---
title: Dossier Scaffold Summary Clipping Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Scaffold Summary Clipping Implementation Notes

## Summary

Tightened deterministic scaffold summaries so generated HTML remains scan-friendly. Long prose summaries are now capped before they flow into Reading Path cards, Structure Map nodes, Section Map cards, and inline section briefs.

## Changes

- Added explicit summary and key-point length constants in `src/enrich/section-summaries.ts`.
- Reduced scaffold summary clipping from a loose paragraph-sized limit to a card-sized limit.
- Added a regression test proving long source prose becomes a bounded summary shared by reading path and structure-map nodes.

## Verification

- Red test first: `pnpm test tests/enrich.test.ts -t "clips long prose summaries"` failed because the summary still contained the next clause.
- Targeted green test: `pnpm test tests/enrich.test.ts -t "clips long prose summaries"`.
- `pnpm typecheck`
- `pnpm test tests/enrich.test.ts`
- `pnpm test tests/render-spec.test.ts`
- `pnpm test`
- Spec frontmatter/status check over `docs/specs/*.md`

## Dogfood Evidence

- Command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-summary-clipped.html --verbose`
- Output: `/tmp/dossier-dogfood/vision-summary-clipped.html`
- CLI-reported output size: `126922`
- UTF-8 byte size: `149459`
- Source Section Map cards: 18
- Inline section summaries: 18
- Maximum source-card summary length: 120
- Maximum inline section-summary length: 120
- Over-limit source-card summaries: 0
- Browser DOM check via local HTTP: lens top `397`, Section Map top `5369`, first source section top `7233`, 12 Dossier Lens TOC links.
