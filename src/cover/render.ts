import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { escapeHtml } from "../parse/markdown.js";
import { render as renderMarkdown } from "../render.js";
import { clusterArtifacts, type ClusterResult, type Dossier } from "./cluster.js";
import { buildCoverEdges } from "./edges.js";
import {
  createBuildManifest,
  readBaselineManifest,
  writeBuildManifest,
} from "./manifest.js";
import { scanArtifacts } from "./scan.js";
import { writeMembershipLookup } from "./membership.js";
import { memberHref } from "./href.js";
import { renderRelationGraph } from "./relation-graph.js";
import type {
  ArtifactRef,
  CoverArtifact,
  CoverDecision,
  CoverEdge,
  CoverOpenQuestion,
  DossierCoverView,
  ReadingPath,
} from "./types.js";
import { buildCoverView } from "./view-model.js";

export type BuildDossierCoverInput = {
  workspaceRoot: string;
  outDir?: string;
  since?: string;
  singleFile?: boolean;
  graph?: boolean;
  onlyDossierContaining?: string;
};

export type BuildDossierCoverResult = {
  indexPath: string;
  covers: Array<{ dossierId: string; outPath: string; view: DossierCoverView }>;
  orphans: CoverArtifact[];
  trace: ClusterResult["trace"];
};

export class FirstRunCoverError extends Error {
  constructor(workspaceRoot: string) {
    super(`error: xdossier cover expects markdown under docs/specs/, docs/changes/,
       or docs/reviews/.

Found none under: ${workspaceRoot}

Either:
  • Point xdossier at the right directory:
      xdossier cover <path-to-your-docs-root>
  • Or initialize the expected layout in this project:
      mkdir -p docs/specs docs/changes docs/reviews
      # Add a .md file with YAML frontmatter (see README)

See https://github.com/xianfeng92/xdossier#quickstart for examples.
`);
    this.name = "FirstRunCoverError";
  }
}

const KIND_ORDER = [
  "vision-spec",
  "mvp-spec",
  "adr",
  "design",
  "change",
  "review",
  "note",
  "other",
] as const;

export async function buildDossierCover(
  input: BuildDossierCoverInput,
): Promise<BuildDossierCoverResult> {
  const workspaceRoot = resolve(input.workspaceRoot);
  const artifacts = await scanArtifacts(workspaceRoot);
  if (artifacts.length === 0 && !hasAnyDocsScanDir(workspaceRoot)) {
    throw new FirstRunCoverError(workspaceRoot);
  }

  const edges = buildCoverEdges(artifacts);
  const { dossiers, orphans, trace } = clusterArtifacts(artifacts);
  const baselineManifest = await readBaselineManifest(workspaceRoot, input.since);
  const outDir = input.outDir ? resolve(input.outDir) : join(workspaceRoot, ".dossier/out");
  const indexPath = join(outDir, "index.html");
  const manifest = createBuildManifest(workspaceRoot, artifacts);
  const covers: BuildDossierCoverResult["covers"] = [];
  const indexCovers: BuildDossierCoverResult["covers"] = [];
  const hasOnlyFilter = input.onlyDossierContaining !== undefined;
  const onlyMemberPath = input.onlyDossierContaining
    ? normalizeWorkspaceRelativePath(workspaceRoot, input.onlyDossierContaining)
    : undefined;
  const onlyDossierId = onlyMemberPath
    ? dossiers.find((dossier) => dossier.members.some((artifact) => artifact.path === onlyMemberPath))?.id
    : undefined;

  await mkdir(outDir, { recursive: true });

  for (const dossier of dossiers) {
    assertFilesystemSafeDossierId(dossier.id);
    const memberPaths = new Set(dossier.members.map((artifact) => artifact.path));
    const dossierEdges = edges.filter((edge) => memberPaths.has(edge.from) && memberPaths.has(edge.to));
    const shouldWriteDossier = !hasOnlyFilter || dossier.id === onlyDossierId;
    const renderedDocuments = input.singleFile && shouldWriteDossier
      ? await renderArtifactDocuments(dossier.members)
      : undefined;
    const view = buildDossierView({
      workspaceRoot,
      dossier,
      edges: dossierEdges,
      baselineManifest,
      privacyWarning: input.singleFile ? privacyWarning(workspaceRoot) : undefined,
      includeSourceBundle: input.singleFile,
      renderedDocuments,
      graphDisabled: input.graph === false,
    });
    const html = renderCoverHtml(view, { workspaceRoot, hrefPrefix: "../../../" });
    const dossierOutDir = join(outDir, dossier.id);
    const outPath = join(dossierOutDir, "index.html");
    indexCovers.push({ dossierId: dossier.id, outPath, view });

    if (shouldWriteDossier) {
      await mkdir(dossierOutDir, { recursive: true });
      await writeFile(outPath, html, "utf8");
      covers.push({ dossierId: dossier.id, outPath, view });
    }
  }

  const indexHtml = renderProjectIndexHtml({
    workspaceRoot,
    builtAt: manifest.built_at,
    artifacts,
    covers: indexCovers,
    orphans,
  });
  await writeFile(indexPath, indexHtml, "utf8");
  await writeMembershipLookup({
    workspaceRoot,
    outDir,
    generatedAt: manifest.built_at,
    dossiers,
    orphans,
  });
  await writeBuildManifest(workspaceRoot, manifest);

  return { indexPath, covers, orphans, trace };
}

