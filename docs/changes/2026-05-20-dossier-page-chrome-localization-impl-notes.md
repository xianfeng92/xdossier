---
title: Dossier Page Chrome Localization Impl Notes
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

# Dossier Page Chrome Localization Impl Notes

## Summary

Localized the page-level navigation, control, and footer chrome for Chinese renders.

Before this change, Chinese output localized the Dossier Lens and frontmatter header, but still wrapped the report in English template controls: `Spec · 18 节`, `Dossier lens navigation`, `Toggle table of contents`, `Copy code`, and `rendered by dossier`.

## Changes

- Added page-level labels to the renderer's detected-language label bundle.
- Updated the render-spec template to receive localized TOC-toggle and footer labels instead of hardcoded English strings.
- Updated the TOC script injection path so generated code-copy buttons use the detected document language.
- Updated the TOC header and Dossier Lens accessible navigation label to use localized labels.
- Kept English renders unchanged:
  - TOC header: `Spec · N sections`;
  - TOC toggle: `Toggle table of contents`;
  - code copy: `Copy code`;
  - footer credit: `rendered by dossier`.
- Updated Chinese renders:
  - TOC header: `文档 · N 节`;
  - lens nav aria: `Dossier 透镜导航`;
  - TOC toggle: `打开或关闭目录`;
  - code copy: `复制代码`;
  - footer status uses localized frontmatter status values;
  - footer credit: `由 dossier 渲染`.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because the Chinese vision spec still rendered `aria-label="Toggle table of contents"`.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after wiring page chrome through detected-language labels.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems; ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- `git diff --check` passed.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-page-chrome-localized.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-page-chrome-localized.html`
  - page chrome now renders `文档 · 18 节`, `Dossier 透镜导航`, `打开或关闭目录`, `复制代码`, footer status `已就绪`, and `由 dossier 渲染`.
  - page-chrome slice search for `Toggle table of contents`, `Copy code`, `rendered by dossier`, `Spec ·`, `Dossier lens navigation`, and footer `ready`: 0 hits.
