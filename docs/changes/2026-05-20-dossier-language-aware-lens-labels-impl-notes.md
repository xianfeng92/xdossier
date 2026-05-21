---
title: Dossier Language-Aware Lens Labels Impl Notes
status: implemented
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
---

# Dossier Language-Aware Lens Labels Impl Notes

## Summary

Localized the Dossier Lens navigation surface so Chinese documents no longer render key structure labels as mixed English UI. The renderer already detects document language for `<html lang>`, but several reader-facing semantic labels still stayed English: `Dossier Lens`, `Overview`, `Structure Map`, `Source Sections`, `Section Map`, `Connections`, and Section Map role prefixes such as `Path:` / `Model:`.

Those labels now come from the same language-aware render label contract used by the overview. English renders keep the existing English labels, while Chinese renders use Chinese labels such as `Dossier 透镜`, `总览`, `结构图`, `原文章节`, `章节地图`, `连接关系`, `路径：...`, and `模型：...`.

Follow-up: the Dossier Lens TOC now follows the actual semantic-lens render order instead of the raw annotation order. This keeps promoted model-building blocks, such as frontmatter relationship maps, in the same place in navigation as they appear in the page.

Second follow-up: source-prose semantic traces now share the same language-aware role-label path as the Section Map. When a Chinese document jumps from the Dossier Lens back into original prose, the inline trace now says `用于`, `路径：...`, `模型：...`, or `路线图：...` instead of reverting to `Used in`, `Path:`, `Model:`, and `Roadmap:`.

Third follow-up: semantic state badges now follow the same language-aware contract. Chinese renders no longer expose structure-map node kinds and status chips as `CONTEXT`, `DECISION`, `QUESTION`, `REQ`, or `OPEN`; they show reader-facing labels such as `背景`, `决策`, `问题`, `必做`, and `开放`.

## Files Changed

- `src/emit.ts`
  - extends `RenderLabels` with semantic block, TOC, source-boundary, Section Map, and role-chip labels;
  - localizes Dossier Lens TOC entries and semantic block labels;
  - localizes source-section counts and Section Map role-chip text while preserving English output for English documents;
  - shares semantic-lens ordering between the rendered page and the Dossier Lens TOC.
  - localizes structure-map node-kind labels and checklist/open-question status badges.
- `src/semantic-labels.ts`
  - adds shared language detection and semantic trace label localization.
- `src/parse/markdown.ts`
  - localizes source-section and subsection semantic traces before injecting them back into the original prose.
- `tests/render-spec.test.ts`
  - adds red/green assertions against the real Dossier vision spec proving the Chinese render no longer shows the main semantic-navigation or source-trace labels in English.
- `tests/enrich.test.ts`
  - updates CJK scaffold expectations so source-prose trace chips assert `检查清单` instead of the old English `Checklist`, and checklist status badges assert `完成` instead of `DONE`.
- `docs/specs/2026-05-19-dossier-semantic-lens-spec.md`
  - records the language-aware semantic-label contract.
- `docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md`
  - records that scaffold-generated semantic badges must be reader-facing in CJK renders.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- -t "renders structurally correct semantic HTML within bounded size"` failed because the Chinese vision spec still rendered `Dossier Lens`, `Overview`, `Structure Map`, `Source Sections`, and `Section Map`.
- Green: `pnpm test tests/render-spec.test.ts -- -t "renders structurally correct semantic HTML within bounded size|renders document overview, reading path, roadmap, and decisions before prose|renders structure maps as a document model before roadmap and traces source sections"` passed after localizing the labels and preserving English role-chip separators for English fixtures.
- Red follow-up: the same e2e test failed because `关系图` appeared after `术语表` / `路线图` in the Dossier Lens TOC even though it is rendered next to `结构图` in the model flow.
- Green follow-up: the same targeted test passed after the TOC reused the semantic-lens render ordering.
- Red source-trace follow-up: the same e2e test failed because source sections still rendered `Used in`, `Path: 为什么这个项目存在`, `Model: 为什么这个项目存在`, and `Roadmap: 10.1`.
- Green source-trace follow-up: the same targeted test passed after sharing the trace-localization path with source-prose rendering.
- Red semantic-badge follow-up: the same e2e test failed because the Chinese vision spec still rendered `CONTEXT`, `DECISION`, `QUESTION`, `REQ`, and `OPEN` inside the semantic lens.
- Green semantic-badge follow-up: the same targeted test passed after moving structure-node kind labels and checklist/open-question status labels into the language-aware render-label contract.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-language-aware-labels.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-language-aware-labels.html`
  - Dossier Lens TOC labels include `Dossier 透镜`, `总览`, `结构图`, `关系图`, `术语表`, `路线图`, `原文章节`, and `章节地图`.
  - `关系图` appears before `术语表` and `路线图` in the Dossier Lens TOC, matching the rendered semantic-lens order.
  - old navigation labels checked in the TOC/Section Map surface: 0 hits for `Dossier Lens`, `Overview`, `Structure Map`, `Source Sections`, and `Section Map`.
  - Section Map role chips include `路径：为什么这个项目存在` and `模型：为什么这个项目存在`; old `Path:` / `Model:` variants for those Chinese roles: 0 hits.
  - external asset check: no `<script src=...>` and no remote `<link href="http...">`.
- Source-trace dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-source-trace-localized.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-source-trace-localized.html`
  - source H2 traces: 10
  - source H3 traces: 3
  - examples include `用于 路径：为什么这个项目存在 模型：为什么这个项目存在` and `用于 路线图：10.1`
  - old source-trace labels: 0 hits for `Used in`, `Path:`, `Model:`, `Roadmap:`, and `Semantic trace for this`.
- Semantic-badge dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-semantic-badges-localized.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-semantic-badges-localized.html`
  - structure node badges: `背景`, `决策`, `决策`, `问题`
  - checklist status badges: 5 `必做`
  - open-question status badges: 8 `开放`
  - old badge labels: 0 hits for `CONTEXT`, `DECISION`, `QUESTION`, `REQ`, and `OPEN` as standalone structure/status badge text.
- `pnpm typecheck` passed.
- `pnpm test tests/render-spec.test.ts` passed: 38 tests.
- `pnpm test tests/enrich.test.ts` passed: 48 tests.
- `pnpm test` passed: 104 tests.
- `docs/specs` frontmatter/status check passed: 11 files, 0 problems, only `docs/specs/2026-05-17-dossier-vision-spec.md` remains `status: ready`.