function normalizeWorkspaceRelativePath(workspaceRoot: string, inputPath: string): string | undefined {
  const absolutePath = resolve(workspaceRoot, inputPath);
  const relativePath = relative(workspaceRoot, absolutePath);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    return undefined;
  }
  return relativePath.split(sep).join("/");
}

type RenderCoverHtmlOptions = {
  workspaceRoot?: string;
  hrefPrefix?: string;
};

export type RenderContext = {
  workspaceRoot?: string;
  hrefPrefix: string;
};

function buildDossierView(input: {
  workspaceRoot: string;
  dossier: Dossier;
  edges: CoverEdge[];
  baselineManifest?: Awaited<ReturnType<typeof readBaselineManifest>>;
  privacyWarning?: string;
  includeSourceBundle?: boolean;
  renderedDocuments?: DossierCoverView["rendered_documents"];
  graphDisabled?: boolean;
}): DossierCoverView {
  const view = buildCoverView({
    workspaceRoot: input.workspaceRoot,
    artifacts: input.dossier.members,
    edges: input.edges,
    baselineManifest: input.baselineManifest,
    privacyWarning: input.privacyWarning,
    includeSourceBundle: input.includeSourceBundle,
    renderedDocuments: input.renderedDocuments,
    graphDisabled: input.graphDisabled,
  });

  return {
    ...view,
    dossier: {
      ...view.dossier,
      id: input.dossier.id,
      title: input.dossier.root.title,
      description: `${input.dossier.members.length} artifacts rooted at ${input.dossier.root.title}`,
    },
  };
}

export function renderCoverHtml(
  view: DossierCoverView,
  options: RenderCoverHtmlOptions = {},
): string {
  const context: RenderContext = {
    workspaceRoot: options.workspaceRoot,
    hrefPrefix: options.hrefPrefix ?? "../../",
  };
  const graphSvg = renderRelationGraph(view, context);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(view.dossier.title)}</title>
  <style>${coverCss()}</style>
</head>
<body>
  <main class="cover">
    ${renderVerdictStrip(view)}
    ${renderActivityInbox(view, context)}
    ${renderPrivacyWarning(view)}
    ${renderRelationGraphSection(graphSvg)}
    <section class="cover-grid">
      ${renderArtifactMap(view, context, graphSvg)}
      <div class="judgment-stack">
        ${renderKeyDecisions(view.decisions, context)}
        ${renderOpenQuestions(view.open_questions, context)}
      </div>
    </section>
    ${renderReadingPaths(view.reading_paths, context)}
    ${renderEvidenceDrawer(view)}
    ${renderRenderedDocumentBundle(view)}
    ${renderSourceBundle(view)}
  </main>
