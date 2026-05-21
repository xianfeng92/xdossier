---
title: Dossier Frontmatter Reader Goal Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Frontmatter Reader Goal Impl Notes

## Summary

Changed scaffold-generated `document_overview.reader_goal` so frontmatter-backed documents can explain the source artifact's purpose, not only how to use the Dossier Lens.

Before this change, the first-screen reader goal was generic guidance such as `先用结构地图和阅读路径理解文档，再进入原文。` That is useful UI guidance, but it does not answer what this particular document helps the reader understand. The scaffold now uses `kind` when present.

## Changes

- Added a deterministic `scaffoldReaderGoal()` helper in `src/enrich/section-summaries.ts`.
- Kept the previous generic reader goal when `kind` is absent.
- Added document-kind purpose text for:
  - `vision-*` documents: product intent, scope boundaries, implementation inputs;
  - `mvp-*` / `*-spec` documents: implementation scope, decisions, acceptance checks;
  - implementation / change notes: changed behavior, verification evidence, residual risks;
  - reviews: findings, risk boundaries, follow-up fixes;
  - handoff / brief documents: context, constraints, next step.
- Added a regression test proving a Chinese `vision-spec` document produces `用这份 vision spec 对齐产品意图、范围边界和后续实施输入。` and does not fall back to usage-only `结构地图` / `阅读路径` guidance.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand` failed because the new reader-goal test still received `先用结构地图和阅读路径理解文档，再进入原文。`
- Green: `pnpm test tests/enrich.test.ts -- --runInBand` passed after adding the frontmatter-kind reader-goal helper.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 107 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems, ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-frontmatter-reader-goal.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-frontmatter-reader-goal.html`
  - overview reader goal: `用这份 vision spec 对齐产品意图、范围边界和后续实施输入。`
  - overview status note: `已就绪 · vision spec · 更新 2026-05-18`
  - semantic blocks: 18
  - section-map cards: 18
