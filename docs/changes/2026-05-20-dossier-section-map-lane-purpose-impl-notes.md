---
title: Dossier Section Map Lane Purpose Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Section Map Lane Purpose Impl Notes

## Summary

Made Section Map semantic lanes explain why a reader should jump to each linked section, instead of showing only a role label and source title.

## Changes

- Reused deterministic `section_summaries` in `renderSourceSectionMapLanes`.
- Added a compact `source-section-lane-purpose` line under each lane role.
- Prefer `reader_hint` when available, otherwise use the section summary.
- Added CSS for the new purpose line so lane links remain scan-friendly.
- Added regression coverage for route, model, and risk/judgment lanes.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -t "section map lanes explain why each semantic route matters"` failed before implementation because lane links lacked purpose text.
- Green: `pnpm test tests/render-spec.test.ts -t "section map lanes explain why each semantic route matters"` passed after implementation.
- `pnpm typecheck` passed.
- `pnpm test` passed with 120 tests.
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-section-map-lane-purpose.html --verbose` wrote a 146,499 byte dogfood HTML file.
- Static inspection confirmed `source-section-lane-purpose` appears in reading-route, model/concept, and judgment/check lanes.
