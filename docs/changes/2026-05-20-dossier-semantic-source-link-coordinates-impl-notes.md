---
title: Dossier Semantic Source Link Coordinates Impl Notes
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

# Dossier Semantic Source Link Coordinates Impl Notes

## Summary

Added source coordinates to semantic block source links.

Before this change, semantic cards could say only `View source`, `Source`, `查看原文`, or `原文`. That made the structured layer traceable by click, but not by sight: a reader could not tell whether a decision, risk, roadmap stage, glossary item, or open question pointed to `§ 7`, `§ 12`, or a specific H3 subsection without leaving the card.

## Changes

- Reuse the renderer's TOC-derived `section_id -> number` lookup for semantic block source links.
- Render block-level source links with coordinates when available, such as `View source § 2` or `查看原文 § 7`.
- Render item-level source links with coordinates when available, such as `Source § 2` or `原文 § 12`.
- Render roadmap H3 item links with subsection coordinates when available, such as `Jump to subsection 2.1` or `跳到小节 10.1`.
- Preserve the previous fallback label when an annotation points to a section id that is not present in the TOC.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because semantic source links still rendered `View source` / `Source` without coordinates.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after source links used TOC coordinates.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-semantic-source-coordinates.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-semantic-source-coordinates.html`
  - Semantic source links: 43.
  - Links with coordinates: 43.
  - Example links: `查看原文 § 1`, `原文 § 7`, `查看原文 § 10`, `跳到小节 10.1`.
- Browser verification:
  - served `/tmp/dossier-dogfood` at `http://127.0.0.1:8768/` during verification.
  - in-app browser loaded `vision-semantic-source-coordinates.html`.
  - Browser DOM check found 43 semantic source links, 43 with coordinates.
  - First 20 sampled source links were visible and had no horizontal overflow.
- `pnpm test tests/enrich.test.ts -- --runInBand` passed: 54 tests.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems.
- `git diff --check` passed.
