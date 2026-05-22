import { parseMarkdownToTokens } from "../parse/markdown.js";
import { parseFrontmatter } from "../parse/frontmatter.js";
import { applySemantic, type DossierToken } from "../parse/semantic.js";
import type { RenderAnnotations, SemanticBlockAnnotation } from "../types.js";

export type EnrichmentContractReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  error_count: number;
  warning_count: number;
  anchor_count: number;
  reference_count: number;
};

export type ValidateEnrichmentContractInput = {
  markdown: string;
  annotations: RenderAnnotations;
  sourceLabel?: string;
};

export function validateEnrichmentContract(input: ValidateEnrichmentContractInput): EnrichmentContractReport {
  const sourceLabel = input.sourceLabel ?? "annotations";
  const anchors = sourceAnchors(input.markdown);
  const errors: string[] = [];
  const warnings: string[] = [];
  const references = collectAnnotationReferences(input.annotations);

  if (!input.annotations.contract) {
    warnings.push(`${sourceLabel}: missing v0.4 contract metadata`);
  } else {
    if (input.annotations.contract.name !== "dossier-ai-enrichment") {
      errors.push(`${sourceLabel}: contract.name must be dossier-ai-enrichment`);
    }
    if (input.annotations.contract.version !== "0.4") {
      errors.push(`${sourceLabel}: contract.version must be 0.4`);
    }
    if (!input.annotations.contract.producer.trim()) {
      errors.push(`${sourceLabel}: contract.producer must be a non-empty string`);
    }
    if (input.annotations.contract.created_at && !/^\d{4}-\d{2}-\d{2}$/.test(input.annotations.contract.created_at)) {
      errors.push(`${sourceLabel}: contract.created_at must be YYYY-MM-DD`);
    }
  }

  for (const reference of references) {
    if (!anchors.has(reference.id)) {
      errors.push(`${sourceLabel}: ${reference.path} references missing source anchor ${reference.id}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    error_count: errors.length,
    warning_count: warnings.length,
    anchor_count: anchors.size,
    reference_count: references.length,
  };
}

export function enrichmentContractSchema(): Record<string, unknown> {
  return {
    name: "dossier-ai-enrichment",
    version: "0.4",
    requires: {
      schema_version: [1, 2],
      contract: {
        name: "dossier-ai-enrichment",
        version: "0.4",
        producer: "non-empty string",
        created_at: "optional YYYY-MM-DD",
      },
    },
    validates: [
      "JSON parses as RenderAnnotations",
      "section_summaries section_id values exist in source markdown",
      "reading_path section_id values exist in source markdown",
      "semantic_blocks source_section_id and item section_id values exist in source markdown",
      "checkpoints and analogies section_id values exist in source markdown",
    ],
  };
}

function sourceAnchors(markdown: string): Set<string> {
  const parsed = parseFrontmatter(markdown);
  const tokens = applySemantic(parseMarkdownToTokens(parsed.content)) as DossierToken[];
  const anchors = new Set<string>();
  for (const token of tokens) {
    if (token.type === "heading" && (token.depth === 2 || token.depth === 3) && token._dossierId) {
      anchors.add(token._dossierId);
    }
  }
  return anchors;
}

type Reference = {
  path: string;
  id: string;
};

function collectAnnotationReferences(annotations: RenderAnnotations): Reference[] {
  const references: Reference[] = [];
  annotations.section_summaries.forEach((summary, index) => {
    references.push({ path: `section_summaries[${index}].section_id`, id: summary.section_id });
  });
  annotations.reading_path?.forEach((item, index) => {
    references.push({ path: `reading_path[${index}].section_id`, id: item.section_id });
  });
  annotations.checkpoints?.forEach((checkpoint, index) => {
    references.push({ path: `checkpoints[${index}].section_id`, id: checkpoint.section_id });
  });
  annotations.analogies?.forEach((analogy, index) => {
    references.push({ path: `analogies[${index}].section_id`, id: analogy.section_id });
  });
  annotations.semantic_blocks?.forEach((block, index) => {
    collectSemanticBlockReferences(block, index, references);
  });
  return references;
}

function collectSemanticBlockReferences(
  block: SemanticBlockAnnotation,
  blockIndex: number,
  references: Reference[],
): void {
  if (block.source_section_id) {
    references.push({ path: `semantic_blocks[${blockIndex}].source_section_id`, id: block.source_section_id });
  }
  if (block.type === "structure_map") {
    block.nodes.forEach((node, nodeIndex) => {
      if (node.section_id) {
        references.push({ path: `semantic_blocks[${blockIndex}].nodes[${nodeIndex}].section_id`, id: node.section_id });
      }
    });
    return;
  }
  if (block.type === "scope_boundary") return;
  const items = "items" in block ? block.items : [];
  items.forEach((item: { section_id?: string }, itemIndex: number) => {
    if (item.section_id) {
      references.push({ path: `semantic_blocks[${blockIndex}].items[${itemIndex}].section_id`, id: item.section_id });
    }
  });
}
