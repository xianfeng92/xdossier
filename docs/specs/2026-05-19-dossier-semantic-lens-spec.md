---
title: Dossier Semantic Lens Spec
status: implemented
kind: mvp-spec
owner: codex
created: 2026-05-19
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-annotation-tldr-experiment-spec.md
reviews: []
---

# Dossier Semantic Lens Spec

## 0. One Sentence

Turn enriched HTML from "styled markdown plus summaries" into a dossier-native artifact with a document overview, reading path, relationship map, and visual semantic blocks such as roadmaps and decision grids.

## 1. Problem

The current enriched output proves the pipeline but does not create a meaningful advantage over reading the source Markdown. Section summaries still follow the original prose order, so the generated HTML feels like a prettier text page instead of a structured artifact.

## 2. Goal

For a long spec such as the finetune-lab Gemma roadmap, the first screen and first scroll should answer:

- what this document decides;
- who should read it and why;
- which sections matter most;
- what staged path, artifact relationships, decisions, or acceptance checks are hidden inside the prose.

## 3. Annotation Contract

Extend schema version 1 with optional semantic fields. Existing `section_summaries` remain valid.

```json
{
  "schema_version": 1,
  "source": "dossier-enrich:agent",
  "document_overview": {
    "summary": "One sentence describing the document's core decision.",
    "reader_goal": "What the reader can understand or do after reading.",
    "status_note": "Current state or decision status.",
    "next_step": "Recommended next action."
  },
  "reading_path": [
    {
      "label": "Start here",
      "section_id": "s1",
      "description": "Why this section matters."
    }
  ],
  "semantic_blocks": [
    {
      "type": "roadmap",
      "title": "Six-stage learning path",
      "source_section_id": "s7",
      "summary": "Short explanation of the path.",
      "items": [
        {
          "label": "Level 1",
          "title": "Baseline and Task Framing",
          "summary": "What the stage teaches.",
          "outputs": ["baseline prompts", "success rubric"],
          "section_id": "s7-1"
        }
      ]
    },
    {
      "type": "decision_grid",
      "title": "Key decisions",
      "source_section_id": "s5",
      "items": [
        {
          "label": "Default base",
          "value": "google/gemma-4-E2B-it",
          "rationale": "Stable local teaching baseline.",
          "section_id": "s5"
        }
      ]
    },
    {
      "type": "relationship_map",
      "title": "Artifact relationships",
      "source_section_id": "s5",
      "summary": "How the source artifacts and decisions connect.",
      "items": [
        {
          "from": "Vision spec",
          "relation": "frames",
          "to": "MVP spec",
          "evidence": "The MVP spec implements the vision contract.",
          "section_id": "s5"
        }
      ]
    },
    {
      "type": "concept_glossary",
      "title": "Core concepts",
      "source_section_id": "s4",
      "items": [
        {
          "term": "Artifact",
          "plain_language": "A source document or output the reader needs to understand.",
          "example": "A vision spec, review note, or change note.",
          "model_field": "Artifact.kind",
          "section_id": "s4"
        }
      ]
    },
    {
      "type": "takeaway_grid",
      "title": "Key takeaways",
      "source_section_id": "s4",
      "items": [
        {
          "label": "Keep the semantic layer first",
          "detail": "Readers need the model before the prose.",
          "section_id": "s4"
        }
      ]
    },
    {
      "type": "scope_boundary",
      "title": "Scope boundaries",
      "source_section_id": "s3",
      "in_scope": ["What the document explicitly includes"],
      "out_of_scope": ["What the document explicitly excludes"]
    },
    {
      "type": "checklist",
      "title": "Acceptance checks",
      "source_section_id": "s11",
      "items": [
        {
          "label": "Visible staged roadmap",
          "detail": "A reader can understand the staged path before reading source prose.",
          "status": "required",
          "section_id": "s7"
        }
      ]
    },
    {
      "type": "open_questions",
      "title": "Open questions",
      "source_section_id": "s10",
      "items": [
        {
          "question": "Which dataset should become the canonical teaching example?",
          "context": "Why the question is still unresolved.",
          "impact": "What it blocks or changes.",
          "status": "open",
          "section_id": "s7-1"
        }
      ]
    }
  ],
  "section_summaries": []
}
```

All annotation text is plain text and must be HTML-escaped by the renderer.

## 4. Render Contract

