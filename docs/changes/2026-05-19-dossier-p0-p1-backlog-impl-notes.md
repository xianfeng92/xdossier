---
title: Dossier P0/P1 backlog implementation notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: []
---

# Dossier P0/P1 backlog implementation notes

## Implemented

- Added Cover-2 build manifest support at `.dossier/build-manifest.json`.
- Added `dossier build --since last` activity inbox comparison for new and changed artifacts.
- Added `dossier build --since <git-ref>` activity inbox comparison against committed artifact content.
- Made `--since last` degrade to an empty activity inbox when no previous manifest exists, then write the first manifest.
- Added `dossier build --single-file`, embedding both rendered artifact documents and source markdown inside the generated cover HTML.
- Added a privacy warning for single-file output when neither `.dossierignore` nor redaction rules are configured.
- Removed the reverse `implements` edge from the vision spec frontmatter so implementation specs point upward to the vision document.
- Implemented skill dispatch layers 4 and 5 using filename and directory patterns from `SKILL.md`.
- Cleaned stale source-level `TODO (Codex)` comments from implemented MVP-0 parser/render files.
- Checked off the Cover IA acceptance checklist now that Cover-0, Cover-1, and Cover-2 behaviors are implemented and verified.

## Boundary

- `--since last`, explicit manifest paths, and git refs are supported. Deleted artifact reporting is still future work.
- `--single-file` embeds source markdown and rendered artifact documents in the cover. The rendered documents are placed in collapsed iframes rather than merged into one continuous reading surface.
- Provenance/session adapters, watch mode, MCP server, and LLM summaries remain out of scope.

## Verification

- `pnpm test tests/cover.test.ts`
- `pnpm test tests/render-spec.test.ts`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev build /Users/xforg/AI_SPACE/dossier --since last --single-file --verbose`
