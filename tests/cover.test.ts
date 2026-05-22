import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { scanArtifacts } from "../src/cover/scan.js";
import { buildCoverEdges } from "../src/cover/edges.js";
import { buildCoverView } from "../src/cover/view-model.js";
import { renderCoverHtml } from "../src/cover/render.js";
import { renderRelationGraph } from "../src/cover/relation-graph.js";
import { extractOpenQuestions } from "../src/cover/extract.js";
import { parseFrontmatter } from "../src/parse/frontmatter.js";
import type { CoverArtifact, CoverEdge, DossierCoverView } from "../src/cover/types.js";

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

function syntheticArtifact(input: Partial<CoverArtifact> & Pick<CoverArtifact, "path" | "title" | "kind">): CoverArtifact {
  return {
    id: input.path,
    path: input.path,
    title: input.title,
    kind: input.kind,
    status: input.status ?? "ready",
    frontmatter: input.frontmatter ?? {},
    raw_content: input.raw_content ?? `# ${input.title}\n`,
    content: input.content ?? `# ${input.title}\n`,
    updated_at: input.updated_at ?? "2026-05-22",
    implements: input.implements ?? [],
    reviews: input.reviews ?? [],
    reviews_target: input.reviews_target ?? [],
    summary: input.summary,
    rendered_html_path: input.rendered_html_path,
  };
}

