import type {
  ChecklistItemAnnotation,
  ConceptGlossaryItemAnnotation,
  DecisionItemAnnotation,
  EvidenceItemAnnotation,
  OpenQuestionItemAnnotation,
  PrincipleItemAnnotation,
  RelationshipMapItemAnnotation,
  ReferenceItemAnnotation,
  RenderAnnotations,
  RequirementItemAnnotation,
  RiskItemAnnotation,
  RoadmapItemAnnotation,
  SectionSummaryAnnotation,
  StructureMapNodeKind,
  TakeawayItemAnnotation,
} from "../types.js";
import { parseFrontmatter } from "../parse/frontmatter.js";
import { parseMarkdownToTokens, type MarkdownToken } from "../parse/markdown.js";
import { applySemantic, type DossierToken } from "../parse/semantic.js";
import { classifyContentMode } from "./content-mode.js";

type SectionBlock = {
  kind: "paragraph" | "list" | "table" | "subheading" | "other";
  text: string;
  points?: string[];
  id?: string;
  displayNum?: string;
  depth?: number;
  tableHeaders?: string[];
  tableRows?: string[][];
  links?: ReferenceItemAnnotation[];
};

type SectionBrief = {
  summary: string;
  keyPoints: string[];
};

const SUMMARY_MAX_CHARS = 120;
const KEY_POINT_MAX_CHARS = 96;

type ScaffoldSection = {
  id: string;
  title: string;
  displayNum?: string;
  summary: string;
  keyPoints: string[];
  scopeBoundary?: {
    in_scope: string[];
    out_of_scope: string[];
  };
  roadmap?: {
    summary?: string;
    items: RoadmapItemAnnotation[];
  };
  requirementGrid?: {
    items: RequirementItemAnnotation[];
  };
  referenceList?: {
    items: ReferenceItemAnnotation[];
  };
  takeawayGrid?: {
    title?: string;
    items: TakeawayItemAnnotation[];
  };
  principleGrid?: {
    items: PrincipleItemAnnotation[];
  };
  decisionGrid?: {
    items: DecisionItemAnnotation[];
  };
  evidenceGrid?: {
    items: EvidenceItemAnnotation[];
  };
  riskRegister?: {
    items: RiskItemAnnotation[];
  };
  checklist?: {
    items: ChecklistItemAnnotation[];
  };
  openQuestions?: {
    items: OpenQuestionItemAnnotation[];
  };
  conceptGlossary?: {
    title?: string;
    items: ConceptGlossaryItemAnnotation[];
  };
  relationshipMap?: {
    summary?: string;
    items: RelationshipMapItemAnnotation[];
  };
};

export function createSectionSummaryScaffold(markdown: string, legacySourceLabel?: string): RenderAnnotations {
  const frontmatter = parseFrontmatter(markdown);
  const tokens = applySemantic(parseMarkdownToTokens(frontmatter.content)) as DossierToken[];
  const contentMode = classifyContentMode(tokens, frontmatter.data).mode;

  const sections: ScaffoldSection[] = [];
  let h1Title = "";
  let current: { id: string; title: string; displayNum?: string; blocks: SectionBlock[] } | null = null;

  const flush = () => {
    if (!current) return;
    const brief = summarizeBlocks(current.title, current.blocks);
    if (brief) {
      const evidenceGrid = evidenceGridForSection(current.id, current.title, current.blocks);
      const requirementGrid = requirementGridForSection(current.id, current.title, current.blocks);
      sections.push({
        id: current.id,
        title: current.title,
        displayNum: current.displayNum,
        summary: brief.summary,
        keyPoints: brief.keyPoints,
        scopeBoundary: scopeBoundaryForSection(current.title, current.blocks),
        roadmap: roadmapForSection(current.id, current.title, current.blocks),
        requirementGrid,
        referenceList: referenceListForSection(current.title, current.blocks),
        takeawayGrid: takeawayGridForSection(current.id, current.title, current.blocks),
        principleGrid: principleGridForSection(current.id, current.title, current.blocks),
        decisionGrid: decisionGridForSection(current.id, current.title, current.blocks),
        evidenceGrid,
        riskRegister: riskRegisterForSection(current.id, current.title, current.blocks),
        checklist: checklistForSection(current.id, current.title, current.blocks, {
          excludeTableItems: Boolean(evidenceGrid),
          excludeRequirementItems: Boolean(requirementGrid),
        }),
        openQuestions: openQuestionsForSection(current.id, current.title, current.blocks),
        conceptGlossary: conceptGlossaryForSection(current.id, current.title, current.blocks),
        relationshipMap: relationshipMapForSection(current.id, current.title, current.blocks),
      });
    }
  };

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      flush();
      current = {
        id: token._dossierId ?? `s${sections.length + 1}`,
        title: token._dossierText ?? token.text,
        displayNum: token._dossierDisplayNum,
        blocks: [],
      };
      continue;
    }
    if (token.type === "heading" && token.depth === 1 && !h1Title) {
      h1Title = token.text;
      continue;
    }

    if (!current) continue;
    if (token.type === "heading" && token.depth < 3) continue;

    const block = textBlockFromToken(token);
    if (block.text) current.blocks.push(block);
  }

  flush();

  const title = stringField(frontmatter.data, "title") || h1Title || "Untitled";
  const navigableSections = sections.filter((section) => !isPreambleSection(section));
  const lensSections = navigableSections.length ? navigableSections : sections;
  const language = detectScaffoldLanguage(`${title}\n${sections.map((section) => `${section.title}\n${section.summary}`).join("\n")}`);
  const labels = scaffoldLabels(language);
  const sectionSummaries = sections
    .filter((section) => !isPreambleSection(section))
    .map((section) => sectionSummaryAnnotation(section, language));
  const readingPathSections = selectReadingPathSections(lensSections);
  const structureMap = createStructureMap(selectStructureMapSections(lensSections, readingPathSections), labels);
  const semanticBlocks = [
    ...(structureMap ? [structureMap] : []),
    ...createRelationshipMapBlocks(lensSections),
    ...createConceptGlossaryBlocks(lensSections),
    ...createRoadmapBlocks(lensSections),
    ...createRequirementGridBlocks(lensSections),
    ...createReferenceListBlocks(lensSections),
    ...createTakeawayGridBlocks(lensSections, labels),
    ...createPrincipleGridBlocks(lensSections),
    ...createDecisionGridBlocks(lensSections),
    ...createEvidenceGridBlocks(lensSections),
    ...createRiskRegisterBlocks(lensSections),
    ...createScopeBoundaryBlocks(lensSections, labels),
    ...createChecklistBlocks(lensSections, labels),
    ...createOpenQuestionsBlocks(lensSections, labels),
  ];

  return {
    schema_version: legacySourceLabel ? 1 : 2,
    source: "dossier-enrich:section-summary-scaffold",
    ...(legacySourceLabel ? {} : { contract: enrichmentContract("dossier-enrich:section-summary-scaffold") }),
    content_mode: contentMode,
    prerequisites: prerequisitesFromFrontmatter(frontmatter.data),
    checkpoints: [],
    analogies: [],
    ...(sections.length
      ? {
          document_overview: {
            summary: overviewSummary(title, lensSections[0]?.summary ?? sections[0].summary),
            reader_goal: scaffoldReaderGoal(frontmatter.data, labels, language),
            status_note: scaffoldStatusNote(frontmatter.data, language),
            next_step: labels.nextStep(cleanMarkdownText(lensSections[0].title)),
          },
          reading_path: readingPathSections.map((section) => ({
            label: cleanMarkdownText(section.title),
            section_id: section.id,
            description: readingPathDescription(section, language),
          })),
          ...(semanticBlocks.length ? { semantic_blocks: semanticBlocks } : {}),
        }
      : {}),
    section_summaries: sectionSummaries,
  };
}

export function enrichmentContract(producer: string, createdAt = localDateString()): RenderAnnotations["contract"] {
  return {
    name: "dossier-ai-enrichment",
    version: "0.4",
    producer,
    created_at: createdAt,
  };
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prerequisitesFromFrontmatter(frontmatter: Record<string, unknown>): RenderAnnotations["prerequisites"] {
  const raw = frontmatter.prerequisites;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") {
      const term = item.trim();
      return term ? [{ term, plain_language: term }] : [];
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const term = stringField(record, "term") || stringField(record, "name") || stringField(record, "label");
    const plainLanguage = stringField(record, "plain_language") || stringField(record, "description") || term;
    if (!term || !plainLanguage) return [];
    const whyNeeded = stringField(record, "why_needed");
    const fallbackLink = stringField(record, "fallback_link");
    return [{
      term,
      plain_language: plainLanguage,
      ...(whyNeeded ? { why_needed: whyNeeded } : {}),
      ...(fallbackLink ? { fallback_link: fallbackLink } : {}),
    }];
  });
}

function overviewSummary(title: string, firstSummary: string): string {
  if (title.length > 64 || title.includes("—") || title.includes("--") || firstSummary.length > 80) {
    return firstSummary;
  }
  return `${title}: ${firstSummary}`;
}

function isPreambleSection(section: ScaffoldSection): boolean {
  if (section.displayNum === "0") return true;
  return /^(one sentence|one line|一句话|一行话|tl;?dr)$/i.test(section.title.trim());
}

type ScaffoldLanguage = "zh-CN" | "en";

type ScaffoldLabels = {
  readerGoal: string;
  nextStep: (sectionTitle: string) => string;
  structureTitle: string;
  structureSummary: string;
  scopeTitle: string;
  checklistTitle: string;
  openQuestionsTitle: string;
  takeawayTitle: string;
  edgeLabel: (fromKind: StructureMapNodeKind, toKind: StructureMapNodeKind) => string;
};

function detectScaffoldLanguage(text: string): ScaffoldLanguage {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return "en";
  const cjkCount = (compact.match(/[\u3400-\u9fff]/g) ?? []).length;
  return cjkCount >= 8 || cjkCount / compact.length >= 0.18 ? "zh-CN" : "en";
}

