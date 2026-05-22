import { basename } from "node:path";
import { escapeHtml } from "../parse/markdown.js";
import { memberHref } from "./href.js";
import type { CoverArtifact, CoverEdge, DossierCoverView } from "./types.js";
import type { RenderContext } from "./render.js";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 24;
const VERTICAL_GAP = 80;
const CELL_WIDTH = NODE_WIDTH + HORIZONTAL_GAP;
const LAYER_HEIGHT = NODE_HEIGHT + VERTICAL_GAP;
const PADDING = 16;

const ROOT_KINDS = new Set(["vision-spec", "mvp-spec", "design", "spec"]);
const REVIEW_RELATIONS = new Set(["reviews", "reviews_target", "answers"]);
const META_RELATIONS = new Set(["follows", "supersedes"]);

const KIND_LABEL: Record<string, string> = {
  "vision-spec": "SPEC",
  "mvp-spec": "SPEC",
  design: "DESIGN",
  spec: "SPEC",
  change: "CHANGE",
  review: "REVIEW",
};

type LayerName = "root" | "change" | "review";

type PositionedArtifact = {
  artifact: CoverArtifact;
  id: string;
  href: string;
  layer: LayerName;
  x: number;
  y: number;
};

export function renderRelationGraph(view: DossierCoverView, context: RenderContext): string {
  const members = view.artifacts;
  if (view.graph_disabled === true || members.length === 0 || members.length > 12) return "";

  const layers = layerArtifacts(members);
  const cols = Math.max(layers.root.length, layers.change.length, layers.review.length);
  if (cols > 6) return "";

  const width = cols * CELL_WIDTH + PADDING * 2;
  const height = 3 * LAYER_HEIGHT - VERTICAL_GAP + PADDING * 2;
  const positioned = positionLayers(layers, cols, context);
  const byPath = new Map(positioned.map((node) => [node.artifact.path, node]));
  const edges = view.edges.filter((edge) => byPath.has(edge.from) && byPath.has(edge.to));

  return `<svg class="relation-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Artifact relation graph" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <style>
.relation-graph { --rg-node-fill: #fdfaf5; --rg-node-stroke: rgba(31, 29, 24, 0.18); --rg-node-hover: rgba(184, 92, 61, 0.6); --rg-edge: rgba(31, 29, 24, 0.32); --rg-edge-meta: rgba(31, 29, 24, 0.2); font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
.rg-edge { fill: none; stroke: var(--rg-edge); stroke-width: 1.5; }
.rg-edge--meta { stroke: var(--rg-edge-meta); }
.rg-node rect { fill: var(--rg-node-fill); stroke: var(--rg-node-stroke); stroke-width: 1; }
.rg-node:hover rect { stroke: var(--rg-node-hover); stroke-width: 2; }
.rg-node-kind { fill: #8a6b36; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.rg-node-title { fill: #1f1d18; font-size: 13px; font-weight: 700; }
  </style>
  <defs>
    <marker id="rg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <polygon points="0,0 10,5 0,10" fill="rgba(31, 29, 24, 0.32)" />
    </marker>
  </defs>
  <g class="rg-edges">
${edges.map((edge) => renderEdge(edge, byPath)).join("\n")}
  </g>
  <g class="rg-nodes">
${positioned.map(renderNode).join("\n")}
  </g>
</svg>`;
}

function layerArtifacts(artifacts: CoverArtifact[]): Record<LayerName, CoverArtifact[]> {
  const layers: Record<LayerName, CoverArtifact[]> = {
    root: [],
    change: [],
    review: [],
  };

  for (const artifact of artifacts) {
    if (isRootArtifact(artifact)) {
      layers.root.push(artifact);
    } else if (artifact.kind === "review") {
      layers.review.push(artifact);
    } else {
      layers.change.push(artifact);
    }
  }

  return layers;
}

function isRootArtifact(artifact: CoverArtifact): boolean {
  if (ROOT_KINDS.has(artifact.kind)) return true;
  return basename(artifact.path).replace(/\.md$/i, "").endsWith("-spec");
}

function positionLayers(
  layers: Record<LayerName, CoverArtifact[]>,
  cols: number,
  context: RenderContext,
): PositionedArtifact[] {
  return (["root", "change", "review"] as const).flatMap((layer, layerIndex) => {
    const row = layers[layer];
    const rowOffset = ((cols - row.length) * CELL_WIDTH) / 2;
    return row.map((artifact, index) => ({
      artifact,
      id: pathId(artifact.path),
      href: memberHref(artifact.path, context.workspaceRoot, context.hrefPrefix),
      layer,
      x: PADDING + rowOffset + index * CELL_WIDTH,
      y: PADDING + layerIndex * LAYER_HEIGHT,
    }));
  });
}

function renderNode(node: PositionedArtifact): string {
  const kind = node.artifact.kind;
  return `    <a href="${escapeAttribute(node.href)}" xlink:href="${escapeAttribute(node.href)}" data-kind="${escapeAttribute(kind)}" data-id="${escapeAttribute(node.id)}">
      <g class="rg-node rg-node--${node.layer}" transform="translate(${node.x} ${node.y})">
        <rect width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="8" />
        <text x="12" y="22" class="rg-node-kind">${escapeHtml(kindLabel(kind))}</text>
        <text x="12" y="44" class="rg-node-title">${escapeHtml(truncate(node.artifact.title, 24))}</text>
      </g>
    </a>`;
}

function renderEdge(edge: CoverEdge, byPath: Map<string, PositionedArtifact>): string {
  const from = byPath.get(edge.from);
  const to = byPath.get(edge.to);
  if (!from || !to) return "";

  const fromX = from.x + NODE_WIDTH / 2;
  const fromY = from.y + NODE_HEIGHT;
  const toX = to.x + NODE_WIDTH / 2;
  const toY = to.y;
  const midY = (fromY + toY) / 2;
  const d = `M ${fromX} ${fromY} V ${midY} H ${toX} V ${toY}`;
  const relation = edge.relation as string;
  const dashed = REVIEW_RELATIONS.has(relation) ? ` stroke-dasharray="6 4"` : "";

  return `    <path d="${d}" class="${edgeClass(relation)}" data-from="${escapeAttribute(from.id)}" data-to="${escapeAttribute(to.id)}" marker-end="url(#rg-arrow)"${dashed} />`;
}

function edgeClass(relation: string): string {
  if (REVIEW_RELATIONS.has(relation)) return "rg-edge rg-edge--reviews";
  if (META_RELATIONS.has(relation)) return "rg-edge rg-edge--meta";
  return "rg-edge rg-edge--implements";
}

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind.toUpperCase();
}

function pathId(path: string): string {
  return path.replace(/\.md$/i, "").replaceAll("/", "_");
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
