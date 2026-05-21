---
title: Dossier Cover-2 remaining backlog implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: []
---

# Dossier Cover-2 remaining backlog implementation notes

## Implemented

- Extended `--since <ref>` from previous-manifest comparison to git ref comparison.
- Git ref baselines read committed markdown under `docs/specs`, `docs/changes`, and `docs/reviews`, then hash parsed document content using the same rule as the current build manifest.
- Kept explicit manifest paths working for `--since path/to/build-manifest.json`.
- Extended `--single-file` output with a collapsed `Rendered Documents` bundle.
- Each rendered artifact is embedded as an offline `iframe srcdoc`, while the raw source markdown remains available in the existing `Embedded Sources` drawer.

## Boundary

- Deleted artifact reporting is not implemented yet.
- Git ref comparison uses deterministic committed files, not session provenance.
- Provenance/session adapters, watch mode, MCP server, and LLM summaries remain next-phase systems rather than Cover-2 patch work.

## Verification

- `pnpm test tests/cover.test.ts -- -t "git ref|rendered artifact"`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose`
