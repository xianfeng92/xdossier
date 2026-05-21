import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { scanArtifacts } from "../src/cover/scan.js";
import { buildCoverEdges } from "../src/cover/edges.js";
import { buildCoverView } from "../src/cover/view-model.js";
import { renderCoverHtml } from "../src/cover/render.js";
import { extractOpenQuestions } from "../src/cover/extract.js";
import { parseFrontmatter } from "../src/parse/frontmatter.js";
import type { CoverArtifact } from "../src/cover/types.js";

async function makeWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dossier-cover-"));
  await writeFile(join(root, "README.md"), "# Fixture\n", "utf8");
  await writeFile(join(root, "docs-placeholder"), "", "utf8");
  await mkdir(join(root, "docs/specs"), { recursive: true });
  await mkdir(join(root, "docs/changes"), { recursive: true });
  await mkdir(join(root, "docs/reviews"), { recursive: true });

  await writeFile(
    join(root, "docs/specs/2026-05-17-dossier-vision-spec.md"),
    `---
title: Vision Spec
status: ready
kind: vision-spec
created: 2026-05-17
updated: 2026-05-17
reviews: ["docs/reviews/2026-05-18-vision-review.md"]
---

# Vision Spec
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/specs/2026-05-18-dossier-mvp-0-spec.md"),
    `---
title: MVP-0 Spec
status: implemented
kind: mvp-spec
created: 2026-05-18
updated: 2026-05-18
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
reviews: ["docs/reviews/2026-05-18-mvp-0-review.md"]
---

# MVP-0 Spec

## Decision: Use Node.js >=20

Node.js keeps the CLI aligned with the local TypeScript toolchain.

| Decision | Reason |
|---|---|
| Keep pnpm as the package manager | It matches the existing repository contract. |

## Open Questions

- [ ] Decide whether share mode should warn about missing redaction rules. Blocks public export.
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md"),
    `---
title: MVP-0 Change
status: implemented
created: 2026-05-18
updated: 2026-05-18
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
---

# MVP-0 Change
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/reviews/2026-05-18-vision-review.md"),
    `---
title: Vision Review
status: implemented
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
---

# Vision Review

## Verdict

BLOCKED until the cover exposes decisions and open questions with evidence.
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/reviews/2026-05-18-mvp-0-review.md"),
    `---
title: MVP-0 Review
status: implemented
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
---

# MVP-0 Review
`,
    "utf8",
  );

  return root;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function iframeSrcdocs(html: string): string[] {
  return [...html.matchAll(/srcdoc="([\s\S]*?)"\s*><\/iframe>/g)]
    .map((match) => decodeHtmlAttribute(match[1] ?? ""));
}

function activityInboxHtml(html: string): string {
  return html.match(/<section class="activity-inbox"[\s\S]*?<section class="cover-grid"/)?.[0] ?? "";
}

describe("Cover-0 artifact scanning", () => {
  test("scans specs, changes, reviews, and referenced artifacts deterministically", async () => {
    const root = await makeWorkspace();

    const artifacts = await scanArtifacts(root);

    expect(artifacts.map((artifact) => artifact.path)).toEqual([
      "docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md",
      "docs/reviews/2026-05-18-mvp-0-review.md",
      "docs/reviews/2026-05-18-vision-review.md",
      "docs/specs/2026-05-17-dossier-vision-spec.md",
      "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
    ]);
    expect(artifacts.find((artifact) => artifact.path === "docs/specs/2026-05-17-dossier-vision-spec.md")).toMatchObject({
      kind: "vision-spec",
      status: "ready",
      title: "Vision Spec",
    });
  });
});

describe("Cover-0 edge building", () => {
  test("builds high-confidence implements and reviews edges with labels and evidence", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);

    const edges = buildCoverEdges(artifacts);

    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
          to: "docs/specs/2026-05-17-dossier-vision-spec.md",
          relation: "implements",
          confidence: "high",
          label: "MVP-0 Spec implements Vision Spec",
          evidence: "frontmatter implements includes docs/specs/2026-05-17-dossier-vision-spec.md",
        }),
        expect.objectContaining({
          from: "docs/reviews/2026-05-18-vision-review.md",
          to: "docs/specs/2026-05-17-dossier-vision-spec.md",
          relation: "reviews",
          confidence: "high",
          label: "Vision Review reviews Vision Spec",
          evidence: "frontmatter reviews_target includes docs/specs/2026-05-17-dossier-vision-spec.md",
        }),
      ]),
    );
    expect(edges.every((edge) => edge.label && edge.confidence === "high")).toBe(true);
  });
});