</body>
</html>`;
}

async function renderArtifactDocuments(
  artifacts: CoverArtifact[],
): Promise<NonNullable<DossierCoverView["rendered_documents"]>> {
  return Promise.all(
    artifacts.map(async (artifact) => ({
      path: artifact.path,
      title: artifact.title,
      html: await renderMarkdown({
        markdown: artifact.raw_content,
        skillId: "render-spec",
        withToc: true,
      }),
    })),
  );
}

function renderVerdictStrip(view: DossierCoverView): string {
  return `<section class="verdict-strip">
  <div>
    <p class="eyebrow">Cover-1</p>
    <h1>${escapeHtml(view.dossier.title)}</h1>
    <p>${escapeHtml(view.dossier.description)}</p>
  </div>
  <dl>
    <div><dt>Status</dt><dd>${escapeHtml(view.dossier.status)}</dd></div>
    <div><dt>Confidence</dt><dd>${escapeHtml(view.dossier.confidence)}</dd></div>
    <div><dt>Artifacts</dt><dd>${view.artifacts.length}</dd></div>
    <div><dt>Latest update</dt><dd>${escapeHtml(view.dossier.updated_at || "unknown")}</dd></div>
  </dl>
  ${view.dossier.next_action ? `<p class="next-action">${escapeHtml(view.dossier.next_action)}</p>` : ""}
</section>`;
}

function renderActivityInbox(view: DossierCoverView, context: RenderContext): string {
  const hasActivity = view.activity.new_artifacts.length > 0 ||
    view.activity.changed_artifacts.length > 0 ||
    view.activity.open_items.length > 0;
  if (!hasActivity) return "";

  return `<section class="activity-inbox" id="activity-inbox">
  <h2>Activity Inbox</h2>
  ${renderActivityGroup("New artifacts", view.activity.new_artifacts, context)}
  ${renderActivityGroup("Changed artifacts", view.activity.changed_artifacts, context)}
  ${renderActivityGroup("Open items", view.activity.open_items, context)}
</section>`;
}

function renderActivityGroup(label: string, artifacts: ArtifactRef[], context: RenderContext): string {
  if (artifacts.length === 0) return "";
  return `<section class="activity-group">
  <h3>${escapeHtml(label)}</h3>
  <ul>${artifacts.map((artifact) => `<li><a href="${escapeAttribute(rebaseHref(artifact.href ?? sourceHref(artifact.path, context), context))}">${escapeHtml(artifact.title)}</a><code>${escapeHtml(artifact.path)}</code></li>`).join("")}</ul>
</section>`;
}

function renderPrivacyWarning(view: DossierCoverView): string {
  if (!view.privacy_warning) return "";
  return `<section class="privacy-warning">
  <h2>Privacy Warning</h2>
  <p>${escapeHtml(view.privacy_warning)}</p>
</section>`;
}

function renderRelationGraphSection(graphSvg: string): string {
  if (!graphSvg) return "";
  return `<section class="relation-graph-section" id="relation-graph">
  <h2>Relation Graph</h2>
  ${graphSvg}
</section>`;
}

function renderArtifactMap(view: DossierCoverView, context: RenderContext, graphSvg: string): string {
  const visibleEdges = view.edges.filter((edge) => edge.confidence === "high" || edge.confidence === "medium");
  const showEdgeList = view.graph_disabled !== true && graphSvg === "";
  const edgeRows = visibleEdges.length > 0
    ? visibleEdges.map((edge) => renderEdgeRow(edge, view.artifacts, context)).join("\n")
    : `<p class="empty-state">No high or medium confidence edges found.</p>`;
  const graphMode = view.graph_disabled
    ? `<p class="map-mode">Graph disabled; showing list fallback.</p>`
    : "";

  return `<section class="artifact-map" id="artifact-map">
  <h2>Artifact Map</h2>
  ${graphMode}
  ${showEdgeList ? `<div class="edge-list">
    ${edgeRows}
  </div>` : ""}
  ${renderArtifactList(view.artifacts, context)}