function syntheticView(input: {
  artifacts: CoverArtifact[];
  edges?: CoverEdge[];
  graphDisabled?: boolean;
}): DossierCoverView {
  return {
    dossier: {
      id: "phase-d",
      title: "Phase D",
      status: "ready",
      description: "Synthetic relation graph fixture",
      updated_at: "2026-05-22",
      confidence: "high",
    },
    activity: { new_artifacts: [], changed_artifacts: [], open_items: [] },
    artifacts: input.artifacts,
    edges: input.edges ?? [],
    decisions: [],
    open_questions: [],
    reading_paths: [],
    evidence: [],
    graph_disabled: input.graphDisabled,
  };
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
  test("xdossier build writes a project index plus per-dossier covers", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "build", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const indexPath = join(root, ".dossier/out/index.html");
    const visionCoverPath = join(root, ".dossier/out/2026-05-17-dossier-vision/index.html");
    const mvpCoverPath = join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html");
    expect(existsSync(indexPath)).toBe(true);
    expect(existsSync(visionCoverPath)).toBe(true);
    expect(existsSync(mvpCoverPath)).toBe(true);

    const indexHtml = await readFile(indexPath, "utf8");
    expect(indexHtml).toMatch(/Project Dossier Index/);
    expect(indexHtml).toMatch(/<a href="2026-05-17-dossier-vision\/index\.html">Vision Spec<\/a>/);
    expect(indexHtml).toMatch(/<a href="2026-05-18-dossier-mvp-0\/index\.html">MVP-0 Spec<\/a>/);

    const visionHtml = await readFile(visionCoverPath, "utf8");
    expect(visionHtml).toMatch(/<section class="verdict-strip">/);
    expect(visionHtml).toMatch(/Vision Review reviews Vision Spec/);
    expect(visionHtml).toMatch(/confidence.*high/);

    const mvpHtml = await readFile(mvpCoverPath, "utf8");
    expect(mvpHtml).toMatch(/<section class="verdict-strip">/);
    expect(mvpHtml).toMatch(/MVP-0 Change implements MVP-0 Spec/);
    expect(mvpHtml).not.toMatch(/MVP-0 Spec implements Vision Spec/);

    expect(result.stdout).toContain(visionCoverPath);
    expect(result.stdout).toContain(mvpCoverPath);
    expect(result.stdout).toContain(indexPath);
  });

  test("xdossier cover writes one index plus per-dossier covers from a 2-dossier workspace", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "cover", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(root, ".dossier/out/index.html"))).toBe(true);
    expect(existsSync(join(root, ".dossier/out/2026-05-17-dossier-vision/index.html"))).toBe(true);
    expect(existsSync(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"))).toBe(true);
    expect(result.stdout.match(/\.dossier\/out\/[^/\n]+\/index\.html/g)).toHaveLength(2);
  });

  test("xdossier cover writes membership.json for roots, members, and orphans", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "cover", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const membershipPath = join(root, ".dossier/out/membership.json");
    expect(existsSync(membershipPath)).toBe(true);

    const membership = JSON.parse(await readFile(membershipPath, "utf8")) as {
      version: number;
      workspace_root: string;
      members: Record<string, {
        dossier_id: string | null;
        dossier_title?: string;
        cover_href: string;
        member_count?: number;
        role: string;
      }>;
    };

    expect(membership.version).toBe(1);
    expect(membership.workspace_root).toBe(root);
    expect(Object.keys(membership.members).sort()).toEqual([
      "docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md",
      "docs/reviews/2026-05-18-mvp-0-review.md",
      "docs/reviews/2026-05-18-vision-review.md",
      "docs/specs/2026-05-17-dossier-vision-spec.md",
      "docs/specs/2026-05-18-dossier-mvp-0-spec.md",
    ]);
    expect(membership.members["docs/specs/2026-05-17-dossier-vision-spec.md"]).toMatchObject({
      dossier_id: "2026-05-17-dossier-vision",
      role: "root",
      cover_href: "../../.dossier/out/2026-05-17-dossier-vision/index.html",
      member_count: 2,
    });
    expect(membership.members["docs/reviews/2026-05-18-vision-review.md"]).toMatchObject({
      dossier_id: "2026-05-17-dossier-vision",
      role: "member",
    });
    expect(membership.members["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]).toMatchObject({
      dossier_id: "2026-05-18-dossier-mvp-0",
      role: "root",
      member_count: 3,
    });
    expect(membership.members["docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md"]).toMatchObject({
      dossier_id: "2026-05-18-dossier-mvp-0",
      role: "member",
    });
    expect(membership.members["docs/reviews/2026-05-18-mvp-0-review.md"]).toMatchObject({
      dossier_id: "2026-05-18-dossier-mvp-0",
      role: "member",
    });
  });

  test("project index lists all dossiers with link hrefs", async () => {
    const root = await makeWorkspace();
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "cover", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/<section class="project-dossiers"/);
    expect(html).toContain('href="2026-05-17-dossier-vision/index.html"');
    expect(html).toContain('href="2026-05-18-dossier-mvp-0/index.html"');
    expect(html).not.toContain('href="../../.dossier/out/');
  });

  test("workspace with no root specs writes only a project index with orphans", async () => {
    const root = await mkdtemp(join(tmpdir(), "dossier-cover-no-roots-"));
    await mkdir(join(root, "docs/changes"), { recursive: true });
    await writeFile(
      join(root, "docs/changes/2026-05-20-orphan-impl-notes.md"),
      `---
title: Orphan Change
status: ready
kind: change
updated: 2026-05-20
---

# Orphan Change
`,
      "utf8",
    );
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "cover", root],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const outEntries = await readdir(join(root, ".dossier/out"), { withFileTypes: true });
    expect(outEntries.filter((entry) => entry.isDirectory())).toHaveLength(0);
    const html = await readFile(join(root, ".dossier/out/index.html"), "utf8");
    expect(html).toMatch(/No spec roots detected/);
    expect(html).toMatch(/Orphans/);
    expect(html).toMatch(/Orphan Change/);
  });
});

