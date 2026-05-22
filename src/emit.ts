// Template substitution. Read template.html + style.css + toc-script.js from skill dir,
// substitute {{PLACEHOLDER}} markers, return final single-file HTML.
//
// Placeholder set (kept stable for skill template authors):
//   {{LANG}}                — language code (default "zh-CN")
//   {{TITLE}}               — frontmatter.title or H1 text
//   {{SUBTITLE}}            — optional subtitle (frontmatter.subtitle)
//   {{STATUS}}              — frontmatter.status (e.g. "ready")
//   {{UPDATED}}             — frontmatter.updated date
//   {{STYLE_CSS}}           — inlined CSS
//   {{TOC_SCRIPT_JS}}       — inlined scroll-spy JS
//   {{TOC_BLOCK}}           — TOC <aside> HTML, or "" when --no-toc
//   {{DOSSIER_BANNER}}      — optional member → cover backlink banner
//   {{FRONTMATTER_CARD}}    — frontmatter top card HTML
//   {{CALLOUTS_BLOCK}}      — top-level callouts (⚠/📝/🎯 blockquotes) HTML
//   {{SEMANTIC_LENS_BLOCK}} — annotation-driven overview / roadmap / decision blocks
//   {{CONTENT_HTML}}        — main content HTML
//
// See docs/specs/2026-05-18-dossier-mvp-0-spec.md §6.2.

import type {
  ChecklistBlockAnnotation,
  CheckpointAnnotation,
  ConceptGlossaryBlockAnnotation,
  ContentMode,
  DecisionGridBlockAnnotation,
  EvidenceGridBlockAnnotation,
  OpenQuestionsBlockAnnotation,
  PrincipleGridBlockAnnotation,
  PrerequisiteItemAnnotation,
  RenderAnnotations,
  ReaderProfile,
  RelationshipMapBlockAnnotation,
  ReferenceListBlockAnnotation,
  RequirementGridBlockAnnotation,
  RiskRegisterBlockAnnotation,
  RoadmapBlockAnnotation,
  SemanticBlockAnnotation,
  SkillMeta,
  ScopeBoundaryBlockAnnotation,
  StructureMapBlockAnnotation,
  TakeawayGridBlockAnnotation,
  TocEntry,
  ParsedFrontmatter,
} from "./types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { escapeHtml } from "./parse/markdown.js";
import {
  SEMANTIC_OVERVIEW_ANCHOR_ID,
  collectSectionSemanticTrace,
  semanticBlockAnchorId,
  semanticBlockItemAnchorId,
  semanticStructureNodeAnchorId,
  type SectionSemanticTraceLink,
  type SemanticTraceAnchor,
} from "./semantic-trace.js";
import {
  detectDocumentLanguage,
  localizeTraceLabel,
  semanticTraceLabelsForLanguage,
  type DocumentLanguage,
  type SemanticTraceLabels,
} from "./semantic-labels.js";

const SOURCE_SECTIONS_ANCHOR_ID = "source-sections";
const SOURCE_SECTION_MAP_ANCHOR_ID = "source-section-map";

export type EmitInput = {
  frontmatter: ParsedFrontmatter["data"];
  sourceTitle?: string;
  contentHtml: string;
  toc: TocEntry[] | null;
  skill: SkillMeta;
  annotations?: RenderAnnotations;
  reader: ReaderProfile;
  contentModeOverride?: ContentMode;
  dossierBannerHtml?: string;
};

export async function emit(input: EmitInput): Promise<string> {
  const [template, styleCss, tocScriptJs, readerToggleJs] = await Promise.all([
    readFile(join(input.skill.dir, "template.html"), "utf8"),
    readFile(join(input.skill.dir, "style.css"), "utf8"),
    readFile(join(input.skill.dir, "toc-script.js"), "utf8"),
    readFile(join(input.skill.dir, "reader-toggle.js"), "utf8"),
  ]);

  const title = stringValue(input.frontmatter.title) || input.sourceTitle || "Untitled";
  const splitTitle = splitTitleAndSubtitle(title, stringValue(input.frontmatter.subtitle));
  const displayTitle = splitTitle.title;
  const subtitle = splitTitle.subtitle;
  const status = stringValue(input.frontmatter.status) || "draft";
  const updated = stringValue(input.frontmatter.updated) || stringValue(input.frontmatter.created);
  const pedagogyContentHtml = renderPedagogyInlineBlocks(
    applyGlossaryPopovers(input.contentHtml, input.annotations),
    input.annotations,
  );
  const preparedContent = prepareFirstScreenContent(pedagogyContentHtml);
  const documentLanguage = detectDocumentLanguage(`${title}\n${preparedContent.contentHtml}`);
  const labels = labelsForLanguage(documentLanguage);
  const localizedTocScriptJs = localizeTocScript(tocScriptJs, labels);
  // Reading time intentionally measures the prepared body only; header brief/notes are navigation aids.
  const readingMinutes = estimateReadingMinutes(preparedContent.contentHtml);
  const frontmatterRelations = frontmatterRelationshipBlock(input.frontmatter, displayTitle);
  const effectiveAnnotations = mergeFrontmatterRelationshipBlock(input.annotations, frontmatterRelations);
  const contentMode = input.contentModeOverride ?? input.annotations?.content_mode ?? "concept";
  const semanticLensHtml = renderSemanticLens(effectiveAnnotations, labels, input.toc);
  const hasAnnotationLens = hasRenderableSemanticLens(input.annotations);
  const sourceProseBoundaryHtml = semanticLensHtml
    ? renderSourceProseBoundary(input.toc, preparedContent.contentHtml, labels)
    : "";
  const sourceSectionMapHtml = semanticLensHtml
    ? renderSourceSectionMap(input.toc, effectiveAnnotations, labels)
    : "";

  const replacements: Record<string, string> = {
    LANG: documentLanguage,
    TITLE: escapeHtml(title),
    SUBTITLE: escapeHtml(subtitle),
    STATUS: escapeHtml(status),
    UPDATED: escapeHtml(updated),
    TOC_TOGGLE_LABEL: escapeHtml(labels.tocToggleAria),
    FOOTER_META: renderFooterMeta(title, status, updated, labels),
    FOOTER_RENDERED_BY: escapeHtml(labels.footerRenderedBy),
    STYLE_CSS: styleCss,
    TOC_SCRIPT_JS: localizedTocScriptJs,
    READER_DEFAULT: input.reader,
    CONTENT_MODE: contentMode,
    READER_TOGGLE: renderReaderToggle(input.reader, documentLanguage),
    PREREQUISITE_CARD: renderPrerequisiteCard(input.annotations?.prerequisites ?? []),
    ANALOGY_CALLOUTS: "",
    LEARNING_CHECKPOINTS: "",
    READER_TOGGLE_SCRIPT: readerToggleJs,
    TOC_BLOCK: input.toc ? renderToc(input.toc, effectiveAnnotations, Boolean(semanticLensHtml), labels) : "",
    DOSSIER_BANNER: input.dossierBannerHtml ?? "",
    FRONTMATTER_CARD: renderFrontmatterCard(
      input.frontmatter,
      displayTitle,
      subtitle,
      status,
      updated,
      readingMinutes,
      preparedContent.executiveBriefHtml,
      preparedContent.documentNotesHtml,
      hasAnnotationLens,
      labels,
    ),
    CALLOUTS_BLOCK: "",
    SEMANTIC_LENS_BLOCK: semanticLensHtml,
    CONTENT_HTML: `${sourceProseBoundaryHtml}${sourceSectionMapHtml}${preparedContent.contentHtml}`,
  };

  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key: string) => {
    return replacements[key] ?? "";
  });

  return html;
}

type RenderLabels = SemanticTraceLabels & {
  semanticLensAria: string;
  dossierLens: string;
  overview: string;
  statusBadge: (status: string) => string;
  readingTime: (minutes: number) => string;
  tocHeader: (count: number) => string;
  lensNavigationAria: string;
  tocToggleAria: string;
  codeCopyAria: string;
  footerRenderedBy: string;
  frontmatterReading: string;
  frontmatterUpdated: string;
  frontmatterOwner: string;
  frontmatterCreated: string;
  frontmatterImplements: string;
  frontmatterReviews: string;
  frontmatterRelationCount: (kind: FrontmatterRelationKind, count: number) => string;
  dossierOverview: string;
  readerGoal: string;
  statusNote: string;
  nextStep: string;
  recommendedReadingPath: string;
  keyJudgmentPanels: string;
  viewSource: string;
  source: string;
  jumpToSubsection: string;
  sourceSections: string;
  sourceSectionsAria: string;
  topLevelSections: (count: number) => string;
  subsections: (count: number) => string;
  subsectionLinksAria: string;
  moreSubsections: (count: number) => string;
  sectionMap: string;
  sectionMapAria: string;
  sectionMapHelp: string;
  sectionMapLanesAria: string;
  sectionMapLaneRoute: string;
  sectionMapLaneModel: string;
  sectionMapLaneJudgment: string;
  semanticRolesAria: string;
  moreRoles: (count: number) => string;
  structureMap: string;
  relationshipMap: string;
  roadmap: string;
  roadmapStages: string;
  requirements: string;
  references: string;
  takeaways: string;
  principles: string;
  decisions: string;
  evidence: string;
  risks: string;
  scope: string;
  questions: string;
  openQuestions: string;
  glossary: string;
  conceptGlossary: string;
  checklist: string;
  connections: string;
  trigger: string;
  impact: string;
  mitigation: string;
  inScope: string;
  outOfScope: string;
  example: string;
  structureNodeKind: (kind: string) => string;
  checklistStatus: (status: string) => string;
  openQuestionStatus: (status: string) => string;
};

