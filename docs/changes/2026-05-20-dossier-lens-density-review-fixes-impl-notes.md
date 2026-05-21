---
title: Dossier Lens Density Review Fixes Impl Notes
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

# Dossier Lens Density Review Fixes Impl Notes

## Summary

Applied the review feedback that the generated HTML had become visually polished but information-architecture heavy. The renderer now uses thresholds and folding so the lens layer helps readers enter the source instead of blocking it.

## Changes

- Preamble / tagline sections such as `§0` no longer receive scaffold section summaries, key points, or reader hints.
- Scaffold document overview now uses the first substantive section instead of repeating the one-line tagline.
- Frontmatter relationship maps are generated only when there are at least two explicit relation edges; single review / implements entries stay in the compact header details.
- Section Map no longer renders a separate reading-route lane because the overview reading-path cards already own that job.
- Section Map semantic role chips are collapsed into a details summary by default.
- Semantic blocks show only the first three items before a disclosure row.
- Concept glossary cards skip repeated per-card source links when the block header already points to the same source section.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -t "scaffold does not repeat|single frontmatter relation|section map removes|semantic lens panels"` failed on all four new density contracts before implementation.
- Green: `pnpm test tests/render-spec.test.ts -t "scaffold does not repeat|single frontmatter relation|section map removes|semantic lens panels"` passed after implementation.
- `pnpm test tests/render-spec.test.ts` passed with 45 tests.
- `pnpm test tests/enrich.test.ts` passed with 61 tests.
- `pnpm typecheck` passed.
- `pnpm test` passed with 124 tests.
