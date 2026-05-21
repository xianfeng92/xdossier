---
title: Dossier Takeaway Grid Lens Impl Notes
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

# Dossier Takeaway Grid Lens Impl Notes

## Summary

The semantic lens now supports `takeaway_grid` blocks for explicit takeaways, lessons learned, inspiration, or "what this project should learn/adopt/absorb" lists.

## Why

The real `finetune-lab` Gemma roadmap already had an `机会判断` section with two different semantic layers: comparable projects and the four things the project should absorb from them. Reference cards exposed the comparable projects, but the four carry-forward lessons still stayed inside source prose and truncated key points.

## Implemented

- Added `takeaway_grid` / takeaway item annotation types and parser support.
- Added language-aware rendering, TOC labels, source-section trace chips, item anchors, and compact card styling.
- Added deterministic scaffold extraction for explicit takeaway titles and lead-in paragraphs such as `本项目应该从这些项目吸收...`.
- Kept extraction source-bound: takeaway cards come from explicit non-link list items, and link lists remain reference cards.
- Updated local agent provider guidance so external annotations can emit `takeaway_grid`.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "takeaway cards"` failed because no `takeaway_grid` block was emitted.
- Green: the same target test passed after takeaway extraction, rendering, and trace support landed.
- Target suites: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 61 tests; `pnpm test tests/render-spec.test.ts -- --runInBand` passed with 40 tests.
- Typecheck: `pnpm typecheck`.
- Real dogfood scaffold: `pnpm dev enrich /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md --provider scaffold -o /tmp/dossier-dogfood/finetune-takeaways.annotations.json --verbose` produced 13 semantic blocks, including `借鉴要点：机会判断` with 4 takeaway cards.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-takeaways.html --verbose` wrote a 127159-byte HTML file.
- Browser DOM verification on `http://127.0.0.1:8776/finetune-takeaways.html` found 1 takeaway block, 4 takeaway cards, a specific `借鉴要点：机会判断` TOC entry, localized block and item trace chips, preserved card details, no English `Takeaway:` trace prefix, and no horizontal overflow for takeaway blocks, cards, or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
