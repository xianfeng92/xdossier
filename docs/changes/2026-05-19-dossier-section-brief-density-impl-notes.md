---
title: Dossier section brief density implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - "docs/reviews/2026-05-19-dossier-html-design-review.md#slice-3--section-brief-density-rules"
---

## Summary

Implemented the section brief density rules for AI-enriched render output:

- Keep the one-line section summary visible.
- Cap rendered `key_points` to two items per section.
- Render `reader_hint` as a compact chip instead of a full paragraph.
- Hide key points on narrow screens to keep mobile reading light.

## Files Changed

- `src/parse/markdown.ts`
  - Caps `section-key-points` to two items.
  - Adds `data-density="compact"`.
  - Changes reader hint markup to `section-reader-chip` with an explicit `READ` label span.
  - Adds an `aria-label` for the reader hint chip so the visual label does not create awkward screen-reader text.
- `src/skills/render-spec/style.css`
  - Adds chip styling for reader hints.
  - Removes the old pseudo-element `READ` prefix.
  - Adds mobile density rules that reset section brief margins and hide key points below 720px.
- `tests/render-spec.test.ts`
  - Updates annotation coverage to verify key point capping, chip markup, and mobile CSS.

## Verification

Targeted TDD cycle:

- Red: `pnpm test tests/render-spec.test.ts` failed because all three key points rendered and reader hints used the old paragraph markup.
- Green: `pnpm test tests/render-spec.test.ts` passed with 21 tests after the compact density implementation.

Full verification:

- `pnpm typecheck` passed.
- `pnpm test` passed with 43 tests.
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-vision-codex.annotations.json -o /tmp/dossier-section-brief-density-codex.html --verbose` wrote a 70,399 byte enriched HTML file.
- Static inspection of the enriched HTML found 18 summaries, 18 key point lists, 18 reader chips, max 2 key points per section, 0 sections with 3+ key points, and mobile CSS hiding key points.
- Browser inspection of the enriched HTML confirmed the §7 brief rendered with exactly 2 key points and a compact reader chip.
