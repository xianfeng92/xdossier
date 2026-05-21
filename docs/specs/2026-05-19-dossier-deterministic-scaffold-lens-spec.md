---
title: Dossier Deterministic Scaffold Lens Spec
status: implemented
kind: mvp-spec
owner: codex
created: 2026-05-19
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-structure-map-spec.md
reviews: []
---

# Dossier Deterministic Scaffold Lens Spec

## 0. One Sentence

Make the default offline render path produce a minimal semantic lens, not only a styled Markdown document with optional section summaries.

## 1. Problem

The renderer can show a Dossier Overview, Reading Path, Structure Map, and source trace links when annotations provide them. But the deterministic scaffold provider originally only produced `section_summaries`, and `dossier render <file>` originally did not use the scaffold unless an annotations file was supplied, so the most common offline path still rendered closer to "Markdown plus styling" than a structured dossier.

## 2. Goal

The no-agent path should produce enough structure for the HTML to be useful:

- `dossier render <markdown>` should use deterministic scaffold annotations by default when no explicit annotations are supplied;
- explicit annotations from `--annotations` or callers still own the render and replace the default scaffold;
- a document overview from title plus first useful section summary;
- a 3-4 item reading path that starts at the first meaningful H2 section and then promotes high-signal model / core-concept / guardrail sections over filler sections;
- a structure map with stable nodes derived from section titles, using the same high-signal chapter set as the reading path for long documents;
- relationship-map blocks from explicit relationship / dependency / upstream-downstream tables;
- concept-glossary blocks from explicit term / concept / vocabulary tables;
- roadmap blocks from explicit staged H3 sections under roadmap / plan / milestone H2 sections;
- requirement-grid blocks from explicit requirements sections with H3 requirement groups and list items;
- reference-list blocks from explicit references / sources / bibliography / further-reading sections with Markdown links;
- principle-grid blocks from explicit design-principle / guideline sections with labelled list items;
- decision-grid blocks from explicit decision tables or explicit `Decision:` paragraphs with rationale;
- evidence-grid blocks from explicit evidence / verification / acceptance tables;
- risk-register blocks from explicit risk / mitigation tables;
- checklist blocks from explicit acceptance / success criteria sections;
- open-question blocks from explicit unresolved-question sections;
- deterministic structure-map edges whose labels describe role transitions such as framing a decision, turning a model into a path, validating with evidence, stress-testing with risks, or leaving questions open;
- source-section summaries as before.

## 3. Contract

`createSectionSummaryScaffold(markdown)` returns annotation schema v1 with:

- `document_overview`;
- `reading_path`;
- one `structure_map` semantic block when at least one section has useful content;
- zero or more `relationship_map` semantic blocks when explicit relationship-shaped sections contain from/relation/to table rows;
- zero or more `concept_glossary` semantic blocks when explicit glossary / term / concept sections contain a concept table;
- zero or more `roadmap` semantic blocks when explicit roadmap-shaped sections contain H3 stages;
- zero or more `requirement_grid` semantic blocks when explicit requirements-shaped sections contain H3 requirement groups with list items;
- zero or more `reference_list` semantic blocks when explicit reference-shaped sections contain Markdown links;
- zero or more `takeaway_grid` semantic blocks when explicit takeaway / lesson / inspiration sections contain lists of lessons to carry forward;
- zero or more `principle_grid` semantic blocks when explicit principle-shaped sections contain labelled list items;
- zero or more `decision_grid` semantic blocks when explicit decision-shaped tables or paragraphs contain a decision, value, and rationale;
- zero or more `evidence_grid` semantic blocks when explicit evidence-shaped tables contain a claim/check label and evidence/proof column;
- zero or more `risk_register` semantic blocks when explicit risk-shaped tables contain a risk label and mitigation / response column;
- zero or more `checklist` semantic blocks when explicit checklist-shaped sections contain list/table items;
- zero or more `open_questions` semantic blocks when explicit unresolved-question sections contain list/table items;
- `section_summaries`.

`render(input)` uses `input.annotations` when present. If `input.annotations` is absent, it calls `createSectionSummaryScaffold(input.markdown)` and passes the resulting annotations through both source-section rendering and semantic-lens emission.