</section>`;
}

function renderEdgeRow(edge: CoverEdge, artifacts: CoverArtifact[], context: RenderContext): string {
  const byPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  const from = byPath.get(edge.from);
  const to = byPath.get(edge.to);
  return `<article class="edge-row">
  <a href="${escapeAttribute(sourceHref(edge.from, context))}">${escapeHtml(from?.title ?? edge.from)}</a>
  <span class="edge-relation">${escapeHtml(edge.relation)}</span>
  <a href="${escapeAttribute(sourceHref(edge.to, context))}">${escapeHtml(to?.title ?? edge.to)}</a>
  <span class="confidence">${escapeHtml(edge.confidence)}</span>
  <p>${escapeHtml(edge.label)}</p>
</article>`;
}

function renderArtifactList(artifacts: CoverArtifact[], context: RenderContext): string {
  const byKind = new Map<string, CoverArtifact[]>();
  for (const kind of KIND_ORDER) byKind.set(kind, []);
  for (const artifact of artifacts) {
    const group = byKind.get(artifact.kind) ?? byKind.get("other");
    group?.push(artifact);
  }

  const groups = [...byKind.entries()]
    .filter(([, groupArtifacts]) => groupArtifacts.length > 0)
    .map(([kind, groupArtifacts]) => {
      const items = groupArtifacts
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((artifact) => {
          return `<li>
  <a href="${escapeAttribute(sourceHref(artifact.path, context))}">${escapeHtml(artifact.title)}</a>
  <span class="pill">${escapeHtml(artifact.status ?? "unknown")}</span>
  <code>${escapeHtml(artifact.path)}</code>
</li>`;
        })
        .join("\n");
      return `<section class="artifact-group">
  <h3>${escapeHtml(kind)} <span>${groupArtifacts.length}</span></h3>
  <ul>${items}</ul>
</section>`;
    })
    .join("\n");

  return `<section class="artifact-list">
  <h2>Artifacts</h2>
  ${groups}
</section>`;
}

function renderKeyDecisions(decisions: CoverDecision[], context: RenderContext): string {
  const items = decisions.length > 0
    ? decisions.map((decision) => `<li>
  <a href="${escapeAttribute(rebaseHref(decision.href, context))}">${escapeHtml(decision.title)}</a>
  <code>${escapeHtml(decision.source_artifact)}</code>
  ${decision.evidence ? `<p>${escapeHtml(decision.evidence)}</p>` : ""}
</li>`).join("\n")
    : `<li class="empty-state">No high-confidence decisions found.</li>`;

  return `<section class="key-decisions" id="key-decisions">
  <h2>Key Decisions</h2>
  <ol>${items}</ol>
</section>`;
}

function renderOpenQuestions(openQuestions: CoverOpenQuestion[], context: RenderContext): string {
  const items = openQuestions.length > 0
    ? openQuestions.map((question) => `<li>
  <a href="${escapeAttribute(rebaseHref(question.href, context))}">${escapeHtml(question.title)}</a>
  <code>${escapeHtml(question.source_artifact)}</code>
  ${question.blocks ? `<p><span class="label">Blocks</span> ${escapeHtml(question.blocks)}</p>` : ""}
</li>`).join("\n")
    : `<li class="empty-state">No open questions found.</li>`;

  return `<section class="open-questions" id="open-questions">
  <h2>Open Questions</h2>
  <ol>${items}</ol>
</section>`;
}

function renderReadingPaths(paths: ReadingPath[], context: RenderContext): string {
  const renderedPaths = paths.map((path) => `<article class="reading-path">
  <h3>${escapeHtml(path.role)}</h3>
  <ol>${path.steps.map((step) => renderReadingStep(step, context)).join("")}</ol>
</article>`).join("\n");

  return `<section class="reading-paths" id="reading-paths">
  <h2>Reading Paths</h2>
  <div class="reading-path-grid">${renderedPaths}</div>
