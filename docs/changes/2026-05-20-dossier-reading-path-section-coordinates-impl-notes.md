---
title: Dossier Reading Path Section Coordinates Impl Notes
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

# Dossier Reading Path Section Coordinates Impl Notes

## Summary

Added source section coordinates to Reading Path cards.

Before this change, the semantic overview could recommend "Main path" or "Dossier 设计与实现（重点章）", but the card did not show which source section it pointed to. Readers had to click or cross-check the TOC to learn the actual `§` coordinate.

## Changes

- Pass the source TOC into semantic-lens overview rendering.
- Build a deterministic `section_id -> number` lookup from H2/H3 TOC entries.
- Render the matching source coordinate in each Reading Path card when available, such as `§ 2`.
- Keep the behavior graceful when annotations point to a section that is not present in the TOC: the card still renders without a coordinate.
- Add compact Reading Path number styling that matches the existing mono metadata language.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because Reading Path cards did not render `<span class="reading-path-number">§ 2</span>`.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after Reading Path cards used TOC coordinates.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-reading-path-coordinates.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-reading-path-coordinates.html`
  - Reading Path cards: 4.
  - Extracted coordinates:
    - `#s2`: `§ 1` `为什么这个项目存在`.
    - `#s5`: `§ 4` `核心架构（三层 + 一个核心概念）`.
    - `#s8`: `§ 7` `Dossier 设计与实现（重点章）`.
    - `#s13`: `§ 12` `开放问题`.
- Browser verification note: the in-app browser rejected direct `file:///tmp/dossier-dogfood/vision-reading-path-coordinates.html` navigation under its URL policy, so visual browser verification was not used for this slice.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems.
- `git diff --check` passed.