describe("Cover-0 view model", () => {
  test("creates a deterministic mixed-status cover view with grouped evidence", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);

    const view = buildCoverView({ workspaceRoot: root, artifacts, edges });

    expect(view.dossier).toMatchObject({
      id: "dossier-cover",
      title: "Dossier cover",
      status: "mixed",
      confidence: "high",
      updated_at: "2026-05-18",
    });
    expect(view.artifacts).toHaveLength(5);
    expect(view.evidence).toHaveLength(edges.length);
    expect(view.evidence[0]).toMatchObject({
      confidence: "high",
      extraction_rule: "frontmatter",
    });
  });
});

describe("Cover-1 deterministic extraction", () => {
  test("extracts high-confidence decisions without inventing more than five", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);

    const view = buildCoverView({ workspaceRoot: root, artifacts, edges });

    expect(view.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Decision: Use Node.js >=20",
          source_artifact: "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
        }),
        expect.objectContaining({
          title: "Keep pnpm as the package manager",
          source_artifact: "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
        }),
      ]),
    );
    expect(view.decisions.length).toBeLessThanOrEqual(5);
    expect(view.decisions.every((decision) => decision.href.includes("#"))).toBe(true);
  });

  test("extracts open questions from sections, unchecked tasks, and review blockers", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);

    const view = buildCoverView({ workspaceRoot: root, artifacts, edges });

    expect(view.open_questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Decide whether share mode should warn about missing redaction rules. Blocks public export.",
          source_artifact: "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
          blocks: "public export",
        }),
        expect.objectContaining({
          title: "BLOCKED until the cover exposes decisions and open questions with evidence.",
          source_artifact: "docs/reviews/2026-05-18-vision-review.md",
          blocks: "until the cover exposes decisions and open questions with evidence.",
        }),
      ]),
    );
  });

  test("generates compact PM, Engineer, and Reviewer reading paths", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);

    const view = buildCoverView({ workspaceRoot: root, artifacts, edges });

    expect(view.reading_paths.map((path) => path.role)).toEqual([
      "PM / decision maker",
      "Engineer / implementer",
      "Reviewer / handoff receiver",
    ]);
    expect(view.reading_paths.every((path) => path.steps.length > 0)).toBe(true);
    expect(view.reading_paths[0]?.steps.at(-1)).toMatchObject({
      path: "docs/specs/2026-05-17-dossier-vision-spec.md",
    });
  });
});

describe("Cover-0 CLI behavior", () => {
  test("dossier build writes .dossier/out/index.html with artifacts and edge evidence", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const outPath = join(root, ".dossier/out/index.html");
    expect(existsSync(outPath)).toBe(true);
    const html = await readFile(outPath, "utf8");
    expect(html).toMatch(/<section class="verdict-strip">/);
    expect(html).toMatch(/MVP-0 Spec implements Vision Spec/);
    expect(html).toMatch(/Vision Review reviews Vision Spec/);
    expect(html).toMatch(/confidence.*high/);
    expect(result.stdout).toContain(outPath);
  });
});

describe("Cover-1 rendering", () => {
  test("renders artifact map, decisions, open questions, reading paths, and collapsed evidence", async () => {
    const root = await makeWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);
    const view = buildCoverView({ workspaceRoot: root, artifacts, edges });

    const html = renderCoverHtml(view);

    expect(html).toMatch(/<section class="artifact-map"/);
    expect(html).toMatch(/MVP-0 Spec implements Vision Spec/);
    expect(html).toMatch(/<section class="key-decisions"/);
    expect(html).toMatch(/Decision: Use Node\.js &gt;=20/);
    expect(html).toMatch(/<section class="open-questions"/);
    expect(html).toMatch(/Decide whether share mode should warn/);
    expect(html).toMatch(/<section class="reading-paths"/);
    expect(html).toMatch(/PM \/ decision maker/);
    expect(html).toMatch(/<details class="evidence-drawer">/);
    expect(html).toMatch(/<summary>Evidence/);
    expect(html).not.toMatch(/<script src=|<link[^>]+href="http|@import|url\(http/);
  });
});

