---
title: Dossier Artifact Header Label Localization Impl Notes
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

# Dossier Artifact Header Label Localization Impl Notes

## Summary

Localized the first-viewport artifact header metadata for Chinese renders.

Before this change, Chinese Dossier output already localized the Dossier Lens, Section Map, source trace chips, and reader hints, but the frontmatter header still showed English metadata chrome such as `ready`, `Reading`, `Updated`, `Owner`, `Created`, and `Reviews`.

## Changes

- Added frontmatter/header label fields to the renderer's language label bundle.
- Kept English renders unchanged for status badge text, stat labels, relation labels, and relation summary counts.
- Updated Chinese renders:
  - known status values: `草稿`, `已就绪`, `已实现`, `已归档`;
  - reading time: `约 N 分钟`;
  - stat labels: `阅读`, `更新`, `负责人`, `创建`, `实现`, `评审`;
  - relation details: `N 个实现`, `N 个评审`.
- Added an end-to-end regression assertion on the real Dossier vision spec header so English metadata labels cannot silently re-enter the Chinese first viewport.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because the Chinese vision spec header still rendered `<span class="badge ready">ready</span>`.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after wiring the artifact header through detected-language labels.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems; ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- `git diff --check` passed.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-header-labels-localized.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-header-labels-localized.html`
  - header now renders `已就绪`, `阅读`, `更新`, `负责人`, `创建`, `评审`, `约 21 分钟`, and `1 个评审`.
  - header-slice search for `ready`, `Reading`, `Updated`, `Owner`, `Created`, `Implements`, `Reviews`, `N reviews`, `N implements`, and `~N min`: 0 hits.