function scaffoldLabels(language: ScaffoldLanguage): ScaffoldLabels {
  if (language === "zh-CN") {
    return {
      readerGoal: "先用结构地图和阅读路径理解文档，再进入原文。",
      nextStep: (sectionTitle) => `从「${sectionTitle}」开始，再按相关章节继续。`,
      structureTitle: "文档结构",
      structureSummary: "按原文顺序生成的主要章节阅读地图。",
      scopeTitle: "范围边界",
      checklistTitle: "验收检查",
      openQuestionsTitle: "开放问题",
      takeawayTitle: "借鉴要点",
      edgeLabel: structureEdgeLabelZh,
    };
  }
  return {
    readerGoal: "Use the structure map and reading path to understand the document before reading the source prose.",
    nextStep: (sectionTitle) => `Start with ${sectionTitle}, then follow the source sections that matter.`,
    structureTitle: "Document model",
    structureSummary: "A deterministic map of the main sections and how to read them.",
    scopeTitle: "Scope boundaries",
    checklistTitle: "Acceptance checks",
    openQuestionsTitle: "Open questions",
    takeawayTitle: "Takeaways",
    edgeLabel: structureEdgeLabelEn,
  };
}

function scaffoldStatusNote(frontmatter: Record<string, unknown>, language: ScaffoldLanguage): string {
  const status = stringField(frontmatter, "status");
  const kind = stringField(frontmatter, "kind");
  const updated = dateField(frontmatter, "updated");
  const created = updated ? "" : dateField(frontmatter, "created");
  const parts = [
    status ? readerFacingStatus(status, language) : "",
    kind ? readerFacingKind(kind) : "",
    updated ? dateLabel("updated", updated, language) : "",
    created ? dateLabel("created", created, language) : "",
  ].filter(Boolean);

  if (parts.length) return parts.join(" · ");
  return language === "zh-CN" ? "未声明状态元数据。" : "No status metadata declared.";
}

function scaffoldReaderGoal(frontmatter: Record<string, unknown>, labels: ScaffoldLabels, language: ScaffoldLanguage): string {
  const kind = stringField(frontmatter, "kind");
  if (!kind) return labels.readerGoal;

  const readableKind = readerFacingKind(kind);
  const normalizedKind = readableKind.toLowerCase();
  if (language === "zh-CN") {
    if (normalizedKind.includes("vision")) return `用这份 ${readableKind} 对齐产品意图、范围边界和后续实施输入。`;
    if (normalizedKind.includes("mvp") || normalizedKind.includes("spec")) return `用这份 ${readableKind} 对齐实现范围、关键决策和验收标准。`;
    if (normalizedKind.includes("impl") || normalizedKind.includes("change")) return `用这份 ${readableKind} 理解已改内容、验证证据和后续风险。`;
    if (normalizedKind.includes("review")) return `用这份 ${readableKind} 核对评审结论、风险边界和后续修正。`;
    if (normalizedKind.includes("handoff") || normalizedKind.includes("brief")) return `用这份 ${readableKind} 接住上下文、关键约束和下一步。`;
    return `用这份 ${readableKind} 理解文档目标、关键结构和后续动作。`;
  }

  if (normalizedKind.includes("vision")) return `Use this ${readableKind} to align on product intent, scope boundaries, and implementation inputs.`;
  if (normalizedKind.includes("mvp") || normalizedKind.includes("spec")) return `Use this ${readableKind} to align on implementation scope, key decisions, and acceptance checks.`;
  if (normalizedKind.includes("impl") || normalizedKind.includes("change")) return `Use this ${readableKind} to understand changed behavior, verification evidence, and residual risks.`;
  if (normalizedKind.includes("review")) return `Use this ${readableKind} to check review findings, risk boundaries, and follow-up fixes.`;
  if (normalizedKind.includes("handoff") || normalizedKind.includes("brief")) return `Use this ${readableKind} to recover context, key constraints, and the next step.`;
  return `Use this ${readableKind} to understand the document goal, key structure, and next actions.`;
}

function readerFacingStatus(status: string, language: ScaffoldLanguage): string {
  const normalized = status.trim().toLowerCase();
  if (language === "zh-CN") {
    const zhStatuses: Record<string, string> = {
      draft: "草稿",
      ready: "已就绪",
      implemented: "已实现",
      archived: "已归档",
    };
    return zhStatuses[normalized] ?? readerFacingKind(status);
  }
  return readerFacingKind(status);
}

function readerFacingKind(kind: string): string {
  return kind.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function dateLabel(kind: "updated" | "created", value: string, language: ScaffoldLanguage): string {
  if (language === "zh-CN") return `${kind === "updated" ? "更新" : "创建"} ${value}`;
  return `${kind} ${value}`;
}

function createStructureMap(
  sections: ScaffoldSection[],
  labels: ScaffoldLabels,
): NonNullable<RenderAnnotations["semantic_blocks"]>[number] | null {
  const nodes = sections.slice(0, 6).map((section) => ({
    id: slugifyNodeId(section.title) || section.id,
    label: cleanMarkdownText(section.title),
    kind: inferNodeKind(section.title),
    summary: section.summary,
    section_id: section.id,
  }));
  if (!nodes.length) return null;
  const edges = nodes.slice(0, -1).map((node, index) => {
    const nextNode = nodes[index + 1];
    return {
      from: node.id,
      to: nextNode.id,
      label: labels.edgeLabel(node.kind, nextNode.kind),
    };
  });
  return {
    type: "structure_map",
    title: labels.structureTitle,
    summary: labels.structureSummary,
    source_section_id: sections[0].id,
    nodes,
    ...(edges.length ? { edges } : {}),
  };
}

function selectStructureMapSections(
  sections: ScaffoldSection[],
  readingPathSections: ScaffoldSection[],
): ScaffoldSection[] {
  if (sections.length <= 6) return sections;
  return readingPathSections;
}

function structureEdgeLabelEn(
  fromKind: StructureMapNodeKind,
  toKind: StructureMapNodeKind,
): string {
  if (toKind === "question") return "leaves open";
  if (toKind === "risk") return "stress-tested by";
  if (toKind === "evidence") return "verified by";
  if (toKind === "decision") return fromKind === "context" ? "frames" : "refines";
  if (toKind === "path" || toKind === "action") return "turns into";
  if (toKind === "output") return "produces";
  if (toKind === "context") return "grounds";
  return "connects to";
}

function structureEdgeLabelZh(
  fromKind: StructureMapNodeKind,
  toKind: StructureMapNodeKind,
): string {
  if (toKind === "question") return "留下问题";
  if (toKind === "risk") return "由风险检验";
  if (toKind === "evidence") return "由证据验证";
  if (toKind === "decision") return fromKind === "context" ? "框定" : "细化";
  if (toKind === "path" || toKind === "action") return "转为行动";
  if (toKind === "output") return "产出";
  if (toKind === "context") return "补充背景";
  return "连接";
}

function createScopeBoundaryBlocks(
  sections: ScaffoldSection[],
  labels: ScaffoldLabels,
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  const scopeSections = sections.filter((section) => section.scopeBoundary);
  const needsSourceTitle = scopeSections.length > 1;
  return scopeSections
    .map((section) => ({
      type: "scope_boundary" as const,
      title: needsSourceTitle
        ? sourceQualifiedLensTitle(labels.scopeTitle, section.title)
        : labels.scopeTitle,
      source_section_id: section.id,
      in_scope: section.scopeBoundary?.in_scope ?? [],
      out_of_scope: section.scopeBoundary?.out_of_scope ?? [],
    }));
}

function createRelationshipMapBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.relationshipMap)
    .map((section) => ({
      type: "relationship_map" as const,
      title: section.title,
      source_section_id: section.id,
      ...(section.relationshipMap?.summary ? { summary: section.relationshipMap.summary } : {}),
      items: section.relationshipMap?.items ?? [],
    }));
}

function createRoadmapBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.roadmap)
    .map((section) => ({
      type: "roadmap" as const,
      title: section.title,
      source_section_id: section.id,
      ...(section.roadmap?.summary ? { summary: section.roadmap.summary } : {}),
      items: section.roadmap?.items ?? [],
    }));
}

function createRequirementGridBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.requirementGrid)
    .map((section) => ({
      type: "requirement_grid" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.requirementGrid?.items ?? [],
    }));
}

function createReferenceListBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.referenceList)
    .map((section) => ({
      type: "reference_list" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.referenceList?.items ?? [],
    }));
}

function createTakeawayGridBlocks(
  sections: ScaffoldSection[],
  labels: ScaffoldLabels,
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.takeawayGrid)
    .map((section) => ({
      type: "takeaway_grid" as const,
      title: section.takeawayGrid?.title ?? sourceQualifiedLensTitle(labels.takeawayTitle, section.title),
      source_section_id: section.id,
      items: section.takeawayGrid?.items ?? [],
    }));
}

function createPrincipleGridBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.principleGrid)
    .map((section) => ({
      type: "principle_grid" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.principleGrid?.items ?? [],
    }));
}

function createDecisionGridBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.decisionGrid)
    .map((section) => ({
      type: "decision_grid" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.decisionGrid?.items ?? [],
    }));
}

function createEvidenceGridBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.evidenceGrid)
    .map((section) => ({
      type: "evidence_grid" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.evidenceGrid?.items ?? [],
    }));
}

function createRiskRegisterBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.riskRegister)
    .map((section) => ({
      type: "risk_register" as const,
      title: section.title,
      source_section_id: section.id,
      items: section.riskRegister?.items ?? [],
    }));
}

