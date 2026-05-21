---
title: Dossier Structure Map Prioritization Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Structure Map Prioritization Implementation Notes

## Summary

Aligned deterministic Structure Map selection with the role-aware Reading Path for long documents. The structure map now models the same high-signal chapters that help a reader understand the document, instead of clipping to the first six H2 sections.

## Changes

- Added `selectStructureMapSections()` in `src/enrich/section-summaries.ts`.
- Preserved short-document behavior: documents with six or fewer substantive sections still map all source sections in order.
- For longer documents, Structure Map now uses the selected Reading Path sections, so filler notes / appendices do not push core model, design, or guardrail chapters out of the document model.
- Added a regression test that fails when Structure Map returns `Background`, filler notes, appendix, and extra context instead of the high-signal `Background`, `Core Architecture`, `Dossier Design and Implementation`, and `Open Questions` path.
- Updated the deterministic scaffold spec to record the long-document structure-map contract.

## Verification

- Red test first: `pnpm test tests/enrich.test.ts -- -t "deterministic scaffold uses high-signal sections in the structure map for long documents"` failed because Structure Map still returned the first six H2 sections.
- Targeted green test: `pnpm test tests/enrich.test.ts -- -t "deterministic scaffold uses high-signal sections in the structure map for long documents"`.
- `pnpm typecheck`
- `pnpm test tests/enrich.test.ts`
- `pnpm test tests/render-spec.test.ts`
- `pnpm test`
- Spec frontmatter/status check: 11 Markdown specs checked, 0 problems, only `docs/specs/2026-05-17-dossier-vision-spec.md` remains `status: ready`.

## Dogfood Evidence

- Command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-structure-map-prioritized.html --verbose`
- Output: `/tmp/dossier-dogfood/vision-structure-map-prioritized.html`
- Reading Path: `s2 为什么这个项目存在` -> `s5 核心架构（三层 + 一个核心概念）` -> `s8 Dossier 设计与实现（重点章）` -> `s13 开放问题`
- Structure Map nodes: `s2 为什么这个项目存在` -> `s5 核心架构（三层 + 一个核心概念）` -> `s8 Dossier 设计与实现（重点章）` -> `s13 开放问题`
- Semantic blocks: 9
- Source Section Map cards: 18
- Inline section summaries: 18
- External asset check: no `<script src=...>` and no remote `<link href="http...">`.
