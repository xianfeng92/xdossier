import type {
  AnalogyAnnotation,
  ChecklistBlockAnnotation,
  CheckpointAnnotation,
  ChecklistItemAnnotation,
  ChecklistItemStatus,
  ConceptGlossaryBlockAnnotation,
  ConceptGlossaryItemAnnotation,
  ContentMode,
  DecisionGridBlockAnnotation,
  DocumentOverviewAnnotation,
  EvidenceGridBlockAnnotation,
  EvidenceItemAnnotation,
  OpenQuestionsBlockAnnotation,
  OpenQuestionItemAnnotation,
  OpenQuestionStatus,
  PrincipleGridBlockAnnotation,
  PrincipleItemAnnotation,
  PrerequisiteItemAnnotation,
  ReadingPathAnnotation,
  RelationshipMapBlockAnnotation,
  RelationshipMapItemAnnotation,
  ReferenceItemAnnotation,
  ReferenceListBlockAnnotation,
  RenderAnnotations,
  RequirementGridBlockAnnotation,
  RequirementItemAnnotation,
  RoadmapBlockAnnotation,
  RoadmapItemAnnotation,
  SectionSummaryAnnotation,
  SemanticBlockAnnotation,
  ScopeBoundaryBlockAnnotation,
  StructureMapBlockAnnotation,
  StructureMapEdgeAnnotation,
  StructureMapNodeAnnotation,
  StructureMapNodeKind,
  TakeawayGridBlockAnnotation,
  TakeawayItemAnnotation,
} from "./types.js";

const SECTION_ID_RE = /^s\d+$/;
const ANCHOR_ID_RE = /^s\d+(?:-\d+)?$/;
const STRUCTURE_NODE_ID_RE = /^[a-z][a-z0-9_-]{0,48}$/;
const CONTENT_MODES = new Set(["tutorial", "concept", "reference", "course"]);

export function parseAnnotationsJson(
  raw: string,
  sourceLabel = "annotations",
): RenderAnnotations {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${sourceLabel}: invalid JSON: ${(e as Error).message}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${sourceLabel}: expected a JSON object`);
  }

  const schemaVersion = parsed.schema_version ?? 1;
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    throw new Error(`${sourceLabel}: unsupported schema_version ${String(schemaVersion)}`);
  }

  const rawSummaries = parsed.section_summaries ?? [];
  if (!Array.isArray(rawSummaries)) {
    throw new Error(`${sourceLabel}: section_summaries must be an array`);
  }

  const seen = new Set<string>();
  const sectionSummaries: SectionSummaryAnnotation[] = [];
  rawSummaries.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: section_summaries[${index}] must be an object`);
    }
    const sectionId = stringField(item, "section_id") || stringField(item, "id");
    const summary = stringField(item, "summary").trim();
    if (!sectionId || !SECTION_ID_RE.test(sectionId)) {
      throw new Error(`${sourceLabel}: section_summaries[${index}].section_id must look like s1`);
    }
    if (!summary) {
      throw new Error(`${sourceLabel}: section_summaries[${index}].summary must be a non-empty string`);
    }
    if (seen.has(sectionId)) {
      throw new Error(`${sourceLabel}: duplicate section summary for ${sectionId}`);
    }
    seen.add(sectionId);
    const keyPoints = stringArrayField(item, "key_points");
    const readerHint = stringField(item, "reader_hint").trim();
    sectionSummaries.push({
      section_id: sectionId,
      summary,
      ...(keyPoints.length ? { key_points: keyPoints } : {}),
      ...(readerHint ? { reader_hint: readerHint } : {}),
    });
  });

  const documentOverview = parseDocumentOverview(parsed, sourceLabel);
  const contract = parseEnrichmentContract(parsed, sourceLabel);
  const readingPath = parseReadingPath(parsed, sourceLabel);
  const semanticBlocks = parseSemanticBlocks(parsed, sourceLabel);
  const contentMode = parseContentMode(parsed, sourceLabel);
  const prerequisites = parsePrerequisites(parsed, sourceLabel);
  const checkpoints = parseCheckpoints(parsed, sourceLabel);
  const analogies = parseAnalogies(parsed, sourceLabel);

  return {
    schema_version: schemaVersion,
    source: stringField(parsed, "source") || undefined,
    ...(contract ? { contract } : {}),
    ...(documentOverview ? { document_overview: documentOverview } : {}),
    ...(readingPath ? { reading_path: readingPath } : {}),
    ...(semanticBlocks ? { semantic_blocks: semanticBlocks } : {}),
    section_summaries: sectionSummaries,
    ...(contentMode ? { content_mode: contentMode } : {}),
    ...(prerequisites ? { prerequisites } : {}),
    ...(checkpoints ? { checkpoints } : {}),
    ...(analogies ? { analogies } : {}),
  };
}

