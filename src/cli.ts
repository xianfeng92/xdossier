// CLI entry — argv parsing, dispatch, error handling.
// See docs/specs/2026-05-18-dossier-mvp-0-spec.md §4 for the CLI surface and §6.5 for skill dispatch.

import { readFile, writeFile, access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "./render.js";
import { parseAnnotationsJson } from "./annotations.js";
import { createSectionSummariesWithAgent, type EnrichProvider } from "./enrich/agent-cli.js";
import { createSectionSummaryScaffold } from "./enrich/section-summaries.js";
import { parseFrontmatter } from "./parse/frontmatter.js";
import { selectSkill } from "./skills/registry.js";
import { buildDossierCover } from "./cover/render.js";
import type { ContentMode, ReaderProfile, RenderAnnotations } from "./types.js";

const VERSION = "0.1.0";

type Argv =
  | {
      command: "render";
      input: string;
      out?: string;
      skill?: string;
      annotations?: string;
      toc: boolean;
      verbose: boolean;
      reader: ReaderProfile;
      contentMode?: ContentMode;
    }
  | {
      command: "enrich";
      input: string;
      out?: string;
      provider: EnrichProvider;
      model?: string;
      verbose: boolean;
    }
  | {
      command: "build" | "cover";
      workspace: string;
      outDir?: string;
      since?: string;
      singleFile: boolean;
      graph: boolean;
      verbose: boolean;
    }
  | { command: "help"; topic?: string }
  | { command: "version" }
  | { command: "error"; message: string };

const HELP_TEXT = `xdossier ${VERSION}

Usage:
  xdossier render <input.md> [options]
  xdossier enrich <input.md> [options]
  xdossier cover [workspace] [options]
  xdossier build [workspace] [options]
  xdossier --help
  xdossier --version

Arguments:
  <input.md>                Path to a markdown file (absolute or relative)
  [workspace]               Workspace root for a multi-doc cover build (default: .)

Options:
Render options:
  -o, --out <path>          Output HTML path (default: <input>.html same dir)
  -s, --skill <name>        Force a specific skill, overriding auto-detection
                              (default: auto-select via §6.5 of MVP-0 spec;
                              falls back to render-spec)
                              MVP-0 only has "render-spec" registered;
                              passing an unknown name exits with code 3.
      --annotations <path>  Read deterministic render annotations JSON
      --reader <profile>    beginner, intermediate, or expert (default: beginner)
      --content-mode <mode> auto, tutorial, concept, reference, or course (default: auto)
      --no-toc              Disable TOC sidebar

Enrich options:
  -o, --out <path>          Output annotations JSON path (default: <input>.annotations.json)
      --provider <name>     scaffold, codex, or claude (default: scaffold)
      --model <name>        Optional model name passed to codex/claude providers

Build options:
  -o, --out <dir>           Output directory (default: <workspace>/.dossier/out)
      --single-file         Pack cover, rendered documents, and source artifacts into one HTML file
      --since <ref>         Populate activity inbox from previous build manifest
      --no-graph            Build cover with grouped-list fallback only
      --verbose             Print skill selection reason and timings
  -h, --help                Show help
  -v, --version             Show version

Output:
  .dossier/out/index.html                  Project index linking all dossiers
  .dossier/out/<dossier-id>/index.html     Per-dossier cover

cover:
  alias: xdossier build

Exit codes:
  0   success
  1   input file missing or unreadable
  2   parse error (malformed frontmatter / markdown)
  3   unknown skill
  64  internal error
`;

export function parseArgv(argv: string[]): Argv {
  if (argv.length === 0) return { command: "help" };
  if (argv[0] === "-h" || argv[0] === "--help") return { command: "help" };
  if (argv[0] === "-v" || argv[0] === "--version") return { command: "version" };
  if (argv[0] === "build") return parseBuildArgv(argv.slice(1), "build");
  if (argv[0] === "cover") return parseBuildArgv(argv.slice(1), "cover");
  if (argv[0] === "enrich") return parseEnrichArgv(argv.slice(1));
  if (argv[0] !== "render") {
    return { command: "error", message: `unknown command: ${argv[0]}` };
  }

  let input: string | undefined;
  let out: string | undefined;
  let skill: string | undefined;
  let annotations: string | undefined;
  let toc = true;
  let verbose = false;
  let reader: ReaderProfile = "beginner";
  let contentMode: ContentMode | undefined;

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") {
      out = argv[++i];
      if (!out) return { command: "error", message: "--out requires a value" };
    } else if (a === "-s" || a === "--skill") {
      skill = argv[++i];
      if (!skill) return { command: "error", message: "--skill requires a value" };
    } else if (a === "--annotations") {
      annotations = argv[++i];
      if (!annotations) return { command: "error", message: "--annotations requires a value" };
    } else if (a === "--reader") {
      const raw = argv[++i];
      if (!raw) return { command: "error", message: "--reader requires a value" };
      if (!isReaderProfile(raw)) {
        return { command: "error", message: `unknown reader profile: ${raw}` };
      }
      reader = raw;
    } else if (a === "--content-mode") {
      const raw = argv[++i];
      if (!raw) return { command: "error", message: "--content-mode requires a value" };
      if (raw === "auto") {
        contentMode = undefined;
      } else if (isContentMode(raw)) {
        contentMode = raw;
      } else {
        return { command: "error", message: `unknown content mode: ${raw}` };
      }
    } else if (a === "--no-toc") {
      toc = false;
    } else if (a === "--verbose") {
      verbose = true;
    } else if (a === "-h" || a === "--help") {
      return { command: "help", topic: "render" };
    } else if (a.startsWith("-")) {
      return { command: "error", message: `unknown option: ${a}` };
    } else if (!input) {
      input = a;
    } else {
      return { command: "error", message: `unexpected positional argument: ${a}` };
    }
  }

  if (!input) return { command: "error", message: "render: missing <input.md>" };
  return { command: "render", input, out, skill, annotations, toc, verbose, reader, contentMode };
}