- `document_overview` renders directly after the frontmatter card as a compact semantic board.
- When `document_overview`, `reading_path`, or `semantic_blocks` are present, the frontmatter header renders as a compact artifact bar so the semantic board becomes the first-screen focus.
- Scaffold-generated `document_overview.reader_goal` text may use explicit frontmatter `kind` metadata to describe the source artifact's reader purpose, such as aligning product intent for a `vision-spec` or checking verification evidence for implementation notes.
- Scaffold-generated `document_overview.status_note` text uses explicit frontmatter metadata such as status, kind, and update date. It must describe the source artifact's state, not the scaffold generator's implementation path.
- `reading_path` renders as section jump links inside the board.
- `reading_path` cards include the source section number when a matching TOC entry exists, such as `§ 7`, so the recommended path gives readers a stable coordinate before they enter the prose.
- Scaffold-generated `reading_path.description` text explains the reader purpose of each jump rather than repeating section summaries; section summaries remain available in the Section Map and source prose.
- `semantic_blocks` render after the board and before the original Markdown body.
- The first roadmap block renders as the primary flow. When a primary flow exists, it renders directly after the overview so staged learning or execution paths become the first actionable model a reader sees.
- Structure maps, relationship maps, glossary blocks, and judgment panels render after the primary flow when a primary flow exists; they remain available as supporting navigation and provenance instead of delaying the reader's path into the topic.
- Relationship map blocks render near the structure map as explicit edge lists, with `from`, `relation`, `to`, optional evidence, and source links.
- Frontmatter `implements`, `reviews`, and `reviews_target` relations render as a deterministic relationship map even when no external annotations file is provided.
- Frontmatter relation maps use only explicit metadata: current artifact `implements` each target, each `reviews` path reviews the current artifact, and current artifact `reviews` each `reviews_target`.
- Concept glossary blocks render as model-building cards near the structure map, before execution/judgment panels.
- Roadmap blocks render as stage cards with compact output chips and source-section links.
- Roadmap blocks with multiple stages render a compact stage strip before the detailed cards, so readers can scan the whole stage sequence even when only the first few detailed cards are expanded.
- Roadmap stage cards expose stable item anchors such as `lens-roadmap-1-item-1`.
- Takeaway grids render lessons, inspiration, or carry-forward points as compact cards with a short title, optional detail, and source links.
- Decision grids render as small decision cards with value, rationale, a block-level source link, and item source links.
- Risk registers render explicit risks, triggers/impact when present, mitigations, and source links as compact risk cards.
- Scope boundary blocks render goals and non-goals as paired in/out panels.
- Checklist blocks render requirements, acceptance criteria, or readiness gates as compact status rows.
- Open question blocks render unresolved decisions, blocked choices, or answered questions as a first-class uncertainty panel.
- Open question panels span a wider area in the judgment grid so question/context/impact text remains readable.
- The semantic overview and semantic blocks expose stable `lens-*` anchors so source prose can link back to the structured layer.
- When a semantic lens is present, the left TOC prepends a `Dossier Lens` group linking to the overview, semantic blocks, `Source Sections`, and `Section Map` before the original source heading tree.
- The TOC scroll-spy includes semantic overview, semantic blocks, source boundary, and section map anchors, not only source H2/H3 headings.
- When a semantic lens is present, a compact `Source Sections` boundary renders before the original Markdown body.
- When section summaries and TOC entries are available, render a `Section Map` after the boundary so readers can jump into source prose with section-level context.
- `Section Map` cards expose semantic role chips from the same trace graph used by source sections, so a reader can see whether each source section participates in the reading path, model, relationships, roadmap, references, takeaways, principles, decisions, evidence, risks, scope, checklist, glossary, or open questions before entering the prose.
- `Section Map` first renders deterministic semantic lanes before the full source-order card grid. The lanes group source sections by reader task: reading route, model/concepts, and judgment/checks. Each lane links directly to the source section and shows the first relevant localized semantic role, so readers can choose a route before scanning the full Markdown order.
- `Section Map` role chips are real links to the semantic lens, while the card body remains a separate source-section link; the renderer must not rely on nested anchors or inert `data-*` pseudo-links.
- `Section Map` may keep the first few role chips visible for scanability, but extra roles must remain available as links instead of being silently dropped.
- `Section Map` cards for sections with H3 children expose a compact subsection outline with direct links to the first few subsections, including local H3 numbers such as `7.1 定义`, so readers can understand the internal shape and coordinates of a long section before jumping into source prose. These links render outside the main section anchor to avoid nested anchors.
- Scaffold-generated Section Map summaries should remain scan-friendly without broken mixed-language clipping fragments; complete CJK sentence boundaries are preferred when available.
- Structure map traces are de-duplicated: when a structure map's `source_section_id` is already represented by one of its nodes, render the node-specific `Model: <label>` link instead of showing both a generic `Model` link and the node link for the same source section.
- Dossier lens UI labels follow the detected document language. For Chinese documents, the semantic TOC group, overview link, structure/relationship/roadmap/checklist labels, source boundary, section map, source-section counts, and Section Map role chips render in Chinese instead of mixing English navigation terms into the reader-facing structure layer.
- Artifact header metadata follows the detected document language as well. Chinese documents render frontmatter status badges, stat labels, reading-time text, and frontmatter relation summaries/labels in Chinese instead of leaking `ready`, `Reading`, `Updated`, `Owner`, `Created`, `Implements`, or `Reviews` into the first viewport.
- Page-level navigation and footer chrome follow the detected document language too. Chinese documents render the TOC header, lens navigation accessible label, mobile TOC toggle label, code-copy accessible label, footer status text, and footer renderer credit in Chinese rather than mixing English template controls around the structured report.
- The Dossier Lens TOC follows the actual semantic-lens render order, not raw annotation order, so promoted model-building blocks such as relationship maps appear in navigation where they appear in the page.
- Semantic state badges follow the detected document language too. Chinese documents must not expose structure-node kinds or checklist/open-question statuses as `CONTEXT`, `DECISION`, `QUESTION`, `REQ`, or `OPEN`; those are renderer internals, not reader-facing labels.
- Source sections referenced by `reading_path` or `semantic_blocks` render compact semantic trace chips after their section brief, linking back to the relevant overview or semantic block.
- Semantic block source links include source coordinates when a matching TOC entry exists, such as `查看原文 § 7`, `原文 § 7`, or `跳到小节 7.1`, so structured cards remain traceable without forcing readers to cross-check the TOC.
- Semantic item cards for takeaways, decisions, evidence, risks, checklists, open questions, and glossary entries expose stable item anchors, and source-section semantic traces may link to the exact item with localized labels such as `要点：...`, `决策：...`, `Takeaway: ...`, or `Decision: ...`, not only to the parent semantic block.
- Source section reader-hint chips follow the detected document language as well; Chinese documents use `阅读` and `阅读提示:` instead of leaking the English `READ` / `Read:` chip chrome.
- Source H2/H3 trace chips use the same language-aware role labels as the Section Map, so Chinese documents show labels like `用于`, `路径：...`, `模型：...`, and `路线图：...` instead of `Used in`, `Path:`, `Model:`, and `Roadmap:`.
- Source H3 subsections referenced by roadmap items render compact semantic trace chips after the H3 heading, linking back to the exact roadmap stage card.
- When a roadmap item omits `section_id`, the renderer may deterministically match it to an H3 by label/title text. This remains render-only and does not call an LLM.
- Original Markdown content remains available below the semantic lens.
- `dossier render` remains deterministic and never calls an LLM.

