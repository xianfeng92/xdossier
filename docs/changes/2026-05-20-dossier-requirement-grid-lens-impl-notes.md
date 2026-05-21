---
title: Dossier Requirement Grid Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Requirement Grid Lens Impl Notes

## Summary

The deterministic scaffold now promotes explicit requirements sections with H3 groups into `requirement_grid` semantic blocks.

## Why

The real `finetune-lab` Gemma roadmap still had two high-signal sections that rendered mostly as source prose: `仓库与 agent 设计要求` and `前端教学链路要求`. Both sections already had a clear structure of H3 requirement groups plus list items, so the HTML should surface them as reader-facing requirement cards instead of asking the reader to rediscover the structure in Markdown.

## Implemented

- Added `requirement_grid` / requirement item annotation types and parser support.
- Added deterministic extraction for explicit requirements-shaped H2 sections with H3 groups and list bullets.
- Added full-width requirement-grid rendering, TOC labels, localized section trace labels, and item-level H3 source links.
- Avoided duplicate checklist flattening when the same source section is already represented by a requirement grid.
- Updated the local agent prompt contract so external annotations can also emit `requirement_grid`.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "requirement grid"` failed because no `requirement_grid` block was emitted.
- Green: the same target test passed after the requirement-grid extractor and renderer landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 56 tests.
- Render target suite: `pnpm test tests/render-spec.test.ts -- --runInBand` passed with 39 tests.
- Typecheck: `pnpm typecheck`.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-gemma-roadmap-requirements.html --verbose` wrote a 105558-byte HTML file.
- Dogfood audit found 2 requirement-grid blocks, 7 requirement cards, and localized item trace labels for all 7 H3 requirement groups; `Requirement:` did not appear in the Chinese render.
- Browser DOM verification on `http://127.0.0.1:8771/finetune-gemma-roadmap-requirements.html` found the same 2 requirement blocks and 7 cards, no duplicate checklist trace for those requirement sections, no English `Requirement:` prefix, and no horizontal overflow for requirement blocks, cards, or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