function parseEnrichmentContract(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): RenderAnnotations["contract"] | undefined {
  const raw = parsed.contract;
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) throw new Error(`${sourceLabel}: contract must be an object`);
  const name = stringField(raw, "name").trim();
  const version = stringField(raw, "version").trim();
  const producer = stringField(raw, "producer").trim();
  const createdAt = stringField(raw, "created_at").trim();
  if (name !== "dossier-ai-enrichment") {
    throw new Error(`${sourceLabel}: contract.name must be dossier-ai-enrichment`);
  }
  if (version !== "0.4") {
    throw new Error(`${sourceLabel}: contract.version must be 0.4`);
  }
  if (!producer) {
    throw new Error(`${sourceLabel}: contract.producer must be a non-empty string`);
  }
  if (createdAt && !/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
    throw new Error(`${sourceLabel}: contract.created_at must be YYYY-MM-DD`);
  }
  return {
    name: "dossier-ai-enrichment",
    version: "0.4",
    producer,
    ...(createdAt ? { created_at: createdAt } : {}),
  };
}

function parseContentMode(parsed: Record<string, unknown>, sourceLabel: string): ContentMode | undefined {
  const raw = stringField(parsed, "content_mode").trim();
  if (!raw) return undefined;
  if (!CONTENT_MODES.has(raw)) {
    throw new Error(`${sourceLabel}: content_mode must be tutorial, concept, reference, or course`);
  }
  return raw as ContentMode;
}

function parsePrerequisites(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): PrerequisiteItemAnnotation[] | undefined {
  const raw = parsed.prerequisites;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new Error(`${sourceLabel}: prerequisites must be an array`);
  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: prerequisites[${index}] must be an object`);
    }
    const term = stringField(item, "term").trim();
    const plainLanguage = stringField(item, "plain_language").trim();
    const whyNeeded = stringField(item, "why_needed").trim();
    const fallbackLink = stringField(item, "fallback_link").trim();
    if (!term) throw new Error(`${sourceLabel}: prerequisites[${index}].term must be a non-empty string`);
    if (!plainLanguage) throw new Error(`${sourceLabel}: prerequisites[${index}].plain_language must be a non-empty string`);
    return {
      term,
      plain_language: plainLanguage,
      ...(whyNeeded ? { why_needed: whyNeeded } : {}),
      ...(fallbackLink ? { fallback_link: fallbackLink } : {}),
    };
  });
}

function parseCheckpoints(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): CheckpointAnnotation[] | undefined {
  const raw = parsed.checkpoints;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new Error(`${sourceLabel}: checkpoints must be an array`);
  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: checkpoints[${index}] must be an object`);
    }
    const sectionId = stringField(item, "section_id").trim();
    if (!SECTION_ID_RE.test(sectionId)) {
      throw new Error(`${sourceLabel}: checkpoints[${index}].section_id must look like s1`);
    }
    const items = stringArrayField(item, "items");
    if (!items.length) {
      throw new Error(`${sourceLabel}: checkpoints[${index}].items must contain at least one string`);
    }
    return { section_id: sectionId, items };
  });
}