describe("Cover-2 backlog behavior", () => {
  test("--since last succeeds when no previous manifest exists", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--since", "last"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(root, ".dossier/build-manifest.json"))).toBe(true);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).not.toMatch(/<section class="activity-inbox"/);
  });

  test("writes a build manifest and populates activity inbox from --since last", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");
    const cwd = resolve(import.meta.dirname, "..");

    const first = spawnSync(process.execPath, ["--import", "tsx", cliPath, "build", root], {
      cwd,
      encoding: "utf8",
    });
    expect(first.status).toBe(0);
    const manifestPath = join(root, ".dossier/build-manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      artifacts: Array<{ path: string; content_hash: string }>;
    };
    expect(manifest.artifacts).toHaveLength(5);

    const mvpPath = join(root, "docs/specs/2026-05-18-dossier-mvp-0-spec.md");
    await writeFile(
      mvpPath,
      `${await readFile(mvpPath, "utf8")}\n## Next\n\n- [ ] Re-run the launch checklist. Blocks release.\n`,
      "utf8",
    );
    await writeFile(
      join(root, "docs/changes/2026-05-19-new-impl-notes.md"),
      `---
title: New Change
status: implemented
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
---

# New Change
`,
      "utf8",
    );

    const second = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--since", "last"],
      { cwd, encoding: "utf8" },
    );

    expect(second.status).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/<section class="activity-inbox"/);
    expect(html).toMatch(/New Change/);
    expect(html).toMatch(/MVP-0 Spec/);
    expect(html).toMatch(/Changed artifacts/);
    expect(html).toMatch(/Open items/);
    expect(html).toMatch(/Re-run the launch checklist/);
    expect(activityInboxHtml(html)).not.toMatch(/Decide whether share mode should warn/);
  });

  test("single-file build succeeds and warns when no privacy filters are configured", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--single-file"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/class="privacy-warning"/);
    expect(html).toMatch(/No .dossierignore or redaction rules were found/);
    expect(html).toMatch(/<details class="source-bundle">/);
    expect(html).toMatch(/title: MVP-0 Spec/);
    expect(html).not.toMatch(/<script src=|<link[^>]+href="http|@import|url\(http/);
  });

  test("changed artifacts include frontmatter-only edits", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");
    const cwd = resolve(import.meta.dirname, "..");

    const first = spawnSync(process.execPath, ["--import", "tsx", cliPath, "build", root], {
      cwd,
      encoding: "utf8",
    });
    expect(first.status, first.stderr).toBe(0);

    const visionPath = join(root, "docs/specs/2026-05-17-dossier-vision-spec.md");
    await writeFile(
      visionPath,
      (await readFile(visionPath, "utf8")).replace("status: ready", "status: implemented"),
      "utf8",
    );

    const second = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--since", "last"],
      { cwd, encoding: "utf8" },
    );

    expect(second.status, second.stderr).toBe(0);
    expect(activityInboxHtml(await readFile(join(root, ".dossier/out/index.html"), "utf8"))).toMatch(/Vision Spec/);
  });

  test("--since git ref populates activity inbox without a previous manifest", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");
    const cwd = resolve(import.meta.dirname, "..");
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "Dossier Test",
      GIT_AUTHOR_EMAIL: "dossier@example.test",
      GIT_COMMITTER_NAME: "Dossier Test",
      GIT_COMMITTER_EMAIL: "dossier@example.test",
    };

    expect(spawnSync("git", ["init"], { cwd: root, encoding: "utf8", env: gitEnv }).status).toBe(0);
    expect(spawnSync("git", ["add", "."], { cwd: root, encoding: "utf8", env: gitEnv }).status).toBe(0);
    expect(spawnSync("git", ["commit", "-m", "baseline"], { cwd: root, encoding: "utf8", env: gitEnv }).status).toBe(0);

    const mvpPath = join(root, "docs/specs/2026-05-18-dossier-mvp-0-spec.md");
    await writeFile(
      mvpPath,
      `${await readFile(mvpPath, "utf8")}\n## Decision: Keep git baselines deterministic\n\nGit refs should compare against committed artifact content.\n`,
      "utf8",
    );
    await writeFile(
      join(root, "docs/changes/2026-05-19-git-baseline-impl-notes.md"),
      `---
title: Git Baseline Change
status: implemented
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
---

# Git Baseline Change
`,
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--since", "HEAD"],
      { cwd, encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/<section class="activity-inbox"/);
    expect(html).toMatch(/Git Baseline Change/);
    expect(html).toMatch(/Changed artifacts/);
    expect(html).toMatch(/MVP-0 Spec/);
  });

  test("single-file build embeds rendered artifact documents, not only source markdown", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--single-file"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/<details class="rendered-document-bundle">/);
    expect(html).toMatch(/<iframe/);
    expect(html).toMatch(/srcdoc="/);
    expect(html).toMatch(/MVP-0 Spec/);
    expect(html).toMatch(/spec-shell|spec-page|frontmatter/);
    const renderedMvp = iframeSrcdocs(html).find((srcdoc) => srcdoc.includes("<title>MVP-0 Spec</title>")) ?? "";
    expect(renderedMvp).toMatch(/<span class="badge ok">implemented<\/span>/);
    expect(renderedMvp).toMatch(/<span class="stat-label">Updated<\/span><span class="stat-value">2026-05-18<\/span>/);
    expect(renderedMvp).toMatch(/<span class="stat-label">Implements<\/span><span class="stat-value">1<\/span>/);
    expect(renderedMvp).toMatch(/<details class="frontmatter-details compact-relations">/);
    expect(renderedMvp).toMatch(/<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">/);
    expect(renderedMvp).toMatch(/<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(renderedMvp).toMatch(/<nav id="source-section-map" class="source-section-map"/);
    expect(renderedMvp).toMatch(/<li><code>docs\/specs\/2026-05-17-dossier-vision-spec\.md<\/code><\/li>/);
    expect(html).not.toMatch(/<script src=|<link[^>]+href="http|@import|url\(http/);
  });

  test("open-question extraction ignores prose bullets that describe extraction rules", () => {
    const artifact: CoverArtifact = {
      id: "docs/specs/noisy-spec.md",
      path: "docs/specs/noisy-spec.md",
      title: "Noisy Spec",
      kind: "mvp-spec",
      status: "ready",
      frontmatter: {},
      raw_content: `# Noisy Spec

## Open Questions

- headings containing Open Questions, 开放问题, 风险, or Next;
- unchecked tasks \`- [ ]\`;
- [ ] Decide the real launch blocker. Blocks release.

| Question | Blocks |
|---|---|
| Who owns export review? | public export |
`,
      content: `# Noisy Spec

## Open Questions

- headings containing Open Questions, 开放问题, 风险, or Next;
- unchecked tasks \`- [ ]\`;
- [ ] Decide the real launch blocker. Blocks release.

| Question | Blocks |
|---|---|
| Who owns export review? | public export |
`,
      updated_at: "2026-05-19",
      implements: [],
      reviews: [],
      reviews_target: [],
    };

    const questions = extractOpenQuestions([artifact]);

    expect(questions.map((question) => question.title)).toEqual([
      "Decide the real launch blocker. Blocks release.",
      "Who owns export review?",
    ]);
  });

  test("--no-graph is visible in the rendered cover output", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root, "--no-graph"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/Graph disabled/);
  });

  test("build help describes --out as an output directory", () => {
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", "--help"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/Build options:[\s\S]*--out <dir>/);
    expect(result.stdout).toMatch(/Output directory/);
  });

  test("the real vision spec no longer declares that it implements MVP-0", async () => {
    const md = await readFile(
      resolve(import.meta.dirname, "../docs/specs/2026-05-17-dossier-vision-spec.md"),
      "utf8",
    );

    const implementsValue = parseFrontmatter(md).data.implements;

    expect(implementsValue === undefined || (Array.isArray(implementsValue) && implementsValue.length === 0)).toBe(true);
  });
});