export function formatEnrichSummary(annotations: RenderAnnotations): string {
  const pieces = [`${annotations.section_summaries.length} summaries`];
  if (annotations.document_overview) pieces.push("overview");
  if (annotations.reading_path?.length) {
    pieces.push(`${annotations.reading_path.length} reading path ${annotations.reading_path.length === 1 ? "item" : "items"}`);
  }
  if (annotations.semantic_blocks?.length) {
    pieces.push(`${annotations.semantic_blocks.length} semantic ${annotations.semantic_blocks.length === 1 ? "block" : "blocks"}`);
  }
  return pieces.join(", ");
}

export function formatPedagogySummary(annotations: RenderAnnotations): string {
  const prereqCount = annotations.prerequisites?.length ?? 0;
  const checkpointSections = (annotations.checkpoints ?? []).filter((checkpoint) => checkpoint.items.length > 0).length;
  const analogyCount = annotations.analogies?.length ?? 0;
  return `prereq: ${prereqCount}, checkpoints: ${checkpointSections} sections, analogies: ${analogyCount}`;
}

function parseEnrichArgv(argv: string[]): Argv {
  let input: string | undefined;
  let out: string | undefined;
  let provider: EnrichProvider = "scaffold";
  let model: string | undefined;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") {
      out = argv[++i];
      if (!out) return { command: "error", message: "--out requires a value" };
    } else if (a === "--provider") {
      const raw = argv[++i];
      if (!raw) return { command: "error", message: "--provider requires a value" };
      if (!isEnrichProvider(raw)) {
        return { command: "error", message: `unknown enrich provider: ${raw}` };
      }
      provider = raw;
    } else if (a === "--model") {
      model = argv[++i];
      if (!model) return { command: "error", message: "--model requires a value" };
    } else if (a === "--verbose") {
      verbose = true;
    } else if (a === "-h" || a === "--help") {
      return { command: "help", topic: "enrich" };
    } else if (a.startsWith("-")) {
      return { command: "error", message: `unknown option: ${a}` };
    } else if (!input) {
      input = a;
    } else {
      return { command: "error", message: `unexpected positional argument: ${a}` };
    }
  }

  if (!input) return { command: "error", message: "enrich: missing <input.md>" };
  return { command: "enrich", input, out, provider, model, verbose };
}

function isEnrichProvider(value: string): value is EnrichProvider {
  return value === "scaffold" || value === "codex" || value === "claude";
}

