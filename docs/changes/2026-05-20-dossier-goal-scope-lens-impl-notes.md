---
title: Dossier Goal Scope Lens Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Goal Scope Lens Impl Notes

## Summary

The deterministic scaffold now treats exact Chinese `目标` sections as in-scope scope-boundary content, while preserving `非目标` as out-of-scope content.

## Why

The real `finetune-lab` Gemma roadmap already had a clear `目标` / `非目标` pair. Before this change, only `非目标` became a Scope Lens; the reader still had to enter the source prose to see what the document explicitly includes.

## Implemented

- Added exact Chinese goal-title recognition for `目标`, `项目目标`, `本轮目标`, and `核心目标`.
- Kept `目标用户` excluded from scope extraction.
- Disambiguated repeated scope-boundary titles with the source section title, so repeated Scope entries do not collapse into generic `范围边界`.
- Preserved the existing deterministic extraction: scope items come only from explicit list/table points.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand -t "Chinese goals"` failed because only the `非目标` block was emitted and it used a generic title.
- Green: the same target test passed after goal-title recognition and repeated-scope title disambiguation landed.
- Target suite: `pnpm test tests/enrich.test.ts -- --runInBand` passed with 59 tests.
- Typecheck: `pnpm typecheck`.
- Real dogfood scaffold: `pnpm dev enrich /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md --provider scaffold -o /tmp/dossier-dogfood/finetune-scope-goals.annotations.json --verbose` produced 11 semantic blocks, including `范围边界：目标` with 5 in-scope items and `范围边界：非目标` with 4 out-of-scope items.
- Real dogfood render: `pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md -o /tmp/dossier-dogfood/finetune-gemma-roadmap-goal-scope.html --verbose` wrote a 120615-character HTML file.
- Browser DOM verification on `http://127.0.0.1:8774/finetune-gemma-roadmap-goal-scope.html` found 2 scope blocks, separate TOC entries for `范围边界：目标` and `范围边界：非目标`, visible in-scope/out-of-scope items, localized `范围` trace chips, no English `Scope:` prefix, and no horizontal overflow for scope blocks, columns, or trace links at a 1280px viewport.
- Full checks: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, touched-file trailing whitespace scan, and `git diff --check`.
