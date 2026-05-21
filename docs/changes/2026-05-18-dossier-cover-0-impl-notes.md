---
title: Dossier Cover-0 implementation notes
status: implemented
owner: codex
created: 2026-05-18
updated: 2026-05-18
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: []
---

# Dossier Cover-0 implementation notes

## Implemented

- Added `dossier build [workspace]`, with default output at `.dossier/out/index.html`.
- Added deterministic scanning for `docs/specs/`, `docs/changes/`, and `docs/reviews/`.
- Added a Cover-0 view model with artifact records, high-confidence frontmatter edges, reader-facing labels, confidence, and evidence rows.
- Rendered a no-LLM, offline cover page with a verdict strip, grouped artifact list, and evidence table.
- Supported high-confidence `implements`, `reviews`, and `reviews_target` relationships from frontmatter.

## Boundary

- No LLM calls.
- No provenance/session adapter.
- No watch mode.
- No graph library; the artifact map uses the grouped-list fallback.
- The Cover IA spec remains `status: ready` because Cover-1 still needs decisions, open questions, reading paths, and the fuller evidence drawer.

## Verification

- `pnpm test tests/cover.test.ts`
- `pnpm typecheck`
- `pnpm dev build /Users/xforg/AI_SPACE/dossier --verbose`