type FrontmatterRelationKind = "implements" | "reviews";

function labelsForLanguage(language: DocumentLanguage): RenderLabels {
  const traceLabels = semanticTraceLabelsForLanguage(language);
  if (language === "en") {
    return {
      ...traceLabels,
      semanticLensAria: "Dossier semantic lens",
      dossierLens: "Dossier Lens",
      overview: "Overview",
      statusBadge: statusBadgeLabelEn,
      readingTime: (minutes) => `~${minutes} min`,
      tocHeader: (count) => count === 1 ? "Spec · 1 section" : `Spec · ${count} sections`,
      lensNavigationAria: "Dossier lens navigation",
      tocToggleAria: "Toggle table of contents",
      codeCopyAria: "Copy code",
      footerRenderedBy: "rendered by xdossier",
      frontmatterReading: "Reading",
      frontmatterUpdated: "Updated",
      frontmatterOwner: "Owner",
      frontmatterCreated: "Created",
      frontmatterImplements: "Implements",
      frontmatterReviews: "Reviews",
      frontmatterRelationCount: frontmatterRelationCountEn,
      dossierOverview: "Dossier Overview",
      readerGoal: "Reader Goal",
      statusNote: "Status",
      nextStep: "Next Step",
      recommendedReadingPath: "Recommended Reading Path",
      keyJudgmentPanels: "Key judgment panels",
      viewSource: "View source",
      source: "Source",
      jumpToSubsection: "Jump to subsection",
      sourceSections: "Source Sections",
      sourceSectionsAria: "Source sections",
      topLevelSections: (count) => count === 1 ? "1 top-level section" : `${count} top-level sections`,
      subsections: (count) => count === 1 ? "1 subsection" : `${count} subsections`,
      subsectionLinksAria: "Subsections",
      moreSubsections: (count) => count === 1 ? "1 more subsection" : `${count} more subsections`,
      sectionMap: "Section Map",
      sectionMapAria: "Section map",
      sectionMapHelp: "Use this map to jump into the source prose with context already loaded.",
      sectionMapLanesAria: "Section map lanes",
      sectionMapLaneRoute: "Reading route",
      sectionMapLaneModel: "Model and concepts",
      sectionMapLaneJudgment: "Judgment and checks",
      semanticRolesAria: "Semantic roles",
      moreRoles: (count) => count === 1 ? "1 more role" : `${count} more roles`,
      structureMap: "Structure Map",
      relationshipMap: "Relationship Map",
      roadmap: "Roadmap",
      roadmapStages: "Roadmap stages",
      requirements: "Requirements",
      references: "References",
      takeaways: "Takeaways",
      principles: "Principles",
      decisions: "Decisions",
      evidence: "Evidence",
      risks: "Risks",
      scope: "Scope",
      questions: "Questions",
      openQuestions: "Open Questions",
      glossary: "Glossary",
      conceptGlossary: "Concept Glossary",
      checklist: "Checklist",
      connections: "Connections",
      trigger: "Trigger",
      impact: "Impact",
      mitigation: "Mitigation",
      inScope: "In scope",
      outOfScope: "Out of scope",
      example: "Example",
      structureNodeKind: structureNodeKindLabelEn,
      checklistStatus: checklistStatusLabelEn,
      openQuestionStatus: openQuestionStatusLabelEn,
    };
  }

  return {
    ...traceLabels,
    semanticLensAria: "Dossier 语义透镜",
    dossierLens: "Dossier 透镜",
    overview: "总览",
    statusBadge: statusBadgeLabelZh,
    readingTime: (minutes) => `约 ${minutes} 分钟`,
    tocHeader: (count) => `文档 · ${count} 节`,
    lensNavigationAria: "Dossier 透镜导航",
    tocToggleAria: "打开或关闭目录",
    codeCopyAria: "复制代码",
    footerRenderedBy: "由 xdossier 渲染",
    frontmatterReading: "阅读",
    frontmatterUpdated: "更新",
    frontmatterOwner: "负责人",
    frontmatterCreated: "创建",
    frontmatterImplements: "实现",
    frontmatterReviews: "评审",
    frontmatterRelationCount: frontmatterRelationCountZh,
    dossierOverview: "Dossier 总览",
    readerGoal: "读者收益",
    statusNote: "当前状态",
    nextStep: "下一步",
    recommendedReadingPath: "推荐阅读路径",
    keyJudgmentPanels: "关键判断面板",
    viewSource: "查看原文",
    source: "原文",
    jumpToSubsection: "跳到小节",
    sourceSections: "原文章节",
    sourceSectionsAria: "原文章节",
    topLevelSections: (count) => `${count} 个一级章节`,
    subsections: (count) => `${count} 个小节`,
    subsectionLinksAria: "小节",
    moreSubsections: (count) => `还有 ${count} 个小节`,
    sectionMap: "章节地图",
    sectionMapAria: "章节地图",
    sectionMapHelp: "用这张地图带着上下文跳入原文。",
    sectionMapLanesAria: "章节地图分组",
    sectionMapLaneRoute: "阅读路径",
    sectionMapLaneModel: "模型与概念",
    sectionMapLaneJudgment: "判断与验证",
    semanticRolesAria: "语义角色",
    moreRoles: (count) => `还有 ${count} 个角色`,
    structureMap: "结构图",
    relationshipMap: "关系图",
    roadmap: "路线图",
    roadmapStages: "路线图阶段",
    requirements: "要求",
    references: "参考资料",
    takeaways: "借鉴要点",
    principles: "原则",
    decisions: "决策",
    evidence: "证据",
    risks: "风险",
    scope: "范围",
    questions: "问题",
    openQuestions: "开放问题",
    glossary: "术语表",
    conceptGlossary: "概念词表",
    checklist: "检查清单",
    connections: "连接关系",
    trigger: "触发条件",
    impact: "影响",
    mitigation: "缓解",
    inScope: "范围内",
    outOfScope: "范围外",
    example: "示例",
    structureNodeKind: structureNodeKindLabelZh,
    checklistStatus: checklistStatusLabelZh,
    openQuestionStatus: openQuestionStatusLabelZh,
  };
}

function statusBadgeLabelEn(status: string): string {
  return status;
}

function statusBadgeLabelZh(status: string): string {
  if (status === "draft") return "草稿";
  if (status === "ready") return "已就绪";
  if (status === "implemented") return "已实现";
  if (status === "archived") return "已归档";
  return status;
}

function frontmatterRelationCountEn(kind: FrontmatterRelationKind, count: number): string {
  return `${count} ${kind}`;
}

function frontmatterRelationCountZh(kind: FrontmatterRelationKind, count: number): string {
  const label = kind === "implements" ? "实现" : "评审";
  return `${count} 个${label}`;
}

function localizeTocScript(script: string, labels: RenderLabels): string {
  return script
    .replace(/^\s*\/\/.*\n/gm, "")
    .replaceAll("__DOSSIER_CODE_COPY_LABEL__", JSON.stringify(labels.codeCopyAria));
}

function renderReaderToggle(reader: ReaderProfile, language: DocumentLanguage): string {
  const aria = language === "en" ? "Reader profile" : "读者熟练度";
  const labels = language === "en"
    ? { beginner: "Beginner", intermediate: "Systematic", expert: "Expert" }
    : { beginner: "零基础", intermediate: "系统化", expert: "速查" };
  const button = (value: ReaderProfile) =>
    `<button type="button" data-reader-set="${value}" aria-pressed="${reader === value ? "true" : "false"}">${escapeHtml(labels[value])}</button>`;
  return `<nav class="reader-toggle" role="radiogroup" aria-label="${escapeAttribute(aria)}">
  ${button("beginner")}
  ${button("intermediate")}
  ${button("expert")}
</nav>`;
}

function renderPrerequisiteCard(items: PrerequisiteItemAnnotation[]): string {
  const visible = items.filter((item) => item.term.trim() && item.plain_language.trim());
  if (!visible.length) return "";
  const list = visible.map((item) => {
    const why = item.why_needed ? `<p>${escapeHtml(item.why_needed)}</p>` : "";
    const link = item.fallback_link
      ? ` <a href="${escapeAttribute(item.fallback_link)}">补一下</a>`
      : "";
    return `<li><strong>${escapeHtml(item.term)}</strong>：${escapeHtml(item.plain_language)}${link}${why}</li>`;
  }).join("");
  return `<aside class="prerequisite-card" data-detail-level="prereq">
  <h4>阅读前你最好知道</h4>
  <ul>${list}</ul>
</aside>`;
}

