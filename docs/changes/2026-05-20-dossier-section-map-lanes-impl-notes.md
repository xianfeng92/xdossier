---
title: Dossier Section Map Lanes Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Section Map Lanes Impl Notes

## Summary

Added deterministic semantic lanes at the top of `Section Map` so the generated HTML gives readers a task-oriented route into the source prose before showing the full Markdown section order.

## Changes

- Added localized renderer labels for Section Map lane chrome.
- Added `source-section-map-lanes` rendering in `src/emit.ts`.
- Grouped source sections into three reader tasks from the existing semantic trace graph:
  - reading route: `path`, `roadmap`;
  - model and concepts: `model`, `relationship`, `glossary`, `reference`;
  - judgment and checks: `decision`, `requirement`, `evidence`, `risk`, `scope`, `checklist`, `question`.
- Added compact CSS for lane cards and source links.
- Updated semantic-lens tests to verify route, model, and judgment lanes.

## Verification

- Red first: `pnpm test tests/render-spec.test.ts -- -t "renders document overview|renders structure maps|styles primary flow"` failed because no `source-section-map-lanes` HTML or CSS existed.
- Green: the same command passed after implementation.