## 5. Enrich Contract

`dossier enrich --provider codex|claude` should ask the local CLI provider for these semantic fields in addition to section summaries.

Provider guidance:

- prefer 1 document overview;
- prefer 3-5 reading path entries;
- produce a roadmap block when the document contains levels, phases, milestones, or staged workflows;
- produce a relationship map when the document explicitly describes artifact, component, decision, dependency, or upstream/downstream relationships;
- produce a decision grid when the document contains explicit choices, defaults, scope boundaries, or acceptance decisions;
- produce a concept glossary when the document defines key terms, vocabulary, domain concepts, or a table of concepts;
- produce a takeaway grid when the document contains explicit takeaways, lessons learned, inspiration, or "what this project should learn/adopt/absorb" lists;
- produce a risk register when the document contains explicit risks, mitigations, pitfalls, blockers, failure modes, or risk/mitigation tables;
- produce a scope boundary block when the document contains goals, non-goals, exclusions, constraints, or boundaries;
- produce a checklist block when the document contains acceptance criteria, completion gates, requirements, or readiness checks;
- produce an open questions block when the document contains unresolved questions, risks waiting on decisions, explicit TODO decisions, or blocked next steps;
- use `blocked` for open-question items that block a next action, dependency, launch, or implementation decision, and use `answered` only when the markdown explicitly records the answer;
- keep `key_points` to at most 2 bullets unless a third is truly necessary.

## 6. Acceptance

- Unit tests cover parsing the new annotation fields.
- Unit tests cover rendering the overview, reading path, roadmap, and decision grid before the prose body.
- Unit tests cover takeaway-grid parsing, rendering, TOC links, and source trace chips.
- Unit tests cover concept glossary blocks, source trace chips, TOC entries, and provider prompt shape.
- Unit tests cover relationship map parsing, edge rendering, source trace chips, TOC entries, deterministic scaffold extraction, and provider prompt shape.
- Unit tests cover frontmatter-only relationship maps so single-document render output is still structurally linked without LLM annotations.
- Unit tests cover stable semantic lens anchors and source-section trace links.
- Unit tests cover `Section Map` semantic role chips for sections referenced by the semantic lens, including role-chip links back to the lens and overflow roles beyond the visible chip budget.
- Unit tests cover `Section Map` semantic lanes for reading-route, model/concept, and judgment/check source sections.
- Unit tests cover roadmap item anchors and H3-level semantic trace links, including the deterministic H3 fallback for roadmap items without `section_id`.
- Unit tests cover the semantic `Dossier Lens` TOC group, stable source prose anchors, and semantic-anchor scroll-spy coverage.
- Unit tests cover decision-grid block-level source links in addition to item source links.
- Unit tests cover open question semantic blocks, status labels, TOC entries, source trace chips, provider prompt shape, and wide judgment-grid placement.
- Unit tests cover risk register semantic blocks, TOC entries, source trace chips, and provider prompt shape.
- Unit tests cover provider prompt/schema shape.
- Unit tests cover scaffold-generated reader goals from frontmatter `kind` and verify the goal is not only Dossier Lens usage guidance.
- Unit tests cover scaffold-generated status notes from frontmatter and verify generator-internal scaffold prose does not appear as the reader-facing document status.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- A real finetune-lab Gemma roadmap render shows a compact artifact header, semantic board, reading path cards, roadmap cards, scope boundary, checklist, open questions, Dossier Lens TOC group, section map, source-section trace chips, and H3-level roadmap stage trace chips before or inside the original prose.