function renderPedagogyInlineBlocks(contentHtml: string, annotations: RenderAnnotations | undefined): string {
  if (!annotations?.analogies?.length && !annotations?.checkpoints?.length) return contentHtml;
  const analogies = groupBySection(annotations?.analogies ?? []);
  const checkpoints = groupBySection(annotations?.checkpoints ?? []);
  return contentHtml.replace(/<section id="(s\d+)">([\s\S]*?)<\/section>/g, (match, sectionId: string, body: string) => {
    const afterHeading = renderAnalogyCallouts(analogies.get(sectionId) ?? []);
    const beforeClose = renderLearningCheckpoints(checkpoints.get(sectionId) ?? []);
    return `<section id="${sectionId}">${injectAfterH2(body, afterHeading)}${beforeClose}</section>`;
  });
}

function renderAnalogyCallouts(items: Array<{ concept: string; analogy: string; section_id: string }>): string {
  if (!items.length) return "";
  return items
    .filter((item) => item.analogy.trim())
    .map((item) => `<aside class="callout analogy" data-detail-level="analogy" data-section="${escapeAttribute(item.section_id)}">
  <span class="callout-icon">类比</span>
  <p><strong>${escapeHtml(item.concept)}：</strong>${escapeHtml(item.analogy)}</p>
</aside>`)
    .join("\n");
}

function renderLearningCheckpoints(items: CheckpointAnnotation[]): string {
  if (!items.length) return "";
  return items
    .filter((checkpoint) => checkpoint.items.length)
    .map((checkpoint) => `<aside class="learning-checkpoint" data-detail-level="checkpoint" data-section="${escapeAttribute(checkpoint.section_id)}">
  <h5>走完这节你应当能</h5>
  <ul>${checkpoint.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
</aside>`)
    .join("\n");
}

function injectAfterH2(body: string, addition: string): string {
  if (!addition) return body;
  const h2End = body.indexOf("</h2>");
  if (h2End < 0) return `${addition}\n${body}`;
  const insertAt = h2End + "</h2>".length;
  return `${body.slice(0, insertAt)}\n${addition}\n${body.slice(insertAt)}`;
}

function groupBySection<T extends { section_id: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const existing = map.get(item.section_id) ?? [];
    existing.push(item);
    map.set(item.section_id, existing);
  }
  return map;
}

function applyGlossaryPopovers(contentHtml: string, annotations: RenderAnnotations | undefined): string {
  const glossaryItems = (annotations?.semantic_blocks ?? [])
    .filter((block): block is ConceptGlossaryBlockAnnotation => block.type === "concept_glossary")
    .flatMap((block) => block.items)
    .filter((item) => item.term.trim() && item.plain_language.trim());
  if (!glossaryItems.length) return contentHtml;

  let html = contentHtml;
  for (const item of glossaryItems) {
    html = replaceFirstTextOccurrenceOutsideTags(html, item.term, (match) => {
      const tooltipId = `g-${slugForId(item.term)}`;
      return `<span class="term" data-detail-level="glossary" data-term="${escapeAttribute(item.term)}" data-definition="${escapeAttribute(item.plain_language)}" aria-describedby="${escapeAttribute(tooltipId)}" tabindex="0">${escapeHtml(match)}<span id="${escapeAttribute(tooltipId)}" role="tooltip">${escapeHtml(item.plain_language)}</span></span>`;
    });
  }
  return html;
}

function replaceFirstTextOccurrenceOutsideTags(
  html: string,
  term: string,
  render: (match: string) => string,
): string {
  const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
  const parts = html.split(/(<[^>]+>)/g);
  const stack: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.startsWith("<")) {
      updateTagStack(stack, part);
      continue;
    }
    if (stack.includes("a") || stack.includes("code") || stack.includes("pre") || stack.includes("script") || stack.includes("style")) {
      continue;
    }
    if (re.test(part)) {
      parts[i] = part.replace(re, (match) => render(match));
      return parts.join("");
    }
  }
  return html;
}

function updateTagStack(stack: string[], tag: string): void {
  const match = tag.match(/^<\/?\s*([a-z0-9-]+)/i);
  if (!match) return;
  const name = match[1].toLowerCase();
  if (tag.startsWith("</")) {
    const index = stack.lastIndexOf(name);
    if (index >= 0) stack.splice(index, 1);
    return;
  }
  if (/\/>$/.test(tag) || /^(br|hr|img|input|meta|link)$/i.test(name)) return;
  stack.push(name);
}

