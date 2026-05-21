---
title: Dossier Reference List Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Reference List Lens Impl Notes

## Summary

The deterministic scaffold now promotes explicit reference/source sections with Markdown links into `reference_list` semantic blocks.

## Why

The real `finetune-lab` Gemma roadmap had a high-signal `参考对象` section with ten external links. Before this change, the default render compressed those links into a dense prose-like summary, so the HTML did not expose the document's research substrate as a navigable structure.

## Implemented

- Added `reference_list` / reference item annotation types and parser support.
- Added deterministic extraction for explicit references / sources / bibliography / further-reading sections with Markdown links.
- Added full-width reference-list rendering, card anchors, TOC labels, external-link attributes, and localized section trace labels.
- Kept extraction offline and deterministic: labels and hrefs come from source Markdown only, with no link fetching or validation.
- Updated the local agent prompt contract so external annotations can also emit `reference_list`.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "reference list"` failed because no `reference_list` block was emitted.
- Green: the same target test passed after the reference-list extractor and renderer landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 57 tests.
- Render target suite: `pnpm test tests/render-spec.test.ts -- --runInBand` passed with 39 tests.
- Typecheck: `pnpm typecheck`.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-gemma-roadmap-references.html --verbose` wrote a 110533-character HTML file.
- Dogfood audit found 1 reference-list block, 10 reference cards, localized `参考资料` trace chips, and no English `Reference:` prefix in visible text.
- Browser DOM verification on `http://127.0.0.1:8772/finetune-gemma-roadmap-references.html` found 1 reference block, 10 cards, complete hrefs, correct external-link `target` / `rel` attributes, expected source labels, localized trace labels, and no horizontal overflow for reference blocks, cards, or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
