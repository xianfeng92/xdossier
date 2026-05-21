import { basename } from "node:path";
import type {
  ArtifactRef,
  BuildManifest,
  CoverArtifact,
  CoverEdge,
  CoverEvidence,
  CoverOpenQuestion,
  CoverStatus,
  DossierCoverView,
} from "./types.js";
import { extractDecisions, extractOpenQuestions, generateReadingPaths } from "./extract.js";
import { contentHash, openQuestionHash } from "./manifest.js";

type BuildCoverViewInput = {
  workspaceRoot: string;
  artifacts: CoverArtifact[];
  edges: CoverEdge[];
  baselineManifest?: BuildManifest;
  privacyWarning?: string;
  includeSourceBundle?: boolean;
  renderedDocuments?: DossierCoverView["rendered_documents"];
  graphDisabled?: boolean;
};

export function buildCoverView(input: BuildCoverViewInput): DossierCoverView {
  const artifacts = [...input.artifacts].sort((a, b) => a.path.localeCompare(b.path));
  const edges = [...input.edges].sort((a, b) => {
    const relationCompare = a.relation.localeCompare(b.relation);
    if (relationCompare !== 0) return relationCompare;
    return `${a.from}\u0000${a.to}`.localeCompare(`${b.from}\u0000${b.to}`);
  });
  const decisions = extractDecisions(artifacts);
  const openQuestions = extractOpenQuestions(artifacts);
  const readingPaths = generateReadingPaths(artifacts, decisions, openQuestions);
  const activity = input.baselineManifest
    ? buildActivity(artifacts, input.baselineManifest, openQuestions)
    : emptyActivity();

  return {
    dossier: {
      id: "dossier-cover",
      title: "Dossier cover",
      status: combinedStatus(artifacts),
      description: `${artifacts.length} artifacts scanned from ${basename(input.workspaceRoot)} docs/specs, docs/changes, and docs/reviews.`,
      updated_at: latestDate(artifacts),
      confidence: edges.some((edge) => edge.confidence === "high") ? "high" : "low",
      next_action: "Read the high-confidence relationships, then open the source artifacts that carry the next implementation decision.",
    },
    activity,
    artifacts,
    edges,
    decisions,
    open_questions: openQuestions,
    reading_paths: readingPaths,
    evidence: edges.map(edgeToEvidence),
    graph_disabled: input.graphDisabled,
    privacy_warning: input.privacyWarning,
    source_bundle: input.includeSourceBundle
      ? artifacts.map((artifact) => ({
          path: artifact.path,
          title: artifact.title,
          content: artifact.raw_content,
        }))
      : undefined,
    rendered_documents: input.renderedDocuments,
  };
}

function emptyActivity(): DossierCoverView["activity"] {
  return {
    new_artifacts: [],
    changed_artifacts: [],
    open_items: [],
  };
}

function buildActivity(
  artifacts: CoverArtifact[],
  baselineManifest: BuildManifest,
  openQuestions: CoverOpenQuestion[],
): DossierCoverView["activity"] {
  const baseline = new Map(
    baselineManifest.artifacts.map((artifact) => [artifact.path, artifact]),
  );
  const newArtifacts: ArtifactRef[] = [];
  const changedArtifacts: ArtifactRef[] = [];
  const openItems: ArtifactRef[] = [];
  const baselineOpenQuestions = new Set(
    baselineManifest.artifacts.flatMap((artifact) => artifact.open_question_hashes ?? []),
  );

  for (const artifact of artifacts) {
    const previous = baseline.get(artifact.path);
    if (!previous) {
      newArtifacts.push(artifactRef(artifact));
    } else if (previous.content_hash !== contentHash(artifact.raw_content)) {
      changedArtifacts.push(artifactRef(artifact));
    }
  }

  for (const question of openQuestions) {
    if (baselineOpenQuestions.has(openQuestionHash(question))) continue;
    openItems.push({
      id: question.href,
      path: question.source_artifact,
      title: question.title,
      href: question.href,
    });
  }

  return {
    new_artifacts: newArtifacts,
    changed_artifacts: changedArtifacts,
    open_items: openItems,
  };
}

function combinedStatus(artifacts: CoverArtifact[]): CoverStatus | "mixed" {
  const statuses = new Set(artifacts.map((artifact) => artifact.status).filter(Boolean));
  if (statuses.size === 1) return [...statuses][0] as CoverStatus;
  if (statuses.size === 0) return "draft";
  return "mixed";
}

function latestDate(artifacts: CoverArtifact[]): string {
  const dates = artifacts
    .map((artifact) => artifact.updated_at)
    .filter((date): date is string => Boolean(date))
    .sort();
  return dates.at(-1) ?? "";
}

function edgeToEvidence(edge: CoverEdge): CoverEvidence {
  return {
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
    label: edge.label,
    confidence: edge.confidence,
    extraction_rule: edge.source,
    evidence: edge.evidence ?? "",
  };
}

function artifactRef(artifact: CoverArtifact): ArtifactRef {
  return {
    id: artifact.id,
    path: artifact.path,
    title: artifact.title,
    href: `../../${artifact.path}`,
  };
}
