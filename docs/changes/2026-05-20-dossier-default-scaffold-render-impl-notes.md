---
title: Dossier Default Scaffold Render Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Default Scaffold Render Implementation Notes

## Summary

Changed the plain render path so `dossier render <markdown>` now emits deterministic scaffold annotations by default. A normal render therefore includes a Dossier Overview, Reading Path, Structure Map, semantic blocks where detectable, Section Map, source-section summaries, and semantic trace links without requiring a separate `dossier enrich --provider scaffold` step.

## Changes

- Updated `src/render.ts` to call `createSectionSummaryScaffold(input.markdown)` whenever callers do not provide explicit annotations.
- Preserved explicit annotation ownership: `input.annotations` still replaces the default scaffold completely.
- Updated render acceptance tests so the default vision-spec render is expected to be structured semantic HTML, not a sub-100KB styled Markdown artifact.
- Updated frontmatter relation tests for the new default ordering: default `structure_map` appears before frontmatter `relationship_map`, so frontmatter relations now render as a later lens when scaffold annotations are active.

## Verification

- Red test first: `pnpm test tests/render-spec.test.ts -t "deterministic scaffold lens|explicit annotations replace"` failed before implementation.
- Targeted green test: `pnpm test tests/render-spec.test.ts -t "deterministic scaffold lens|explicit annotations replace"`.
- `pnpm typecheck`
- `pnpm test tests/render-spec.test.ts`
- `pnpm test tests/enrich.test.ts`
- `pnpm test`
- Spec frontmatter/status check over `docs/specs/*.md`

## Dogfood Evidence

Plain render without an annotations file:

- Command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-default-scaffold.html --verbose`
- Output: `/tmp/dossier-dogfood/vision-default-scaffold.html`
- CLI-reported output size: `127468`
- UTF-8 byte size: `150461`
- Default scaffold evidence: 1 overview, 1 structure map, 9 semantic blocks, 18 source-section summaries, 18 Section Map cards.
- External asset check: no `<script src=...>` and no remote `<link href="http...">`.