function createChecklistBlocks(
  sections: ScaffoldSection[],
  labels: ScaffoldLabels,
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  const checklistSections = sections.filter((section) => section.checklist);
  const needsSourceTitle = checklistSections.length > 1;
  return checklistSections
    .map((section) => ({
      type: "checklist" as const,
      title: needsSourceTitle
        ? sourceQualifiedLensTitle(labels.checklistTitle, section.title)
        : labels.checklistTitle,
      source_section_id: section.id,
      items: section.checklist?.items ?? [],
    }));
}

function createOpenQuestionsBlocks(
  sections: ScaffoldSection[],
  labels: ScaffoldLabels,
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.openQuestions)
    .map((section) => ({
      type: "open_questions" as const,
      title: labels.openQuestionsTitle,
      source_section_id: section.id,
      items: section.openQuestions?.items ?? [],
    }));
}

function createConceptGlossaryBlocks(
  sections: ScaffoldSection[],
): NonNullable<RenderAnnotations["semantic_blocks"]> {
  return sections
    .filter((section) => section.conceptGlossary)
    .map((section) => ({
      type: "concept_glossary" as const,
      title: section.conceptGlossary?.title ?? section.title,
      source_section_id: section.id,
      items: section.conceptGlossary?.items ?? [],
    }));
}

function inferNodeKind(title: string): StructureMapNodeKind {
  const normalized = title.toLowerCase();
  if (isExplicitOpenQuestionsTitle(title)) return "question";
  if (/(risk|risks|failure|blocker|风险|失败|阻塞)/i.test(normalized)) return "risk";
  if (/(questions?|\bopen\s+(?:questions?|issues?|items?|decisions?)\b|todos?|uncertain|开放问题|问题|待定)/i.test(normalized)) return "question";
  if (/(decision|decisions|architecture|model|design|choice|strategy|defaults?|架构|模型|设计|决策|选择|策略|默认|基座)/i.test(normalized)) return "decision";
  if (/(roadmap|path|plan|milestone|mvp|next|路线|路径|计划|里程碑|下一步)/i.test(normalized)) return "path";
  if (isManualReviewChecklistTitle(title)) return "evidence";
  if (/(acceptance|success|criteria|check|verify|evidence|review|compliance|标准|验收|验证|证据|评审|审查|合规)/i.test(normalized)) return "evidence";
  if (/(output|artifact|deliverable|implementation|实现|产物|输出|交付)/i.test(normalized)) return "output";
  if (/(action|task|workflow|工作流|行动|任务)/i.test(normalized)) return "action";
  return "context";
}

function selectReadingPathSections(sections: ScaffoldSection[]): ScaffoldSection[] {
  if (sections.length <= 4) return sections;

  const selected: ScaffoldSection[] = [];
  const add = (section: ScaffoldSection | undefined) => {
    if (!section) return;
    if (selected.some((item) => item.id === section.id)) return;
    selected.push(section);
  };
  const findAfterFirst = (predicate: (section: ScaffoldSection) => boolean) =>
    sections.find((section, index) => (
      index > 0
      && !selected.some((item) => item.id === section.id)
      && predicate(section)
    ));

  add(sections[0]);
  add(findAfterFirst((section) => isPrimaryReadingPathKind(inferNodeKind(section.title))));
  add(findAfterFirst((section) => isStrongCoreReadingPathTitle(section.title))
    ?? findAfterFirst((section) => isCoreReadingPathTitle(section.title)));
  add(findAfterFirst((section) => isGuardrailReadingPathKind(inferNodeKind(section.title))));

  const minimumLength = Math.min(3, sections.length);
  if (selected.length < minimumLength) {
    for (const section of sections) {
      add(section);
      if (selected.length >= minimumLength) break;
    }
  }

  return selected.slice(0, 4);
}

function isPrimaryReadingPathKind(kind: StructureMapNodeKind): boolean {
  return kind === "decision" || kind === "path" || kind === "output" || kind === "action";
}

function isGuardrailReadingPathKind(kind: StructureMapNodeKind): boolean {
  return kind === "risk" || kind === "question" || kind === "evidence";
}

function isCoreReadingPathTitle(title: string): boolean {
  return /(core|architecture|model|design|dossier|核心|架构|模型|数据模型|设计|重点|命门)/i.test(title);
}

function isStrongCoreReadingPathTitle(title: string): boolean {
  return /(dossier.*(design|implementation)|design.*dossier|设计与实现|dossier.*设计|dossier.*实现|重点章|命门)/i.test(title);
}

function slugifyNodeId(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  if (/^[a-z]/.test(ascii)) return ascii;
  return "";
}

function sectionSummaryAnnotation(
  section: ScaffoldSection,
  language: ScaffoldLanguage,
): SectionSummaryAnnotation {
  const hint = readerHintForKind(inferNodeKind(section.title), language);
  return {
    section_id: section.id,
    summary: section.summary,
    ...(section.keyPoints.length ? { key_points: section.keyPoints } : {}),
    ...(hint ? { reader_hint: hint } : {}),
  };
}

function readingPathDescription(section: ScaffoldSection, language: ScaffoldLanguage): string {
  const title = cleanMarkdownText(section.title);
  if (isStrongCoreReadingPathTitle(title)) {
    return language === "zh-CN"
      ? "用本节建立文档的核心模型。"
      : "Use this section to build the document's core model.";
  }

  const kind = inferNodeKind(title);
  if (language === "zh-CN") {
    switch (kind) {
      case "decision":
        return "用本节理解关键决策及其理由。";
      case "risk":
        return "实现前先用本节检查风险。";
      case "question":
        return "继续前先用本节确认开放问题。";
      case "path":
        return "用本节跟随执行路径。";
      case "evidence":
        return "用本节核对验证证据。";
      case "output":
        return "用本节识别预期产物。";
      case "action":
        return "用本节规划下一步行动。";
      default:
        return "先用本节建立背景和问题。";
    }
  }

  switch (kind) {
    case "decision":
      return "Use this section to understand the key decision and rationale.";
    case "risk":
      return "Use this section to inspect risks before acting.";
    case "question":
      return "Use this section to confirm unresolved questions before moving on.";
    case "path":
      return "Use this section to follow the execution path.";
    case "evidence":
      return "Use this section to check the verification evidence.";
    case "output":
      return "Use this section to identify expected outputs.";
    case "action":
      return "Use this section to plan the next action.";
    default:
      return "Start here to understand the context and problem.";
  }
}

function readerHintForKind(kind: StructureMapNodeKind, language: ScaffoldLanguage): string {
  if (language === "zh-CN") {
    switch (kind) {
      case "decision":
        return "用本节理解关键决策及其理由。";
      case "risk":
        return "实现前先用本节检查风险。";
      case "question":
        return "继续前先用本节确认开放问题。";
      case "path":
        return "用本节跟随执行路径。";
      case "evidence":
        return "用本节核对验证证据。";
      case "output":
        return "用本节识别预期产物。";
      case "action":
        return "用本节规划下一步行动。";
      default:
        return "";
    }
  }
  switch (kind) {
    case "decision":
      return "Use this section to understand the decision and its rationale.";
    case "risk":
      return "Use this section to check risks before implementation.";
    case "question":
      return "Use this section to resolve open questions before moving on.";
    case "path":
      return "Use this section to follow the execution path.";
    case "evidence":
      return "Use this section as the verification checklist.";
    case "output":
      return "Use this section to identify expected outputs.";
    case "action":
      return "Use this section to plan next actions.";
    default:
      return "";
  }
}

function summarizeBlocks(title: string, blocks: SectionBlock[]): SectionBrief | null {
  const candidates = blocks.filter((block) => block.kind !== "subheading" && block.text.trim() && !looksLikeStructuralNoise(block.text));
  const first = candidates[0];
  if (!first) return null;

  let summary: string;
  let keyPointStartIndex = 1;
  if (first.kind === "paragraph" && endsWithLeadIn(first.text)) {
    const nextIndex = candidates.findIndex((block, index) => index > 0 && block.kind !== "other");
    const next = nextIndex >= 0 ? candidates[nextIndex] : undefined;
    if (next) {
      if (next.kind === "table") {
        const semanticSummary = semanticTableSectionSummary(title, next);
        if (semanticSummary) {
          return {
            summary: semanticSummary,
            keyPoints: collectKeyPoints(candidates.slice(nextIndex + 1), semanticSummary),
          };
        }
      }
      if (next.kind === "list") {
        const semanticSummary = semanticListSectionSummary(title, next);
        if (semanticSummary) {
          return {
            summary: semanticSummary,
            keyPoints: collectKeyPoints(candidates.slice(nextIndex + 1), semanticSummary),
          };
        }
      }
      summary = clipSentence(joinLeadInSummary(first.text, next.text));
      keyPointStartIndex = nextIndex + 1;
      return {
        summary,
        keyPoints: collectKeyPoints(candidates.slice(keyPointStartIndex), summary),
      };
    }
  }
  if (first.kind === "table") {
    const semanticSummary = semanticTableSectionSummary(title, first);
    if (semanticSummary) return { summary: semanticSummary, keyPoints: [] };
    return {
      summary: clipSentence(first.text),
      keyPoints: [],
    };
  }
  if (first.kind === "list") {
    const semanticSummary = semanticListSectionSummary(title, first);
    if (semanticSummary) return { summary: semanticSummary, keyPoints: [] };
    return {
      summary: clipSentence(first.text),
      keyPoints: [],
    };
  }
  summary = firstSentence(first.text);
  return {
    summary,
    keyPoints: collectKeyPoints(candidates.slice(keyPointStartIndex), summary),
  };
}

function semanticTableSectionSummary(title: string, block: SectionBlock): string {
  return riskTableSectionSummary(title, block)
    || openQuestionTableSectionSummary(title, block)
    || relationshipTableSectionSummary(title, block)
    || evidenceTableSectionSummary(title, block)
    || checklistTableSectionSummary(title, block);
}