function parseAnalogies(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): AnalogyAnnotation[] | undefined {
  const raw = parsed.analogies;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new Error(`${sourceLabel}: analogies must be an array`);
  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: analogies[${index}] must be an object`);
    }
    const sectionId = stringField(item, "section_id").trim();
    const concept = stringField(item, "concept").trim();
    const analogy = stringField(item, "analogy").trim();
    if (!SECTION_ID_RE.test(sectionId)) {
      throw new Error(`${sourceLabel}: analogies[${index}].section_id must look like s1`);
    }
    if (!concept) throw new Error(`${sourceLabel}: analogies[${index}].concept must be a non-empty string`);
    if (!analogy) throw new Error(`${sourceLabel}: analogies[${index}].analogy must be a non-empty string`);
    return { section_id: sectionId, concept, analogy };
  });
}

function parseDocumentOverview(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): DocumentOverviewAnnotation | undefined {
  const raw = parsed.document_overview;
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    throw new Error(`${sourceLabel}: document_overview must be an object`);
  }

  const summary = stringField(raw, "summary").trim();
  if (!summary) {
    throw new Error(`${sourceLabel}: document_overview.summary must be a non-empty string`);
  }

  const readerGoal = stringField(raw, "reader_goal").trim();
  const statusNote = stringField(raw, "status_note").trim();
  const nextStep = stringField(raw, "next_step").trim();
  return {
    summary,
    ...(readerGoal ? { reader_goal: readerGoal } : {}),
    ...(statusNote ? { status_note: statusNote } : {}),
    ...(nextStep ? { next_step: nextStep } : {}),
  };
}

function parseReadingPath(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): ReadingPathAnnotation[] | undefined {
  const raw = parsed.reading_path;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`${sourceLabel}: reading_path must be an array`);
  }

  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: reading_path[${index}] must be an object`);
    }
    const label = stringField(item, "label").trim();
    const sectionId = stringField(item, "section_id").trim();
    const description = stringField(item, "description").trim();
    if (!label) throw new Error(`${sourceLabel}: reading_path[${index}].label must be a non-empty string`);
    if (!ANCHOR_ID_RE.test(sectionId)) {
      throw new Error(`${sourceLabel}: reading_path[${index}].section_id must look like s1 or s1-1`);
    }
    if (!description) {
      throw new Error(`${sourceLabel}: reading_path[${index}].description must be a non-empty string`);
    }
    return { label, section_id: sectionId, description };
  });
}

function parseSemanticBlocks(
  parsed: Record<string, unknown>,
  sourceLabel: string,
): SemanticBlockAnnotation[] | undefined {
  const raw = parsed.semantic_blocks;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`${sourceLabel}: semantic_blocks must be an array`);
  }

  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${sourceLabel}: semantic_blocks[${index}] must be an object`);
    }
    const type = stringField(item, "type");
    if (type === "structure_map") return parseStructureMapBlock(item, sourceLabel, index);
    if (type === "relationship_map") return parseRelationshipMapBlock(item, sourceLabel, index);
    if (type === "roadmap") return parseRoadmapBlock(item, sourceLabel, index);
    if (type === "requirement_grid") return parseRequirementGridBlock(item, sourceLabel, index);
    if (type === "reference_list") return parseReferenceListBlock(item, sourceLabel, index);
    if (type === "takeaway_grid") return parseTakeawayGridBlock(item, sourceLabel, index);
    if (type === "principle_grid") return parsePrincipleGridBlock(item, sourceLabel, index);
    if (type === "decision_grid") return parseDecisionGridBlock(item, sourceLabel, index);
    if (type === "evidence_grid") return parseEvidenceGridBlock(item, sourceLabel, index);
    if (type === "risk_register") return parseRiskRegisterBlock(item, sourceLabel, index);
    if (type === "scope_boundary") return parseScopeBoundaryBlock(item, sourceLabel, index);
    if (type === "checklist") return parseChecklistBlock(item, sourceLabel, index);
    if (type === "open_questions") return parseOpenQuestionsBlock(item, sourceLabel, index);
    if (type === "concept_glossary") return parseConceptGlossaryBlock(item, sourceLabel, index);
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].type must be structure_map, relationship_map, roadmap, requirement_grid, reference_list, takeaway_grid, principle_grid, decision_grid, evidence_grid, risk_register, scope_boundary, checklist, open_questions, or concept_glossary`);
  });
}

function parseStructureMapBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): StructureMapBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const summary = stringField(item, "summary").trim();
  const rawNodes = item.nodes;
  if (!Array.isArray(rawNodes)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].nodes must be an array`);
  }
  const nodes = rawNodes.map((rawNode, nodeIndex) => parseStructureMapNode(rawNode, sourceLabel, index, nodeIndex));
  if (nodes.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].nodes must not be empty`);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawEdges = item.edges;
  const edges = Array.isArray(rawEdges)
    ? rawEdges.map((rawEdge, edgeIndex) => parseStructureMapEdge(rawEdge, sourceLabel, index, edgeIndex, nodeIds))
    : [];

  return {
    type: "structure_map",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    ...(summary ? { summary } : {}),
    nodes,
    ...(edges.length ? { edges } : {}),
  };
}

function parseStructureMapNode(
  rawNode: unknown,
  sourceLabel: string,
  blockIndex: number,
  nodeIndex: number,
): StructureMapNodeAnnotation {
  if (!isRecord(rawNode)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].nodes[${nodeIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].nodes[${nodeIndex}]`;
  const id = stringField(rawNode, "id").trim();
  const label = stringField(rawNode, "label").trim();
  const kind = stringField(rawNode, "kind").trim();
  const summary = stringField(rawNode, "summary").trim();
  const sectionId = optionalAnchorId(rawNode, "section_id", prefix);
  if (!STRUCTURE_NODE_ID_RE.test(id)) {
    throw new Error(`${prefix}.id must start with a lowercase letter and contain only lowercase letters, digits, underscores, or hyphens`);
  }
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!isStructureNodeKind(kind)) {
    throw new Error(`${prefix}.kind must be context, path, decision, risk, evidence, output, question, or action`);
  }
  if (!summary) throw new Error(`${prefix}.summary must be a non-empty string`);
  return {
    id,
    label,
    kind,
    summary,
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseStructureMapEdge(
  rawEdge: unknown,
  sourceLabel: string,
  blockIndex: number,
  edgeIndex: number,
  nodeIds: Set<string>,
): StructureMapEdgeAnnotation {
  if (!isRecord(rawEdge)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].edges[${edgeIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].edges[${edgeIndex}]`;
  const from = stringField(rawEdge, "from").trim();
  const to = stringField(rawEdge, "to").trim();
  const label = stringField(rawEdge, "label").trim();
  if (!nodeIds.has(from) || !nodeIds.has(to)) {
    throw new Error(`${prefix} must reference existing node ids`);
  }
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  return { from, to, label };
}

function parseRelationshipMapBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): RelationshipMapBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const summary = stringField(item, "summary").trim();
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseRelationshipMapItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }

  return {
    type: "relationship_map",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    ...(summary ? { summary } : {}),
    items,
  };
}

function parseRelationshipMapItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): RelationshipMapItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const from = stringField(rawItem, "from").trim();
  const relation = stringField(rawItem, "relation").trim();
  const to = stringField(rawItem, "to").trim();
  const evidence = stringField(rawItem, "evidence").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!from) throw new Error(`${prefix}.from must be a non-empty string`);
  if (!relation) throw new Error(`${prefix}.relation must be a non-empty string`);
  if (!to) throw new Error(`${prefix}.to must be a non-empty string`);
  return {
    from,
    relation,
    to,
    ...(evidence ? { evidence } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseRoadmapBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): RoadmapBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const summary = stringField(item, "summary").trim();
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseRoadmapItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }

  return {
    type: "roadmap",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    ...(summary ? { summary } : {}),
    items,
  };
}

function parseRoadmapItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): RoadmapItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const title = stringField(rawItem, "title").trim();
  const summary = stringField(rawItem, "summary").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  const outputs = stringArrayField(rawItem, "outputs");
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!title) throw new Error(`${prefix}.title must be a non-empty string`);
  if (!summary) throw new Error(`${prefix}.summary must be a non-empty string`);
  return {
    label,
    title,
    summary,
    ...(outputs.length ? { outputs } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseRequirementGridBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): RequirementGridBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseRequirementItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "requirement_grid",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseRequirementItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): RequirementItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const detail = stringField(rawItem, "detail").trim();
  const requirements = stringArrayField(rawItem, "requirements");
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!requirements.length) throw new Error(`${prefix}.requirements must include at least one item`);
  return {
    label,
    ...(detail ? { detail } : {}),
    requirements,
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseReferenceListBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): ReferenceListBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseReferenceItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "reference_list",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseReferenceItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): ReferenceItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const href = stringField(rawItem, "href").trim();
  const description = stringField(rawItem, "description").trim();
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!href) throw new Error(`${prefix}.href must be a non-empty string`);
  return {
    label,
    href,
    ...(description ? { description } : {}),
  };
}

function parseTakeawayGridBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): TakeawayGridBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseTakeawayItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "takeaway_grid",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseTakeawayItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): TakeawayItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const detail = stringField(rawItem, "detail").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  return {
    label,
    ...(detail ? { detail } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parsePrincipleGridBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): PrincipleGridBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parsePrincipleItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "principle_grid",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parsePrincipleItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): PrincipleItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const guidance = stringField(rawItem, "guidance").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!guidance) throw new Error(`${prefix}.guidance must be a non-empty string`);
  return {
    label,
    guidance,
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseDecisionGridBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): DecisionGridBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => {
    if (!isRecord(rawItem)) {
      throw new Error(`${sourceLabel}: semantic_blocks[${index}].items[${itemIndex}] must be an object`);
    }
    const prefix = `${sourceLabel}: semantic_blocks[${index}].items[${itemIndex}]`;
    const label = stringField(rawItem, "label").trim();
    const value = stringField(rawItem, "value").trim();
    const rationale = stringField(rawItem, "rationale").trim();
    const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
    if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
    if (!value) throw new Error(`${prefix}.value must be a non-empty string`);
    if (!rationale) throw new Error(`${prefix}.rationale must be a non-empty string`);
    return {
      label,
      value,
      rationale,
      ...(sectionId ? { section_id: sectionId } : {}),
    };
  });
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "decision_grid",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseEvidenceGridBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): EvidenceGridBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseEvidenceItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "evidence_grid",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseEvidenceItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): EvidenceItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const evidence = stringField(rawItem, "evidence").trim();
  const source = stringField(rawItem, "source").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!evidence) throw new Error(`${prefix}.evidence must be a non-empty string`);
  return {
    label,
    evidence,
    ...(source ? { source } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseRiskRegisterBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): SemanticBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseRiskItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "risk_register",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseRiskItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
) {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const trigger = stringField(rawItem, "trigger").trim();
  const impact = stringField(rawItem, "impact").trim();
  const mitigation = stringField(rawItem, "mitigation").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (!mitigation) throw new Error(`${prefix}.mitigation must be a non-empty string`);
  return {
    label,
    ...(trigger ? { trigger } : {}),
    ...(impact ? { impact } : {}),
    mitigation,
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseScopeBoundaryBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): ScopeBoundaryBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const inScope = stringArrayField(item, "in_scope");
  const outOfScope = stringArrayField(item, "out_of_scope");
  if (inScope.length === 0 && outOfScope.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}] must include in_scope or out_of_scope items`);
  }
  return {
    type: "scope_boundary",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    in_scope: inScope,
    out_of_scope: outOfScope,
  };
}

function parseChecklistBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): ChecklistBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseChecklistItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "checklist",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseChecklistItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): ChecklistItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const label = stringField(rawItem, "label").trim();
  const detail = stringField(rawItem, "detail").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  const status = stringField(rawItem, "status").trim();
  if (!label) throw new Error(`${prefix}.label must be a non-empty string`);
  if (status && !isChecklistStatus(status)) {
    throw new Error(`${prefix}.status must be required, open, or done`);
  }
  const checklistStatus = status && isChecklistStatus(status) ? status : undefined;
  return {
    label,
    ...(detail ? { detail } : {}),
    ...(checklistStatus ? { status: checklistStatus } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseOpenQuestionsBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): OpenQuestionsBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseOpenQuestionItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "open_questions",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseOpenQuestionItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): OpenQuestionItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const question = stringField(rawItem, "question").trim();
  const context = stringField(rawItem, "context").trim();
  const impact = stringField(rawItem, "impact").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  const status = stringField(rawItem, "status").trim();
  if (!question) throw new Error(`${prefix}.question must be a non-empty string`);
  if (status && !isOpenQuestionStatus(status)) {
    throw new Error(`${prefix}.status must be open, blocked, or answered`);
  }
  const questionStatus = status && isOpenQuestionStatus(status) ? status : undefined;
  return {
    question,
    ...(context ? { context } : {}),
    ...(impact ? { impact } : {}),
    ...(questionStatus ? { status: questionStatus } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function parseConceptGlossaryBlock(
  item: Record<string, unknown>,
  sourceLabel: string,
  index: number,
): ConceptGlossaryBlockAnnotation {
  const title = stringField(item, "title").trim();
  if (!title) throw new Error(`${sourceLabel}: semantic_blocks[${index}].title must be a non-empty string`);
  const sourceSectionId = optionalAnchorId(item, "source_section_id", `${sourceLabel}: semantic_blocks[${index}]`);
  const rawItems = item.items;
  if (!Array.isArray(rawItems)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must be an array`);
  }
  const items = rawItems.map((rawItem, itemIndex) => parseConceptGlossaryItem(rawItem, sourceLabel, index, itemIndex));
  if (items.length === 0) {
    throw new Error(`${sourceLabel}: semantic_blocks[${index}].items must not be empty`);
  }
  return {
    type: "concept_glossary",
    title,
    ...(sourceSectionId ? { source_section_id: sourceSectionId } : {}),
    items,
  };
}

