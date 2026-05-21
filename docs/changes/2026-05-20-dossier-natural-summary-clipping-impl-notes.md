---
title: Dossier Natural Summary Clipping Impl Notes
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

# Dossier Natural Summary Clipping Impl Notes

## Summary

Changed deterministic scaffold summary clipping so Section Map cards and inline source summaries stop exposing broken mixed-language fragments.

Before this change, real Dossier vision dogfood output contained scan-card text such as `VS Code 的 ma...`, `哪个 dossi...`, `rend...`, and list-summary leftovers like `又一个 chat...`. These fragments were short, but they made the page feel mechanically compressed rather than deliberately summarized.

## Changes

- Added a shared natural clipping helper in `src/enrich/section-summaries.ts`.
- `clipSentence()` now prefers a complete CJK sentence boundary when one fits inside the summary limit.
- Hard clipping now trims an incomplete trailing ASCII word before adding `...`.
- Reused the same safe clipping helper for decision labels, roadmap outputs, scope items, and key points.
- Added regression tests for:
  - mixed Chinese/English paragraph summaries that previously ended in `ma...`;
  - CJK paragraph summaries that should stop before a next-sentence `chat...` fragment;
  - list summaries that should use the same CJK sentence-boundary behavior.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand` failed on the mixed-language summary test with `VS Code 的 ma...`.
- Red: the CJK sentence-boundary tests failed with summaries that included `又一个 chat...`.
- Green: `pnpm test tests/enrich.test.ts -- --runInBand` passed after the natural clipping helper and CJK sentence-boundary handling.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 110 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems, ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-natural-summary-clipping.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-natural-summary-clipping.html`
  - search hits for `ma...`, `dossi...`, `rend...`, `chat...`, and `[A-Za-z]{2,}...`: 0.
