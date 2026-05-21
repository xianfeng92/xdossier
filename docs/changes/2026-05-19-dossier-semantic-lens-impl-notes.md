---
title: Dossier Semantic Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Semantic Lens Impl Notes

## Summary

The enriched render path now supports a semantic lens before the original Markdown prose. The goal is to make generated HTML useful as a structured dossier artifact, not just a styled Markdown page.

## Changes

- Extended annotation schema v1 with optional `document_overview`, `reading_path`, and `semantic_blocks`.
- Added semantic block support for:
  - `roadmap` stage cards with output chips and source-section links;
  - `decision_grid` decision cards with value, rationale, and source links.
  - `scope_boundary` paired in/out panels for goals and non-goals;
  - `checklist` status rows for acceptance criteria and readiness gates.
- Added a `{{SEMANTIC_LENS_BLOCK}}` render slot between the frontmatter card and the prose body.
- Added compact `artifact-header` rendering when semantic annotations exist, so metadata no longer dominates the first viewport.
- Updated the Claude/Codex provider prompt to request document-level overview, reading path, roadmap blocks, decision grids, and at most two key points per section.
- Updated the Claude/Codex provider prompt to request scope boundary and checklist blocks when source Markdown contains goals/non-goals or acceptance criteria.
- Added CSS for the semantic overview, reading path cards, roadmap cards, and decision cards.
- Added CSS for scope boundary panels and checklist rows.
- Tightened reading path cards into a denser grid so a 720px viewport can reveal the roadmap start.
- Grouped semantic blocks into a primary flow and judgment panel grid: the first roadmap stays full-width, while decisions, scope, and checklist scan as coordinated side-by-side panels.
- Stacked scope in/out panels when they appear inside the judgment grid so narrow columns remain readable.
- Added a compact `Source Sections` boundary before the original Markdown body when semantic lens output is present.
- Added a `Section Map` generated from TOC entries plus `section_summaries`, giving readers a compact jump surface before the original prose.
- Hidden zero-value subsection metadata in Section Map cards; subsection counts appear only when a section actually has H3 children.
- Added stable semantic lens anchors (`lens-overview`, `lens-roadmap-*`, `lens-decision-grid-*`, `lens-scope-boundary-*`, `lens-checklist-*`) so prose sections can link back to the structured layer.
- Added `Semantic Trace` chips under source section briefs for sections referenced by reading paths, roadmaps, decisions, scope boundaries, or checklists.
- Added stable roadmap stage anchors (`lens-roadmap-*-item-*`) so source H3 subsections can link back to the exact stage card.
- Added H3-level semantic trace chips for roadmap items, including deterministic label/title matching when an item omits `section_id`.
- Added a `Dossier Lens` group at the top of the left TOC for semantic pages, linking to the overview, semantic blocks, source boundary, and section map before the original Markdown heading tree.
- Added stable source prose anchors for `Source Sections` and `Section Map`.
- Updated the TOC scroll-spy so semantic overview, semantic blocks, source boundary, and section map anchors participate alongside source H2/H3 headings.
- Added an `open_questions` semantic block for unresolved decisions, blocked choices, and answered questions.
- Added open question status labels (`OPEN`, `BLOCKED`, `ANSWERED`), context, impact, source links, TOC entries, and source trace chips.
- Made open question panels span wider in the judgment grid so uncertainty text does not collapse into a narrow card column.
- Updated the Claude/Codex provider prompt to request open question blocks when source Markdown contains unresolved decisions, blocked next steps, risks waiting on choices, or explicit TODO decisions.
- Added tests for parser/render behavior and provider prompt shape.

## Dogfood Output

Rendered the finetune-lab Gemma roadmap with Claude semantic annotations:

- annotations: `/tmp/dossier-finetune-lab/roadmap-semantic-claude.annotations.json`
- html: `/tmp/dossier-finetune-lab/roadmap-semantic-claude.html`

The first semantic output contains:

- 1 document overview;
- 5 reading path cards;
- 2 roadmap blocks;
- 9 roadmap cards;
- 1 decision grid;
- 6 decision cards;
- 12 section summaries.

The v2 semantic output adds:

- 1 scope boundary block with 4 in-scope and 4 out-of-scope items;
- 1 checklist block with 6 acceptance checks;
- source prose starts after the semantic lens at roughly 2869px in a 720px viewport.

