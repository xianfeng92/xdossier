import { basename } from "node:path";
import type { CoverArtifact, CoverEdge, CoverOpenQuestion } from "../cover/types.js";
import { extractDecisions, extractOpenQuestions } from "../cover/extract.js";
import type { ReviewPacket } from "./types.js";

export type CreateReviewPacketInput = {
  workspaceRoot: string;
  targetPath?: string;
  artifacts: CoverArtifact[];
  edges: CoverEdge[];
  today?: string;
};

export function createReviewPacket(input: CreateReviewPacketInput): ReviewPacket {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const target = input.targetPath
    ? input.artifacts.find((artifact) => artifact.path === input.targetPath)
    : undefined;
  const targetPath = target?.path ?? input.targetPath ?? ".";
  const targetTitle = target?.title ?? basename(input.workspaceRoot);
  const suggestedReviewPath = defaultSuggestedReviewPath(targetPath, today);
  const relatedArtifacts = relatedArtifactsForTarget(targetPath, input.artifacts, input.edges);
  const decisions = extractDecisions(target ? [target] : input.artifacts).slice(0, 5);
  const openQuestions = extractTargetOpenQuestions(targetPath, input.artifacts).slice(0, 5);

  return {
    suggestedReviewPath,
    markdown: `# Dossier Review Packet

Target: \`${targetPath}\`
Title: ${targetTitle}
Kind: ${target?.kind ?? "workspace"}
Status: ${target?.status ?? "unknown"}
Updated: ${target?.updated_at ?? "unknown"}
Suggested review doc: \`${suggestedReviewPath}\`

## Reviewer Task

Review the target in the context of this dossier. Prioritize bugs, trust boundary issues, stale or missing evidence, findability gaps, and verification holes. Do not rewrite the implementation unless explicitly asked; produce a review document at the suggested path.

## Related Artifacts

${renderRelatedArtifacts(relatedArtifacts)}

## Known Decisions

${decisions.length ? decisions.map((decision) => `- ${decision.title} (${decision.source_artifact})`).join("\n") : "- No decisions extracted yet."}

## Open Questions

${renderOpenQuestions(openQuestions)}

## Checklist

- Correctness and behavioral regressions
- Trust boundaries, unsafe input, and URL handling
- Findability, anchors, search, and folded content
- Accessibility and local-only output
- Portability across real downstream repositories
- Verification commands and evidence quality

## Expected Review Output

\`\`\`yaml
kind: review
status: needs-rework | approved | fixed | deferred
reviews_target:
  - ${targetPath}
verdict: NEEDS_REWORK | APPROVED | APPROVED_WITH_FOLLOWUPS
\`\`\`

\`\`\`markdown
## Findings

- [P1] Concise finding title
  - File: path/to/file.ts
  - Evidence: what proves this is real
  - Status: open

## Verification

- command and observed result
\`\`\`
`,
  };
}

export function defaultReviewPacketPath(targetPath: string, today = new Date().toISOString().slice(0, 10)): string {
  return `.dossier/review-packets/${today}-${targetSlug(targetPath)}-review-packet.md`;
}

export function defaultSuggestedReviewPath(targetPath: string, today = new Date().toISOString().slice(0, 10)): string {
  return `docs/reviews/${today}-${targetSlug(targetPath)}-review.md`;
}

function targetSlug(targetPath: string): string {
  const base = basename(targetPath, ".md")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "workspace";
}

function relatedArtifactsForTarget(
  targetPath: string,
  artifacts: CoverArtifact[],
  edges: CoverEdge[],
): CoverArtifact[] {
  const relatedPaths = new Set<string>([targetPath]);
  for (const edge of edges) {
    if (edge.from === targetPath) relatedPaths.add(edge.to);
    if (edge.to === targetPath) relatedPaths.add(edge.from);
  }
  return artifacts
    .filter((artifact) => relatedPaths.has(artifact.path))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function renderRelatedArtifacts(artifacts: CoverArtifact[]): string {
  if (artifacts.length === 0) return "- No related artifacts found.";
  return artifacts
    .map((artifact) => `- ${artifact.title} (${artifact.kind}, ${artifact.status ?? "unknown"}) — \`${artifact.path}\``)
    .join("\n");
}

function extractTargetOpenQuestions(targetPath: string, artifacts: CoverArtifact[]): CoverOpenQuestion[] {
  return extractOpenQuestions(artifacts).filter((question) => question.source_artifact === targetPath);
}

function renderOpenQuestions(openQuestions: CoverOpenQuestion[]): string {
  if (openQuestions.length === 0) return "- No open questions extracted yet.";
  return openQuestions.map((question) => `- ${question.title}`).join("\n");
}