The scaffold remains deterministic and does not call an LLM.

## 4. Heuristics

- Section labels come from semantic H2 titles.
- Section summaries come from the first paragraph or list in each section.
- Section summaries are capped at a scan-friendly length so Reading Path cards, Structure Map nodes, Section Map cards, and inline section briefs do not become mini copies of the original Markdown.
- Summary clipping prefers complete CJK sentence boundaries when available and avoids ending scan cards with broken Latin word fragments such as `ma...`, `dossi...`, or `rend...`.
- Section Map cards expose a compact H3 subsection outline as separate numbered links when a source H2 has children, so long sections are understandable from the map instead of only showing a subsection count.
- Reading Path cards expose matching source section numbers from the TOC, so a recommended path such as "Dossier 设计与实现" also tells the reader which `§` coordinate it points to.
- Semantic block source links expose the same TOC coordinates, so decision, risk, roadmap, relationship, glossary, checklist, and question cards can point back to exact source sections or subsections.
- Semantic item cards expose stable item anchors, and source-section trace chips can point to exact decision, evidence, risk, checklist, question, or glossary items rather than stopping at the parent block.
- Reading Path descriptions are role-aware reader-purpose statements, not copies of section summaries. They explain why a reader should visit the section now, while the source summary remains available in Section Map and inline section briefs.
- Markdown tables are summarized as readable row pairs instead of raw pipe syntax.
- Fenced code blocks and ASCII diagrams are skipped as summary candidates.
- Colon-ending lead-in paragraphs are completed with the following list/table/prose content when available.
- Dense sections may emit up to two deterministic `key_points` from later paragraphs, lists, or tables so section briefs and Section Map cards expose more than a TLDR.
- Scaffold `document_overview.reader_goal` uses explicit document type metadata when `kind` is available, so the overview explains what the artifact helps the reader decide or understand instead of only explaining how to use the Dossier Lens.
- Scaffold `reader_hint` is generated only for sections whose title implies an actionable role such as decision, risk, question, path, evidence, output, or action.
- Scaffold `document_overview.status_note` is generated from explicit frontmatter metadata such as `status`, `kind`, `updated`, or `created`; it must not expose generator-internal provenance like "deterministic scaffold" as a reader-facing status.
- Empty lead-in paragraphs such as `Precise profile:` are skipped when choosing key points.
- Inline code and angle-bracket placeholders such as `<encoded>` are preserved in generated summaries.
- Explicit goal / in-scope sections may emit a deterministic `scope_boundary` semantic block from their list or table items.
- Explicit non-goal / out-of-scope sections may emit a deterministic `scope_boundary` semantic block from their list or table items.
- Generic audience sections such as `目标用户` must not be treated as scope boundaries.
- Explicit glossary / term / concept sections, or nested glossary / term / concept subheadings under a broader section, may emit deterministic `concept_glossary` semantic blocks from tables with term/concept and definition/explanation-like columns.
- Concept-glossary extraction may include example and model-field metadata only when those columns are explicit in the table.
- Explicit relationship / dependency / connection sections may emit deterministic `relationship_map` semantic blocks from tables with from/source/upstream, relation/edge/type, and to/target/downstream-like columns.
- Relationship-map extraction may include evidence/proof/source/reason metadata only when those columns are explicit in the table, and prose-only relationship sections do not emit relationship maps.
- Relationship-table section summaries should describe the table as explicit relationships instead of leaking raw table rows into the reading path.
- Explicit checklist / acceptance / success-criteria sections may emit deterministic `checklist` semantic blocks from their list or table items.
- Prose-only acceptance sections do not emit checklist blocks, because the scaffold should avoid inventing item boundaries.
- Manual / visual / human review checklist sections may emit deterministic `checklist` semantic blocks from list items, and their summaries should describe the number of checks instead of leaking raw bullet text.
- Explicit open-question sections such as `Open Questions` or `开放问题` may emit deterministic `open_questions` semantic blocks from list or table items.
- Prose-only open-question sections do not emit open-question blocks, because the scaffold should avoid inventing item boundaries.
- Table-derived open questions strip row separators from the context/impact text.
- Table-derived open-question section summaries should describe the table as open questions instead of being misclassified as risks when the title also says the questions are not blocking.
- Open-question items whose detail explicitly says they block or prevent the next action should render with `status: blocked`; unresolved non-blocking questions remain `open`.
- Explicit roadmap / plan / milestone sections may emit deterministic `roadmap` semantic blocks from H3 stages.
- Prose-only roadmap sections do not emit roadmap blocks, because the scaffold should avoid inventing stages.
- Roadmap cards link back to source H3 ids when those ids are available.
- H3 headings used for roadmap extraction do not replace the parent H2 section summary or reading-path description.
- Explicit requirements sections such as `Frontend Requirements` or `设计要求` may emit deterministic `requirement_grid` semantic blocks from H3 requirement groups with list items.
- Requirement cards preserve the H3 title as the requirement label, use the first paragraph as optional context, and expose list bullets as requirement items.
- Requirement-grid items link back to source H3 ids when those ids are available.
- Requirement-grid blocks should not also be flattened into generic checklist blocks for the same source section.
- Explicit references / sources / bibliography / further-reading sections may emit deterministic `reference_list` semantic blocks from Markdown links in lists.
- Explicit opportunity / inspiration / comparable-project sections may emit deterministic `reference_list` semantic blocks from Markdown links in lists, preserving link-adjacent lesson text as item descriptions.
- Reference-list extraction requires visible link labels and hrefs, de-duplicates repeated label+href pairs, and preserves source order without validating or fetching links.
- Reference-list blocks use a block-level source-section trace chip instead of per-link source trace chips, because long reference sections would otherwise flood source headings with repeated link chips.
- Explicit takeaway / lessons-learned sections, or lead-in paragraphs such as `本项目应该从这些项目吸收...`, may emit deterministic `takeaway_grid` semantic blocks from the following non-link list.
- Takeaway extraction preserves source order, splits the first clause into a card title when possible, keeps the remaining clause as detail, and avoids treating link lists as takeaways.
- Explicit design-principle / guideline / tenet sections may emit deterministic `principle_grid` semantic blocks from list items shaped as `label: guidance` or `label：guidance`.
- Principle-grid extraction preserves source order, requires both a visible principle label and guidance text, and avoids inventing principles from prose-only sections.
- Principle-grid blocks use a block-level source-section trace chip instead of per-item trace chips, because principle lists usually live in one source section.
- Explicit decision sections may emit deterministic `decision_grid` semantic blocks from tables with decision/default/rationale-like columns.
- Explicit `Decision:` / `决策：` paragraphs may emit deterministic `decision_grid` semantic blocks when the paragraph includes a visible decision value and dash-separated rationale.
- Explicit decision / strategy sections may emit deterministic `decision_grid` semantic blocks from default/base/comparison/upgrade strategy lists, such as `默认教学基座：...`, because these labelled defaults are reader-facing decisions rather than ordinary prose bullets.
- Decision-grid blocks include `source_section_id` so the rendered decision panel can jump back to the source section, not only from each individual decision card.
- Prose-only decision sections do not emit decision-grid blocks, because the scaffold should avoid inventing decision boundaries or rationales.
- Explicit evidence / verification / acceptance sections may emit deterministic `evidence_grid` semantic blocks from tables with claim/check and evidence/proof-like columns.
- Evidence tables with numeric `#` columns must choose the human-readable claim/check column as the evidence label.
- Evidence-table section summaries should describe the table as a set of verifiable evidence items instead of leaking raw table rows into the reading path.
- Evidence-table rows must not also be emitted as checklist items for the same source section; if a section has both an evidence table and separate list checks, only the non-table list checks may become a checklist.
- Explicit risk / mitigation sections may emit deterministic `risk_register` semantic blocks from tables with risk/failure/blocker-like labels and mitigation/response-like columns.
- Risk-register cards may include trigger and impact fields when the source table exposes those columns, but must require a mitigation / response field so the lens explains how the risk is handled.
- Explicit open-question titles such as `开放问题` take precedence over incidental risk/blocking words, so the scaffold must not emit a duplicate `risk_register` for the same question table.
- Risk-table section summaries should describe the table as a set of risks instead of leaking raw table rows into the reading path.
- Checklist / compliance table section summaries should describe the table as a set of checks instead of leaking raw table rows into the reading path, even when introduced by a colon-ending lead-in paragraph.
- Compliance / rule-review tables such as `决不要做的事` may emit deterministic `checklist` semantic blocks so every rule is visible as a status row instead of only a source table.
- Compliance checklist rows default to `done` unless the row text explicitly indicates a violation or touched boundary.
- Compliance checklist extraction preserves at least ten rows, so standard rule-review tables are not truncated before their final rules.
- Prose-only evidence sections do not emit evidence-grid blocks, because the scaffold should avoid inventing proof items.
- Node ids are slugified from section titles when possible, otherwise section ids are used.
- Node kinds are inferred from title keywords such as `background`, `architecture`, `roadmap`, `risk`, `acceptance`, `open questions`, and their Chinese equivalents; incidental inline-code words such as `` `open` `` must not create a question node unless the title is explicitly an open-question section.
- Edges connect the selected nodes in source order, but their labels are semantic role transitions rather than a generic sequence label.
- Deterministic edge labels are derived from the source and target node kinds, with localized CJK labels for Chinese documents.
- Preamble sections such as `§0`, `One Sentence`, or `一句话` may feed the overview summary, but are skipped in the reading path and structure-map nodes.
- Long-document reading paths are role-aware rather than a raw first-four-section slice: keep the first substantive section, then prefer a primary model/path/decision/output section, a distinct core-concept section, and a guardrail section such as risks, open questions, evidence, or acceptance.
- Long-document structure maps use the selected reading-path sections instead of a raw first-six-section slice, so filler notes and appendices do not push core model / design / guardrail chapters out of the document model.
- Strong core-concept titles such as Dossier design / implementation / 重点章 / 命门 take precedence over generic model/data-model sections.
- CJK documents use Chinese scaffold chrome for reader goal, status, next step, structure title, structure summary, and edge labels.
- CJK scaffold status notes localize known status values such as `ready` / `implemented` into reader-facing Chinese labels, while keeping explicit document metadata visible.
- CJK scaffold renders should keep semantic badges reader-facing as well: structure node kinds and checklist/open-question statuses are localized instead of leaking English enum labels.
- CJK artifact headers localize frontmatter badge/stat chrome and relation summaries, including status values, reading-time text, owner/update/create labels, and `implements` / `reviews` counts.
- CJK renders localize page-level controls and footer chrome around the scaffold, including the TOC header, lens navigation accessible label, mobile TOC toggle label, code-copy label, footer status, and renderer credit.
- CJK scaffold reader-hint chips in source sections use Chinese visual and accessible labels (`阅读`, `阅读提示:`), not the default English `READ` / `Read:`.
- Very long or dash-separated titles are not prefixed onto the overview summary when that would duplicate the first summary.
- Semantic labels and next-step text strip Markdown code markers, while rendered source headings preserve inline Markdown as HTML and TOC labels display readable plain text.
- Repeated semantic block types should disambiguate their lens titles and TOC labels with the source section title, so readers can tell two checklist/evidence/etc. panels apart from the sidebar.