Compared with the previous enriched output, original prose now starts after the semantic lens rather than being the primary first-scroll experience.

The v3 layout pass keeps the same annotations but changes semantic block IA:

- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v3-layout.html`
- first-screen screenshot: `/tmp/dossier-finetune-lab/roadmap-semantic-v3-layout-firstscreen.png`
- first roadmap top: 644px;
- judgment grid top: 1266px;
- judgment grid columns: 3;
- scope inner columns inside the judgment grid: 1;
- source boundary top: 2334px;
- first source section top: 2407px in a 720px viewport.

The v4 section-map pass keeps the same annotations and adds a source-prose map:

- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v4-section-map.html`
- first-screen screenshot: `/tmp/dossier-finetune-lab/roadmap-semantic-v4-section-map-firstscreen.png`
- section-map screenshot: `/tmp/dossier-finetune-lab/roadmap-semantic-v4-section-map-sectionmap.png`
- section map cards: 12;
- section map columns: 3;
- source boundary top: 2334px;
- section map top: 2401px;
- first source section top: 3413px in a 720px viewport;
- zero-value subsection labels: hidden.

The v5 semantic-trace pass keeps the same annotations and connects original prose back to the structured lens:

- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v5-trace.html`
- lens anchors: 5 (`lens-overview`, roadmap, decisions, scope, checklist);
- source sections with semantic trace chips: 7;
- section `s7` trace chips: `Path: 六阶段学习路径`, `Roadmap`;
- section map cards: 12.

The v6 H3-trace pass keeps the same annotations and connects roadmap stage prose back to exact roadmap cards:

- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v6-h3-trace.html`
- H3 trace screenshot: `/tmp/dossier-finetune-lab/roadmap-semantic-v6-h3-trace-s7-1-clip.png`
- roadmap stage card anchors: 6;
- H3 semantic trace chips under section `s7`: 6;
- stage trace labels: `Roadmap: Level 1` through `Roadmap: Level 6`;
- previous v5 H3 trace count for the same section: 0.

The v7 semantic-TOC pass keeps the same annotations and makes the left navigation dossier-native instead of only source-Markdown-native:

- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v7-lens-toc.html`
- sidebar screenshot: `/tmp/dossier-finetune-lab/roadmap-semantic-v7-lens-toc-sidebar.png`
- previous v6 `Dossier Lens` TOC group present: false;
- v7 `Dossier Lens` TOC group present: true;
- first TOC links: `Overview`, `Roadmap`, `Decisions`, `Scope`, `Checklist`, `Source Sections`, `Section Map`, then source sections `背景`, `目标`, `非目标`;
- stable source prose anchors present: `source-sections`, `source-section-map`;
- semantic-anchor scroll-spy selector present in the page script: true.

The v8 open-questions pass keeps the same annotations plus a representative uncertainty block:

- annotations: `/tmp/dossier-finetune-lab/roadmap-semantic-v8-open-questions.annotations.json`
- html: `/tmp/dossier-finetune-lab/roadmap-semantic-v8-open-questions.html`
- `Open Questions` appears in the Dossier Lens TOC after `Checklist`;
- open question panel present: true;
- question count: 3;
- status labels: `OPEN`, `BLOCKED`, `OPEN`;
- source trace chips include `Questions` under roadmap section `s7` and acceptance section `s11`;
- open question panel grid column: `span 2`;
- panel width/height after wide placement: 501px / 658px.

After the compact-header pass, the browser metrics for
`/tmp/dossier-finetune-lab/roadmap-semantic-claude.html` were:

- semantic overview top: 207px;
- first roadmap top: 624px;
- first source section top: 2153px;
- viewport height: 720px.

## Verification

- `pnpm test tests/render-spec.test.ts -t "semantic lens annotations"`
- `pnpm test tests/enrich.test.ts -t "local agent provider prompt"`
- `pnpm test tests/render-spec.test.ts -t "compact artifact header"`
- `pnpm test tests/render-spec.test.ts -t "reading path cards densely"`
- `pnpm typecheck`
- `pnpm test`
- Browser preview at `http://127.0.0.1:8766/roadmap-semantic-v2-claude.html`