function isReaderProfile(value: string): value is ReaderProfile {
  return value === "beginner" || value === "intermediate" || value === "expert";
}

function isContentMode(value: string): value is ContentMode {
  return value === "tutorial" || value === "concept" || value === "reference" || value === "course";
}

function parseBuildArgv(argv: string[], command: "build" | "cover"): Argv {
  let workspace: string | undefined;
  let outDir: string | undefined;
  let since: string | undefined;
  let singleFile = false;
  let graph = true;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--out") {
      outDir = argv[++i];
      if (!outDir) return { command: "error", message: "--out requires a value" };
    } else if (a === "--no-graph") {
      graph = false;
    } else if (a === "--verbose") {
      verbose = true;
    } else if (a === "--single-file") {
      singleFile = true;
    } else if (a === "--since") {
      since = argv[++i];
      if (!since) return { command: "error", message: "--since requires a value" };
    } else if (a === "-h" || a === "--help") {
      return { command: "help", topic: "build" };
    } else if (a.startsWith("-")) {
      return { command: "error", message: `unknown option: ${a}` };
    } else if (!workspace) {
      workspace = a;
    } else {
      return { command: "error", message: `unexpected positional argument: ${a}` };
    }
  }

  return { command, workspace: workspace ?? ".", outDir, since, singleFile, graph, verbose };
}

