---
title: Dossier Default Strategy Decision Grid Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Default Strategy Decision Grid Impl Notes

## Summary

The deterministic scaffold now extracts explicit default/base/comparison/upgrade strategy lists as `decision_grid` blocks when they appear inside decision- or strategy-shaped sections.

## Why

The real `finetune-lab` Gemma roadmap dogfood render exposed a structural gap: the source section `Gemma 4 E2B 基座策略` declared the default teaching base, comparison base, and upgrade route, but the Dossier Lens produced zero decision cards. Those labelled defaults are exactly the kind of reader-facing decision the structured HTML should surface before the source prose.

## Implemented

- Added a red test for explicit default strategy lists in `tests/enrich.test.ts`.
- Extended decision-title detection to include strategy/default/base strategy language.
- Added list extraction for labelled default strategy bullets such as `默认教学基座：...`, `对照实验基座：...`, and `后续升级路线：...`.
- Kept the heuristic narrow: generic decision prose still does not create decision grids, and the existing prose-only decision-section regression remains intact.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "default strategy lists"` failed because only the structure map was emitted.
- Green: `pnpm test tests/enrich.test.ts -- --runInBand -t "default strategy lists"` passed after the strategy-list extractor landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 55 tests.
- Render target suite: `pnpm test tests/render-spec.test.ts -- --runInBand` passed with 39 tests after replacing a brittle hard-coded lens id assertion with a relationship-map ordering assertion.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-gemma-roadmap-strategy-decisions.html --verbose` wrote a 98379-byte HTML file.
- Dogfood audit found 3 decision cards for `默认教学基座`, `对照实验基座`, and `后续升级路线`, plus matching item-level trace links `决策：...`; `Decision:` did not appear in the Chinese render.
- Browser DOM verification on `http://127.0.0.1:8770/finetune-gemma-roadmap-strategy-decisions.html` found the same 3 cards and 3 item trace labels, with no horizontal overflow for decision cards or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, `rg -n '[ \t]$' ...`, and `git diff --check`.
