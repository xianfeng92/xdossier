---
title: Dossier render HTML review fixes implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - "docs/reviews/2026-05-19-dossier-render-html-ia-review.md"
---

# Dossier render HTML review fixes implementation notes

## Summary

Handled the Claude Code follow-up review for the render-spec IA work.

Implemented fixes for:

- F1: localized first-screen brief and document-note labels for the zh-CN output surface.
- F2: replaced brittle tagline/callout extraction with balanced `<div>` scanning and added nested raw-HTML regression coverage.
- F3: finished the remaining section brief density rules for short sections and reference/appendix-like sections.
- F4: kept the two visible key-point cap while preserving overflow points in a collapsed details block.
- F5/F6/F7/F8: tightened TOC scroll behavior, hash-load active-state sync, ID-contract documentation, and reading-time intent documentation.

## Files Changed

- `src/emit.ts`
  - Uses Chinese labels for `executive-brief` and `document-notes`.
  - Extracts generated tagline/callout blocks with a balanced div scanner so nested raw HTML does not clip the promoted content.
  - Documents that reading time measures the prepared body, excluding header guide surfaces.
- `src/parse/markdown.ts`
  - Adds section context collection for short/reference density decisions.
  - Hides dense key points and reader chips for very short sections.
  - Wraps reference/appendix-like section briefs in a collapsed `section-brief` details block.
  - Preserves key points beyond the visible two-item cap in collapsed overflow details.
  - Adds renderer-owned data attributes for promotable brief and document-note callouts.
- `src/skills/render-spec/style.css`
  - Styles overflow key points and collapsible reference briefs.
  - Keeps mobile density resets aligned with the new brief surfaces.
- `src/skills/render-spec/toc-script.js`
  - Makes TOC self-scrolling instant.
  - Re-syncs scroll-spy after hash/load layout.
  - Documents the `s<n>` / `s<n>-<m>` ID contract.
- `tests/render-spec.test.ts`
  - Adds regression coverage for localized labels, nested raw HTML extraction, short-section density, reference brief folding, key-point overflow, and TOC hash/scroll behavior.
- `docs/specs/2026-05-19-claude-code-render-html-review-handoff.md`
  - Marks the review handoff as implemented and links the generated review document.

## Verification

- Red: `pnpm test tests/render-spec.test.ts` failed on localized labels, nested extraction, section brief density, key-point overflow, and TOC scroll-sync expectations.
- Green: `pnpm test tests/render-spec.test.ts` passed with 24 tests.
- `pnpm typecheck` passed.
- `pnpm test` passed with 46 tests.
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-vision-codex.annotations.json -o /tmp/dossier-review-fixes-enriched.html --verbose` wrote a 76,520 byte enriched HTML file.
- Static inspection confirmed Chinese first-screen labels, no remaining body `class="tagline"`, collapsed document notes, key-point overflow details, and instant TOC self-scroll.
