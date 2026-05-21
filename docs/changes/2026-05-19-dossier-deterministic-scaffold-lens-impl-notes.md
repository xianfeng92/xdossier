---
title: Dossier Deterministic Scaffold Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-19
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Deterministic Scaffold Lens Impl Notes

## Summary

The scaffold enrichment path now emits a minimal semantic lens. This makes the fully offline path produce structured HTML instead of only styled Markdown with section summaries.

## Changes

- Extended `createSectionSummaryScaffold()` to collect section titles and summaries.
- Added deterministic `document_overview` output.
- Added deterministic `reading_path` output from the first useful sections.
- Added deterministic `structure_map` output with node kind inference and sequential edges.
- Skipped preamble sections such as `§0` / `一句话` in the reading path and structure-map nodes while still allowing them to feed the overview summary.
- Added simple CJK scaffold labels for reader goal, status, next step, structure-map title, summary, and edges.
- Avoided duplicating long or dash-separated titles in overview summaries.
- De-noised scaffold summaries so Markdown tables become readable row summaries instead of raw pipe syntax.
- Skipped fenced code / ASCII diagrams as section-summary candidates, allowing the next prose block to explain the section.
- Completed colon-ending lead-in paragraphs with their following list/table content, so reading-path cards do not stop at fragments such as `关键设计判断：`.
- Preserved H2 display numbers during scaffold collection so numbered preamble sections such as `§0` stay out of the reading path even when the title wording varies.
- Added deterministic `key_points` for dense section briefs, derived from later paragraphs, list items, or table rows.
- Added deterministic `reader_hint` chips for action-shaped sections such as decisions, risks, questions, paths, evidence, outputs, and actions.
- Avoided duplicating list-first or table-first summaries as key points.
- Filtered empty lead-in paragraphs out of key-point selection.
- Preserved inline-code paths and angle-bracket placeholders such as `<encoded>` while still stripping real HTML tags.
- Added deterministic `scope_boundary` semantic blocks for explicit non-goal / out-of-scope sections.
- Kept scope extraction conservative so audience sections such as `目标用户` and broad roadmap-range sections are not misreported as Scope.
- Preserved all non-goal table rows for scope blocks while still keeping table-based summaries concise.
- Added deterministic `roadmap` semantic blocks for explicit roadmap / plan / milestone sections that contain H3 stages.
- Kept roadmap extraction conservative so prose-only roadmap sections do not invent stage cards.
- Linked roadmap cards back to source H3 ids so subsection trace chips can jump back to the structured stage.
- Added deterministic `decision_grid` semantic blocks for explicit decision tables and explicit `Decision:` paragraphs with rationale.
- Kept decision extraction conservative so prose-only decision sections do not invent decision cards.
- Linked decision grids back to source H2 sections so the rendered source keeps a Decisions trace chip and the decision panel header gets its own source-section jump link.
- Added `source_section_id` support for `decision_grid` annotations in the parser, renderer, deterministic scaffold, semantic trace, and local-agent provider schema.
- Added deterministic `evidence_grid` semantic blocks for explicit evidence / verification / acceptance tables.
- Kept evidence extraction conservative so prose-only evidence sections do not invent proof cards.
- Preferred human-readable claim/check columns over numeric `#` columns when labeling evidence cards.
- Summarized evidence-table sections as verifiable evidence sets so reading-path cards do not leak raw table rows.
- Suppressed checklist extraction from evidence-table rows when a section already emits an Evidence lens, avoiding duplicate Evidence + Checklist panels from the same verification table.
- Added annotation schema, parser, renderer, source trace, TOC, CSS, provider-prompt, and scaffold support for `risk_register` semantic blocks.
- Added deterministic `risk_register` extraction for explicit risk / mitigation tables, requiring a mitigation / response column and including optional trigger and impact fields when those columns exist.
- Summarized risk-table sections as risk sets so reading-path cards do not leak raw table rows.
- Gave explicit open-question titles priority over incidental risk/blocking words, so `开放问题（不阻塞...）` stays in the Open Questions lens instead of also becoming a duplicate Risks lens.
- Summarized open-question tables as open-question sets so reading-path cards and section briefs do not mislabel decision questions as risks.
- Summarized checklist / compliance table sections as check sets, including colon-ending lead-ins followed by a table, so reading-path cards do not leak raw table rows.
- Added renderer, annotation parser, source trace, TOC, and CSS support for Evidence lens cards.
- Updated the local-agent enrich prompt schema so providers can emit `evidence_grid` annotations.
- Added deterministic `checklist` semantic blocks for explicit acceptance / success-criteria sections when they contain list or table items.
- Kept checklist extraction conservative so prose-only acceptance sections do not invent item boundaries.
- Added deterministic `checklist` semantic blocks for compliance / rule-review tables such as `§ 7 "决不要做的事"` so rules become status rows instead of only source-table prose.
- Marked compliance checklist rows as `done` by default unless the row explicitly indicates a touched or violated boundary.
- Preserved up to 12 compliance checklist rows so 10-rule reviews are not truncated by the generic 8-item checklist density limit.
- Summarized manual / visual / human review checklist sections from list items as check sets, so reading-path cards do not leak raw manual QA bullets.
- Added deterministic `checklist` semantic blocks for manual review checklist sections.
- Added deterministic `open_questions` semantic blocks for explicit unresolved-question sections when they contain list or table items.
- Cleaned table-derived open-question context so row separators do not leak into the rendered question detail.
- Classified open-question items as `blocked` when their detail explicitly says they block or prevent the next action, and kept unresolved non-blocking questions as `open`.
- Added provider-prompt guidance for `open`, `blocked`, and `answered` question status selection.
- Added spacing between the Open Questions `Impact` label and impact text so rendered HTML reads as `Impact Blocks...` instead of `ImpactBlocks...`.
- Kept open-question extraction conservative so prose-only question sections do not invent item boundaries.
- Narrowed question node-kind inference so incidental inline-code words such as `open` do not turn manual-review sections into open-question sections.
- Cleaned scaffold reading-path labels, structure-map labels, and next-step text so Markdown code markers do not leak into semantic annotations.
- Rendered numbered H2/H3 source headings with inline Markdown preserved as HTML, while TOC labels use readable plain text.
- Disambiguated repeated semantic block types in the lens TOC; repeated checklist blocks now include their source section title instead of appearing as duplicate generic `Checklist` links.
- Added a render test proving scaffold annotations create a Dossier Lens and source-section model trace chips.
- Updated CLI enrich summaries so operators see `overview`, reading path count, and semantic block count.

