---
title: Dossier first-screen IA and progressive TOC implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - "docs/reviews/2026-05-19-dossier-html-design-review.md#slice-1--first-screen-ia-rework"
  - "docs/reviews/2026-05-19-dossier-html-design-review.md#slice-2--toc-progressive-disclosure"
---

## Summary

Implemented the first two HTML design slices from the 2026-05-19 design review:

- Promote the first generated `tagline` into a compact header-level `executive-brief`.
- Collapse pre-section callouts into a `document-notes` details block inside the header.
- Render the TOC as progressive navigation, with H3 children hidden by default and expanded only for the current section.
- Keep the active TOC entry in view while scrolling through long documents.

## Files Changed

- `src/emit.ts`
  - Adds a first-screen preparation pass before template substitution.
  - Extracts the first `.tagline` as `executive-brief`.
  - Extracts leading callouts before the first section as collapsed document notes.
  - Adds progressive TOC classes and `data-progressive-toc`.
- `src/skills/render-spec/style.css`
  - Reduces header padding/margin.
  - Adds `executive-brief` and `document-notes` styling.
  - Hides `.toc-children` until the parent `.toc-section` is current.
- `src/skills/render-spec/toc-script.js`
  - Tracks the current top-level section with `.is-current`.
  - Scrolls the active TOC link into view on active-section changes.
- `tests/render-spec.test.ts`
  - Adds regression coverage for executive brief promotion, collapsed document notes, and progressive TOC markup/script behavior.

## Verification

Targeted TDD cycle:

- Red: `pnpm test tests/render-spec.test.ts` failed on missing `executive-brief`, `document-notes`, and progressive TOC markup.
- Green: `pnpm test tests/render-spec.test.ts` passed with 21 tests.

Full verification:

- `pnpm typecheck` passed.
- `pnpm test` passed with 43 tests.
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-vision-first-screen-toc.html --verbose` wrote a 61,401 byte HTML file.
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-vision-codex.annotations.json -o /tmp/dossier-vision-first-screen-toc-codex.html --verbose` wrote a 68,942 byte enriched HTML file.
- Browser inspection confirmed the enriched HTML has one header-level executive brief, four collapsed document notes, zero remaining `.tagline` blocks, progressive TOC markup, and one expanded H3 group for the current section after scrolling.
