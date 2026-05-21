---
title: Dossier Structure Map Edge Labels Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-structure-map-spec.md
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Structure Map Edge Labels Implementation Notes

## Summary

Changed scaffold-generated Structure Map edges from a generic sequence label into deterministic role-aware relationship labels. The structure map now reads more like a document model and less like a decorated source-order list.

## Changes

- Replaced the fixed scaffold edge labels `leads to` / `引出` with language-localized label functions.
- Edge labels are derived from source and target node kinds:
  - context -> decision: `frames` / `框定`
  - decision -> path/action: `turns into` / `转为行动`
  - path/action -> risk: `stress-tested by` / `由风险检验`
  - any -> evidence: `verified by` / `由证据验证`
  - any -> question: `leaves open` / `留下问题`
- Preserved the existing structure-map schema and rendering surface; only generated edge labels changed.
- Added a regression test that fails when scaffold-generated edges are still the generic `leads to`.
- Updated the structure-map and deterministic-scaffold specs to make meaningful edge labels part of the contract.

## Verification

- Red test first: `pnpm test tests/enrich.test.ts -- -t "deterministic scaffold labels structure-map edges by section roles"` failed because all three edges still used `leads to`.
- Targeted green test: `pnpm test tests/enrich.test.ts`
- `pnpm typecheck`
- `pnpm test tests/enrich.test.ts`
- `pnpm test tests/render-spec.test.ts`
- `pnpm test`
- Spec frontmatter/status check: 11 Markdown specs checked, 0 problems, only `docs/specs/2026-05-17-dossier-vision-spec.md` remains `status: ready`.

## Dogfood Evidence

- Command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-structure-map-edge-labels.html --verbose`
- Output: `/tmp/dossier-dogfood/vision-structure-map-edge-labels.html`
- Reading Path: `s2 为什么这个项目存在` -> `s5 核心架构（三层 + 一个核心概念）` -> `s8 Dossier 设计与实现（重点章）` -> `s13 开放问题`
- Structure Map nodes: `CONTEXT 为什么这个项目存在` -> `DECISION 核心架构（三层 + 一个核心概念）` -> `DECISION Dossier 设计与实现（重点章）` -> `QUESTION 开放问题`
- Structure Map edges: `为什么这个项目存在` -- `框定` -> `核心架构（三层 + 一个核心概念）`; `核心架构（三层 + 一个核心概念）` -- `细化` -> `Dossier 设计与实现（重点章）`; `Dossier 设计与实现（重点章）` -- `留下问题` -> `开放问题`
- Semantic blocks: 9
- Source Section Map cards: 18
- Inline section summaries: 18
- External asset check: no `<script src=...>` and no remote `<link href="http...">`.
