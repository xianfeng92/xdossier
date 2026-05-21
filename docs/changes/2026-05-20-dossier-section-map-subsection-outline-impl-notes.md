---
title: Dossier Section Map Subsection Outline Impl Notes
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

# Dossier Section Map Subsection Outline Impl Notes

## Summary

Added compact numbered H3 subsection outlines to Section Map cards.

Before this change, Section Map cards could say `2 subsections` / `2 个小节`, but they did not reveal what those subsections were. Readers still had to jump into the source prose or use the progressive TOC to understand the inside shape of a long section.

## Changes

- Render the first few H3 children of a source H2 as direct links inside its Section Map card.
- Include the local H3 number in each subsection link label when available, so the map shows coordinates such as `7.1 定义` instead of only the subsection title.
- Keep subsection links outside the main source-section anchor, preserving valid HTML and avoiding nested anchors.
- Localize the subsection outline accessible label:
  - English: `Subsections`;
  - Chinese: `小节`.
- Add a compact overflow label when a section has more subsection links than the visible budget.
- Add CSS for subsection chips that matches the existing Section Map key-point and semantic-role chip density.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed because Section Map cards only rendered the subsection count and did not contain `<span class="source-section-subsections" aria-label="Subsections">`.
- Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after rendering H3 subsection links in Section Map cards.
- Follow-up Red: `pnpm test tests/render-spec.test.ts -- --runInBand` failed when the expected subsection links required `2.1 Level 1` and `2.2 Level 2: Data and Schema`, because the renderer only emitted titles.
- Follow-up Green: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after subsection link labels included H3 numbers.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 111 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems; ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- `git diff --check` passed.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-section-map-numbered-subsections.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-section-map-numbered-subsections.html`
  - Section Map cards: 18.
  - Cards with numbered subsection outlines: 5.
  - Example outlines:
    - `为什么这个项目存在`: `1.1 一个被忽视的现实`, `1.2 一个更被忽视的现实`, `1.3 现状三种"理解 AI 输出"方式都不够好`, plus `还有 1 个小节`.
    - `Dossier 设计与实现（重点章）`: `7.1 定义`, `7.2 Dossier 识别（三层信号，由强到弱）`, `7.3 利用你现有 AI_SPACE 约定的具体例子`, plus `还有 5 个小节`.
