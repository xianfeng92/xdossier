// Internal types for the dossier renderer.
// See docs/specs/2026-05-18-dossier-mvp-0-spec.md §6.5 for the skill dispatch model.

export type SkillId = string;

export type SkillMetaAppliesTo = {
  /** Match against frontmatter `kind:` field. */
  frontmatter_kind?: string[];
  /** Glob patterns matched against filepath basename. MVP-1. */
  filename_patterns?: string[];
  /** Glob patterns matched against the file's directory path. MVP-1. */
  directory_patterns?: string[];
  /** Higher = preferred when multiple skills match. */
  priority?: number;
};

export type SkillMeta = {
  id: SkillId;
  /** Human-facing label (from SKILL.md `name:` or `id`). */
  name: string;
  description?: string;
  applies_to: SkillMetaAppliesTo;
  /** Absolute path to the skill directory; populated by loader. */
  dir: string;
};

export type SkillSelectionInput = {
  frontmatter: Record<string, unknown>;
  /** Absolute path to the input markdown file. */
  filepath: string;
  /** Value of CLI `--skill <name>` if supplied. */
  cliOverride?: SkillId;
};

export type SkillSelectionReason =
  | "cli-flag"
  | "frontmatter-render-skill"
  | "frontmatter-kind"
  | "filename-pattern"
  | "directory-pattern"
  | "fallback";

export type SkillSelection = {
  skillId: SkillId;
  reason: SkillSelectionReason;
  /** Set when multiple skills matched the same layer; useful for `--verbose` debug. */
  matched_skills?: SkillId[];
};

export type RenderInput = {
  markdown: string;
  skillId: SkillId;
  withToc: boolean;
  annotations?: RenderAnnotations;
  reader?: ReaderProfile;
  contentModeOverride?: ContentMode;
};

export type ParsedFrontmatter = {
  data: Record<string, unknown>;
  content: string;
};

export type SectionSummaryAnnotation = {
  section_id: string;
  summary: string;
  key_points?: string[];
  reader_hint?: string;
};

export type DocumentOverviewAnnotation = {
  summary: string;
  reader_goal?: string;
  status_note?: string;
  next_step?: string;
};

export type ReadingPathAnnotation = {
  label: string;
  section_id: string;
  description: string;
};

export type RoadmapItemAnnotation = {
  label: string;
  title: string;
  summary: string;
  outputs?: string[];
  section_id?: string;
};

export type RoadmapBlockAnnotation = {
  type: "roadmap";
  title: string;
  source_section_id?: string;
  summary?: string;
  items: RoadmapItemAnnotation[];
};

export type RequirementItemAnnotation = {
  label: string;
  detail?: string;
  requirements: string[];
  section_id?: string;
};

export type RequirementGridBlockAnnotation = {
  type: "requirement_grid";
  title: string;
  source_section_id?: string;
  items: RequirementItemAnnotation[];
};

export type ReferenceItemAnnotation = {
  label: string;
  href: string;
  description?: string;
};

export type ReferenceListBlockAnnotation = {
  type: "reference_list";
  title: string;
  source_section_id?: string;
  items: ReferenceItemAnnotation[];
};

export type TakeawayItemAnnotation = {
  label: string;
  detail?: string;
  section_id?: string;
};

export type TakeawayGridBlockAnnotation = {
  type: "takeaway_grid";
  title: string;
  source_section_id?: string;
  items: TakeawayItemAnnotation[];
};

export type PrincipleItemAnnotation = {
  label: string;
  guidance: string;
  section_id?: string;
};

export type PrincipleGridBlockAnnotation = {
  type: "principle_grid";
  title: string;
  source_section_id?: string;
  items: PrincipleItemAnnotation[];
};

export type DecisionItemAnnotation = {
  label: string;
  value: string;
  rationale: string;
  section_id?: string;
};

export type DecisionGridBlockAnnotation = {
  type: "decision_grid";
  title: string;
  source_section_id?: string;
  items: DecisionItemAnnotation[];
};

export type EvidenceItemAnnotation = {
  label: string;
  evidence: string;
  source?: string;
  section_id?: string;
};

export type EvidenceGridBlockAnnotation = {
  type: "evidence_grid";
  title: string;
  source_section_id?: string;
  items: EvidenceItemAnnotation[];
};

export type RiskItemAnnotation = {
  label: string;
  trigger?: string;
  impact?: string;
  mitigation: string;
  section_id?: string;
};