export async function main(): Promise<void> {
  const parsed = parseArgv(process.argv.slice(2));

  if (parsed.command === "help") {
    process.stdout.write(HELP_TEXT);
    return;
  }
  if (parsed.command === "version") {
    process.stdout.write(`xdossier ${VERSION}\n`);
    return;
  }
  if (parsed.command === "error") {
    process.stderr.write(`error: ${parsed.message}\n\n`);
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }

  if (parsed.command === "enrich") {
    const inputAbs = resolve(parsed.input);
    try {
      await access(inputAbs);
    } catch {
      process.stderr.write(`error: input file not found: ${parsed.input}\n`);
      process.exit(1);
    }

    let md: string;
    try {
      md = await readFile(inputAbs, "utf8");
    } catch (e) {
      process.stderr.write(`error: cannot read ${parsed.input}: ${(e as Error).message}\n`);
      process.exit(1);
    }

    let annotations;
    const warnings: string[] = [];
    try {
      annotations = parsed.provider === "scaffold"
        ? createSectionSummaryScaffold(md)
        : await createSectionSummariesWithAgent(md, {
            provider: parsed.provider,
            cwd: process.cwd(),
            model: parsed.model,
            onWarning: (message) => warnings.push(message),
          });
    } catch (e) {
      process.stderr.write(`error: failed to enrich markdown: ${(e as Error).message}\n`);
      process.exit(2);
    }

    const outAbs = parsed.out
      ? resolve(parsed.out)
      : inputAbs.replace(/\.md$/i, ".annotations.json");

    const json = `${JSON.stringify(annotations, null, 2)}\n`;
    try {
      await writeFile(outAbs, json, "utf8");
    } catch (e) {
      process.stderr.write(`error: cannot write ${outAbs}: ${(e as Error).message}\n`);
      process.exit(64);
    }

    if (parsed.verbose) {
      process.stderr.write(`provider: ${parsed.provider}${parsed.model ? ` (${parsed.model})` : ""}\n`);
      process.stderr.write(`annotations: ${formatEnrichSummary(annotations)}\n`);
      process.stderr.write(`pedagogy: ${formatPedagogySummary(annotations)}\n`);
      warnings.forEach((warning) => process.stderr.write(`warning: ${warning}\n`));
    }
    process.stdout.write(`wrote ${outAbs} (${formatEnrichSummary(annotations)})\n`);
    return;
  }

  if (parsed.command === "build" || parsed.command === "cover") {
    const workspaceAbs = resolve(parsed.workspace);
    try {
      await access(workspaceAbs);
    } catch {
      process.stderr.write(`error: workspace not found: ${parsed.workspace}\n`);
      process.exit(1);
    }

    try {
      const result = await buildDossierCover({
        workspaceRoot: workspaceAbs,
        outDir: parsed.outDir,
        since: parsed.since,
        singleFile: parsed.singleFile,
        graph: parsed.graph,
      });
      if (parsed.verbose) {
        const artifactCount = result.covers.reduce((sum, cover) => sum + cover.view.artifacts.length, 0);
        const edgeCount = result.covers.reduce((sum, cover) => sum + cover.view.edges.length, 0);
        const newCount = result.covers.reduce((sum, cover) => sum + cover.view.activity.new_artifacts.length, 0);
        const changedCount = result.covers.reduce((sum, cover) => sum + cover.view.activity.changed_artifacts.length, 0);
        process.stderr.write(
          `cover artifacts: ${artifactCount}, edges: ${edgeCount}, graph: ${parsed.graph ? "list-fallback" : "disabled"}, activity: ${newCount} new/${changedCount} changed\n`,
        );
      }
      for (const cover of result.covers) {
        process.stdout.write(`wrote ${cover.outPath} (${(await stat(cover.outPath)).size} bytes)\n`);
      }
      process.stdout.write(`wrote ${result.indexPath} (${(await stat(result.indexPath)).size} bytes)\n`);
      return;
    } catch (e) {
      process.stderr.write(`error: build failed: ${(e as Error).message}\n`);
      process.exit(64);
    }
  }

  if (parsed.command !== "render") {
    return;
  }

  const inputAbs = resolve(parsed.input);
  try {
    await access(inputAbs);
  } catch {
    process.stderr.write(`error: input file not found: ${parsed.input}\n`);
    process.exit(1);
  }

  let md: string;
  try {
    md = await readFile(inputAbs, "utf8");
  } catch (e) {
    process.stderr.write(`error: cannot read ${parsed.input}: ${(e as Error).message}\n`);
    process.exit(1);
  }

  let fm: ReturnType<typeof parseFrontmatter>;
  try {
    fm = parseFrontmatter(md);
  } catch (e) {
    process.stderr.write(`error: failed to parse frontmatter: ${(e as Error).message}\n`);
    process.exit(2);
  }

  let selection;
  try {
    selection = selectSkill({
      frontmatter: fm.data,
      filepath: inputAbs,
      cliOverride: parsed.skill,
    });
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    process.exit(3);
  }

  if (parsed.verbose) {
    process.stderr.write(
      `selected skill: ${selection.skillId} (${selection.reason})\n`,
    );
    if (selection.matched_skills) {
      process.stderr.write(`  candidates: ${selection.matched_skills.join(", ")}\n`);
    }
  }

  let annotations;
  if (parsed.annotations) {
    const annotationsAbs = resolve(parsed.annotations);
    let rawAnnotations: string;
    try {
      rawAnnotations = await readFile(annotationsAbs, "utf8");
    } catch (e) {
      process.stderr.write(`error: cannot read annotations ${parsed.annotations}: ${(e as Error).message}\n`);
      process.exit(1);
    }
    try {
      annotations = parseAnnotationsJson(rawAnnotations, parsed.annotations);
    } catch (e) {
      process.stderr.write(`error: failed to parse annotations: ${(e as Error).message}\n`);
      process.exit(2);
    }
  }

  let html: string;
  try {
    html = await render({
      markdown: md,
      skillId: selection.skillId,
      withToc: parsed.toc,
      annotations,
      reader: parsed.reader,
      contentModeOverride: parsed.contentMode,
    });
  } catch (e) {
    process.stderr.write(`error: render failed: ${(e as Error).message}\n`);
    process.exit(64);
  }

  const outAbs = parsed.out
    ? resolve(parsed.out)
    : inputAbs.replace(/\.md$/i, ".html");

  try {
    await writeFile(outAbs, html, "utf8");
  } catch (e) {
    process.stderr.write(`error: cannot write ${outAbs}: ${(e as Error).message}\n`);
    process.exit(64);
  }

  process.stdout.write(`wrote ${outAbs} (${html.length} bytes)\n`);
}

// Run when invoked directly (tsx src/cli.ts ...).
// When imported by bin/xdossier.js, the consumer calls main() explicitly.
const isDirectExec =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/src/cli.ts") ||
  process.argv[1]?.endsWith("/dist/cli.js");
if (isDirectExec) {
  main().catch((e) => {
    process.stderr.write(`fatal: ${(e as Error).stack ?? e}\n`);
    process.exit(64);
  });
}
