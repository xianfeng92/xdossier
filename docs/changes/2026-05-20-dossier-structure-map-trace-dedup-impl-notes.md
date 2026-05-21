---
title: Dossier Structure Map Trace Dedup Impl Notes
status: implemented
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
---

# Dossier Structure Map Trace Dedup Impl Notes

## Summary

Removed duplicate generic `Model` role chips when a source section is already represented by a structure-map node. Before this change, the first modeled section could show both `Model` and `Model: <node label>` in the Section Map and in the source-section trace, which made the structured layer feel more like renderer debugging output than reader-facing navigation.

The renderer now keeps the more specific node-level link and only keeps the generic structure-map link when `source_section_id` points to a section that is not covered by any structure-map node.

## Files Changed

- `src/semantic-trace.ts`
  - de-duplicates structure-map source traces against node `section_id` values.
- `tests/render-spec.test.ts`
  - adds a red/green assertion that structure-map source sections keep `Model: <label>` links without also rendering a generic `Model` chip for the same structure map.
- `docs/specs/2026-05-19-dossier-semantic-lens-spec.md`
  - records the trace de-duplication contract.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -- -t "renders structure maps as a document model before roadmap and traces source sections"` failed because the `Context` source section still rendered both `Model` and `Model: Why it exists`.
- Green: `pnpm test tests/render-spec.test.ts -- -t "renders structure maps as a document model before roadmap and traces source sections"` passed after de-duplicating structure-map traces.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-structure-map-trace-dedup.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-structure-map-trace-dedup.html`
  - Section Map cards: 18
  - Section Map role links: 15
  - generic `#lens-structure-map-1` Model role links: 0
  - generic `#lens-structure-map-1` Model source-section chips: 0
  - node-level structure-map links: 8
  - external asset check: no `<script src=...>` and no remote `<link href="http...">`.
- `pnpm typecheck` passed.
- `pnpm test tests/render-spec.test.ts` passed: 38 tests.
- `pnpm test tests/enrich.test.ts` passed: 48 tests.
- `pnpm test` passed: 104 tests.
- `docs/specs` frontmatter/status check passed: 11 files, 0 problems, only `docs/specs/2026-05-17-dossier-vision-spec.md` remains `status: ready`.