export type RiskRegisterBlockAnnotation = {
  type: "risk_register";
  title: string;
  source_section_id?: string;
  items: RiskItemAnnotation[];
};

export type ScopeBoundaryBlockAnnotation = {
  type: "scope_boundary";
  title: string;
  source_section_id?: string;
  in_scope: string[];
  out_of_scope: string[];
};

export type ChecklistItemStatus = "required" | "open" | "done";

export type ChecklistItemAnnotation = {
  label: string;
  detail?: string;
  status?: ChecklistItemStatus;
  section_id?: string;
};

export type ChecklistBlockAnnotation = {
  type: "checklist";
  title: string;
  source_section_id?: string;
  items: ChecklistItemAnnotation[];
};

export type OpenQuestionStatus = "open" | "blocked" | "answered";

export type OpenQuestionItemAnnotation = {
  question: string;
  context?: string;
  impact?: string;
  status?: OpenQuestionStatus;
  section_id?: string;
};

export type OpenQuestionsBlockAnnotation = {
  type: "open_questions";
  title: string;
  source_section_id?: string;
  items: OpenQuestionItemAnnotation[];
};

export type ConceptGlossaryItemAnnotation = {
  term: string;
  plain_language: string;
  example?: string;
  model_field?: string;
  section_id?: string;
};

export type ConceptGlossaryBlockAnnotation = {
  type: "concept_glossary";
  title: string;
  source_section_id?: string;
  items: ConceptGlossaryItemAnnotation[];
};

export type ContentMode = "tutorial" | "concept" | "reference" | "course";

export type ReaderProfile = "beginner" | "intermediate" | "expert";

export type PrerequisiteItemAnnotation = {
  term: string;
  plain_language: string;
  why_needed?: string;
  fallback_link?: string;
};

export type CheckpointAnnotation = {
  section_id: string;
  items: string[];
};

export type AnalogyAnnotation = {
  section_id: string;
  concept: string;
  analogy: string;
};

export type RelationshipMapItemAnnotation = {
  from: string;
  relation: string;
  to: string;
  evidence?: string;
  section_id?: string;
};

export type RelationshipMapBlockAnnotation = {
  type: "relationship_map";
  title: string;
  source_section_id?: string;
  summary?: string;
  items: RelationshipMapItemAnnotation[];
};

export type StructureMapNodeKind =
  | "context"
  | "path"
  | "decision"
  | "risk"
  | "evidence"
  | "output"
  | "question"
  | "action";

export type StructureMapNodeAnnotation = {
  id: string;
  label: string;
  kind: StructureMapNodeKind;
  summary: string;
  section_id?: string;
};

export type StructureMapEdgeAnnotation = {
  from: string;
  to: string;
  label: string;
};

export type StructureMapBlockAnnotation = {
  type: "structure_map";
  title: string;
  source_section_id?: string;
  summary?: string;
  nodes: StructureMapNodeAnnotation[];
  edges?: StructureMapEdgeAnnotation[];
};

export type SemanticBlockAnnotation =
  | StructureMapBlockAnnotation
  | RelationshipMapBlockAnnotation
  | RoadmapBlockAnnotation
  | RequirementGridBlockAnnotation
  | ReferenceListBlockAnnotation
  | TakeawayGridBlockAnnotation
  | PrincipleGridBlockAnnotation
  | DecisionGridBlockAnnotation
  | EvidenceGridBlockAnnotation
  | RiskRegisterBlockAnnotation
  | ScopeBoundaryBlockAnnotation
  | ChecklistBlockAnnotation
  | OpenQuestionsBlockAnnotation
  | ConceptGlossaryBlockAnnotation;

export type RenderAnnotations = {
  schema_version: 1 | 2;
  source?: string;
  document_overview?: DocumentOverviewAnnotation;
  reading_path?: ReadingPathAnnotation[];
  semantic_blocks?: SemanticBlockAnnotation[];
  section_summaries: SectionSummaryAnnotation[];
  content_mode?: ContentMode;
  prerequisites?: PrerequisiteItemAnnotation[];
  checkpoints?: CheckpointAnnotation[];
  analogies?: AnalogyAnnotation[];
};

export type TocEntry = {
  level: 2 | 3;
  id: string;
  text: string;
  number?: string;
  children?: TocEntry[];
};
