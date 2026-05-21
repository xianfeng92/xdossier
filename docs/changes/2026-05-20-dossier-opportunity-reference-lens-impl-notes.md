---
title: Dossier Opportunity Reference Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Opportunity Reference Lens Impl Notes

## Summary

The deterministic scaffold now promotes opportunity / inspiration / comparable-project sections with Markdown links into `reference_list` semantic blocks, preserving link-adjacent lesson text as card descriptions.

## Why

The real `finetune-lab` Gemma roadmap has a high-signal `机会判断` section. Before this change, its comparable projects and lessons stayed buried in source prose, so the Dossier Lens exposed the final `参考对象` link dump but not the more useful "what should we learn from each project" layer.

## Implemented

- Extended reference-title recognition to include opportunity, inspiration, comparable, benchmark, `机会判断`, `借鉴对象`, `借鉴项目`, `竞品`, `对标项目`, and `同类项目` sections.
- Extracted descriptions from list items shaped like `[Project](url): lesson`.
- Kept extraction deterministic and source-bound: visible labels, hrefs, and adjacent lesson text all come from the Markdown list item.
- Reused the existing `reference_list` annotation and renderer instead of adding a new schema type.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "opportunity links"` failed because no `reference_list` block was emitted for `机会判断`.
- Green: the same target test passed after opportunity-title recognition and link-adjacent description extraction landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 60 tests.
- Real dogfood scaffold: `pnpm dev enrich /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md --provider scaffold -o /tmp/dossier-dogfood/finetune-opportunity-reference.annotations.json --verbose` produced 12 semantic blocks, including `机会判断` with 7 described reference cards and `参考对象` with 10 reference cards.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-opportunity-reference.html --verbose` wrote a 123941-byte HTML file.
- Browser DOM verification on `http://127.0.0.1:8775/finetune-opportunity-reference.html` found 2 reference blocks, separate TOC entries for `机会判断` and `参考对象`, localized `参考资料` trace chips, preserved lesson descriptions, no English `Reference:` trace prefix, and no horizontal overflow for reference blocks, cards, or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