describe("MVP-1 Phase C member banners", () => {
  test("xdossier render injects a dossier banner when membership.json is present", async () => {
    const root = await mkdtemp(join(tmpdir(), "dossier-phase-c-banner-"));
    await mkdir(join(root, "docs/specs"), { recursive: true });
    await writeFile(
      join(root, "docs/specs/2026-05-22-phase-c-spec.md"),
      `---
title: Phase C Spec
status: ready
kind: spec
updated: 2026-05-22
---

# Phase C Spec
`,
      "utf8",
    );
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");
    const cwd = resolve(import.meta.dirname, "..");

    const cover = spawnSync(process.execPath, ["--import", "tsx", cliPath, "cover", root], {
      cwd,
      encoding: "utf8",
    });
    expect(cover.status, cover.stderr).toBe(0);

    const render = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "render", join(root, "docs/specs/2026-05-22-phase-c-spec.md")],
      { cwd, encoding: "utf8" },
    );
    expect(render.status, render.stderr).toBe(0);

    const html = await readFile(join(root, "docs/specs/2026-05-22-phase-c-spec.html"), "utf8");
    expect(html).toContain('<a class="dossier-banner"');
    expect(html).toContain('href="../../.dossier/out/2026-05-22-phase-c/index.html"');
    expect(html).toContain('data-dossier-id="2026-05-22-phase-c"');
    expect(html).toContain('data-role="root"');
    expect(html).toContain('<span class="dossier-banner-title">Phase C Spec</span>');
  });

  test("xdossier render skips the banner when membership.json is absent", async () => {
    const root = await mkdtemp(join(tmpdir(), "dossier-phase-c-no-membership-"));
    await mkdir(join(root, "docs/specs"), { recursive: true });
    await writeFile(
      join(root, "docs/specs/2026-05-22-standalone-spec.md"),
      `---
title: Standalone Spec
status: ready
kind: spec
updated: 2026-05-22
---

# Standalone Spec
`,
      "utf8",
    );
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "render", join(root, "docs/specs/2026-05-22-standalone-spec.md")],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const html = await readFile(join(root, "docs/specs/2026-05-22-standalone-spec.html"), "utf8");
    expect(html).not.toContain('<a class="dossier-banner"');
  });

  test("orphan documents render a banner back to the project index", async () => {
    const root = await mkdtemp(join(tmpdir(), "dossier-phase-c-orphan-"));
    await mkdir(join(root, "docs/specs"), { recursive: true });
    await mkdir(join(root, "docs/changes"), { recursive: true });
    await writeFile(
      join(root, "docs/specs/2026-05-22-root-spec.md"),
      `---
title: Root Spec
status: ready
kind: spec
updated: 2026-05-22
---

# Root Spec
`,
      "utf8",
    );
    await writeFile(
      join(root, "docs/changes/2026-05-22-unrelated-change.md"),
      `---
title: Unrelated Change
status: ready
kind: change
updated: 2026-05-22
---

# Unrelated Change
`,
      "utf8",
    );
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");
    const cwd = resolve(import.meta.dirname, "..");

    const cover = spawnSync(process.execPath, ["--import", "tsx", cliPath, "cover", root], {
      cwd,
      encoding: "utf8",
    });
    expect(cover.status, cover.stderr).toBe(0);

    const render = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "render", join(root, "docs/changes/2026-05-22-unrelated-change.md")],
      { cwd, encoding: "utf8" },
    );
    expect(render.status, render.stderr).toBe(0);

    const html = await readFile(join(root, "docs/changes/2026-05-22-unrelated-change.html"), "utf8");
    expect(html).toContain('<a class="dossier-banner" href="../../.dossier/out/index.html" data-role="orphan">');
    expect(html).toContain('<span class="dossier-banner-label">unassigned ·</span>');
    expect(html).toContain('<span class="dossier-banner-title">project index</span>');
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

