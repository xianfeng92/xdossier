import type { RenderAnnotations, SemanticBlockAnnotation } from "./types.js";

export const SEMANTIC_OVERVIEW_ANCHOR_ID = "lens-overview";

export type SectionSemanticTraceLink = {
  href: string;
  label: string;
  kind: "path" | "model" | "relationship" | "roadmap" | "requirement" | "reference" | "takeaway" | "principle" | "decision" | "evidence" | "risk" | "scope" | "checklist" | "question" | "glossary";
};

export type SemanticTraceAnchor = {
  id: string;
  level: 2 | 3;
  text: string;
};

export function semanticBlockAnchorId(block: SemanticBlockAnnotation, index: number): string {
  return `lens-${semanticBlockSlug(block)}-${index + 1}`;
}

export function semanticBlockItemAnchorId(blockId: string, itemIndex: number): string {
  return `${blockId}-item-${itemIndex + 1}`;
}

export function semanticStructureNodeAnchorId(blockId: string, nodeId: string): string {
  return `${blockId}-node-${nodeId}`;
}

export function collectSectionSemanticTrace(
  annotations?: RenderAnnotations,
  anchors: SemanticTraceAnchor[] = [],
): Map<string, SectionSemanticTraceLink[]> {
  const traces = new Map<string, SectionSemanticTraceLink[]>();

  const add = (sectionId: string | undefined, link: SectionSemanticTraceLink) => {
    if (!sectionId) return;
    const links = traces.get(sectionId) ?? [];
    if (links.some((existing) => existing.href === link.href)) return;
    links.push(link);
    traces.set(sectionId, links);
  };

  for (const item of annotations?.reading_path ?? []) {
    add(item.section_id, {
      href: `#${SEMANTIC_OVERVIEW_ANCHOR_ID}`,
      label: `Path: ${item.label}`,
      kind: "path",
    });
  }

  for (const [index, block] of (annotations?.semantic_blocks ?? []).entries()) {
    const blockId = semanticBlockAnchorId(block, index);
    const link = {
      href: `#${blockId}`,
      label: semanticBlockLabel(block),
      kind: semanticBlockKind(block),
    };

    if (block.type === "structure_map") {
      const nodeSectionIds = new Set(
        block.nodes
          .map((node) => node.section_id)
          .filter((sectionId): sectionId is string => Boolean(sectionId)),
      );
      if (!block.source_section_id || !nodeSectionIds.has(block.source_section_id)) {
        add(block.source_section_id, link);
      }
      for (const node of block.nodes) {
        add(node.section_id, {
          href: `#${semanticStructureNodeAnchorId(blockId, node.id)}`,
          label: `Model: ${node.label}`,
          kind: "model",
        });
      }
    }
    if (block.type === "relationship_map") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Relation: ${item.from} to ${item.to}`,
          kind: "relationship",
        });
      });
    }
    if (block.type === "roadmap") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        const itemId = item.section_id || resolveRoadmapItemSectionId(item, anchors);
        add(itemId, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Roadmap: ${item.label}`,
          kind: "roadmap",
        });
      });
    }
    if (block.type === "requirement_grid") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Requirement: ${item.label}`,
          kind: "requirement",
        });
      });
    }
    if (block.type === "reference_list") {
      add(block.source_section_id, link);
    }
    if (block.type === "takeaway_grid") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Takeaway: ${item.label}`,
          kind: "takeaway",
        });
      });
    }
    if (block.type === "principle_grid") {
      add(block.source_section_id, link);
    }
    if (block.type === "decision_grid") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Decision: ${item.label}`,
          kind: "decision",
        });
      });
    }
    if (block.type === "evidence_grid") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Evidence: ${item.label}`,
          kind: "evidence",
        });
      });
    }
    if (block.type === "risk_register") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Risk: ${item.label}`,
          kind: "risk",
        });
      });
    }
    if (block.type === "scope_boundary") {
      add(block.source_section_id, link);
    }
    if (block.type === "checklist") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Checklist: ${item.label}`,
          kind: "checklist",
        });
      });
    }
    if (block.type === "open_questions") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Question: ${item.question}`,
          kind: "question",
        });
      });
    }
    if (block.type === "concept_glossary") {
      add(block.source_section_id, link);
      block.items.forEach((item, itemIndex) => {
        add(item.section_id, {
          href: `#${semanticBlockItemAnchorId(blockId, itemIndex)}`,
          label: `Glossary: ${item.term}`,
          kind: "glossary",
        });
      });
    }
  }

  return traces;
}

function resolveRoadmapItemSectionId(
  item: { label: string; title: string },
  anchors: SemanticTraceAnchor[],
): string | undefined {
  const label = normalizeTraceText(item.label);
  const title = normalizeTraceText(item.title);
  if (!title) return undefined;

  const candidates = anchors.filter((anchor) => anchor.level === 3);
  const exact = candidates.find((anchor) => {
    const text = normalizeTraceText(anchor.text);
    return text.includes(title) && (!label || text.includes(label));
  });
  if (exact) return exact.id;

  return candidates.find((anchor) => normalizeTraceText(anchor.text).includes(title))?.id;
}

function normalizeTraceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function semanticBlockSlug(block: SemanticBlockAnnotation): string {
  if (block.type === "requirement_grid") return "requirement-grid";
  if (block.type === "reference_list") return "reference-list";
  if (block.type === "takeaway_grid") return "takeaway-grid";
  if (block.type === "principle_grid") return "principle-grid";
  if (block.type === "decision_grid") return "decision-grid";
  if (block.type === "evidence_grid") return "evidence-grid";
  if (block.type === "risk_register") return "risk-register";
  if (block.type === "scope_boundary") return "scope-boundary";
  if (block.type === "open_questions") return "open-questions";
  if (block.type === "concept_glossary") return "concept-glossary";
  if (block.type === "relationship_map") return "relationship-map";
  if (block.type === "structure_map") return "structure-map";
  return block.type;
}

function semanticBlockLabel(block: SemanticBlockAnnotation): SectionSemanticTraceLink["label"] {
  if (block.type === "structure_map") return "Model";
  if (block.type === "relationship_map") return "Relations";
  if (block.type === "roadmap") return "Roadmap";
  if (block.type === "requirement_grid") return "Requirements";
  if (block.type === "reference_list") return "References";
  if (block.type === "takeaway_grid") return "Takeaways";
  if (block.type === "principle_grid") return "Principles";
  if (block.type === "decision_grid") return "Decisions";
  if (block.type === "evidence_grid") return "Evidence";
  if (block.type === "risk_register") return "Risks";
  if (block.type === "scope_boundary") return "Scope";
  if (block.type === "open_questions") return "Questions";
  if (block.type === "concept_glossary") return "Glossary";
  return "Checklist";
}

function semanticBlockKind(block: SemanticBlockAnnotation): SectionSemanticTraceLink["kind"] {
  if (block.type === "structure_map") return "model";
  if (block.type === "relationship_map") return "relationship";
  if (block.type === "roadmap") return "roadmap";
  if (block.type === "requirement_grid") return "requirement";
  if (block.type === "reference_list") return "reference";
  if (block.type === "takeaway_grid") return "takeaway";
  if (block.type === "principle_grid") return "principle";
  if (block.type === "decision_grid") return "decision";
  if (block.type === "evidence_grid") return "evidence";
  if (block.type === "risk_register") return "risk";
  if (block.type === "scope_boundary") return "scope";
  if (block.type === "open_questions") return "question";
  if (block.type === "concept_glossary") return "glossary";
  return "checklist";
}
