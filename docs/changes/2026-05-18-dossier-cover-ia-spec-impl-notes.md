---
title: Dossier cover IA spec implementation notes
status: implemented
owner: codex
created: 2026-05-18
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: []
---

# Dossier cover IA spec implementation notes

## Implemented

- Added `docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md`.
- Rendered `docs/specs/2026-05-18-dossier-cover-information-architecture-spec.html` with the existing MVP-0 renderer.
- Promoted the accepted review direction into a concrete MVP-1 contract for `render-dossier-cover`.
- Added reader tasks, 3-minute acceptance, seven cover zones, deterministic extraction rules, role-based reading paths, responsive/offline behavior, CLI surface, and milestones.
- Kept this as documentation only; no renderer code was changed.

## Why

The accepted direction was that Dossier should solve the daily burden of understanding many related AI artifacts, not merely beautify a single Markdown file. The new spec turns that into an implementation-ready boundary for the next build step.

## Verification

- Frontmatter includes `status: ready` and links back to the vision spec.
- Scope excludes LLM summaries and complex provenance by default.
- This note originally defined MVP-1 completion at Cover-1, with Cover-2 optional; the Cover-2 P0 backlog was later implemented in `docs/changes/2026-05-19-dossier-p0-p1-backlog-impl-notes.md`.
- `pnpm dev render docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md --verbose`
- `pnpm test`
