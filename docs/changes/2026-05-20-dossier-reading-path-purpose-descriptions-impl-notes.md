---
title: Dossier Reading Path Purpose Descriptions Impl Notes
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

# Dossier Reading Path Purpose Descriptions Impl Notes

## Summary

Changed scaffold-generated Reading Path descriptions from copied section summaries into role-aware reader-purpose guidance.

Before this change, a long source section could make the first Reading Path card show clipped source prose such as `...VS Code 的 ma...`. That made the Dossier Lens feel like a compact Markdown summary. Now Reading Path cards explain why the reader should jump to a section, while source summaries remain available in the Section Map and inline section briefs.

## Changes

- Added a deterministic `readingPathDescription()` helper in `src/enrich/section-summaries.ts`.
- Kept `section_summaries` unchanged as the source-prose summary layer.
- Generated Reading Path descriptions from section roles:
  - context -> background/problem orientation;
  - decision -> key decision and rationale;
  - strong Dossier/core-design chapters -> core model building;
  - path/action/output -> execution or output orientation;
  - evidence/check/review -> verification evidence;
  - risk -> risk inspection;
  - open questions -> uncertainty confirmation.
- Updated existing scaffold tests whose old contract expected Reading Path descriptions to equal summaries.
- Added a regression test proving Chinese long-document Reading Path cards no longer copy source summaries or source-prose fragments.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- -t "reader-purpose reading path"` failed because the new test saw copied source summaries such as `漂亮 Markdown`, `解释架构选择`, and `哪些关系`.
- Green: `pnpm test tests/enrich.test.ts` passed after generating reader-purpose descriptions and updating the old summary-copy assertions.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-reading-path-purpose.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-reading-path-purpose.html`
  - Reading Path cards:
    - `为什么这个项目存在` -> `先用本节建立背景和问题。`
    - `核心架构（三层 + 一个核心概念）` -> `用本节理解关键决策及其理由。`
    - `Dossier 设计与实现（重点章）` -> `用本节建立文档的核心模型。`
    - `开放问题` -> `继续前先用本节确认开放问题。`
  - old raw-summary fragments in Reading Path cards: 0 hits for `VS Code`, `markdown`, `html-anything`, `命门`, and `开放问题包含`.
  - source summaries still present in the full HTML for Section Map / source-prose context.