function slugForId(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "term";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderFooterMeta(title: string, status: string, updated: string, labels: RenderLabels): string {
  return [title, labels.statusBadge(status), updated]
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(" · ");
}

function structureNodeKindLabelEn(kind: string): string {
  return kind.replace(/_/g, " ").toUpperCase();
}

function structureNodeKindLabelZh(kind: string): string {
  if (kind === "context") return "背景";
  if (kind === "path") return "路径";
  if (kind === "decision") return "决策";
  if (kind === "risk") return "风险";
  if (kind === "evidence") return "证据";
  if (kind === "output") return "产出";
  if (kind === "question") return "问题";
  if (kind === "action") return "行动";
  return kind;
}

function checklistStatusLabelEn(status: string): string {
  if (status === "done") return "DONE";
  if (status === "open") return "OPEN";
  return "REQ";
}

function checklistStatusLabelZh(status: string): string {
  if (status === "done") return "完成";
  if (status === "open") return "开放";
  return "必做";
}

function openQuestionStatusLabelEn(status: string): string {
  if (status === "blocked") return "BLOCKED";
  if (status === "answered") return "ANSWERED";
  return "OPEN";
}

function openQuestionStatusLabelZh(status: string): string {
  if (status === "blocked") return "阻塞";
  if (status === "answered") return "已答";
  return "开放";
}

function renderSemanticLens(annotations: RenderAnnotations | undefined, labels: RenderLabels, toc?: TocEntry[] | null): string {
  if (!annotations) return "";
  const sourceNumbers = sourceSectionNumberById(toc);
  const overview = renderSemanticOverview(annotations, labels, sourceNumbers);
  const blocks = annotations.semantic_blocks ?? [];
  const blockViews = createSemanticBlockViews(blocks);
  const modelBlocks = blockViews.filter((view) => view.block.type === "structure_map" || view.block.type === "relationship_map");
  const glossaryBlocks = blockViews.filter((view) => view.block.type === "concept_glossary");
  const primaryIndex = blocks.findIndex((block) => block.type === "roadmap");
  const primaryBlockIndexes = new Set([
    ...(primaryIndex >= 0 ? [primaryIndex] : []),
    ...blockViews.filter((view) => view.block.type === "requirement_grid").map((view) => view.index),
    ...blockViews.filter((view) => view.block.type === "reference_list").map((view) => view.index),
    ...blockViews.filter((view) => view.block.type === "takeaway_grid").map((view) => view.index),
  ]);
  const primaryBlocks = blockViews.filter((view) => primaryBlockIndexes.has(view.index));
  const judgmentBlocks = blockViews.filter((view, index) => (
    !primaryBlockIndexes.has(index)
    && view.block.type !== "structure_map"
    && view.block.type !== "relationship_map"
    && view.block.type !== "concept_glossary"
  ));
  const modelHtml = modelBlocks.length
    ? `<div class="semantic-model-flow">
${modelBlocks.map((view) => renderSemanticBlock(view.block, view.id, labels, sourceNumbers)).filter(Boolean).join("\n")}
</div>`
    : "";
  const glossaryHtml = glossaryBlocks.length
    ? `<div class="semantic-model-flow semantic-glossary-flow">
${glossaryBlocks.map((view) => renderSemanticBlock(view.block, view.id, labels, sourceNumbers)).filter(Boolean).join("\n")}
</div>`
    : "";
  const primaryHtml = primaryBlocks.length
    ? `<div class="semantic-primary-flow">
${primaryBlocks.map((view) => renderSemanticBlock(view.block, view.id, labels, sourceNumbers)).filter(Boolean).join("\n")}
</div>`
    : "";
  const judgmentHtml = judgmentBlocks.length
    ? `<div class="semantic-judgment-grid" aria-label="${escapeHtml(labels.keyJudgmentPanels)}">
${judgmentBlocks.map((view) => renderSemanticBlock(view.block, view.id, labels, sourceNumbers)).filter(Boolean).join("\n")}
</div>`
    : "";
  const pieces = primaryHtml
    ? [overview, primaryHtml, modelHtml, glossaryHtml, judgmentHtml].filter(Boolean)
    : [overview, modelHtml, glossaryHtml, judgmentHtml].filter(Boolean);
  if (!pieces.length) return "";
  return `<div class="semantic-lens" aria-label="${escapeHtml(labels.semanticLensAria)}">
${pieces.join("\n")}
</div>`;
}

type SemanticBlockView = {
  block: SemanticBlockAnnotation;
  id: string;
  index: number;
};

function createSemanticBlockViews(blocks: SemanticBlockAnnotation[]): SemanticBlockView[] {
  return blocks.map((block, index) => ({
    block,
    id: semanticBlockAnchorId(block, index),
    index,
  }));
}

function orderSemanticBlockViewsForLens(blockViews: SemanticBlockView[]): SemanticBlockView[] {
  const modelBlocks = blockViews.filter((view) => view.block.type === "structure_map" || view.block.type === "relationship_map");
  const glossaryBlocks = blockViews.filter((view) => view.block.type === "concept_glossary");
  const primaryRoadmap = blockViews.find((view) => view.block.type === "roadmap");
  const primaryBlocks = [
    ...(primaryRoadmap ? [primaryRoadmap] : []),
    ...blockViews.filter((view) => view.block.type === "requirement_grid"),
    ...blockViews.filter((view) => view.block.type === "reference_list"),
    ...blockViews.filter((view) => view.block.type === "takeaway_grid"),
  ];
  const excluded = new Set([
    ...modelBlocks.map((view) => view.index),
    ...glossaryBlocks.map((view) => view.index),
    ...primaryBlocks.map((view) => view.index),
  ]);
  const judgmentBlocks = blockViews.filter((view) => !excluded.has(view.index));
  return primaryBlocks.length
    ? [...primaryBlocks, ...modelBlocks, ...glossaryBlocks, ...judgmentBlocks]
    : [...modelBlocks, ...glossaryBlocks, ...judgmentBlocks];
}

function hasRenderableSemanticLens(annotations: RenderAnnotations | undefined): boolean {
  if (!annotations) return false;
  return Boolean(
    annotations.document_overview
    || annotations.reading_path?.length
    || annotations.semantic_blocks?.length,
  );
}

function mergeFrontmatterRelationshipBlock(
  annotations: RenderAnnotations | undefined,
  relationshipBlock: RelationshipMapBlockAnnotation | undefined,
): RenderAnnotations | undefined {
  if (!relationshipBlock) return annotations;
  if (!annotations) {
    return {
      schema_version: 1,
      semantic_blocks: [relationshipBlock],
      section_summaries: [],
    };
  }

  return {
    ...annotations,
    semantic_blocks: [
      ...(annotations.semantic_blocks ?? []),
      relationshipBlock,
    ],
  };
}

function frontmatterRelationshipBlock(
  frontmatter: Record<string, unknown>,
  documentTitle: string,
): RelationshipMapBlockAnnotation | undefined {
  const title = documentTitle.trim() || "Current artifact";
  const implementsItems = relationRefValues(frontmatter.implements).map((target) => ({
    from: title,
    relation: "implements",
    to: target,
    evidence: `frontmatter implements includes ${target}`,
  }));
  const reviewItems = relationRefValues(frontmatter.reviews).map((reviewPath) => ({
    from: reviewPath,
    relation: "reviews",
    to: title,
    evidence: `frontmatter reviews includes ${reviewPath}`,
  }));
  const reviewTargetItems = relationRefValues(frontmatter.reviews_target).map((target) => ({
    from: title,
    relation: "reviews",
    to: target,
    evidence: `frontmatter reviews_target includes ${target}`,
  }));
  const items = [...implementsItems, ...reviewItems, ...reviewTargetItems];
  if (items.length <= 1) return undefined;

  return {
    type: "relationship_map",
    title: "Frontmatter relations",
    summary: "Explicit artifact relationships declared in frontmatter.",
    items,
  };
}

function relationRefValues(value: unknown): string[] {
  return arrayValue(value)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderSemanticOverview(annotations: RenderAnnotations, labels: RenderLabels, sourceNumbers: Map<string, string>): string {
  const overview = annotations.document_overview;
  const readingPath = annotations.reading_path ?? [];
  if (!overview && readingPath.length === 0) return "";

  const facts: string[] = [];
  if (overview?.reader_goal) facts.push(overviewFact(labels.readerGoal, overview.reader_goal));
  if (overview?.status_note) facts.push(overviewFact(labels.statusNote, overview.status_note));
  if (overview?.next_step) facts.push(overviewFact(labels.nextStep, overview.next_step));

  const readingPathHtml = readingPath.length
    ? `<div class="reading-path-lens" data-annotation="reading-path">
  <p class="semantic-label">${escapeHtml(labels.recommendedReadingPath)}</p>
  <div class="reading-path-cards">
    ${readingPath
      .map((item) => {
        const number = sourceNumbers.get(item.section_id);
        const numberHtml = number ? `<span class="reading-path-number">${escapeHtml(number)}</span>` : "";
        return `<a href="#${escapeHtml(item.section_id)}" class="reading-path-card">
      <span class="reading-path-kicker">${numberHtml}<span class="reading-path-label">${escapeHtml(item.label)}</span></span>
      <span>${escapeHtml(item.description)}</span>
    </a>`;
      })
      .join("\n")}
  </div>
</div>`
    : "";

  return `<div id="${SEMANTIC_OVERVIEW_ANCHOR_ID}" class="semantic-overview" data-annotation="document-overview">
  <div class="semantic-overview-lead">
    <p class="semantic-label">${escapeHtml(labels.dossierOverview)}</p>
    ${overview ? `<p class="semantic-overview-summary">${escapeHtml(overview.summary)}</p>` : ""}
  </div>
  ${facts.length ? `<dl class="semantic-facts">${facts.join("")}</dl>` : ""}
  ${readingPathHtml}
</div>`;
}

function overviewFact(label: string, value: string): string {
  return `<div class="semantic-fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function sourceSectionNumberById(toc: TocEntry[] | null | undefined): Map<string, string> {
  const numbers = new Map<string, string>();
  const visit = (entry: TocEntry) => {
    if (entry.number) numbers.set(entry.id, entry.level === 2 ? `§ ${entry.number}` : entry.number);
    for (const child of entry.children ?? []) visit(child);
  };
  for (const entry of toc ?? []) visit(entry);
  return numbers;
}

function renderSemanticSourceLink(
  sectionId: string | undefined,
  label: string,
  sourceNumbers: Map<string, string>,
): string {
  if (!sectionId) return "";
  const number = sourceNumbers.get(sectionId);
  const text = number ? `${label} ${number}` : label;
  return `<a class="semantic-source-link" href="#${escapeHtml(sectionId)}">${escapeHtml(text)}</a>`;
}

function renderSemanticBlock(
  block: SemanticBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  if (block.type === "structure_map") return renderStructureMapBlock(block, id, labels, sourceNumbers);
  if (block.type === "relationship_map") return renderRelationshipMapBlock(block, id, labels, sourceNumbers);
  if (block.type === "roadmap") return renderRoadmapBlock(block, id, labels, sourceNumbers);
  if (block.type === "requirement_grid") return renderRequirementGridBlock(block, id, labels, sourceNumbers);
  if (block.type === "reference_list") return renderReferenceListBlock(block, id, labels, sourceNumbers);
  if (block.type === "takeaway_grid") return renderTakeawayGridBlock(block, id, labels, sourceNumbers);
  if (block.type === "principle_grid") return renderPrincipleGridBlock(block, id, labels, sourceNumbers);
  if (block.type === "decision_grid") return renderDecisionGridBlock(block, id, labels, sourceNumbers);
  if (block.type === "evidence_grid") return renderEvidenceGridBlock(block, id, labels, sourceNumbers);
  if (block.type === "risk_register") return renderRiskRegisterBlock(block, id, labels, sourceNumbers);
  if (block.type === "scope_boundary") return renderScopeBoundaryBlock(block, id, labels, sourceNumbers);
  if (block.type === "checklist") return renderChecklistBlock(block, id, labels, sourceNumbers);
  if (block.type === "open_questions") return renderOpenQuestionsBlock(block, id, labels, sourceNumbers);
  if (block.type === "concept_glossary") return renderConceptGlossaryBlock(block, id, labels, sourceNumbers);
  return "";
}

function renderStructureMapBlock(
  block: StructureMapBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const nodeById = new Map(block.nodes.map((node) => [node.id, node]));
  const nodes = block.nodes.map((node) => {
    const link = renderSemanticSourceLink(node.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticStructureNodeAnchorId(id, node.id))}" class="structure-node structure-node-${escapeHtml(node.kind)}" data-map-node-id="${escapeHtml(node.id)}">
      <p class="structure-node-kind">${escapeHtml(labels.structureNodeKind(node.kind))}</p>
      <h3>${escapeHtml(node.label)}</h3>
      <p>${escapeHtml(node.summary)}</p>
      ${link}
    </article>`;
  }).join("\n");
  const edges = block.edges?.length
    ? `<div class="structure-connections">
      <p class="semantic-label">${escapeHtml(labels.connections)}</p>
      <ol class="structure-edges">
        ${block.edges.map((edge) => {
          const from = nodeById.get(edge.from)?.label ?? edge.from;
          const to = nodeById.get(edge.to)?.label ?? edge.to;
          return `<li class="structure-edge">
            <span class="structure-edge-from">${escapeHtml(from)}</span>
            <span class="structure-edge-label">${escapeHtml(edge.label)}</span>
            <span class="structure-edge-to">${escapeHtml(to)}</span>
          </li>`;
        }).join("\n")}
      </ol>
    </div>`
    : "";

  return `<div id="${escapeHtml(id)}" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.structureMap)}</p>
      <h2>${escapeHtml(block.title)}</h2>
      ${block.summary ? `<p>${escapeHtml(block.summary)}</p>` : ""}
    </div>
    ${sourceLink}
  </div>
  <div class="structure-map-grid">${nodes}</div>
  ${edges}
</div>`;
}