</section>`;
}

function renderReadingStep(step: ArtifactRef, context: RenderContext): string {
  const href = rebaseHref(step.href ?? sourceHref(step.path, context), context);
  return `<li><a href="${escapeAttribute(href)}">${escapeHtml(step.title)}</a></li>`;
}

function renderEvidenceDrawer(view: DossierCoverView): string {
  const rows = view.evidence
    .map((item) => {
      return `<tr>
  <td>${escapeHtml(item.relation)}</td>
  <td>${escapeHtml(item.label)}</td>
  <td><span class="confidence">${escapeHtml(item.confidence)}</span></td>
  <td>${escapeHtml(item.extraction_rule)}</td>
  <td>${escapeHtml(item.evidence)}</td>
</tr>`;
    })
    .join("\n");

  return `<details class="evidence-drawer">
  <summary>Evidence (${view.evidence.length})</summary>
  <table>
    <thead>
      <tr><th>Relation</th><th>Label</th><th>Confidence</th><th>Rule</th><th>Evidence</th></tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5">No high-confidence edges found.</td></tr>`}
    </tbody>
  </table>
</details>`;
}

function renderSourceBundle(view: DossierCoverView): string {
  if (!view.source_bundle?.length) return "";
  const sources = view.source_bundle.map((source) => `<details>
  <summary>${escapeHtml(source.title)} <code>${escapeHtml(source.path)}</code></summary>
  <pre><code>${escapeHtml(source.content)}</code></pre>
</details>`).join("\n");

  return `<details class="source-bundle">
  <summary>Embedded Sources (${view.source_bundle.length})</summary>
  ${sources}
</details>`;
}

function renderRenderedDocumentBundle(view: DossierCoverView): string {
  if (!view.rendered_documents?.length) return "";
  const documents = view.rendered_documents.map((document) => `<details class="rendered-document">
  <summary>${escapeHtml(document.title)} <code>${escapeHtml(document.path)}</code></summary>
  <iframe title="${escapeAttribute(document.title)}" loading="lazy" srcdoc="${escapeAttribute(document.html)}"></iframe>
</details>`).join("\n");

  return `<details class="rendered-document-bundle">
  <summary>Rendered Documents (${view.rendered_documents.length})</summary>
  ${documents}
</details>`;
}

function renderProjectIndexHtml(input: {
  workspaceRoot: string;
  builtAt: string;
  artifacts: CoverArtifact[];
  covers: BuildDossierCoverResult["covers"];
  orphans: CoverArtifact[];
}): string {
  const workspaceName = basename(input.workspaceRoot);
  const dossierRows = input.covers
    .map((cover) => `<tr>
  <td><a href="${escapeAttribute(`${cover.dossierId}/index.html`)}">${escapeHtml(cover.view.dossier.title)}</a><code>${escapeHtml(cover.dossierId)}</code></td>
  <td>${cover.view.artifacts.length}</td>
  <td>${escapeHtml(cover.view.dossier.status)}</td>
  <td>${escapeHtml(cover.view.dossier.updated_at || "unknown")}</td>
</tr>`)
    .join("\n");
  const dossierTable = dossierRows
    ? `<table>
    <thead><tr><th>Dossier</th><th>Members</th><th>Status</th><th>Last updated</th></tr></thead>
    <tbody>${dossierRows}</tbody>
  </table>`
    : input.artifacts.length === 0
      ? `<div class="empty-docs-callout"><p class="empty-state">No documents found under docs/specs|changes|reviews. Create a spec and re-run.</p></div>`
      : `<p class="empty-state">No spec roots detected.</p>`;
  const orphans = input.orphans.length > 0
    ? `<section class="project-orphans">
  <h2>Orphans</h2>
  <ul>${input.orphans.map((artifact) => `<li><a href="${escapeAttribute(memberHref(artifact.path, input.workspaceRoot, "../../"))}">${escapeHtml(artifact.title)}</a><code>${escapeHtml(artifact.path)}</code></li>`).join("")}</ul>