function riskTableSectionSummary(title: string, block: SectionBlock): string {
  if (!isRiskTitle(title)) return "";
  const riskItems = riskItemsFromTable("__summary__", block);
  if (!riskItems.length) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = riskItems.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 项风险。`;
  return `${cleanTitle} contains ${count} risk item${count === 1 ? "" : "s"}.`;
}

function openQuestionTableSectionSummary(title: string, block: SectionBlock): string {
  if (!isExplicitOpenQuestionsTitle(title)) return "";

  const items = (block.points ?? [])
    .map((point) => openQuestionItemFromPoint("__summary__", point))
    .filter((item): item is OpenQuestionItemAnnotation => Boolean(item));
  if (!items.length) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = items.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 个开放问题。`;
  return `${cleanTitle} contains ${count} open question${count === 1 ? "" : "s"}.`;
}

function semanticListSectionSummary(title: string, block: SectionBlock): string {
  return checklistListSectionSummary(title, block);
}

function evidenceTableSectionSummary(title: string, block: SectionBlock): string {
  if (!isEvidenceTitle(title)) return "";
  const headers = block.tableHeaders ?? [];
  const rows = block.tableRows ?? [];
  if (!headers.length || !rows.length) return "";

  const labelIndex = findHeaderIndex(headers, /(claim|check|item|label|topic|assertion|acceptance|判断|声明|检查|验收项|事项|项目|主题|结论)/i, 0);
  const evidenceIndex = findHeaderIndex(headers, /(evidence|proof|verification|validation|actual|observed|证据|证明|验证|校验|实测)/i, -1, [labelIndex]);
  if (labelIndex < 0 || evidenceIndex < 0) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = rows.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 项可验证证据。`;
  return `${cleanTitle} contains ${count} verifiable evidence item${count === 1 ? "" : "s"}.`;
}

function relationshipTableSectionSummary(title: string, block: SectionBlock): string {
  if (!isRelationshipTitle(title)) return "";
  const items = relationshipItemsFromTable("__summary__", block);
  if (!items.length) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = items.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 条显式关系。`;
  return `${cleanTitle} contains ${count} explicit relationship${count === 1 ? "" : "s"}.`;
}

