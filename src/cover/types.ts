export type CoverStatus = "draft" | "ready" | "implemented" | "archived";
export type CoverKind =
  | "vision-spec"
  | "mvp-spec"
  | "adr"
  | "change"
  | "review"
  | "note"
  | "design"
  | "other";

export type CoverConfidence = "high" | "medium" | "low";

export type CoverArtifact = {
  id: string;
  path: string;
  title: string;
  kind: CoverKind;
  status?: CoverStatus;
  summary?: string;
  rendered_html_path?: string;
  frontmatter: Record<string, unknown>;
  raw_content: string;
  content: string;
  updated_at?: string;
  implements: string[];
  reviews: string[];
  reviews_target: string[];
};

export type BuildManifestArtifact = {
  path: string;
  title: string;
  kind: CoverKind;
  status?: CoverStatus;
  updated_at?: string;
  content_hash: string;
  open_question_hashes?: string[];
};

export type BuildManifest = {
  version: 1;
  built_at: string;
  workspace_root: string;
  artifacts: BuildManifestArtifact[];
};

export type CoverEdge = {
  from: string;
  to: string;
  relation: "implements" | "reviews" | "follows" | "supersedes" | "references" | "answers";
  source: "frontmatter" | "filename" | "inline" | "session" | "inferred";
  confidence: CoverConfidence;
  label: string;
  evidence?: string;
};

export type CoverEvidence = {
  from: string;
  to: string;
  relation: CoverEdge["relation"];
  label: string;
  confidence: CoverConfidence;
  extraction_rule: CoverEdge["source"];
  evidence: string;
};

export type ArtifactRef = {
  id: string;
  path: string;
  title: string;
  href?: string;
};

export type OpenQuestionRef = ArtifactRef;

export type CoverDecision = {
  title: string;
  source_artifact: string;
  href: string;
  evidence?: string;
};

export type CoverOpenQuestion = {
  title: string;
  source_artifact: string;
  href: string;
  owner?: string;
  blocks?: string;
};

export type ReadingPath = {
  role: string;
  steps: ArtifactRef[];
};

export type DossierCoverView = {
  dossier: {
    id: string;
    title: string;
    status: CoverStatus | "mixed";
    description: string;
    updated_at: string;
    confidence: CoverConfidence;
    next_action?: string;
  };
  activity: {
    new_artifacts: ArtifactRef[];
    changed_artifacts: ArtifactRef[];
    open_items: OpenQuestionRef[];
  };
  artifacts: CoverArtifact[];
  edges: CoverEdge[];
  decisions: CoverDecision[];
  open_questions: CoverOpenQuestion[];
  reading_paths: ReadingPath[];
  evidence: CoverEvidence[];
  graph_disabled?: boolean;
  privacy_warning?: string;
  source_bundle?: Array<{
    path: string;
    title: string;
    content: string;
  }>;
  rendered_documents?: Array<{
    path: string;
    title: string;
    html: string;
  }>;
};