</section>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(workspaceName)} Project Dossier Index</title>
  <style>${coverCss()}
.project-summary { margin-bottom: 22px; }
.project-dossiers, .project-orphans { margin-top: 22px; border: 1px solid #ddd6ca; border-radius: 8px; background: #fffdf8; padding: 18px; }
.project-dossiers table code { display: block; margin-top: 4px; }
.empty-docs-callout { border-left: 3px solid #d97706; background: #fff8eb; padding: 12px 14px; }
.empty-docs-callout p { margin: 0; }
  </style>
</head>
<body>
  <main class="cover">
    <section class="verdict-strip project-summary">
      <div>
        <p class="eyebrow">Project Dossier Index</p>
        <h1>${escapeHtml(workspaceName)}</h1>
        <p>Built ${escapeHtml(input.builtAt)}</p>
      </div>
      <dl>
        <div><dt>Artifacts</dt><dd>${input.artifacts.length}</dd></div>
        <div><dt>Dossiers</dt><dd>${input.covers.length}</dd></div>
        <div><dt>Orphans</dt><dd>${input.orphans.length}</dd></div>
        <div><dt>Workspace</dt><dd>${escapeHtml(workspaceName)}</dd></div>
      </dl>
    </section>
    <section class="project-dossiers">
      <h2>Dossiers</h2>
      ${dossierTable}
    </section>
    ${orphans}
  </main>
</body>
</html>`;
}

function coverCss(): string {
  return `
:root {
  color: #1d1d1f;
  background: #faf9f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
}
body { margin: 0; background: #faf9f6; }
.cover { max-width: 1120px; margin: 0 auto; padding: 32px 24px 48px; }
.verdict-strip {
  border: 1px solid #d8d3c7;
  border-radius: 8px;
  background: #fffdf8;
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: 20px;
}
.eyebrow { margin: 0 0 8px; color: #5d6b82; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: 34px; line-height: 1.12; margin-bottom: 10px; }
h2 { font-size: 20px; margin-bottom: 16px; }
h3 { font-size: 15px; margin-bottom: 10px; }
dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
dt { color: #6f6a60; font-size: 12px; }
dd { margin: 3px 0 0; font-weight: 700; }
.next-action { grid-column: 1 / -1; margin: 0; border-top: 1px solid #e5dfd3; padding-top: 14px; }
.cover-grid { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, .88fr); gap: 22px; margin-top: 22px; align-items: start; }
.artifact-map, .judgment-stack, .reading-paths, .evidence-drawer, .activity-inbox, .relation-graph-section, .rendered-document-bundle, .source-bundle { min-width: 0; }
.artifact-map, .key-decisions, .open-questions, .reading-paths, .evidence-drawer, .activity-inbox, .privacy-warning, .relation-graph-section, .rendered-document-bundle, .source-bundle {
  border: 1px solid #ddd6ca;
  border-radius: 8px;
  background: #fffdf8;
  padding: 18px;
}
.activity-inbox, .privacy-warning { margin-top: 22px; }
.relation-graph-section { margin-top: 22px; }
.relation-graph-section .relation-graph { width: 100%; height: auto; max-width: 100%; display: block; }
.activity-group + .activity-group { margin-top: 14px; }
.privacy-warning { border-color: #d97706; background: #fff8eb; }
.judgment-stack { display: grid; gap: 18px; }
.edge-list { display: grid; gap: 10px; margin-bottom: 18px; }
.edge-row { border-left: 3px solid #1e3a8a; background: #f7f3eb; padding: 10px 12px; display: grid; gap: 6px; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto; align-items: center; }
.edge-row p { grid-column: 1 / -1; margin: 0; color: #5f5b52; font-size: 13px; }
.edge-relation { color: #6f6a60; font-size: 12px; text-transform: uppercase; }
.artifact-group { border-top: 1px solid #ddd6ca; padding-top: 14px; margin-top: 14px; }
.artifact-group h3 span { color: #777; font-weight: 400; }
.map-mode { color: #6f6a60; font-size: 13px; border-left: 3px solid #cfc7b8; padding-left: 10px; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
li { display: grid; gap: 5px; border: 1px solid #e4ded3; border-radius: 8px; padding: 12px; background: #fffdf8; }
ol { padding-left: 22px; margin: 0; display: grid; gap: 10px; }
ol li { display: list-item; padding: 10px 12px; }
a { color: #1e3a8a; font-weight: 700; text-decoration: none; overflow-wrap: anywhere; }
code { color: #5f5b52; font-size: 12px; overflow-wrap: anywhere; }
.pill, .confidence, .label { display: inline-flex; width: fit-content; border: 1px solid #cfc7b8; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #39352f; background: #f5f0e7; }
.reading-paths { margin-top: 22px; }
.reading-path-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.reading-path h3 { min-height: 34px; }
.evidence-drawer, .rendered-document-bundle, .source-bundle { margin-top: 22px; }
.evidence-drawer summary, .rendered-document-bundle summary, .source-bundle summary { cursor: pointer; font-weight: 700; }
.rendered-document { margin-top: 12px; border-top: 1px solid #e7e0d4; padding-top: 10px; }
.rendered-document iframe { width: 100%; min-height: 520px; border: 1px solid #ddd6ca; border-radius: 6px; background: #fff; }
.evidence-drawer table { margin-top: 14px; }
.source-bundle details { margin-top: 12px; border-top: 1px solid #e7e0d4; padding-top: 10px; }
.source-bundle pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f2eb; padding: 12px; border: 1px solid #e3dccf; border-radius: 6px; }
.empty-state { color: #6f6a60; font-style: italic; }
table { width: 100%; border-collapse: collapse; background: #fffdf8; border: 1px solid #ddd6ca; }
th, td { text-align: left; vertical-align: top; border-bottom: 1px solid #e7e0d4; padding: 10px; font-size: 13px; overflow-wrap: anywhere; }
th { color: #4c566a; background: #f3efe7; font-size: 12px; }
@media (max-width: 760px) {
  .cover { padding: 18px 14px 32px; }
  .verdict-strip, .cover-grid, .reading-path-grid, .edge-row { grid-template-columns: 1fr; }
  h1 { font-size: 28px; }
  dl { grid-template-columns: 1fr; }
}
`;
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function sourceHref(path: string, context?: RenderContext): string {
  return memberHref(path, context?.workspaceRoot, context?.hrefPrefix ?? "../../");
}

function rebaseHref(href: string, context: RenderContext): string {
  if (!href.startsWith("../../")) return href;
  const rebased = href.slice("../../".length);
  const hashIndex = rebased.indexOf("#");
  const path = hashIndex >= 0 ? rebased.slice(0, hashIndex) : rebased;
  const anchor = hashIndex >= 0 ? rebased.slice(hashIndex) : "";
  return `${memberHref(path, context.workspaceRoot, context.hrefPrefix)}${anchor}`;
}

function assertFilesystemSafeDossierId(dossierId: string): void {
  if (!dossierId || dossierId === "." || dossierId === ".." || /[/\\\0]/.test(dossierId)) {
    throw new Error(`unsafe dossier id: ${dossierId}`);
  }
}

function hasAnyDocsScanDir(workspaceRoot: string): boolean {
  return [
    "docs/specs",
    "docs/changes",
    "docs/reviews",
  ].some((scanDir) => existsSync(join(workspaceRoot, scanDir)));
}

function privacyWarning(workspaceRoot: string): string | undefined {
  const hasIgnore = existsSync(join(workspaceRoot, ".dossierignore"));
  const hasRootRedaction = existsSync(join(workspaceRoot, "redact-patterns.json"));
  const hasDossierRedaction = existsSync(join(workspaceRoot, ".dossier/redact-patterns.json"));
  if (hasIgnore || hasRootRedaction || hasDossierRedaction) return undefined;
  return "No .dossierignore or redaction rules were found. Review this single-file output before sharing it outside your local workspace.";
}