## 5. Acceptance

- Unit tests cover scaffold overview, reading path, structure map, node kinds, and edges.
- Unit tests cover role-aware structure-map edge labels instead of generic `leads to` / `引出` edges.
- Unit tests cover rendering scaffold annotations as a Dossier Lens.
- Unit tests cover plain `render()` emitting the deterministic scaffold lens by default.
- Unit tests cover explicit annotations replacing the default scaffold.
- CLI output reports overview/path/block counts, not only summary count.
- CJK dogfood output avoids duplicate title+summary prose and starts the reading path at the first substantive section.
- Dogfood reading path promotes the Dossier vision spec's core architecture, Dossier design chapter, and open questions instead of simply showing the first four H2 sections.
- Dogfood reading-path descriptions explain reader purpose such as context, decision, core model, or open questions, instead of repeating clipped source-summary prose.
- Dogfood document overview reader goal reflects the source artifact type, such as using a vision spec to align product intent, scope boundaries, and implementation inputs.
- Dogfood document overview status note reflects the source frontmatter status/kind/date and does not show scaffold implementation prose.
- Dogfood structure map promotes the same high-signal Dossier vision spec chapters instead of simply showing the first six H2 sections.
- Dogfood reading-path cards do not expose table pipes, ASCII diagram lines, or fragment-only lead-in phrases.
- Dogfood reading-path cards and Section Map summaries stay concise enough to scan before reading source prose.
- Dogfood Section Map and inline section summaries do not show broken mixed-language fragments such as `ma...`, `dossi...`, `rend...`, or next-sentence leftovers such as `chat...` when a complete CJK sentence boundary is available.
- Dogfood annotations include richer deterministic section briefs where useful, without duplicating list-first summaries as key points.
- Dogfood annotations include a Concept Glossary lens when explicit concept / vocabulary tables are present, without inventing glossary items from prose-only sections.
- Targeted scaffold render shows a Relations lens for explicit relationship tables, with edge evidence and source-section trace chips.
- Dogfood annotations include Scope lenses for explicit `目标` and `非目标` sections, without over-extracting `目标用户` or roadmap-range sections as scope blocks.
- Dogfood Dossier Lens navigation disambiguates repeated Scope entries with the source section title, such as `范围边界：目标` and `范围边界：非目标`.
- Dogfood annotations include a Roadmap lens for explicit `MVP 范围：三个里程碑` H3 stages, with H3 source trace links.
- Dogfood annotations include Requirements lenses for explicit H3 grouped requirement sections such as `仓库与 agent 设计要求` and `前端教学链路要求`, with item-level H3 source trace links.
- Dogfood annotations include a References lens for explicit `参考对象` link lists, with one card per source link, external-link attributes, localized trace labels, and no English `Reference:` prefix in CJK renders.
- Dogfood annotations include a separate References lens for `机会判断` / inspiration-style link lists, preserving each linked project's visible lesson as the card description.
- Dogfood annotations include a Takeaways lens for `机会判断` / inspiration-style lesson lists, preserving all four `本项目应该...吸收` bullets as scan-friendly cards with localized trace labels.
- Dogfood annotations include a Principles lens for explicit `设计原则` labelled lists, with one card per principle and localized `原则` trace labels.
- Dogfood annotations include a Decisions lens for explicit `Decision: dossier` naming prose, with source-section trace links and a block-level source link.
- Dogfood annotations include a Decisions lens for MVP-0 ADR tables, with a block-level source link and without creating decision blocks from prose-only decision sections.
- Dogfood annotations include an Evidence lens for review verification tables, with readable labels and source-section trace links.
- Dogfood reading-path cards summarize evidence tables structurally instead of showing raw row summaries.
- Dogfood annotations include a Risks lens for the Dossier vision spec `风险` table, with risk cards and source-section trace links.
- Dogfood annotations include a single Risks lens for the MVP-0 spec `风险与缓解` table and keep `开放问题（不阻塞...）` as Open Questions only.
- Dogfood annotations do not duplicate the automated acceptance evidence table as a second checklist lens.
- Dogfood reading-path cards summarize compliance checklist tables structurally instead of showing raw row summaries.
- Dogfood annotations include a Checklist lens for the `§ 7 "决不要做的事"` compliance review table, with all ten completed rows rendered as `done`.
- Dogfood reading-path cards summarize manual review checklist lists structurally instead of showing raw bullet text, and those sections are not mislabeled as open questions because their title contains an incidental `open` code span.
- Dogfood Dossier Lens navigation does not show duplicate generic `Checklist` entries when compliance and manual-review checklist panels both exist; each repeated checklist entry names its source section.
- Dogfood annotations include a Checklist lens for explicit `成功标准` sections, without creating checklist blocks from prose-only acceptance sections.
- Dogfood annotations include an Open Questions lens for explicit `开放问题` sections, with table context cleaned into readable prose.
- Targeted scaffold render shows `BLOCKED` status and readable `Impact ...` text for open questions that block the next action.
- Dogfood render does not expose raw Markdown backticks in source TOC labels or rendered H2/H3 headings.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- Dogfood render of the Dossier vision spec with plain `dossier render` shows Dossier Lens, Structure Map, semantic blocks, Section Map, and source-section summaries.
