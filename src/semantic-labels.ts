import type { SectionSemanticTraceLink } from "./semantic-trace.js";

export type DocumentLanguage = "zh-CN" | "en";

export type SemanticTraceLabels = {
  semanticTraceSectionAria: string;
  semanticTraceSubsectionAria: string;
  semanticTraceLead: string;
  readerHintAriaPrefix: string;
  readerHintLabel: string;
  tracePathPrefix: string;
  traceModelPrefix: string;
  traceRelationPrefix: string;
  traceRoadmapPrefix: string;
  traceRequirementPrefix: string;
  traceReferencePrefix: string;
  traceTakeawayPrefix: string;
  tracePrinciplePrefix: string;
  traceDecisionPrefix: string;
  traceEvidencePrefix: string;
  traceRiskPrefix: string;
  traceChecklistPrefix: string;
  traceQuestionPrefix: string;
  traceGlossaryPrefix: string;
  traceSeparator: string;
  model: string;
  relationshipMap: string;
  roadmap: string;
  requirements: string;
  references: string;
  takeaways: string;
  principles: string;
  decisions: string;
  evidence: string;
  risks: string;
  scope: string;
  questions: string;
  glossary: string;
  checklist: string;
};

export function detectDocumentLanguage(text: string): DocumentLanguage {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return "zh-CN";
  const cjkCount = (compact.match(/[\u3400-\u9fff]/g) ?? []).length;
  return cjkCount >= 8 || cjkCount / compact.length >= 0.18 ? "zh-CN" : "en";
}

export function semanticTraceLabelsForLanguage(language: DocumentLanguage): SemanticTraceLabels {
  if (language === "en") {
    return {
      semanticTraceSectionAria: "Semantic trace for this section",
      semanticTraceSubsectionAria: "Semantic trace for this subsection",
      semanticTraceLead: "Used in",
      readerHintAriaPrefix: "Read",
      readerHintLabel: "READ",
      tracePathPrefix: "Path",
      traceModelPrefix: "Model",
      traceRelationPrefix: "Relation",
      traceRoadmapPrefix: "Roadmap",
      traceRequirementPrefix: "Requirement",
      traceReferencePrefix: "Reference",
      traceTakeawayPrefix: "Takeaway",
      tracePrinciplePrefix: "Principle",
      traceDecisionPrefix: "Decision",
      traceEvidencePrefix: "Evidence",
      traceRiskPrefix: "Risk",
      traceChecklistPrefix: "Checklist",
      traceQuestionPrefix: "Question",
      traceGlossaryPrefix: "Glossary",
      traceSeparator: ": ",
      model: "Model",
      relationshipMap: "Relationship Map",
      roadmap: "Roadmap",
      requirements: "Requirements",
      references: "References",
      takeaways: "Takeaways",
      principles: "Principles",
      decisions: "Decisions",
      evidence: "Evidence",
      risks: "Risks",
      scope: "Scope",
      questions: "Questions",
      glossary: "Glossary",
      checklist: "Checklist",
    };
  }

  return {
    semanticTraceSectionAria: "本节语义引用",
    semanticTraceSubsectionAria: "小节语义引用",
    semanticTraceLead: "用于",
    readerHintAriaPrefix: "阅读提示",
    readerHintLabel: "阅读",
    tracePathPrefix: "路径",
    traceModelPrefix: "模型",
    traceRelationPrefix: "关系",
    traceRoadmapPrefix: "路线图",
    traceRequirementPrefix: "要求",
    traceReferencePrefix: "参考",
    traceTakeawayPrefix: "要点",
    tracePrinciplePrefix: "原则",
    traceDecisionPrefix: "决策",
    traceEvidencePrefix: "证据",
    traceRiskPrefix: "风险",
    traceChecklistPrefix: "检查清单",
    traceQuestionPrefix: "问题",
    traceGlossaryPrefix: "术语",
    traceSeparator: "：",
    model: "模型",
    relationshipMap: "关系图",
    roadmap: "路线图",
    requirements: "要求",
    references: "参考资料",
    takeaways: "借鉴要点",
    principles: "原则",
    decisions: "决策",
    evidence: "证据",
    risks: "风险",
    scope: "范围",
    questions: "问题",
    glossary: "术语表",
    checklist: "检查清单",
  };
}

export function localizeTraceLabel(link: SectionSemanticTraceLink, labels: SemanticTraceLabels): string {
  if (link.label.startsWith("Path: ")) return `${labels.tracePathPrefix}${labels.traceSeparator}${link.label.slice("Path: ".length)}`;
  if (link.label.startsWith("Model: ")) return `${labels.traceModelPrefix}${labels.traceSeparator}${link.label.slice("Model: ".length)}`;
  if (link.label.startsWith("Relation: ")) return `${labels.traceRelationPrefix}${labels.traceSeparator}${link.label.slice("Relation: ".length)}`;
  if (link.label.startsWith("Roadmap: ")) return `${labels.traceRoadmapPrefix}${labels.traceSeparator}${link.label.slice("Roadmap: ".length)}`;
  if (link.label.startsWith("Requirement: ")) return `${labels.traceRequirementPrefix}${labels.traceSeparator}${link.label.slice("Requirement: ".length)}`;
  if (link.label.startsWith("Reference: ")) return `${labels.traceReferencePrefix}${labels.traceSeparator}${link.label.slice("Reference: ".length)}`;
  if (link.label.startsWith("Takeaway: ")) return `${labels.traceTakeawayPrefix}${labels.traceSeparator}${link.label.slice("Takeaway: ".length)}`;
  if (link.label.startsWith("Principle: ")) return `${labels.tracePrinciplePrefix}${labels.traceSeparator}${link.label.slice("Principle: ".length)}`;
  if (link.label.startsWith("Decision: ")) return `${labels.traceDecisionPrefix}${labels.traceSeparator}${link.label.slice("Decision: ".length)}`;
  if (link.label.startsWith("Evidence: ")) return `${labels.traceEvidencePrefix}${labels.traceSeparator}${link.label.slice("Evidence: ".length)}`;
  if (link.label.startsWith("Risk: ")) return `${labels.traceRiskPrefix}${labels.traceSeparator}${link.label.slice("Risk: ".length)}`;
  if (link.label.startsWith("Checklist: ")) return `${labels.traceChecklistPrefix}${labels.traceSeparator}${link.label.slice("Checklist: ".length)}`;
  if (link.label.startsWith("Question: ")) return `${labels.traceQuestionPrefix}${labels.traceSeparator}${link.label.slice("Question: ".length)}`;
  if (link.label.startsWith("Glossary: ")) return `${labels.traceGlossaryPrefix}${labels.traceSeparator}${link.label.slice("Glossary: ".length)}`;
  if (link.label === "Model") return labels.model;
  if (link.label === "Relations") return labels.relationshipMap;
  if (link.label === "Roadmap") return labels.roadmap;
  if (link.label === "Requirements") return labels.requirements;
  if (link.label === "References") return labels.references;
  if (link.label === "Takeaways") return labels.takeaways;
  if (link.label === "Principles") return labels.principles;
  if (link.label === "Decisions") return labels.decisions;
  if (link.label === "Evidence") return labels.evidence;
  if (link.label === "Risks") return labels.risks;
  if (link.label === "Scope") return labels.scope;
  if (link.label === "Questions") return labels.questions;
  if (link.label === "Glossary") return labels.glossary;
  if (link.label === "Checklist") return labels.checklist;
  return link.label;
}