function checklistTableSectionSummary(title: string, block: SectionBlock): string {
  if (!isChecklistTitle(title) && !isComplianceChecklistTitle(title)) return "";
  const rows = block.tableRows ?? [];
  if (!rows.length) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = rows.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 项检查。`;
  return `${cleanTitle} contains ${count} check item${count === 1 ? "" : "s"}.`;
}

function checklistListSectionSummary(title: string, block: SectionBlock): string {
  if (!isChecklistTitle(title) && !isManualReviewChecklistTitle(title)) return "";
  const points = block.points ?? [];
  if (!points.length) return "";

  const cleanTitle = stripTrailingSentencePunctuation(title);
  const count = points.length;
  if (hasCjk(cleanTitle)) return `${cleanTitle}包含 ${count} 项检查。`;
  return `${cleanTitle} contains ${count} check item${count === 1 ? "" : "s"}.`;
}

function scopeBoundaryForSection(
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["scopeBoundary"] | undefined {
  const mode = scopeModeForTitle(title);
  if (!mode) return undefined;

  const items = blocks
    .flatMap((block) => block.points ?? [])
    .map((item) => clipScopeItem(item))
    .filter((item) => item && !looksLikeStructuralNoise(item))
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  return mode === "out"
    ? { in_scope: [], out_of_scope: items }
    : { in_scope: items, out_of_scope: [] };
}

function roadmapForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["roadmap"] | undefined {
  if (!isRoadmapTitle(title)) return undefined;

  const items = roadmapItemsFromSubheadings(blocks).slice(0, 8);
  if (!items.length) return undefined;

  return {
    summary: items[0]?.summary,
    items: items.map((item) => ({
      ...item,
      section_id: item.section_id ?? sectionId,
    })),
  };
}

function requirementGridForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["requirementGrid"] | undefined {
  if (!isRequirementTitle(title)) return undefined;

  const items = requirementItemsFromSubheadings(blocks).slice(0, 8);
  if (!items.length) return undefined;

  return {
    items: items.map((item) => ({
      ...item,
      section_id: item.section_id ?? sectionId,
    })),
  };
}

function referenceListForSection(
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["referenceList"] | undefined {
  if (!isReferenceTitle(title)) return undefined;

  const items = blocks
    .filter((block) => block.kind === "list")
    .flatMap((block) => block.links ?? [])
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.label === item.label
      && candidate.href === item.href
    )) === index)
    .slice(0, 12);
  if (!items.length) return undefined;

  return { items };
}

function takeawayGridForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["takeawayGrid"] | undefined {
  const items: TakeawayItemAnnotation[] = [];
  let captureNextList = isTakeawayTitle(title);

  for (const block of blocks) {
    if (block.kind === "paragraph") {
      captureNextList = isTakeawayLeadIn(block.text) || (captureNextList && endsWithLeadIn(block.text));
      continue;
    }

    if (block.kind !== "list") continue;
    if (!captureNextList) continue;
    if (block.links?.length) {
      captureNextList = false;
      continue;
    }

    for (const point of block.points ?? []) {
      const item = takeawayItemFromPoint(sectionId, point);
      if (!item) continue;
      items.push(item);
      if (items.length >= 8) break;
    }
    if (items.length) break;
  }

  if (!items.length) return undefined;
  return {
    title: sourceQualifiedLensTitle(scaffoldLabels(hasCjk(title) ? "zh-CN" : "en").takeawayTitle, title),
    items,
  };
}

function principleGridForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["principleGrid"] | undefined {
  if (!isPrincipleTitle(title)) return undefined;

  const items = blocks
    .filter((block) => block.kind === "list")
    .flatMap((block) => block.points ?? [])
    .map((point) => principleItemFromPoint(sectionId, point))
    .filter((item): item is PrincipleItemAnnotation => Boolean(item))
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.label === item.label
      && candidate.guidance === item.guidance
    )) === index)
    .slice(0, 10);
  if (!items.length) return undefined;

  return { items };
}

function decisionGridForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["decisionGrid"] | undefined {
  const tableItems = isDecisionTitle(title)
    ? blocks
      .filter((block) => block.kind === "table")
      .flatMap((block) => decisionItemsFromTable(sectionId, block))
    : [];
  const explicitParagraphItems = blocks
    .filter((block) => block.kind === "paragraph")
    .map((block) => decisionItemFromExplicitParagraph(sectionId, title, block.text))
    .filter((item): item is DecisionItemAnnotation => Boolean(item));
  const defaultStrategyItems = isDecisionTitle(title)
    ? blocks
      .filter((block) => block.kind === "list")
      .flatMap((block) => decisionItemsFromDefaultStrategyList(sectionId, block))
    : [];

  const items = [...tableItems, ...explicitParagraphItems, ...defaultStrategyItems]
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.label === item.label
      && candidate.value === item.value
      && candidate.rationale === item.rationale
    )) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  return { items };
}

function evidenceGridForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["evidenceGrid"] | undefined {
  if (!isEvidenceTitle(title)) return undefined;

  const items = blocks
    .filter((block) => block.kind === "table")
    .flatMap((block) => evidenceItemsFromTable(sectionId, block))
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.label === item.label
      && candidate.evidence === item.evidence
      && candidate.source === item.source
    )) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  return { items };
}

function riskRegisterForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["riskRegister"] | undefined {
  if (isExplicitOpenQuestionsTitle(title)) return undefined;
  if (!isRiskTitle(title)) return undefined;

  const items = blocks
    .filter((block) => block.kind === "table")
    .flatMap((block) => riskItemsFromTable(sectionId, block))
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.label === item.label
      && candidate.trigger === item.trigger
      && candidate.impact === item.impact
      && candidate.mitigation === item.mitigation
    )) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  return { items };
}

function conceptGlossaryForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["conceptGlossary"] | undefined {
  const sectionIsGlossary = isConceptGlossaryTitle(title);
  let activeTitle = title;
  let glossaryTitle = sectionIsGlossary ? title : "";
  const items: ConceptGlossaryItemAnnotation[] = [];

  for (const block of blocks) {
    if (block.kind === "subheading") {
      activeTitle = block.text;
      continue;
    }
    if (block.kind !== "table") continue;
    if (!sectionIsGlossary && !isConceptGlossaryTitle(activeTitle)) continue;

    if (!glossaryTitle) glossaryTitle = activeTitle;
    items.push(...conceptGlossaryItemsFromTable(sectionId, block));
  }

  const uniqueItems = items
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.term === item.term
      && candidate.plain_language === item.plain_language
      && candidate.example === item.example
      && candidate.model_field === item.model_field
    )) === index)
    .slice(0, 8);
  if (!uniqueItems.length) return undefined;

  return {
    ...(glossaryTitle ? { title: glossaryTitle } : {}),
    items: uniqueItems,
  };
}

function relationshipMapForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["relationshipMap"] | undefined {
  if (!isRelationshipTitle(title)) return undefined;

  const items = blocks
    .filter((block) => block.kind === "table")
    .flatMap((block) => relationshipItemsFromTable(sectionId, block))
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.from === item.from
      && candidate.relation === item.relation
      && candidate.to === item.to
      && candidate.evidence === item.evidence
    )) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  const count = items.length;
  const cleanTitle = stripTrailingSentencePunctuation(title);
  const summary = hasCjk(cleanTitle)
    ? `${cleanTitle}包含 ${count} 条显式关系。`
    : `${cleanTitle} contains ${count} explicit relationship${count === 1 ? "" : "s"}.`;

  return {
    summary,
    items,
  };
}

function checklistForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
  options: { excludeTableItems?: boolean; excludeRequirementItems?: boolean } = {},
): ScaffoldSection["checklist"] | undefined {
  if (options.excludeRequirementItems) return undefined;
  const isCompliance = isComplianceChecklistTitle(title);
  if (!isChecklistTitle(title) && !isManualReviewChecklistTitle(title) && !isCompliance) return undefined;
  const itemLimit = isCompliance ? 12 : 8;

  const items = blocks
    .filter((block) => !(options.excludeTableItems && block.kind === "table"))
    .flatMap((block) => block.points ?? [])
    .map((point) => checklistItemFromPoint(sectionId, point, { compliance: isCompliance }))
    .filter((item): item is ChecklistItemAnnotation => Boolean(item))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label && candidate.detail === item.detail) === index)
    .slice(0, itemLimit);
  if (!items.length) return undefined;

  return { items };
}

function openQuestionsForSection(
  sectionId: string,
  title: string,
  blocks: SectionBlock[],
): ScaffoldSection["openQuestions"] | undefined {
  if (!isOpenQuestionsTitle(title)) return undefined;

  const items = blocks
    .flatMap((block) => block.points ?? [])
    .map((point) => openQuestionItemFromPoint(sectionId, point))
    .filter((item): item is OpenQuestionItemAnnotation => Boolean(item))
    .filter((item, index, all) => all.findIndex((candidate) => (
      candidate.question === item.question
      && candidate.context === item.context
      && candidate.impact === item.impact
    )) === index)
    .slice(0, 8);
  if (!items.length) return undefined;

  return { items };
}

function isChecklistTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(acceptance|success criteria|criteria|checklist|done criteria|definition of done|readiness|requirements?|验收|成功标准|检查清单|完成标准|就绪检查|需求清单)/i.test(normalized);
}

function isComplianceChecklistTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(compliance|rule checks?|must not|do not|合规|审查|不要做|铁律)/i.test(normalized);
}

function isManualReviewChecklistTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(manual review|visual review|human review|user review|manual checks?|visual checks?|human checks?|人工复核|用户复核|人工检查|肉眼复核|肉眼检查|视觉复核|视觉检查|目测)/i.test(normalized);
}

function sourceQualifiedLensTitle(baseTitle: string, sourceTitle: string): string {
  const cleanSourceTitle = stripTrailingSentencePunctuation(sourceTitle);
  if (!cleanSourceTitle) return baseTitle;
  if (normalizeComparableText(cleanSourceTitle) === normalizeComparableText(baseTitle)) return baseTitle;
  return hasCjk(`${baseTitle}${cleanSourceTitle}`)
    ? `${baseTitle}：${cleanSourceTitle}`
    : `${baseTitle}: ${cleanSourceTitle}`;
}

function isRoadmapTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(roadmap|learning path|path|plan|milestones?|mvp|stages?|路线|路径|计划|里程碑|阶段|下一步)/i.test(normalized);
}

function isRequirementTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  if (/(acceptance|success criteria|definition of done|readiness|checklist|验收|成功标准|完成标准|就绪检查|检查清单)/i.test(normalized)) {
    return false;
  }
  return /(requirements?|required capabilities|design requirements?|implementation requirements?|requirements? spec|要求|设计要求|实现要求|需求|能力要求)/i.test(normalized);
}

function isReferenceTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(references?|sources?|further reading|reading list|bibliography|inspiration|comparables?|benchmarks?|market scan|参考|参考对象|参考资料|资料来源|来源清单|延伸阅读|机会判断|借鉴对象|借鉴项目|竞品|对标项目|同类项目)/i.test(normalized);
}

function isTakeawayTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(takeaways?|lessons?|lessons learned|key points?|what we learned|insights?|启发|经验|经验教训|借鉴要点|吸收要点|关键要点|学习要点|可借鉴|应该吸收)/i.test(normalized);
}

function isTakeawayLeadIn(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return /(takeaways?|lessons?|what (?:we|this project) should learn|should borrow|should adopt|should absorb|learn from|本项目应该.*(?:吸收|学习|借鉴)|应该从.*(?:吸收|学习|借鉴)|可以从.*(?:吸收|学习|借鉴)|关键启发|经验教训|借鉴要点)/i.test(normalized);
}

function isPrincipleTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(principles?|design principles?|guidelines?|tenets?|heuristics?|原则|设计原则|指导原则|准则|启发式)/i.test(normalized);
}

function isDecisionTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(decisions?|architecture decisions?|technical decisions?|choices?|defaults?|strateg(y|ies)|model strategy|base strategy|adr|verdict|判断|决策|选择|取舍|默认方案|策略|模型策略|基座策略|基座|技术决策|架构决策|结论)/i.test(normalized);
}

function isEvidenceTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(evidence|proof|verification|validation|acceptance|readiness|test results?|review results?|provenance|sources?|证据|证明|验证|验收|校验|测试结果|评审结果|来源|溯源)/i.test(normalized);
}

function isRiskTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(risks?|risk register|failure modes?|blockers?|pitfalls?|mitigations?|风险|风险与缓解|风险点|失败模式|阻塞|坑|缓解)/i.test(normalized);
}

function isOpenQuestionsTitle(title: string): boolean {
  if (isExplicitOpenQuestionsTitle(title)) return true;
  const normalized = title.toLowerCase().trim();
  return /(blockers?|阻塞问题)/i.test(normalized);
}

function isExplicitOpenQuestionsTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(open questions?|unresolved questions?|pending questions?|unknowns?|question list|开放问题|待定问题|未决问题|遗留问题|问题清单)/i.test(normalized);
}

function isConceptGlossaryTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(glossary|terms?|vocabulary|concepts?|concept map|core concepts?|terminology|术语|词汇|词表|概念|核心概念|名词解释)/i.test(normalized);
}

function isRelationshipTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  return /(relationships?|relations?|dependency|dependencies|edge map|flow map|artifact map|connection|connections|关系|依赖|边表|流转|连接|关联|上下游)/i.test(normalized);
}

function decisionItemsFromTable(sectionId: string, block: SectionBlock): DecisionItemAnnotation[] {
  const rows = block.tableRows ?? [];
  const headers = block.tableHeaders ?? [];
  if (!rows.length || !headers.length) return [];

  const labelIndex = findHeaderIndex(headers, /(decision|label|item|adr|topic|决策|判断|选择|事项|编号|主题)/i, 0);
  const valueIndex = findHeaderIndex(headers, /(default|value|choice|selected|verdict|方案|默认|结论|倾向)/i, labelIndex === 0 ? 1 : 0, [labelIndex]);
  const rationaleIndex = findHeaderIndex(headers, /(rationale|reason|because|why|rejected|原因|理由|取舍|拒绝)/i, valueIndex === 1 ? 2 : 1, [labelIndex, valueIndex]);
  if (labelIndex < 0 || valueIndex < 0 || rationaleIndex < 0) return [];

  return rows
    .map((row) => decisionItemFromRow(sectionId, row, labelIndex, valueIndex, rationaleIndex))
    .filter((item): item is DecisionItemAnnotation => Boolean(item));
}

function decisionItemsFromDefaultStrategyList(sectionId: string, block: SectionBlock): DecisionItemAnnotation[] {
  return (block.points ?? [])
    .map((point) => decisionItemFromDefaultStrategyPoint(sectionId, point))
    .filter((item): item is DecisionItemAnnotation => Boolean(item));
}

function evidenceItemsFromTable(sectionId: string, block: SectionBlock): EvidenceItemAnnotation[] {
  const rows = block.tableRows ?? [];
  const headers = block.tableHeaders ?? [];
  if (!rows.length || !headers.length) return [];

  const labelIndex = findHeaderIndex(headers, /(claim|check|item|label|topic|assertion|acceptance|判断|声明|检查|验收项|事项|项目|主题|结论)/i, 0);
  const explicitEvidenceIndex = findHeaderIndex(headers, /(evidence|proof|verification|validation|actual|observed|证据|证明|验证|校验|实测)/i, -1, [labelIndex]);
  const evidenceIndex = explicitEvidenceIndex >= 0
    ? explicitEvidenceIndex
    : findHeaderIndex(headers, /(result|status|结果|状态)/i, labelIndex === 0 ? 1 : 0, [labelIndex]);
  const sourceIndex = findHeaderIndex(headers, /(source|command|artifact|file|link|method|来源|命令|产物|文件|方法|路径)/i, -1, [labelIndex, evidenceIndex]);
  if (labelIndex < 0 || evidenceIndex < 0) return [];

  return rows
    .map((row) => evidenceItemFromRow(sectionId, row, labelIndex, evidenceIndex, sourceIndex))
    .filter((item): item is EvidenceItemAnnotation => Boolean(item));
}

function riskItemsFromTable(sectionId: string, block: SectionBlock): RiskItemAnnotation[] {
  const rows = block.tableRows ?? [];
  const headers = block.tableHeaders ?? [];
  if (!rows.length || !headers.length) return [];

  const labelIndex = findHeaderIndex(headers, /(risk|failure|blocker|pitfall|issue|problem|风险|风险点|失败|阻塞|坑|问题)/i, 0);
  const triggerIndex = findHeaderIndex(headers, /(trigger|cause|condition|when|scenario|触发|原因|条件|场景|何时)/i, -1, [labelIndex]);
  const impactIndex = findHeaderIndex(headers, /(impact|effect|cost|severity|consequence|影响|后果|代价|严重|损失)/i, -1, [labelIndex, triggerIndex]);
  const mitigationIndex = findHeaderIndex(headers, /(mitigation|countermeasure|response|avoid|prevention|缓解|规避|应对|处理|措施|预防)/i, -1, [labelIndex, triggerIndex, impactIndex]);
  if (labelIndex < 0 || mitigationIndex < 0) return [];

  return rows
    .map((row) => riskItemFromRow(sectionId, row, labelIndex, triggerIndex, impactIndex, mitigationIndex))
    .filter((item): item is RiskItemAnnotation => Boolean(item));
}

function conceptGlossaryItemsFromTable(sectionId: string, block: SectionBlock): ConceptGlossaryItemAnnotation[] {
  const rows = block.tableRows ?? [];
  const headers = block.tableHeaders ?? [];
  if (!rows.length || !headers.length) return [];

  const termIndex = findHeaderIndex(headers, /(term|concept|name|element|object|术语|概念|对象|元素|名称|名词)/i, 0);
  const plainIndex = findHeaderIndex(headers, /(plain|definition|explanation|meaning|purpose|description|用途|定义|解释|说明|含义|非技术)/i, termIndex === 0 ? 1 : 0, [termIndex]);
  const exampleIndex = findHeaderIndex(headers, /(example|sample|case|instance|例子|示例|实例|真实例子)/i, -1, [termIndex, plainIndex]);
  const modelFieldIndex = findHeaderIndex(headers, /(model|field|schema|data model|input source|source|数据模型|字段|模型|对应字段|输入来源|来源)/i, -1, [termIndex, plainIndex, exampleIndex]);
  if (termIndex < 0 || plainIndex < 0) return [];

  return rows
    .map((row) => conceptGlossaryItemFromRow(sectionId, row, termIndex, plainIndex, exampleIndex, modelFieldIndex))
    .filter((item): item is ConceptGlossaryItemAnnotation => Boolean(item));
}

function relationshipItemsFromTable(sectionId: string, block: SectionBlock): RelationshipMapItemAnnotation[] {
  const rows = block.tableRows ?? [];
  const headers = block.tableHeaders ?? [];
  if (!rows.length || !headers.length) return [];

  const fromIndex = findHeaderIndex(headers, /(from|source|upstream|parent|input|artifact|起点|来源|上游|父级|输入|源)/i, 0);
  const relationIndex = findHeaderIndex(headers, /(relation|relationship|edge|type|verb|links?|depends|关系|边|类型|动作|连接|依赖)/i, -1, [fromIndex]);
  const toIndex = findHeaderIndex(headers, /(to|target|destination|downstream|child|output|目标|终点|下游|子级|输出)/i, -1, [fromIndex, relationIndex]);
  const evidenceIndex = findHeaderIndex(headers, /(evidence|proof|source|reason|basis|note|confidence|证据|证明|来源|依据|理由|备注|置信)/i, -1, [fromIndex, relationIndex, toIndex]);
  if (fromIndex < 0 || relationIndex < 0 || toIndex < 0) return [];

  return rows
    .map((row) => relationshipItemFromRow(sectionId, row, fromIndex, relationIndex, toIndex, evidenceIndex))
    .filter((item): item is RelationshipMapItemAnnotation => Boolean(item));
}

function relationshipItemFromRow(
  sectionId: string,
  row: string[],
  fromIndex: number,
  relationIndex: number,
  toIndex: number,
  evidenceIndex: number,
): RelationshipMapItemAnnotation | null {
  const from = stripTrailingSentencePunctuation(row[fromIndex] ?? "");
  const relation = stripTrailingSentencePunctuation(row[relationIndex] ?? "");
  const to = stripTrailingSentencePunctuation(row[toIndex] ?? "");
  const evidence = evidenceIndex >= 0 ? ensureSentence(row[evidenceIndex] ?? "") : "";
  if (!from || !relation || !to) return null;

  return {
    from,
    relation,
    to,
    ...(evidence ? { evidence } : {}),
    section_id: sectionId,
  };
}

function conceptGlossaryItemFromRow(
  sectionId: string,
  row: string[],
  termIndex: number,
  plainIndex: number,
  exampleIndex: number,
  modelFieldIndex: number,
): ConceptGlossaryItemAnnotation | null {
  const term = stripTrailingSentencePunctuation(row[termIndex] ?? "");
  const plainLanguage = ensureSentence(row[plainIndex] ?? "");
  const example = exampleIndex >= 0 ? ensureSentence(row[exampleIndex] ?? "") : "";
  const modelField = modelFieldIndex >= 0 ? cleanMarkdownText(row[modelFieldIndex] ?? "") : "";
  if (!term || !plainLanguage) return null;

  return {
    term,
    plain_language: plainLanguage,
    ...(example ? { example } : {}),
    ...(modelField ? { model_field: modelField } : {}),
    section_id: sectionId,
  };
}

function findHeaderIndex(headers: string[], pattern: RegExp, fallback: number, excluded: number[] = []): number {
  const excludedSet = new Set(excluded);
  const found = headers.findIndex((header, index) => !excludedSet.has(index) && pattern.test(header));
  if (found >= 0) return found;
  return fallback < headers.length && !excludedSet.has(fallback) ? fallback : -1;
}

function decisionItemFromRow(
  sectionId: string,
  row: string[],
  labelIndex: number,
  valueIndex: number,
  rationaleIndex: number,
): DecisionItemAnnotation | null {
  const label = stripTrailingSentencePunctuation(row[labelIndex] ?? "");
  const value = ensureSentence(row[valueIndex] ?? "");
  const rationale = ensureSentence(row[rationaleIndex] ?? "");
  if (!label || !value || !rationale) return null;

  return {
    label,
    value,
    rationale,
    section_id: sectionId,
  };
}

function decisionItemFromDefaultStrategyPoint(sectionId: string, point: string): DecisionItemAnnotation | null {
  const clean = cleanMarkdownText(point);
  const match = clean.match(/^(.{1,40}?)[：:]\s*(.+)$/);
  if (!match) return null;

  const label = stripTrailingSentencePunctuation(match[1]);
  if (!isDefaultStrategyLabel(label)) return null;

  const value = ensureSentence(stripTrailingSentencePunctuation(match[2]));
  const rationale = defaultStrategyRationale(label);
  if (!label || !value || !rationale) return null;

  return {
    label,
    value,
    rationale,
    section_id: sectionId,
  };
}

function principleItemFromPoint(sectionId: string, point: string): PrincipleItemAnnotation | null {
  const clean = cleanMarkdownText(point);
  const match = clean.match(/^(.{1,48}?)[：:]\s*(.+)$/);
  if (!match) return null;

  const label = stripTrailingSentencePunctuation(match[1]);
  const guidance = ensureSentence(match[2]);
  if (!label || !guidance || looksLikeStructuralNoise(guidance)) return null;

  return {
    label,
    guidance,
    section_id: sectionId,
  };
}

function takeawayItemFromPoint(sectionId: string, point: string): TakeawayItemAnnotation | null {
  const clean = stripTrailingSentencePunctuation(cleanMarkdownText(point));
  if (!clean || looksLikeStructuralNoise(clean)) return null;
  const split = splitTakeawayPoint(clean);
  const label = clipCleanText(split.label, 64);
  const detail = clipCleanText(ensureSentence(split.detail), 120);
  if (!label) return null;

  return {
    label,
    ...(detail && normalizeComparableText(detail) !== normalizeComparableText(label) ? { detail } : {}),
    section_id: sectionId,
  };
}

function splitTakeawayPoint(text: string): { label: string; detail: string } {
  const clean = cleanMarkdownText(text);
  const labelled = clean.match(/^(.{1,48}?)[：:]\s*(.+)$/);
  if (labelled) {
    return {
      label: stripTrailingSentencePunctuation(labelled[1]),
      detail: labelled[2],
    };
  }

  const clause = clean.match(/^(.{4,48}?)[，,；;、]\s*(.+)$/);
  if (clause) {
    return {
      label: stripTrailingSentencePunctuation(clause[1]),
      detail: clause[2],
    };
  }

  return {
    label: clean,
    detail: "",
  };
}

function isDefaultStrategyLabel(label: string): boolean {
  return /(default|primary|baseline|base|control|comparison|upgrade|route|fallback|默认|主要|教学基座|默认教学|实验基座|对照|升级|路线|后续|备选|基座)/i.test(label);
}

function defaultStrategyRationale(label: string): string {
  return hasCjk(label)
    ? `声明为${label}。`
    : `Declared as ${label.toLowerCase()}.`;
}

function evidenceItemFromRow(
  sectionId: string,
  row: string[],
  labelIndex: number,
  evidenceIndex: number,
  sourceIndex: number,
): EvidenceItemAnnotation | null {
  const label = stripTrailingSentencePunctuation(row[labelIndex] ?? "");
  const evidence = ensureSentence(row[evidenceIndex] ?? "");
  const source = sourceIndex >= 0 ? cleanMarkdownText(row[sourceIndex] ?? "") : "";
  if (!label || !evidence) return null;

  return {
    label,
    evidence,
    ...(source ? { source } : {}),
    section_id: sectionId,
  };
}

function riskItemFromRow(
  sectionId: string,
  row: string[],
  labelIndex: number,
  triggerIndex: number,
  impactIndex: number,
  mitigationIndex: number,
): RiskItemAnnotation | null {
  const label = stripTrailingSentencePunctuation(row[labelIndex] ?? "");
  const trigger = triggerIndex >= 0 ? ensureSentence(row[triggerIndex] ?? "") : "";
  const impact = impactIndex >= 0 ? ensureSentence(row[impactIndex] ?? "") : "";
  const mitigation = ensureSentence(row[mitigationIndex] ?? "");
  if (!label || !mitigation) return null;

  return {
    label,
    ...(trigger ? { trigger } : {}),
    ...(impact ? { impact } : {}),
    mitigation,
    section_id: sectionId,
  };
}

function decisionItemFromExplicitParagraph(
  sectionId: string,
  sectionTitle: string,
  text: string,
): DecisionItemAnnotation | null {
  const clean = cleanMarkdownText(text)
    .replace(/^[✅☑✓✔]\s*/, "")
    .trim();
  const decisionMatch = clean.match(/^(?:decision|choice|default|verdict|决策|选择|结论|默认方案)\s*[:：]\s*(.+)$/i);
  if (!decisionMatch) return null;

  const parsed = splitExplicitDecisionBody(decisionMatch[1]);
  if (!parsed.rationale) return null;

  const label = decisionLabelForSection(sectionTitle, parsed.value);
  const value = ensureSentence(parsed.value);
  const rationale = ensureSentence(parsed.rationale);
  if (!label || !value || !rationale) return null;

  return {
    label,
    value,
    rationale,
    section_id: sectionId,
  };
}

function splitExplicitDecisionBody(text: string): { value: string; rationale: string } {
  const clean = cleanMarkdownText(text);
  const dashMatch = clean.match(/^(.+?)\s*(?:——|—|–|--|-)\s*(.+)$/);
  if (!dashMatch) return { value: stripTrailingSentencePunctuation(clean), rationale: "" };
  return {
    value: stripTrailingSentencePunctuation(dashMatch[1]),
    rationale: cleanMarkdownText(dashMatch[2]),
  };
}

function decisionLabelForSection(sectionTitle: string, value: string): string {
  if (!isDecisionTitle(sectionTitle)) return stripTrailingSentencePunctuation(sectionTitle);
  const cleanValue = stripTrailingSentencePunctuation(value);
  return clipCleanText(cleanValue, 48);
}

function roadmapItemsFromSubheadings(blocks: SectionBlock[]): RoadmapItemAnnotation[] {
  const items: RoadmapItemAnnotation[] = [];
  let current: { heading: SectionBlock; content: SectionBlock[] } | null = null;

  const flush = () => {
    if (!current) return;
    const item = roadmapItemFromSubheading(current.heading, current.content, items.length);
    if (item) items.push(item);
  };

  for (const block of blocks) {
    if (block.kind === "subheading" && block.depth === 3) {
      flush();
      current = { heading: block, content: [] };
      continue;
    }
    if (current) current.content.push(block);
  }
  flush();

  return items;
}

function requirementItemsFromSubheadings(blocks: SectionBlock[]): RequirementItemAnnotation[] {
  const items: RequirementItemAnnotation[] = [];
  let current: { heading: SectionBlock; content: SectionBlock[] } | null = null;

  const flush = () => {
    if (!current) return;
    const item = requirementItemFromSubheading(current.heading, current.content);
    if (item) items.push(item);
  };

  for (const block of blocks) {
    if (block.kind === "subheading" && block.depth === 3) {
      flush();
      current = { heading: block, content: [] };
      continue;
    }
    if (current) current.content.push(block);
  }
  flush();

  return items;
}

function requirementItemFromSubheading(
  heading: SectionBlock,
  content: SectionBlock[],
): RequirementItemAnnotation | null {
  const label = stripRequirementLabelPrefix(heading.text);
  const detail = requirementItemDetail(content);
  const requirements = requirementItemPoints(content, detail);
  if (!label || !requirements.length) return null;

  return {
    label,
    ...(detail ? { detail } : {}),
    requirements,
    ...(heading.id ? { section_id: heading.id } : {}),
  };
}

function requirementItemDetail(blocks: SectionBlock[]): string {
  const firstParagraph = blocks.find((block) => block.kind === "paragraph" && block.text && !looksLikeStructuralNoise(block.text));
  if (!firstParagraph) return "";
  return clipCleanText(cleanMarkdownText(firstParagraph.text), 120);
}

function requirementItemPoints(blocks: SectionBlock[], detail: string): string[] {
  const points: string[] = [];
  for (const block of blocks) {
    for (const point of block.points ?? []) {
      const requirement = stripTrailingSentencePunctuation(point);
      if (!requirement || looksLikeStructuralNoise(requirement) || isDuplicatePoint(requirement, detail, points)) continue;
      points.push(clipCleanText(requirement, 96));
      if (points.length >= 6) return points;
    }
  }
  return points;
}

function stripRequirementLabelPrefix(text: string): string {
  const clean = cleanMarkdownText(text);
  const numbered = clean.match(/^\d+[.)、]\s*(.+)$/);
  return stripTrailingSentencePunctuation(numbered?.[1] ?? clean);
}

function roadmapItemFromSubheading(
  heading: SectionBlock,
  content: SectionBlock[],
  index: number,
): RoadmapItemAnnotation | null {
  const titleParts = roadmapTitleParts(heading.text, heading.displayNum, index);
  const summary = roadmapItemSummary(content);
  if (!summary) return null;
  const outputs = roadmapOutputs(content, summary);
  return {
    label: titleParts.label,
    title: titleParts.title,
    summary,
    ...(outputs.length ? { outputs } : {}),
    ...(heading.id ? { section_id: heading.id } : {}),
  };
}

function roadmapTitleParts(text: string, displayNum: string | undefined, index: number): { label: string; title: string } {
  const clean = cleanMarkdownText(text);
  const labelMatch = clean.match(/^(.{1,40}?)[：:]\s*(.+)$/);
  if (labelMatch) {
    return {
      label: stripTrailingSentencePunctuation(labelMatch[1]),
      title: stripTrailingSentencePunctuation(labelMatch[2]),
    };
  }
  return {
    label: displayNum || `Stage ${index + 1}`,
    title: stripTrailingSentencePunctuation(clean),
  };
}

function roadmapItemSummary(blocks: SectionBlock[]): string {
  const candidates = blocks.filter((block) => block.kind !== "other" && block.text && !looksLikeStructuralNoise(block.text));
  const firstParagraph = candidates.find((block) => block.kind === "paragraph");
  if (firstParagraph) return firstSentence(firstParagraph.text);
  const firstStructured = candidates.find((block) => block.kind === "list" || block.kind === "table");
  return firstStructured ? clipSentence(firstStructured.text) : "";
}

function roadmapOutputs(blocks: SectionBlock[], summary: string): string[] {
  const outputs: string[] = [];
  for (const block of blocks) {
    for (const point of block.points ?? []) {
      const output = stripTrailingSentencePunctuation(point);
      if (!output || isDuplicatePoint(output, summary, outputs)) continue;
      outputs.push(clipCleanText(output, 64));
      if (outputs.length >= 4) return outputs;
    }
  }
  return outputs;
}

function checklistItemFromPoint(
  sectionId: string,
  point: string,
  options: { compliance?: boolean } = {},
): ChecklistItemAnnotation | null {
  const clean = ensureSentence(point);
  if (!clean || looksLikeStructuralNoise(clean)) return null;

  const labelMatch = clean.match(/^(.{1,48}?)[：:]\s*(.+)$/);
  const status = options.compliance ? complianceChecklistStatus(clean) : "required";
  if (labelMatch) {
    const label = stripTrailingSentencePunctuation(cleanMarkdownText(labelMatch[1]));
    const detail = ensureSentence(labelMatch[2]);
    if (!label || !detail) return null;
    return {
      label,
      detail,
      status,
      section_id: sectionId,
    };
  }

  const label = stripTrailingSentencePunctuation(clean);
  if (!label) return null;
  return {
    label: label.length <= 96 ? label : `${label.slice(0, 93).trimEnd()}...`,
    status,
    section_id: sectionId,
  };
}

function complianceChecklistStatus(text: string): ChecklistItemAnnotation["status"] {
  const clean = cleanMarkdownText(text).toLowerCase();
  if (/(✗|✘|×|未动|未触碰|没有触碰|未引|未改|未删|未用|仍是|遵守|not touched|untouched|did not|compliant)/i.test(clean)) {
    return "done";
  }
  if (/(触碰|违反|违背|breach|violate|touched|changed|added|removed|used)/i.test(clean)) {
    return "open";
  }
  return "done";
}

function openQuestionItemFromPoint(sectionId: string, point: string): OpenQuestionItemAnnotation | null {
  const clean = ensureSentence(point);
  if (!clean || looksLikeStructuralNoise(clean)) return null;

  const questionMatch = clean.match(/^(.+?[?？])\s*(.*)$/);
  const question = questionMatch
    ? cleanMarkdownText(questionMatch[1])
    : stripTrailingSentencePunctuation(clean);
  const remainder = questionMatch ? cleanQuestionDetail(questionMatch[2]) : "";
  if (!question) return null;

  const detail = remainder ? ensureSentence(remainder) : "";
  const status = openQuestionStatusFromDetail(detail);
  return {
    question,
    ...(detail && looksLikeQuestionImpact(detail) ? { impact: detail } : {}),
    ...(detail && !looksLikeQuestionImpact(detail) ? { context: detail } : {}),
    status,
    section_id: sectionId,
  };
}

function openQuestionStatusFromDetail(detail: string): OpenQuestionItemAnnotation["status"] {
  if (/^(blocks?|blocked|blocker|prevents?|阻塞|卡住|无法继续)/i.test(detail.trim())) return "blocked";
  return "open";
}

function looksLikeQuestionImpact(text: string): boolean {
  return /^(blocks?|blocked|blocker|impacts?|risk|prevents?|阻塞|影响|风险|否则)/i.test(text.trim());
}

function cleanQuestionDetail(text: string): string {
  return cleanMarkdownText(text)
    .replace(/^[\s/|:：;；,\-—–]+/, "")
    .trim();
}

function stripTrailingSentencePunctuation(text: string): string {
  return cleanMarkdownText(text).replace(/[。！？!?\.]+$/g, "").trim();
}

function scopeModeForTitle(title: string): "in" | "out" | null {
  const normalized = title.toLowerCase().trim();
  if (/(non[- ]?goals?|out of scope|not doing|exclusions?|anti[- ]?goals?|不做|不包括|不服务|非目标|排除|反用户)/i.test(normalized)) {
    return "out";
  }
  if (/^(goals?|scope|in scope)$/i.test(normalized)) return "in";
  if (/^(目标|项目目标|本轮目标|核心目标)$/i.test(normalized)) return "in";
  if (/(in scope|scope includes?|included|范围内|做什么|包括|包含)/i.test(normalized)) return "in";
  return null;
}

function clipScopeItem(text: string): string {
  const clean = ensureSentence(text);
  return clipCleanText(clean, 120);
}

function textBlockFromToken(token: MarkdownToken): SectionBlock {
  const record = token as Record<string, unknown>;
  if (token.type === "heading") {
    const heading = token as DossierToken;
    return {
      kind: "subheading",
      text: cleanMarkdownText(heading._dossierText ?? stringField(record, "text")),
      id: heading._dossierId,
      displayNum: heading._dossierDisplayNum,
      depth: token.depth,
    };
  }
  if (token.type === "code") return { kind: "other", text: "" };
  if (token.type === "table") {
    const table = textFromMarkdownTable(stringField(record, "raw"));
    return { kind: "table", text: table.text, points: table.points, tableHeaders: table.headers, tableRows: table.rows };
  }

  const kind = token.type === "list" ? "list" : token.type === "paragraph" ? "paragraph" : "other";
  if (token.type === "list") {
    const list = textFromList(record);
    return { kind, text: list.text, points: list.points, links: list.links };
  }
  const text = cleanMarkdownText(stringField(record, "text") || stringField(record, "raw"));
  return { kind, text: looksLikeStructuralNoise(text) ? "" : text };
}

function textFromList(record: Record<string, unknown>): { text: string; points: string[]; links: ReferenceItemAnnotation[] } {
  const items = record.items;
  if (!Array.isArray(items)) {
    const text = cleanMarkdownText(stringField(record, "raw"));
    return { text, points: text ? [ensureSentence(text)] : [], links: referenceItemsFromMarkdownText(stringField(record, "raw")) };
  }
  const links: ReferenceItemAnnotation[] = [];
  const points = items
    .map((item) => {
      if (!isRecord(item)) return "";
      links.push(...referenceItemsFromMarkdownText(stringField(item, "text") || stringField(item, "raw")));
      return ensureSentence(stringField(item, "text") || stringField(item, "raw"));
    })
    .filter(Boolean);
  return { text: points.join(" "), points, links };
}

function referenceItemsFromMarkdownText(text: string): ReferenceItemAnnotation[] {
  const items: ReferenceItemAnnotation[] = [];
  const pattern = /\[([^\]]+)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(pattern)) {
    const label = cleanMarkdownText(match[1] ?? "");
    const href = (match[2] ?? "").trim();
    if (!label || !href) continue;
    const description = referenceDescriptionAfterLink(text, match);
    items.push({
      label,
      href,
      ...(description ? { description } : {}),
    });
  }
  return items;
}

function referenceDescriptionAfterLink(text: string, match: RegExpMatchArray): string {
  const end = (match.index ?? 0) + match[0].length;
  const after = text.slice(end);
  const descriptionMatch = after.match(/^\s*[:：\-–—]\s*(.+?)\s*$/);
  if (!descriptionMatch) return "";
  return clipCleanText(ensureSentence(descriptionMatch[1] ?? ""), 160);
}

function textFromMarkdownTable(raw: string): { text: string; points: string[]; headers: string[]; rows: string[][] } {
  const rawRows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map(splitRawMarkdownTableRow)
    .filter((row) => row.length > 0);
  const hasSeparator = rawRows.some(isMarkdownTableSeparator);
  const rows = rawRows
    .filter((row) => !isMarkdownTableSeparator(row))
    .map((row) => row.map(cleanTableCell))
    .filter((row) => row.some(Boolean));
  const dataRows = rows.filter((row) => !isMarkdownTableSeparator(row));
  if (!dataRows.length) return { text: "", points: [], headers: [], rows: [] };

  const headers = hasSeparator && dataRows.length > 1 ? dataRows[0] : [];
  const bodyRows = hasSeparator && dataRows.length > 1
    ? dataRows.slice(1)
    : dataRows;
  const points = bodyRows
    .map(tableRowSummary)
    .filter(Boolean);
  return { text: points.slice(0, 2).join(" "), points, headers, rows: bodyRows };
}

function splitRawMarkdownTableRow(row: string): string[] {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function cleanTableCell(cell: string): string {
  return cleanMarkdownText(cell)
    .replace(/^[^\w\u3400-\u9fff]+/, "")
    .replace(/[“”"]/g, "")
    .replace(/[']+$/, "")
    .trim();
}

function isMarkdownTableSeparator(row: string[]): boolean {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}

function tableRowSummary(row: string[]): string {
  if (row.length >= 2) {
    return ensureSentence(`${row[0]}: ${row.slice(1).filter(Boolean).join(" / ")}`);
  }
  return ensureSentence(row.join(" "));
}

function collectKeyPoints(blocks: SectionBlock[], summary: string): string[] {
  const points: string[] = [];
  for (const block of blocks) {
    if (block.kind === "subheading") continue;
    if (block.kind === "paragraph" && endsWithLeadIn(block.text)) continue;
    const candidates = block.points?.length
      ? block.points
      : block.kind === "paragraph"
        ? [firstSentence(block.text)]
        : [];
    for (const candidate of candidates) {
      const point = clipPoint(candidate);
      if (!point || isDuplicatePoint(point, summary, points)) continue;
      points.push(point);
      if (points.length >= 2) return points;
    }
  }
  return points;
}

function isDuplicatePoint(point: string, summary: string, existing: string[]): boolean {
  const normalizedPoint = normalizeComparableText(point);
  if (!normalizedPoint) return true;
  if (normalizeComparableText(summary).includes(normalizedPoint)) return true;
  return existing.some((item) => normalizeComparableText(item) === normalizedPoint);
}

function clipPoint(text: string): string {
  const clean = ensureSentence(text);
  return clipCleanText(clean, KEY_POINT_MAX_CHARS);
}

function normalizeComparableText(text: string): string {
  return cleanMarkdownText(text)
    .toLowerCase()
    .replace(/[。！？!?.,;:：；]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureSentence(text: string): string {
  const clean = cleanMarkdownText(text);
  if (!clean) return "";
  if (/[。！？!?\.]$/.test(clean)) return clean;
  return `${clean}${hasCjk(clean) ? "。" : "."}`;
}

function endsWithLeadIn(text: string): boolean {
  return /[:：]\s*$/.test(text.trim());
}

function joinLeadInSummary(leadIn: string, continuation: string): string {
  const cleanLeadIn = cleanMarkdownText(leadIn);
  const cleanContinuation = cleanMarkdownText(continuation);
  const separator = cleanLeadIn.endsWith("：") ? "" : " ";
  return `${cleanLeadIn}${separator}${cleanContinuation}`;
}

function firstSentence(text: string): string {
  const clipped = clipSentence(text);
  const cjkMatch = clipped.match(/^(.+?[。！？])/);
  if (cjkMatch) return cjkMatch[1].trim();
  const match = clipped.match(/^(.+?[。！？!?\.])(?:\s|$)/);
  return (match?.[1] ?? clipped).trim();
}

function clipSentence(text: string): string {
  const clean = cleanMarkdownText(text);
  const cjkSentence = firstCjkSentenceWithinLimit(clean, SUMMARY_MAX_CHARS);
  if (cjkSentence) return cjkSentence;
  return clipCleanText(clean, SUMMARY_MAX_CHARS);
}

function firstCjkSentenceWithinLimit(clean: string, maxChars: number): string {
  const match = clean.match(/^(.+?[。！？])/);
  const sentence = match?.[1]?.trim() ?? "";
  return sentence && sentence.length <= maxChars ? sentence : "";
}

function clipCleanText(clean: string, maxChars: number): string {
  if (clean.length <= maxChars) return clean;
  const bodyLimit = Math.max(0, maxChars - 3);
  const body = trimBrokenTrailingWord(clean.slice(0, bodyLimit).trimEnd(), clean);
  return `${body}...`;
}

function trimBrokenTrailingWord(clipped: string, original: string): string {
  if (!clipped || clipped.length >= original.length) return clipped;
  const previous = clipped.at(-1) ?? "";
  const next = original.charAt(clipped.length);
  if (!isAsciiWordChar(previous) || !isAsciiWordChar(next)) return clipped;

  const trimmed = clipped.replace(/[A-Za-z0-9_-]+$/, "").trimEnd();
  return trimmed.length >= Math.floor(clipped.length * 0.7) ? trimmed : clipped;
}

function isAsciiWordChar(char: string): boolean {
  return /[A-Za-z0-9_-]/.test(char);
}

function cleanMarkdownText(text: string): string {
  const codeSpans: string[] = [];
  const anglePlaceholders: string[] = [];
  const protectedCodeText = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    const index = codeSpans.push(code) - 1;
    return `DOSSCODESPAN${index}`;
  });
  const protectedText = protectedCodeText.replace(/<([A-Za-z][A-Za-z0-9_-]*)>/g, (match, name: string) => {
    if (isKnownHtmlTag(name)) return match;
    const index = anglePlaceholders.push(match) - 1;
    return `DOSSANGLEPLACEHOLDER${index}`;
  });

  let clean = protectedText
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+[.)]\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
  for (const [index, code] of codeSpans.entries()) {
    clean = clean.replaceAll(`DOSSCODESPAN${index}`, code);
  }
  for (const [index, placeholder] of anglePlaceholders.entries()) {
    clean = clean.replaceAll(`DOSSANGLEPLACEHOLDER${index}`, placeholder);
  }
  return clean.replace(/\s+/g, " ").trim();
}

const KNOWN_HTML_TAGS = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "kbd",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

function isKnownHtmlTag(name: string): boolean {
  return KNOWN_HTML_TAGS.has(name.toLowerCase());
}

function looksLikeStructuralNoise(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return true;

  const boxDrawingCount = (compact.match(/[┌┐└┘│─├┤┬┴┼]/g) ?? []).length;
  if (boxDrawingCount >= 4) return true;

  const pipeCount = (compact.match(/\|/g) ?? []).length;
  if (pipeCount >= 4 && pipeCount / compact.length > 0.08) return true;

  return /^[-:|]+$/.test(compact);
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function dateField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const dateMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  return dateMatch?.[0] ?? trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
