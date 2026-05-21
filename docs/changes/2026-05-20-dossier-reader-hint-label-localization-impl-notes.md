---
title: Dossier Reader Hint Label Localization Impl Notes
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

# Dossier Reader Hint Label Localization Impl Notes

## Summary

Localized source-section reader hint chip chrome for Chinese renders.

Before this change, Chinese dogfood output still rendered source reader hints as `READ` with accessible labels like `Read: 用本节理解关键决策及其理由。` That leaked template UI language into otherwise localized Dossier Lens / Section Map output.

## Changes

- Added reader-hint label fields to `SemanticTraceLabels`.
- Kept English output unchanged:
  - visible label: `READ`;
  - accessible prefix: `Read:`.
- Updated Chinese output:
  - visible label: `阅读`;
  - accessible prefix: `阅读提示:`.
- Added a renderer regression test for Chinese reader-hint chip labels.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because the rendered chip still used `aria-label="Read: ..."` and visible `READ`.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after wiring reader-hint labels through the detected document language.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems, ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-reader-hint-localized.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-reader-hint-localized.html`
  - Chinese reader hint chips now render `阅读` / `阅读提示:`.
  - search for English `READ` / `Read:` chrome on Chinese reader hints: 0 hits.