function parseConceptGlossaryItem(
  rawItem: unknown,
  sourceLabel: string,
  blockIndex: number,
  itemIndex: number,
): ConceptGlossaryItemAnnotation {
  if (!isRecord(rawItem)) {
    throw new Error(`${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}] must be an object`);
  }
  const prefix = `${sourceLabel}: semantic_blocks[${blockIndex}].items[${itemIndex}]`;
  const term = stringField(rawItem, "term").trim();
  const plainLanguage = stringField(rawItem, "plain_language").trim();
  const example = stringField(rawItem, "example").trim();
  const modelField = stringField(rawItem, "model_field").trim();
  const sectionId = optionalAnchorId(rawItem, "section_id", prefix);
  if (!term) throw new Error(`${prefix}.term must be a non-empty string`);
  if (!plainLanguage) throw new Error(`${prefix}.plain_language must be a non-empty string`);
  return {
    term,
    plain_language: plainLanguage,
    ...(example ? { example } : {}),
    ...(modelField ? { model_field: modelField } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
  };
}

function isChecklistStatus(value: string): value is ChecklistItemStatus {
  return value === "required" || value === "open" || value === "done";
}

function isOpenQuestionStatus(value: string): value is OpenQuestionStatus {
  return value === "open" || value === "blocked" || value === "answered";
}

function isStructureNodeKind(value: string): value is StructureMapNodeKind {
  return value === "context"
    || value === "path"
    || value === "decision"
    || value === "risk"
    || value === "evidence"
    || value === "output"
    || value === "question"
    || value === "action";
}

function optionalAnchorId(record: Record<string, unknown>, key: string, prefix: string): string {
  const value = stringField(record, key).trim();
  if (!value) return "";
  if (!ANCHOR_ID_RE.test(value)) {
    throw new Error(`${prefix}.${key} must look like s1 or s1-1`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