## Dogfood Output

Rendered the Dossier vision spec with scaffold-only annotations:

- command: `pnpm dev enrich docs/specs/2026-05-17-dossier-vision-spec.md --provider scaffold -o /tmp/dossier-dogfood/vision-scaffold.annotations.json --verbose`
- render: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-dogfood/vision-scaffold.annotations.json -o /tmp/dossier-dogfood/vision-scaffold.html --verbose`
- annotations: `/tmp/dossier-dogfood/vision-scaffold.annotations.json`
- html: `/tmp/dossier-dogfood/vision-scaffold.html`
- annotation source: `dossier-enrich:section-summary-scaffold`
- section summaries: 18
- overview: true
- overview summary: `AI 给你的每一份设计 / 方案 / 文档，自动渲染成可读、可分享、可关联的 HTML 档案 —— 让你像翻杂志一样翻 AI 的产出，而不是像翻日志一样翻 AI 的过程。`
- next step: `从「为什么这个项目存在」开始，再按相关章节继续。`
- reading path items: 4
- reading path labels: `为什么这个项目存在`, `这个项目不做什么`, `目标用户`, `核心架构（三层 + 一个核心概念）`
- reading path description cleanup: table pipes removed, ASCII diagram skipped, lead-in paragraphs completed with follow-on list content
- H3 handling: roadmap extraction keeps H3 stages available for stage cards without letting H3 headings replace H2 section summaries
- richer section briefs: 16 of 18 sections include deterministic key points and/or reader hints
- inline-code placeholder preservation: `~/.claude/projects/<encoded>/*.jsonl` remains intact in scaffold output
- semantic blocks: `structure_map`, `roadmap`, `decision_grid`, `risk_register`, `scope_boundary`, `checklist`, `open_questions`
- structure title: `文档结构`
- structure nodes: 6
- first edge: `s2 -> s3` / `引出`
- roadmap source: `s11` / `MVP 范围：三个里程碑`
- roadmap items: 3
- first roadmap item: `10.1` / `MVP-0（1-2 周）—— 自动版的"我们今天手工做的事"`
- decision source: `s17` / `命名（已敲定）`
- decision items: 1
- decision block source link: `#s17`
- first decision item: `命名（已敲定）` / `dossier.` / `直击 §7 核心概念。npm 包名采用 scope: @xforg/dossier（裸 dossier 名 npm 上已占用，scope 包确保归属清晰）。CLI 二进制名：dossier。`
- risk register source: `s16` / `风险`
- risk register items: 6
- first risk item: `Dossier 识别不准（拆散或合错）` / `Tier 1 显式信号默认；让用户能 1 键合并 / 拆分 dossier。`
- last risk item: `隐私顾虑` / `本地优先；.dossierignore + redact-patterns.json。`
- scope boundary source: `s3` / `这个项目不做什么`
- scope boundary out-of-scope items: 8
- checklist source: `s15` / `成功标准`
- checklist items: 5
- open questions source: `s13` / `开放问题`
- open questions items: 8
- first open question context cleanup: `TS + Node，能复用 html-anything 的 SKILL.md 解析器和 detect 代码。`
- HTML size: 117,553 chars / 140,172 bytes
- Dossier Lens present: true
- Structure Map blocks: 1
- Roadmap blocks: 1
- Decision Grid blocks: 1
- Decision Grid anchor: `#lens-decision-grid-3`
- Decision source trace chips: 1
- Risk Register blocks: 1
- Risk Register anchor: `#lens-risk-register-4`
- Risk source trace chips: 1
- Scope blocks: 1
- Checklist blocks: 1
- Open Questions blocks: 1
- model trace chips: 7
- Source Sections boundary present: true
- browser preview: `http://127.0.0.1:8768/vision-risk-scaffold.html`
- browser lens links include: `Risks`
- browser risk cards: 6
- browser first risk: `Dossier 识别不准（拆散或合错）`
- browser last risk: `隐私顾虑`
- browser risk screenshot: `/tmp/dossier-dogfood/vision-risk-register-panel.png`

Rendered the Dossier MVP-0 spec with scaffold-only annotations:

- command: `pnpm dev enrich docs/specs/2026-05-18-dossier-mvp-0-spec.md --provider scaffold -o /tmp/dossier-dogfood/mvp0-risk-scaffold.annotations.json --verbose`
- render: `pnpm dev render docs/specs/2026-05-18-dossier-mvp-0-spec.md --annotations /tmp/dossier-dogfood/mvp0-risk-scaffold.annotations.json -o /tmp/dossier-dogfood/mvp0-risk-scaffold.html --verbose`
- annotations: `/tmp/dossier-dogfood/mvp0-risk-scaffold.annotations.json`
- html: `/tmp/dossier-dogfood/mvp0-risk-scaffold.html`
- annotation source: `dossier-enrich:section-summary-scaffold`
- section summaries: 15
- semantic blocks: `structure_map`, `roadmap`, `decision_grid`, `risk_register`, `scope_boundary`, `checklist`, `open_questions`
- decision source: `s3` / `技术决策（ADR 风格，锁定不再讨论）`
- decision items: 8
- decision block source link: `#s3`
- first decision item: `D1 · 运行时` / `Node.js ≥ 20.` / `Bun：增加新工具链依赖，团队 / CI 未必有；❌ Deno：生态远。`
- risk register source: `s13` / `风险与缓解`
- risk register items: 6
- open questions source: `s17` / `开放问题（不阻塞 MVP-0 启动，但要在过程中决断）`
- open questions items: 4
- open questions section summary: `开放问题（不阻塞 MVP-0 启动，但要在过程中决断）包含 4 个开放问题。`
- duplicate open-question risk register: false
- HTML size: 119,954 chars / 135,060 bytes
- browser preview: `http://127.0.0.1:8768/mvp0-risk-scaffold.html`
- browser lens links include: `Risks`, `Open Questions`
- browser risk blocks/cards: 1 / 6
- browser open-question blocks/items: 1 / 4
- browser source trace chips: `s13` has `Risks`, `s17` has `Questions`
- browser open-question lens screenshot: `/tmp/dossier-dogfood/mvp0-risk-open-question-lens.png`
- browser decision source link: `#s3` / `查看原文`
- browser decision source screenshot: `/tmp/dossier-dogfood/mvp0-decision-source-browser.png`

Rendered a targeted blocked-question scaffold fixture:

- command: inline `tsx` scaffold/render of an `Open Questions` list with `Blocks Cover-1 confidence.`
- annotations: `/tmp/dossier-dogfood/blocked-open-question.annotations.json`
- html: `/tmp/dossier-dogfood/blocked-open-question.html`
- open-question statuses: `BLOCKED`, `OPEN`
- blocked question impact text: `Impact Blocks Cover-1 confidence.`
- browser screenshot: `/tmp/dossier-dogfood/blocked-open-question-browser.png`

Rendered the Dossier MVP-0 review with scaffold-only annotations:

- command: `pnpm dev enrich docs/reviews/2026-05-18-dossier-mvp-0-review.md --provider scaffold -o /tmp/dossier-dogfood/mvp0-review-scaffold.annotations.json --verbose`
- render: `pnpm dev render docs/reviews/2026-05-18-dossier-mvp-0-review.md --annotations /tmp/dossier-dogfood/mvp0-review-scaffold.annotations.json -o /tmp/dossier-dogfood/mvp0-review-scaffold.html --verbose`
- annotations: `/tmp/dossier-dogfood/mvp0-review-scaffold.annotations.json`
- html: `/tmp/dossier-dogfood/mvp0-review-scaffold.html`
- annotation source: `dossier-enrich:section-summary-scaffold`
- section summaries: 8
- semantic blocks: `structure_map`, `evidence_grid`, `checklist`, `checklist`
- evidence source: `s2` / `自动化验收（11/11 命中）`
- evidence items: 8 shown in the lens from a 13-row verification table
- first evidence item: `pnpm typecheck clean` / `tsc -p . --noEmit exit 0.`
- evidence anchor: `#lens-evidence-grid-2`
- evidence source trace chips: 1
- compliance checklist source: `s3` / `§ 7 "决不要做的事" 合规审查`
- compliance checklist items: 10
- compliance checklist statuses: 10 `done`, 0 `required`
- compliance checklist last item: `改 spec 核心决策`
- manual checklist source: `s4` / `仍需用户肉眼复核（2 项，文件已 open 在浏览器）`
- manual checklist items: 2
- manual checklist statuses: 0 `done`, 2 `required`
- automated acceptance duplicated as checklist: false
- reading-path cleanup: `自动化验收（11/11 命中）包含 13 项可验证证据。`
- compliance reading-path cleanup: `§ 7 "决不要做的事" 合规审查包含 10 项检查。`
- manual review reading-path cleanup: `仍需用户肉眼复核（2 项，文件已 open 在浏览器）包含 2 项检查。`
- manual review checklist source: `s4` / `仍需用户肉眼复核（2 项，文件已 open 在浏览器）`
- manual review checklist items: 2
- manual review question-chip false positive: false
- raw manual review bullet leakage in summary: false
- raw source TOC backtick leakage for `open`: false
- raw evidence table row leakage in reading path: false
- raw compliance table row leakage in reading path: false
- HTML size: 69,966 chars / 76,186 bytes
- browser preview: `http://127.0.0.1:8767/mvp0-review-scaffold.html`
- browser lens links: `Overview`, `Structure Map`, `Evidence`, `验收检查：§ 7 "决不要做的事" 合规审查`, `验收检查：仍需用户肉眼复核（2 项，文件已 open 在浏览器）`, `Source Sections`, `Section Map`
- browser checklist blocks: compliance `10 DONE / 0 REQ`, manual review `0 DONE / 2 REQ`
- browser screenshot: `/tmp/dossier-dogfood/mvp0-review-compliance-checklist-firstscreen.png`

## Verification

- `pnpm test tests/enrich.test.ts -t "deterministic scaffold produces"`
- `pnpm test tests/enrich.test.ts -t "deterministic scaffold"`
- `pnpm test tests/enrich.test.ts -t "CLI enrich summary"`
- `pnpm test tests/enrich.test.ts -t "preamble"`
- `pnpm test tests/enrich.test.ts -t "localizes CJK"`
- `pnpm test tests/enrich.test.ts -t "de-noises"`
- `pnpm test tests/enrich.test.ts -t "lead-in"`
- `pnpm test tests/enrich.test.ts -t "lead-in|de-noises|deterministic scaffold"`
- `pnpm test tests/enrich.test.ts -t "key points|duplicating"`
- `pnpm test tests/enrich.test.ts -t "empty lead-in"`
- `pnpm test tests/enrich.test.ts -t "angle-bracket"`
- `pnpm test tests/enrich.test.ts -t "angle-bracket|de-noises|empty lead-in|key points"`
- `pnpm test tests/enrich.test.ts -t "scope boundary"`
- `pnpm test tests/enrich.test.ts -t "target users"`
- `pnpm test tests/enrich.test.ts -t "target users|scope boundary"`
- `pnpm test tests/enrich.test.ts -t "scope boundary|de-noises"`
- `pnpm test tests/enrich.test.ts -t "checklist|acceptance"`
- `pnpm test tests/enrich.test.ts -t "open question"`
- `pnpm test tests/enrich.test.ts -t "roadmap"`
- `pnpm test tests/enrich.test.ts -t "decision grid"`
- `pnpm test tests/enrich.test.ts -t "explicit decision"`
- `pnpm test tests/render-spec.test.ts -t "evidence grids"`
- `pnpm test tests/enrich.test.ts -t "evidence grid"`
- `pnpm test tests/enrich.test.ts -t "risk register"`
- `pnpm test tests/render-spec.test.ts -t "risk registers"`
- `pnpm test tests/enrich.test.ts -t "local agent provider|risk register"`
- `pnpm test tests/render-spec.test.ts -t "semantic lens annotations|risk registers"`
- `pnpm test tests/enrich.test.ts -t "risk register|evidence grid|checklist|open question|local agent provider"`
- `pnpm test tests/enrich.test.ts -t "open-question tables"`
- `pnpm test tests/enrich.test.ts -t "risk register|open question|evidence grid|checklist|local agent provider"`
- `pnpm test tests/render-spec.test.ts -t "semantic lens annotations|risk registers|open question"`
- `pnpm test tests/enrich.test.ts -t "creates open questions"`
- `pnpm test tests/enrich.test.ts -t "local agent provider"`
- `pnpm test tests/enrich.test.ts -t "decision grid from explicit decision tables"`
- `pnpm test tests/enrich.test.ts -t "decision grid|local agent provider"`
- `pnpm test tests/render-spec.test.ts -t "semantic lens annotations"`
- `pnpm test tests/enrich.test.ts -t "acceptance review evidence"`
- `pnpm test tests/enrich.test.ts -t "evidence grid|acceptance review evidence|checklist|manual visual review|multiple checklist lenses"`
- `pnpm test tests/enrich.test.ts -t "compliance tables"`
- `pnpm test tests/enrich.test.ts -t "promotes compliance tables"`
- `pnpm test tests/enrich.test.ts -t "all ten compliance"`
- `pnpm test tests/enrich.test.ts -t "promotes compliance tables|all ten compliance"`
- `pnpm test tests/enrich.test.ts -t "compliance|checklist|acceptance review evidence|manual visual review|multiple checklist lenses"`
- `pnpm test tests/enrich.test.ts -t "manual visual review"`
- `pnpm test tests/enrich.test.ts -t "multiple checklist lenses"`
- `pnpm test tests/enrich.test.ts -t "checklist|manual visual review|multiple checklist lenses"`
- `pnpm test tests/render-spec.test.ts -t "semantic lens annotations"`
- `pnpm test tests/enrich.test.ts -t "open question|checklist|lead-in|manual visual review"`
- `pnpm test tests/render-spec.test.ts -t "inline markdown inside numbered headings"`
- `pnpm test tests/enrich.test.ts -t "lead-in|compliance|acceptance review evidence|checklist|evidence grid|de-noises"`
- `pnpm test tests/enrich.test.ts -t "local agent provider"`
- `pnpm test tests/enrich.test.ts`
- `pnpm test tests/render-spec.test.ts -t "structure map"`
- `pnpm typecheck`
- `pnpm test`
