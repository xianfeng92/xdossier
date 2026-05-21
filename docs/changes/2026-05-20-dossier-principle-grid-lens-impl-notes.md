---
title: Dossier Principle Grid Lens Impl Notes
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

# Dossier Principle Grid Lens Impl Notes

## Summary

The deterministic scaffold now promotes explicit design-principle / guideline sections into `principle_grid` semantic blocks.

## Why

The real `finetune-lab` Gemma roadmap had a compact `设计原则` section with six labelled principles. Before this change, the render only treated that section as prose/list summary, so a reader had to enter the source Markdown to understand the design stance.

## Implemented

- Added `principle_grid` / principle item annotation types and parser support.
- Added deterministic extraction for explicit principles / guidelines / tenets sections with `label: guidance` list items.
- Added principle-card rendering, TOC labels, localized source trace labels, Section Map lane support, and CSS.
- Kept extraction deterministic and source-bound: prose-only principle sections do not invent cards.
- Updated the local agent prompt contract so external annotations can also emit `principle_grid`.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "principle grid"` failed because no `principle_grid` block was emitted.
- Green: the same target test passed after the extractor and renderer landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 58 tests.
- Render target suite: `pnpm test tests/render-spec.test.ts -- --runInBand` passed with 39 tests.
- Typecheck: `pnpm typecheck`.
- Real dogfood scaffold: `pnpm dev enrich /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md --provider scaffold -o /tmp/dossier-dogfood/finetune-principles.annotations.json --verbose` produced 10 semantic blocks, including 1 principle grid with 6 principles.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-gemma-roadmap-principles.html --verbose` wrote a 119403-character HTML file.
- Dogfood audit found 1 principle-grid block, 6 principle cards, `teaching-first`, `frontend-as-curriculum`, localized `原则` trace chips, and no English `Principle:` prefix in visible text.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
