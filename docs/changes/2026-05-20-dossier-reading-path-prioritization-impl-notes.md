---
title: Dossier Reading Path Prioritization Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Reading Path Prioritization Implementation Notes

## Summary

Changed deterministic scaffold reading paths from a raw "first four meaningful sections" slice into a role-aware path. Long documents now keep the first substantive section, then promote model/path/decision material, a distinct core-concept chapter, and guardrail material such as risks, open questions, evidence, or acceptance.

## Changes

- Added `selectReadingPathSections()` in `src/enrich/section-summaries.ts`.
- Kept short documents unchanged: documents with four or fewer substantive sections still use source order.
- For long documents, promoted high-signal sections over filler notes / appendix sections.
- Added a stronger core-concept priority so a `Dossier Design and Implementation` / `Dossier 设计与实现` chapter beats a generic data-model section when both exist.
- Added regression tests for high-signal promotion, distinct core-concept inclusion, and Dossier-design preference.

## Verification

- Red test first: `pnpm test tests/enrich.test.ts -t "promotes high-signal sections"` failed because Reading Path still returned `Background`, `Notes`, `More Notes`, `Appendix`.
- Red test first: `pnpm test tests/enrich.test.ts -t "distinct core concept"` failed because the second core chapter was skipped when the primary model slot already selected a core-like title.
- Red test first: `pnpm test tests/enrich.test.ts -t "prefers a Dossier design"` failed because generic `Data Model` beat `Dossier Design and Implementation`.
- Targeted green test: `pnpm test tests/enrich.test.ts -t "promotes high-signal|distinct core concept|prefers a Dossier design"`.
- `pnpm typecheck`
- `pnpm test tests/enrich.test.ts`
- `pnpm test tests/render-spec.test.ts`

## Dogfood Evidence

- Command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-reading-path-prioritized.html --verbose`
- Output: `/tmp/dossier-dogfood/vision-reading-path-prioritized.html`
- Reading Path: `s2 为什么这个项目存在` -> `s5 核心架构（三层 + 一个核心概念）` -> `s8 Dossier 设计与实现（重点章）` -> `s13 开放问题`
- Semantic blocks: 9
- Source Section Map cards: 18
- Inline section summaries: 18
- Maximum source-card summary length: 120
- External asset check: no `<script src=...>` and no remote `<link href="http...">`.