describe("Cover-1 relation graph", () => {
  test("renders an 8-member dossier as clickable SVG nodes and styled edges", () => {
    const spec = syntheticArtifact({
      path: "docs/specs/phase-d-spec.md",
      title: "Phase D Spec",
      kind: "spec",
    });
    const changes = Array.from({ length: 6 }, (_, index) => syntheticArtifact({
      path: index === 0
        ? "docs/changes/phase-d-change-1<&\".md"
        : `docs/changes/phase-d-change-${index + 1}.md`,
      title: index === 0 ? "Escaped <>&\" Change" : `Phase D Change ${index + 1}`,
      kind: "change",
    }));
    const review = syntheticArtifact({
      path: "docs/reviews/phase-d-review.md",
      title: "Phase D Review",
      kind: "review",
    });
    const artifacts = [spec, ...changes, review];
    const edges: CoverEdge[] = [
      ...changes.map((change) => ({
        from: spec.path,
        to: change.path,
        relation: "implements" as const,
        source: "frontmatter" as const,
        confidence: "high" as const,
        label: `${spec.title} implements ${change.title}`,
      })),
      {
        from: review.path,
        to: spec.path,
        relation: "reviews",
        source: "frontmatter",
        confidence: "high",
        label: "Review checks spec",
      },
    ];

    const svg = renderRelationGraph(syntheticView({ artifacts, edges }), {
      workspaceRoot: "/tmp/phase-d",
      hrefPrefix: "../../",
    });

    expect(svg).toMatch(/<svg class="relation-graph"/);
    expect(svg.match(/<a /g)).toHaveLength(8);
    expect(svg.match(/<path d=/g)).toHaveLength(7);
    expect(svg).toContain('data-kind="spec"');
    expect(svg).toContain("docs/changes/phase-d-change-1&lt;&amp;&quot;.md");
    expect(svg).not.toContain('href="../../docs/changes/phase-d-change-1<&"');
    expect(svg).not.toContain('data-id="docs_changes_phase-d-change-1<&"');
    expect(svg).toContain("Escaped &lt;&gt;&amp;&quot; Change");
  });

  test("degrades instead of rendering more than 12 members", () => {
    const artifacts = [
      syntheticArtifact({ path: "docs/specs/phase-d-spec.md", title: "Phase D Spec", kind: "spec" }),
      ...Array.from({ length: 14 }, (_, index) => syntheticArtifact({
        path: `docs/changes/phase-d-change-${index + 1}.md`,
        title: `Phase D Change ${index + 1}`,
        kind: "change",
      })),
    ];

    expect(renderRelationGraph(syntheticView({ artifacts }), { hrefPrefix: "../../" })).toBe("");
  });

  test("returns empty when graph rendering is disabled by the view flag", () => {
    const artifacts = [
      syntheticArtifact({ path: "docs/specs/phase-d-spec.md", title: "Phase D Spec", kind: "spec" }),
      syntheticArtifact({ path: "docs/changes/phase-d-change.md", title: "Phase D Change", kind: "change" }),
    ];

    expect(renderRelationGraph(syntheticView({ artifacts, graphDisabled: true }), { hrefPrefix: "../../" })).toBe("");
  });

  test("renders a single root node with no edges", () => {
    const artifacts = [
      syntheticArtifact({ path: "docs/specs/phase-d-spec.md", title: "Phase D Spec", kind: "spec" }),
    ];

    const svg = renderRelationGraph(syntheticView({ artifacts }), { hrefPrefix: "../../" });

    expect(svg).toMatch(/<svg class="relation-graph"/);
    expect(svg.match(/<a /g)).toHaveLength(1);
    expect(svg.match(/<path d=/g) ?? []).toHaveLength(0);
    expect(svg).toContain('viewBox="0 0 236 372"');
  });

  test("renderCoverHtml includes both the relation graph and edge-list supplement", () => {
    const spec = syntheticArtifact({ path: "docs/specs/phase-d-spec.md", title: "Phase D Spec", kind: "spec" });
    const changes = [1, 2].map((index) => syntheticArtifact({
      path: `docs/changes/phase-d-change-${index}.md`,
      title: `Phase D Change ${index}`,
      kind: "change",
    }));
    const review = syntheticArtifact({ path: "docs/reviews/phase-d-review.md", title: "Phase D Review", kind: "review" });
    const edges: CoverEdge[] = [
      ...changes.map((change) => ({
        from: spec.path,
        to: change.path,
        relation: "implements" as const,
        source: "frontmatter" as const,
        confidence: "high" as const,
        label: `${spec.title} implements ${change.title}`,
      })),
      {
        from: review.path,
        to: spec.path,
        relation: "reviews",
        source: "frontmatter",
        confidence: "medium",
        label: "Review checks spec",
      },
    ];

    const html = renderCoverHtml(syntheticView({ artifacts: [spec, ...changes, review], edges }));

    expect(html).toContain('<svg class="relation-graph"');
    expect(html).toContain('<div class="edge-list">');
    expect(html).toContain("Phase D Spec implements Phase D Change 1");
    expect(html).toContain("Review checks spec");
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    expect(activityInboxHtml(await readFile(join(root, ".dossier/out/2026-05-17-dossier-vision/index.html"), "utf8"))).toMatch(/Vision Spec/);
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    const html = await readFile(join(root, ".dossier/out/2026-05-18-dossier-mvp-0/index.html"), "utf8");
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
    expect(result.stdout).toMatch(/\.dossier\/out\/index\.html\s+Project index linking all dossiers/);
    expect(result.stdout).toMatch(/\.dossier\/out\/<dossier-id>\/index\.html\s+Per-dossier cover/);
  });

  test("cover help notes build alias", () => {
    const cliPath = resolve(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "cover", "--help"],
      { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/alias: xdossier build/);
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
