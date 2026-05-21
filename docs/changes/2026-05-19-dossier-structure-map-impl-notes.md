---
title: Dossier Structure Map Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-19-dossier-structure-map-spec.md
reviews: []
---

# Dossier Structure Map Impl Notes

## Summary

Added a document-level `structure_map` semantic block so enriched HTML can present a compact model of the document before the original Markdown prose.

## Changes

- Extended the annotation schema with `structure_map` blocks, nodes, edges, node kinds, and validation for edge endpoints.
- Rendered structure maps in a dedicated `semantic-model-flow` before roadmap and judgment panels.
- Added stable structure-node anchors such as `lens-structure-map-1-node-path`.
- Added Dossier Lens TOC entries for `Structure Map`.
- Added source-section semantic trace chips such as `Model: Learning path`.
- Updated the local agent enrichment prompt to request a `structure_map` when the source has related concepts.
- Added CSS for structure nodes, node kinds, and compact edge rows.
- Added mobile overflow protection for the main reading surface so long English terms, paths, or generated labels do not push semantic pages wider than the viewport.
- Completed the partially landed language-label path in `src/emit.ts` so English enriched documents use English lens chrome and Chinese documents keep Chinese chrome.
- Fixed a stale test assertion that mixed English and Chinese aria labels inside the same English fixture.

## Dogfood Output

Rendered the Dossier vision spec with a representative structure-map annotation:

- annotations: `/tmp/dossier-dogfood/vision-structure-map.annotations.json`
- html: `/tmp/dossier-dogfood/vision-structure-map.html`
- desktop first-screen screenshot: `/tmp/dossier-dogfood/vision-structure-map-firstscreen.png`
- mobile first-screen screenshot: `/tmp/dossier-dogfood/vision-structure-map-mobile.png`
- HTML size: 96,783 bytes
- structure maps: 1
- structure nodes: 6
- structure edges: 5
- model trace chips: 7
- Dossier Lens TOC includes `Structure Map`: true
- structure map renders before roadmap: true
- source prose remains after lens panels: true

## Verification

- `pnpm test tests/render-spec.test.ts -t "structure map"`
- `pnpm test tests/enrich.test.ts -t "local agent provider prompt"`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-dogfood/vision-structure-map.annotations.json -o /tmp/dossier-dogfood/vision-structure-map.html --verbose`
- Chrome headless screenshots at 1365x768 and mobile-width CLI capture.
