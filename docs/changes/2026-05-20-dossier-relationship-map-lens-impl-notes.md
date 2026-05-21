---
title: Dossier Relationship Map Lens Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
reviews: []
---

# Dossier Relationship Map Lens Implementation Notes

## Summary

Added a `relationship_map` semantic block so Dossier HTML can expose explicit artifact/component/dependency edges as structured relationships instead of leaving them buried inside source tables.

## Changes

- Added `RelationshipMapBlockAnnotation` and parser validation for `relationship_map` blocks with `from`, `relation`, `to`, optional `evidence`, and optional `section_id`.
- Rendered relationship maps in the model-flow layer near `structure_map`, with stable `lens-relationship-map-*` anchors, edge-level anchors, TOC label `Relations`, evidence text, and source links.
- Extended section semantic trace chips with `relationship` links so source sections and Section Map cards show where a section participates in explicit relationships.
- Extended deterministic scaffold extraction to emit `relationship_map` blocks only from explicit relationship/dependency/upstream-downstream tables with recognizable from/relation/to columns.
- Updated the local agent provider prompt to request `relationship_map` blocks when the markdown explicitly describes relationships.

## Verification

- `pnpm test tests/render-spec.test.ts -t "relationship map"`
- `pnpm test tests/enrich.test.ts -t "relationship map|local agent provider"`
- `pnpm typecheck`
- `pnpm test`
- Spec frontmatter/status check over `docs/specs/*.md`
- Dogfood fixture render: `/tmp/dossier-dogfood/relationship-demo.html`
  - semantic blocks: `structure_map`, `relationship_map`, `checklist`
  - relationship edges: 2
  - source trace chips include `section-semantic-relationship`