function renderRelationshipMapBlock(
  block: RelationshipMapBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const edges = block.items.map((item, itemIndex) => {
    const evidence = item.evidence
      ? `<p class="relationship-evidence"><span>${escapeHtml(labels.evidence)}</span> ${escapeHtml(item.evidence)}</p>`
      : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<li id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="relationship-edge">
      <div class="relationship-main">
        <span class="relationship-node relationship-from">${escapeHtml(item.from)}</span>
        <span class="relationship-relation">${escapeHtml(item.relation)}</span>
        <span class="relationship-node relationship-to">${escapeHtml(item.to)}</span>
      </div>
      ${evidence}
      ${link}
    </li>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block relationship-map-lens" data-annotation="semantic-relationship-map">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.relationshipMap)}</p>
      <h2>${escapeHtml(block.title)}</h2>
      ${block.summary ? `<p>${escapeHtml(block.summary)}</p>` : ""}
    </div>
    ${sourceLink}
  </div>
  <ol class="relationship-edges">${renderVisibleItemsWithDisclosure(edges, labels)}</ol>
</div>`;
}

function renderRoadmapBlock(
  block: RoadmapBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const stageStrip = block.items.length > 1
    ? `<ol class="roadmap-stage-strip" aria-label="${escapeHtml(labels.roadmapStages)}">
      ${block.items.map((item, itemIndex) => `<li>
        <a href="#${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}">
          <span class="roadmap-stage-index">${escapeHtml(item.label)}</span>
          <span class="roadmap-stage-title">${escapeHtml(item.title)}</span>
        </a>
      </li>`).join("\n")}
    </ol>`
    : "";
  const cards = block.items.map((item, itemIndex) => {
    const outputs = item.outputs?.length
      ? `<div class="roadmap-outputs">${item.outputs
        .slice(0, 4)
        .map((output) => `<span>${escapeHtml(output)}</span>`)
        .join("")}</div>`
      : "";
    const itemLink = renderSemanticSourceLink(item.section_id, labels.jumpToSubsection, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="roadmap-card">
      <p class="roadmap-label">${escapeHtml(item.label)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      ${outputs}
      ${itemLink}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block roadmap-lens" data-annotation="semantic-roadmap">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.roadmap)}</p>
      <h2>${escapeHtml(block.title)}</h2>
      ${block.summary ? `<p>${escapeHtml(block.summary)}</p>` : ""}
    </div>
    ${sourceLink}
  </div>
  ${stageStrip}
  <div class="roadmap-grid">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderRequirementGridBlock(
  block: RequirementGridBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const detail = item.detail ? `<p>${escapeHtml(item.detail)}</p>` : "";
    const requirements = item.requirements
      .slice(0, 6)
      .map((requirement) => `<li>${escapeHtml(requirement)}</li>`)
      .join("");
    const link = renderSemanticSourceLink(item.section_id, labels.jumpToSubsection, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="requirement-card">
      <p class="requirement-label">${escapeHtml(labels.requirements)}</p>
      <h3>${escapeHtml(item.label)}</h3>
      ${detail}
      <ul class="requirement-items">${requirements}</ul>
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block requirement-grid" data-annotation="semantic-requirement-grid">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.requirements)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="requirement-grid-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderReferenceListBlock(
  block: ReferenceListBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const description = item.description ? `<p>${escapeHtml(item.description)}</p>` : "";
    if (isExternalHref(item.href)) {
      return `<a id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="reference-card external-ref" href="${escapeAttribute(item.href)}">
      <p class="reference-label">${escapeHtml(labels.references)}</p>
      <h3>${escapeHtml(item.label)}</h3>
      ${description}
      <span class="reference-href">${escapeHtml(externalHrefLabel(item.href))}</span>
    </a>`;
    }
    return `<a id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="reference-card" href="${escapeHtml(item.href)}">
      <p class="reference-label">${escapeHtml(labels.references)}</p>
      <h3>${escapeHtml(item.label)}</h3>
      ${description}
      <span class="reference-href">${escapeHtml(item.href)}</span>
    </a>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block reference-list" data-annotation="semantic-reference-list">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.references)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="reference-grid">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function externalHrefLabel(href: string): string {
  try {
    return new URL(href).hostname;
  } catch {
    return "external reference";
  }
}

function renderTakeawayGridBlock(
  block: TakeawayGridBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const detail = item.detail ? `<p>${escapeHtml(item.detail)}</p>` : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="takeaway-card">
      <p class="takeaway-label">${escapeHtml(labels.takeaways)}</p>
      <h3>${escapeHtml(item.label)}</h3>
      ${detail}
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block takeaway-grid" data-annotation="semantic-takeaway-grid">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.takeaways)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="takeaway-grid-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderPrincipleGridBlock(
  block: PrincipleGridBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="principle-card">
      <h3>${escapeHtml(item.label)}</h3>
      <p>${escapeHtml(item.guidance)}</p>
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block principle-grid" data-annotation="semantic-principle-grid">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.principles)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="principle-grid-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderDecisionGridBlock(
  block: DecisionGridBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="decision-card">
      <p class="decision-label">${escapeHtml(item.label)}</p>
      <p class="decision-value">${escapeHtml(item.value)}</p>
      <p>${escapeHtml(item.rationale)}</p>
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block decision-grid" data-annotation="semantic-decision-grid">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.decisions)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="decision-grid-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderEvidenceGridBlock(
  block: EvidenceGridBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const itemSource = item.source
      ? `<p class="evidence-source"><span>${escapeHtml(labels.source)}</span>${escapeHtml(item.source)}</p>`
      : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="evidence-card">
      <p class="evidence-label">${escapeHtml(item.label)}</p>
      <p>${escapeHtml(item.evidence)}</p>
      ${itemSource}
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block evidence-grid" data-annotation="semantic-evidence-grid">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.evidence)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="evidence-grid-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderRiskRegisterBlock(
  block: RiskRegisterBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const cards = block.items.map((item, itemIndex) => {
    const trigger = item.trigger
      ? `<p class="risk-trigger"><span>${escapeHtml(labels.trigger)}</span> ${escapeHtml(item.trigger)}</p>`
      : "";
    const impact = item.impact
      ? `<p class="risk-impact"><span>${escapeHtml(labels.impact)}</span> ${escapeHtml(item.impact)}</p>`
      : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="risk-card">
      <p class="risk-label">${escapeHtml(item.label)}</p>
      ${trigger}
      ${impact}
      <p class="risk-mitigation"><span>${escapeHtml(labels.mitigation)}</span> ${escapeHtml(item.mitigation)}</p>
      ${link}
    </article>`;
  });

  return `<div id="${escapeHtml(id)}" class="semantic-block risk-register" data-annotation="semantic-risk-register">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.risks)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="risk-register-cards">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

function renderScopeBoundaryBlock(
  block: ScopeBoundaryBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  return `<section id="${escapeHtml(id)}" class="comparison-cards" data-block="scope_boundary">
  <header class="comparison-cards-title">${escapeHtml(block.title)}${sourceLink}</header>
  <div class="comparison-cards-grid">
    ${renderComparisonCard(labels.inScope, block.in_scope, "in")}
    ${renderComparisonCard(labels.outOfScope, block.out_of_scope, "out")}
  </div>
</section>`;
}

function renderComparisonCard(label: string, items: string[], kind: "in" | "out"): string {
  if (items.length === 0) return "";
  const icon = kind === "in" ? "✓" : "✗";
  return `<article class="comparison-card comparison-card-${kind}">
  <h4 class="comparison-card-head">
    <span class="comparison-card-icon" aria-hidden="true">${icon}</span>
    ${escapeHtml(label)}
  </h4>
  <ul class="comparison-card-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
</article>`;
}

function renderChecklistBlock(
  block: ChecklistBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const items = block.items.map((item, itemIndex) => {
    const status = item.status ?? "required";
    const detail = item.detail ? `<p>${escapeHtml(item.detail)}</p>` : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<li id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="checklist-item checklist-${escapeHtml(status)}">
      <span class="checklist-status">${escapeHtml(labels.checklistStatus(status))}</span>
      <div>
        <h3>${escapeHtml(item.label)}</h3>
        ${detail}
        ${link}
      </div>
    </li>`;
  });
  return `<div id="${escapeHtml(id)}" class="semantic-block checklist-lens" data-annotation="semantic-checklist">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.checklist)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <ol class="checklist-items">${renderVisibleItemsWithDisclosure(items, labels)}</ol>
</div>`;
}

function renderOpenQuestionsBlock(
  block: OpenQuestionsBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const items = block.items.map((item, itemIndex) => {
    const status = item.status ?? "open";
    const context = item.context ? `<p>${escapeHtml(item.context)}</p>` : "";
    const impact = item.impact ? `<p class="open-question-impact"><span>${escapeHtml(labels.impact)}</span> ${escapeHtml(item.impact)}</p>` : "";
    const link = renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers);
    return `<li id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="open-question-item open-question-${escapeHtml(status)}">
      <span class="open-question-status">${escapeHtml(labels.openQuestionStatus(status))}</span>
      <div>
        <h3>${escapeHtml(item.question)}</h3>
        ${context}
        ${impact}
        ${link}
      </div>
    </li>`;
  });
  return `<div id="${escapeHtml(id)}" class="semantic-block open-questions-lens" data-annotation="semantic-open-questions">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.openQuestions)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <ol class="open-question-items">${renderVisibleItemsWithDisclosure(items, labels)}</ol>
</div>`;
}

function renderConceptGlossaryBlock(
  block: ConceptGlossaryBlockAnnotation,
  id: string,
  labels: RenderLabels,
  sourceNumbers: Map<string, string>,
): string {
  const sourceLink = renderSemanticSourceLink(block.source_section_id, labels.viewSource, sourceNumbers);
  const shouldRenderItemSourceLinks = !block.source_section_id
    || block.items.some((item) => item.section_id && item.section_id !== block.source_section_id);
  const cards = block.items.map((item, itemIndex) => {
    const example = item.example
      ? `<p class="concept-example"><span>${escapeHtml(labels.example)}</span> ${escapeHtml(item.example)}</p>`
      : "";
    const modelField = item.model_field
      ? `<p class="concept-field"><span>${escapeHtml(labels.model)}</span> <code>${escapeHtml(item.model_field)}</code></p>`
      : "";
    const link = shouldRenderItemSourceLinks
      ? renderSemanticSourceLink(item.section_id, labels.source, sourceNumbers)
      : "";
    return `<article id="${escapeHtml(semanticBlockItemAnchorId(id, itemIndex))}" class="concept-card">
      <h3>${escapeHtml(item.term)}</h3>
      <p>${escapeHtml(item.plain_language)}</p>
      ${example}
      ${modelField}
      ${link}
    </article>`;
  });
  return `<div id="${escapeHtml(id)}" class="semantic-block concept-glossary-lens" data-annotation="semantic-concept-glossary">
  <div class="semantic-block-header">
    <div>
      <p class="semantic-label">${escapeHtml(labels.conceptGlossary)}</p>
      <h2>${escapeHtml(block.title)}</h2>
    </div>
    ${sourceLink}
  </div>
  <div class="concept-grid">${renderVisibleItemsWithDisclosure(cards, labels)}</div>
</div>`;
}

const SEMANTIC_VISIBLE_ITEM_LIMIT = 3;

function renderVisibleItemsWithDisclosure(items: string[], labels: RenderLabels): string {
  const visible = items.slice(0, SEMANTIC_VISIBLE_ITEM_LIMIT).join("\n");
  const hidden = items.slice(SEMANTIC_VISIBLE_ITEM_LIMIT).join("\n");
  if (!hidden) return visible;
  return `${visible}
<details class="semantic-block-extra">
  <summary>${escapeHtml(moreSemanticItemsLabel(items.length - SEMANTIC_VISIBLE_ITEM_LIMIT, labels))}</summary>
  <div class="semantic-block-extra-items">${hidden}</div>
</details>`;
}

function moreSemanticItemsLabel(count: number, labels: RenderLabels): string {
  if (labels.dossierLens === "Dossier 透镜") return `展开 ${count} 项`;
  return count === 1 ? "Show 1 more item" : `Show ${count} more items`;
}

function renderSourceProseBoundary(toc: TocEntry[] | null, contentHtml: string, labels: RenderLabels): string {
  const sectionCount = toc?.length ?? (contentHtml.match(/<section id="/g) ?? []).length;
  const sectionLabel = labels.topLevelSections(sectionCount);
  return `<div id="${SOURCE_SECTIONS_ANCHOR_ID}" class="source-prose-boundary" aria-label="${escapeHtml(labels.sourceSectionsAria)}">
  <p class="source-prose-title">${escapeHtml(labels.sourceSections)}</p>
  <p class="source-prose-count">${escapeHtml(sectionLabel)}</p>
</div>`;
}

function renderSourceSectionMap(
  toc: TocEntry[] | null,
  annotations?: RenderAnnotations,
  labels?: RenderLabels,
): string {
  const summaries = annotations?.section_summaries ?? [];
  if (!toc?.length || summaries.length === 0) return "";

  const summariesById = new Map(summaries.map((summary) => [summary.section_id, summary]));
  const semanticTraces = collectSectionSemanticTrace(annotations, tocSemanticTraceAnchors(toc));
  const renderLabels = labels ?? labelsForLanguage("zh-CN");
  const lanesHtml = renderSourceSectionMapLanes(toc, semanticTraces, summariesById, renderLabels);
  const cards = toc
    .map((entry, index) => {
      const summary = summariesById.get(entry.id);
      if (!summary) return "";
      const number = entry.number ?? String(index + 1);
      const subsectionCount = entry.children?.length ?? 0;
      const subsectionLabel = renderLabels.subsections(subsectionCount);
      const subsectionHtml = subsectionCount > 0 ? `<span>${escapeHtml(subsectionLabel)}</span>` : "";
      const subsectionLinksHtml = renderSourceSectionSubsectionLinks(entry, renderLabels);
      const keyPoints = (summary.key_points ?? [])
        .slice(0, 2)
        .map((point) => `<span>${escapeHtml(point)}</span>`)
        .join("");
      const keyPointHtml = keyPoints ? `<span class="source-section-chips">${keyPoints}</span>` : "";
      const readerHintHtml = summary.reader_hint
        ? `<span class="source-section-hint">${escapeHtml(summary.reader_hint)}</span>`
        : "";
      const semanticRolesHtml = renderSourceSectionRoleChips(semanticTraces.get(entry.id) ?? [], renderLabels);
      return `<article class="source-section-map-card">
  <a class="source-section-map-main" href="#${escapeHtml(entry.id)}">
  <span class="source-section-kicker">
    <span class="source-section-num">§ ${escapeHtml(number)}</span>
    ${subsectionHtml}
  </span>
  <span class="source-section-title">${escapeHtml(entry.text)}</span>
  <span class="source-section-summary">${escapeHtml(summary.summary)}</span>
  ${keyPointHtml}
  ${readerHintHtml}
  </a>
  ${subsectionLinksHtml}
  ${semanticRolesHtml}
</article>`;
    })
    .filter(Boolean)
    .join("\n");

  if (!cards) return "";
  return `<nav id="${SOURCE_SECTION_MAP_ANCHOR_ID}" class="source-section-map" aria-label="${escapeHtml(renderLabels.sectionMapAria)}">
  <div class="source-section-map-intro">
    <p class="semantic-label">${escapeHtml(renderLabels.sectionMap)}</p>
    <p>${escapeHtml(renderLabels.sectionMapHelp)}</p>
  </div>
  ${lanesHtml}
  <div class="source-section-map-grid">
${cards}
  </div>
</nav>`;
}

type SectionMapLaneConfig = {
  key: "route" | "model" | "judgment";
  title: string;
  kinds: SectionSemanticTraceLink["kind"][];
};

function renderSourceSectionMapLanes(
  toc: TocEntry[],
  semanticTraces: Map<string, SectionSemanticTraceLink[]>,
  summariesById: Map<string, NonNullable<RenderAnnotations["section_summaries"]>[number]>,
  labels: RenderLabels,
): string {
  const laneConfigs: SectionMapLaneConfig[] = [
    {
      key: "model",
      title: labels.sectionMapLaneModel,
      kinds: ["model", "relationship", "glossary", "reference"],
    },
    {
      key: "judgment",
      title: labels.sectionMapLaneJudgment,
      kinds: ["principle", "decision", "requirement", "evidence", "risk", "scope", "checklist", "question"],
    },
  ];

  const lanes = laneConfigs
    .map((lane) => renderSourceSectionMapLane(lane, toc, semanticTraces, summariesById, labels))
    .filter(Boolean)
    .join("\n");
  if (!lanes) return "";

  return `<div class="source-section-map-lanes" aria-label="${escapeHtml(labels.sectionMapLanesAria)}">
${lanes}
  </div>`;
}

function renderSourceSectionMapLane(
  lane: SectionMapLaneConfig,
  toc: TocEntry[],
  semanticTraces: Map<string, SectionSemanticTraceLink[]>,
  summariesById: Map<string, NonNullable<RenderAnnotations["section_summaries"]>[number]>,
  labels: RenderLabels,
): string {
  const allowedKinds = new Set(lane.kinds);
  const links = toc
    .map((entry, index) => {
      const trace = (semanticTraces.get(entry.id) ?? []).find((link) => allowedKinds.has(link.kind));
      if (!trace) return "";
      const number = entry.number ?? String(index + 1);
      const summary = summariesById.get(entry.id);
      const purpose = summary?.reader_hint || summary?.summary || "";
      const purposeHtml = purpose
        ? `<span class="source-section-lane-purpose">${escapeHtml(purpose)}</span>`
        : "";
      return `<a class="source-section-lane-link" href="#${escapeHtml(entry.id)}">
        <span class="source-section-lane-number">§ ${escapeHtml(number)}</span>
        <span class="source-section-lane-body">
          <span class="source-section-lane-section">${escapeHtml(entry.text)}</span>
          <span class="source-section-lane-role">${escapeHtml(localizeTraceLabel(trace, labels))}</span>
          ${purposeHtml}
        </span>
      </a>`;
    })
    .filter(Boolean)
    .slice(0, 5)
    .join("\n");
  if (!links) return "";

  return `<section class="source-section-lane source-section-lane-${escapeHtml(lane.key)}">
    <p class="source-section-lane-title">${escapeHtml(lane.title)}</p>
    <div class="source-section-lane-links">
${links}
    </div>
  </section>`;
}

function renderSourceSectionSubsectionLinks(entry: TocEntry, labels: RenderLabels): string {
  const children = entry.children ?? [];
  if (!children.length) return "";

  const visibleChildren = children.slice(0, 3);
  const extraCount = children.length - visibleChildren.length;
  const links = visibleChildren
    .map((child) => `<a href="#${escapeHtml(child.id)}">${escapeHtml(subsectionLinkLabel(child))}</a>`)
    .join("");
  const more = extraCount > 0 ? `<span>${escapeHtml(labels.moreSubsections(extraCount))}</span>` : "";

  return `<span class="source-section-subsections" aria-label="${escapeHtml(labels.subsectionLinksAria)}">${links}${more}</span>`;
}

function subsectionLinkLabel(child: TocEntry): string {
  return child.number ? `${child.number} ${child.text}` : child.text;
}

function tocSemanticTraceAnchors(toc: TocEntry[]): SemanticTraceAnchor[] {
  return toc.flatMap((entry) => [
    {
      id: entry.id,
      level: 2 as const,
      text: entry.text,
    },
    ...(entry.children ?? []).map((child) => ({
      id: child.id,
      level: 3 as const,
      text: child.text,
    })),
  ]);
}

function renderSourceSectionRoleChips(traceLinks: SectionSemanticTraceLink[], labels: RenderLabels): string {
  if (!traceLinks.length) return "";
  const label = labels.dossierLens === "Dossier 透镜"
    ? `${traceLinks.length} 个语义角色`
    : traceLinks.length === 1 ? "1 semantic role" : `${traceLinks.length} semantic roles`;
  return `<details class="source-section-role-summary" aria-label="${escapeHtml(labels.semanticRolesAria)}">
  <summary>${escapeHtml(label)}</summary>
  <span class="source-section-role-summary-links">${traceLinks.map((link) => renderSourceSectionRoleLink(link, labels)).join("")}</span>
</details>`;
}

function renderSourceSectionRoleLink(link: SectionSemanticTraceLink, labels: RenderLabels): string {
  return `<a class="source-section-role-chip section-semantic-chip section-semantic-${escapeHtml(link.kind)}" href="${escapeHtml(link.href)}">${escapeHtml(localizeTraceLabel(link, labels))}</a>`;
}

function renderFrontmatterCard(
  frontmatter: Record<string, unknown>,
  title: string,
  subtitle: string,
  status: string,
  updated: string,
  readingMinutes: number,
  executiveBriefHtml: string,
  documentNotesHtml: string,
  hasSemanticLens: boolean,
  labels: RenderLabels,
): string {
  const badgeClass = badgeClassForStatus(status);
  const eyebrow = renderEyebrow(frontmatter);
  const statRow = renderStatRow(frontmatter, status, badgeClass, updated, readingMinutes, labels);
  const relations = renderRelationDetails(frontmatter, labels, hasSemanticLens);

  if (hasSemanticLens) {
    return `<header class="frontmatter artifact-header" data-semantic-lens="present">
  <div class="artifact-title-row">
    <div class="artifact-title-stack">
      ${eyebrow}
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
    </div>
    <div class="artifact-meta-rail">
      ${statRow}
    </div>
  </div>
  ${executiveBriefHtml}
  ${documentNotesHtml}
  ${relations}
</header>`;
  }

  return `<header class="frontmatter">
  ${eyebrow}
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  ${executiveBriefHtml}
  ${statRow}
  ${documentNotesHtml}
  ${relations}
</header>`;
}

function prepareFirstScreenContent(contentHtml: string): {
  contentHtml: string;
  executiveBriefHtml: string;
  documentNotesHtml: string;
} {
  const withNotes = extractTopDocumentNotes(contentHtml);
  const withBrief = extractFirstTagline(withNotes.contentHtml);
  return {
    contentHtml: withBrief.contentHtml,
    executiveBriefHtml: withBrief.executiveBriefHtml,
    documentNotesHtml: withNotes.documentNotesHtml,
  };
}

function extractFirstTagline(contentHtml: string): {
  contentHtml: string;
  executiveBriefHtml: string;
} {
  const block = findDivBlock(contentHtml, (openTag) => hasClass(openTag, "tagline"));
  if (!block) return { contentHtml, executiveBriefHtml: "" };

  const body = block.innerHtml
    .replace(/<span class="tagline-label">[\s\S]*?<\/span>/, "")
    .trim();
  const executiveBriefHtml = `<div class="executive-brief" aria-label="文档摘要">
  <p class="executive-brief-label">摘要</p>
  <div class="executive-brief-body">${body}</div>
</div>`;
  return {
    contentHtml: removeHtmlRange(contentHtml, block.start, block.end).replace(/\n{3,}/g, "\n\n"),
    executiveBriefHtml,
  };
}

function extractTopDocumentNotes(contentHtml: string): {
  contentHtml: string;
  documentNotesHtml: string;
} {
  const firstSectionIndex = contentHtml.indexOf("<section ");
  if (firstSectionIndex < 0) return { contentHtml, documentNotesHtml: "" };

  const leadHtml = contentHtml.slice(0, firstSectionIndex);
  const restHtml = contentHtml.slice(firstSectionIndex);
  const extracted = extractDivBlocks(leadHtml, (openTag) => hasClass(openTag, "callout"));
  const callouts = extracted.blocks;
  if (callouts.length === 0) return { contentHtml, documentNotesHtml: "" };

  const remainingLeadHtml = extracted.html.trim();
  const summary = `${callouts.length} 条文档提示`;
  const documentNotesHtml = `<details class="document-notes">
  <summary>${escapeHtml(summary)}</summary>
  <div class="document-notes-body">${callouts.join("\n")}</div>
</details>`;

  return {
    contentHtml: `${remainingLeadHtml ? `${remainingLeadHtml}\n` : ""}${restHtml}`,
    documentNotesHtml,
  };
}

type HtmlBlock = {
  start: number;
  end: number;
  innerHtml: string;
};

function extractDivBlocks(
  html: string,
  predicate: (openTag: string) => boolean,
): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  const pieces: string[] = [];
  let cursor = 0;
  let searchStart = 0;

  while (searchStart < html.length) {
    const block = findDivBlock(html, predicate, searchStart);
    if (!block) break;
    pieces.push(html.slice(cursor, block.start));
    blocks.push(html.slice(block.start, block.end));
    cursor = block.end;
    searchStart = block.end;
  }

  pieces.push(html.slice(cursor));
  return { html: pieces.join(""), blocks };
}

function findDivBlock(
  html: string,
  predicate: (openTag: string) => boolean,
  startIndex = 0,
): HtmlBlock | null {
  const tagPattern = /<div\b[^>]*>|<\/div>/gi;
  tagPattern.lastIndex = startIndex;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html))) {
    const openTag = match[0];
    if (openTag.startsWith("</") || !predicate(openTag)) continue;

    const blockStart = match.index;
    const innerStart = tagPattern.lastIndex;
    let depth = 1;

    while ((match = tagPattern.exec(html))) {
      if (match[0].startsWith("</")) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        return {
          start: blockStart,
          end: tagPattern.lastIndex,
          innerHtml: html.slice(innerStart, match.index),
        };
      }
    }

    return null;
  }

  return null;
}

function removeHtmlRange(html: string, start: number, end: number): string {
  return `${html.slice(0, start)}${html.slice(end)}`;
}

function hasClass(openTag: string, className: string): boolean {
  const match = openTag.match(/\bclass="([^"]*)"/);
  if (!match) return false;
  return match[1].split(/\s+/).includes(className);
}

function renderEyebrow(frontmatter: Record<string, unknown>): string {
  const kind = stringValue(frontmatter.kind);
  if (!kind) return "";
  const label = kind.replace(/[-_]/g, " ").toUpperCase();
  return `<p class="eyebrow">${escapeHtml(label)}</p>`;
}

function renderStatRow(
  frontmatter: Record<string, unknown>,
  status: string,
  badgeClass: string,
  updated: string,
  readingMinutes: number,
  labels: RenderLabels,
): string {
  const owner = stringValue(frontmatter.owner);
  const created = stringValue(frontmatter.created);
  const implementsCount = arrayLength(frontmatter.implements);
  const reviewsCount = arrayLength(frontmatter.reviews);

  const stats: string[] = [];
  stats.push(
    `<span class="badge${badgeClass ? ` ${escapeHtml(badgeClass)}` : ""}">${escapeHtml(labels.statusBadge(status))}</span>`,
  );
  if (readingMinutes > 0) stats.push(stat(labels.frontmatterReading, labels.readingTime(readingMinutes)));
  if (updated) stats.push(stat(labels.frontmatterUpdated, updated));
  if (owner) stats.push(stat(labels.frontmatterOwner, owner));
  if (created && created !== updated) stats.push(stat(labels.frontmatterCreated, created));
  if (implementsCount > 0) stats.push(stat(labels.frontmatterImplements, String(implementsCount)));
  if (reviewsCount > 0) stats.push(stat(labels.frontmatterReviews, String(reviewsCount)));

  return `<div class="stat-row">${stats.join("")}</div>`;
}

function estimateReadingMinutes(html: string): number {
  const text = html
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  const cjkChars = (text.match(/[㐀-鿿]/g) ?? []).length;
  const otherChars = text.length - cjkChars;
  const otherWords = otherChars > 0 ? otherChars / 5 : 0;
  const minutes = cjkChars / 400 + otherWords / 220;
  return Math.max(1, Math.round(minutes));
}

function stat(label: string, value: string): string {
  return `<span class="stat"><span class="stat-label">${escapeHtml(label)}</span><span class="stat-value">${escapeHtml(value)}</span></span>`;
}

function renderRelationDetails(frontmatter: Record<string, unknown>, labels: RenderLabels, compact = false): string {
  const implementsList = arrayValue(frontmatter.implements);
  const reviewsList = arrayValue(frontmatter.reviews);
  if (implementsList.length === 0 && reviewsList.length === 0) return "";

  const counts: string[] = [];
  if (implementsList.length > 0) counts.push(labels.frontmatterRelationCount("implements", implementsList.length));
  if (reviewsList.length > 0) counts.push(labels.frontmatterRelationCount("reviews", reviewsList.length));

  const blocks: string[] = [];
  if (implementsList.length > 0) blocks.push(renderRelationBlock(labels.frontmatterImplements, implementsList));
  if (reviewsList.length > 0) blocks.push(renderRelationBlock(labels.frontmatterReviews, reviewsList));

  return `<details class="frontmatter-details${compact ? " compact-relations" : ""}">
  <summary>${escapeHtml(counts.join(" · "))}</summary>
  ${blocks.join("\n")}
</details>`;
}

function renderRelationBlock(label: string, items: string[]): string {
  const lis = items
    .map((item) => `<li><code>${escapeHtml(item)}</code></li>`)
    .join("");
  return `<div class="relation-block">
  <p class="relation-label">${escapeHtml(label)}</p>
  <ul class="relation-list">${lis}</ul>
</div>`;
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function arrayLength(value: unknown): number {
  return arrayValue(value).length;
}

function renderToc(
  toc: TocEntry[],
  annotations: RenderAnnotations | undefined,
  hasSemanticLens: boolean,
  labels?: RenderLabels,
): string {
  const count = toc.length;
  const renderLabels = labels ?? labelsForLanguage("zh-CN");
  const lensGroup = hasSemanticLens ? renderLensTocGroup(annotations, hasSectionMap(toc, annotations), renderLabels) : "";
  const items = toc.map((entry, index) => renderTocEntry(entry, index + 1)).join("\n");
  return `<aside class="toc" data-progressive-toc>
  <p class="toc-header">${escapeHtml(renderLabels.tocHeader(count))}</p>
${lensGroup}
  <ol>
${items}
  </ol>
</aside>`;
}

function renderLensTocGroup(
  annotations: RenderAnnotations | undefined,
  includeSectionMap: boolean,
  labels: RenderLabels,
): string {
  const links: string[] = [];
  if (annotations?.document_overview || annotations?.reading_path?.length) {
    links.push(renderLensTocLink(SEMANTIC_OVERVIEW_ANCHOR_ID, labels.overview));
  }
  const semanticBlocks = annotations?.semantic_blocks ?? [];
  const blockTypeCounts = semanticBlocks.reduce((counts, block) => {
    counts.set(block.type, (counts.get(block.type) ?? 0) + 1);
    return counts;
  }, new Map<SemanticBlockAnnotation["type"], number>());
  for (const view of orderSemanticBlockViewsForLens(createSemanticBlockViews(semanticBlocks))) {
    const block = view.block;
    const isRepeatedType = (blockTypeCounts.get(block.type) ?? 0) > 1;
    links.push(renderLensTocLink(view.id, semanticBlockTocLabel(block, isRepeatedType, labels)));
  }
  links.push(renderLensTocLink(SOURCE_SECTIONS_ANCHOR_ID, labels.sourceSections));
  if (includeSectionMap) links.push(renderLensTocLink(SOURCE_SECTION_MAP_ANCHOR_ID, labels.sectionMap));
  if (!links.length) return "";
  return `<div class="toc-lens-group" aria-label="${escapeHtml(labels.lensNavigationAria)}">
  <p class="toc-lens-title">${escapeHtml(labels.dossierLens)}</p>
  <ol>
${links.join("\n")}
  </ol>
</div>`;
}

function renderLensTocLink(id: string, label: string): string {
  return `    <li><a href="#${escapeHtml(id)}"><span class="toc-num">•</span><span>${escapeHtml(label)}</span></a></li>`;
}

function semanticBlockTocLabel(block: SemanticBlockAnnotation, disambiguate: boolean, labels: RenderLabels): string {
  if (block.type === "takeaway_grid") return block.title || labels.takeaways;
  if (disambiguate) return block.title;
  if (block.type === "structure_map") return labels.structureMap;
  if (block.type === "relationship_map") return labels.relationshipMap;
  if (block.type === "roadmap") return labels.roadmap;
  if (block.type === "requirement_grid") return labels.requirements;
  if (block.type === "reference_list") return labels.references;
  if (block.type === "principle_grid") return labels.principles;
  if (block.type === "decision_grid") return labels.decisions;
  if (block.type === "evidence_grid") return labels.evidence;
  if (block.type === "risk_register") return labels.risks;
  if (block.type === "scope_boundary") return labels.scope;
  if (block.type === "open_questions") return labels.openQuestions;
  if (block.type === "concept_glossary") return labels.glossary;
  return labels.checklist;
}

function hasSectionMap(toc: TocEntry[], annotations: RenderAnnotations | undefined): boolean {
  if (!toc.length || !annotations?.section_summaries.length) return false;
  const summaryIds = new Set(annotations.section_summaries.map((summary) => summary.section_id));
  return toc.some((entry) => summaryIds.has(entry.id));
}

function renderTocEntry(entry: TocEntry, index: number): string {
  const children = entry.children?.length
    ? `<ol class="toc-children">${entry.children.map((child, childIndex) => renderTocChild(child, index, childIndex + 1)).join("")}</ol>`
    : "";
  return `    <li class="toc-section"><a href="#${escapeHtml(entry.id)}"><span class="toc-num">§${escapeHtml(entry.number ?? String(index))}</span><span>${escapeHtml(entry.text)}</span></a>${children}</li>`;
}

function renderTocChild(entry: TocEntry, sectionIndex: number, childIndex: number): string {
  return `<li><a href="#${escapeHtml(entry.id)}"><span class="toc-num">${escapeHtml(entry.number ?? `${sectionIndex}.${childIndex}`)}</span><span>${escapeHtml(entry.text)}</span></a></li>`;
}

function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function splitTitleAndSubtitle(title: string, explicitSubtitle: string): { title: string; subtitle: string } {
  if (explicitSubtitle) return { title, subtitle: explicitSubtitle };
  const parts = title.split(/\s+(?:—|--|-)\s+/);
  if (parts.length <= 1) return { title, subtitle: "" };
  return {
    title: parts[0],
    subtitle: parts.slice(1).join(" — "),
  };
}

function badgeClassForStatus(status: string): string {
  if (status === "draft") return "draft";
  if (status === "ready") return "ready";
  if (status === "implemented") return "ok";
  if (status === "archived") return "warn";
  return "";
}
