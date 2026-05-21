---
title: Dossier Cover-1 implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: []
---

# Dossier Cover-1 implementation notes

## Implemented

- Extended the Cover view model with deterministic key decisions, open questions, and role-based reading paths.
- Added deterministic extraction from decision headings, verdict/decision tables, open-question/risk/next sections, unchecked tasks, and review blocker language.
- Rendered the Cover page with:
  - artifact map using high/medium confidence edge rows plus grouped artifact fallback;
  - key decisions with source-artifact links;
  - open questions with source-artifact links and optional blocking impact;
  - compact PM / Engineer / Reviewer reading paths;
  - collapsed evidence drawer for relation labels, confidence, extraction rule, and evidence text.
- Kept Cover-0 scanner/build pipeline intact except for carrying parsed markdown content on each artifact for deterministic extraction.
- Kept output offline and standalone: inline CSS, no remote assets, no LLM calls.

## Boundary

- This boundary was superseded by `docs/changes/2026-05-19-dossier-p0-p1-backlog-impl-notes.md` for Cover-2 manifest/activity/single-file work.
- At Cover-1 time, no Cover-2 activity inbox or `--since`.
- At Cover-1 time, no privacy warning/export mode.
- No session JSONL/provenance adapter.
- No watch mode, MCP server, LLM summaries, or graph layout library.

## Verification

- `pnpm test tests/cover.test.ts`
- `pnpm typecheck`
- `pnpm dev build /Users/xforg/AI_SPACE/dossier --verbose`
- Generated cover checked for artifact map, decisions, open questions, reading paths, collapsed evidence drawer, and absence of remote assets.
