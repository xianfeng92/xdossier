---
title: Dossier Cover implementation review fixes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md
reviews:
  - docs/reviews/2026-05-19-dossier-cover-implementation-review.md
---

# Dossier Cover implementation review fixes

## Implemented

- Fixed single-file rendered documents so embedded `iframe srcdoc` output receives the original markdown with frontmatter, preserving artifact status and metadata.
- Fixed source bundle output to embed original markdown, not frontmatter-stripped body content.
- Changed build manifest hashing to use original markdown so frontmatter-only edits are detected as changed artifacts.
- Added deterministic open-question hashes to build manifests and changed Activity Inbox `Open items` to show only questions not present in the baseline.
- Reduced open-question extraction noise by ignoring ordinary prose bullets in open-question sections; unchecked tasks and table rows remain supported.
- Threaded `--no-graph` into the cover renderer and made list-fallback mode visible in the generated page.
- Fixed nested absolute directory-pattern dispatch for render skill selection.
- Split CLI help text so render `--out <path>` and build `--out <dir>` semantics are no longer conflated.

## Not Changed

- Deleted artifact reporting remains future work.
- `dossier.confidence` and `next_action` remain coarse MVP heuristics.
- Provenance/session adapters, watch mode, MCP server, graph layout libraries, and LLM summaries remain out of scope.

## Verification

- `pnpm test tests/cover.test.ts`
- `pnpm test tests/render-spec.test.ts`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose`
