---
title: Dossier Primary Roadmap First Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Primary Roadmap First Impl Notes

## Summary

Promoted the primary roadmap flow ahead of the document model / relationship layer when a semantic lens has staged roadmap content.

## Why

The `finetune-lab` Gemma roadmap dogfood page was structurally rich, but a beginner had to pass through the structure map and frontmatter relationship history before seeing the six-stage microtuning learning path. For learning-roadmap documents, the first actionable mental model should be the stage sequence.

## Changes

- `renderSemanticLens()` now renders `semantic-primary-flow` directly after the overview when primary roadmap content exists.
- Dossier Lens TOC ordering follows the same order, so roadmap links appear before structure / relationship support links.
- Roadmap blocks now render a compact stage strip before detailed cards, so all stage names remain visible even when detailed cards are density-capped.
- `render-spec` skill guidance now encodes the design rule: route first, structure/history second for staged learning or execution documents.
- Updated the semantic-lens spec render contract with the same ordering rule.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -t "primary roadmap|frontmatter relationship history"` failed because roadmap still rendered after the structure / relationship layer.
- Green: the same targeted test passed after changing renderer and TOC ordering.
- Red: `pnpm test tests/render-spec.test.ts -t "document overview|primary flow"` failed because roadmap blocks had no stage strip and CSS contract.
- Green: the expanded targeted test passed after adding the stage strip and styles.
