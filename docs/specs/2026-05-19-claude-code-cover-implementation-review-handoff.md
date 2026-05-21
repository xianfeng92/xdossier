---
title: Dossier Cover implementation — Claude Code review handoff
status: archived
kind: handoff
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md"]
reviews: ["docs/reviews/2026-05-19-dossier-cover-implementation-review.md"]
---

# Dossier Cover implementation — Claude Code review handoff

> This is a review handoff for Claude Code. The goal is not to add new features first; the goal is to verify whether Codex's Cover-0 / Cover-1 / Cover-2 implementation is correct, bounded, deterministic, and maintainable.

## 1. Suggested Claude Code prompt

```text
Work in /Users/xforg/AI_SPACE/dossier.

Please review Codex's Dossier Cover implementation as a code review. Lead with findings, ordered by severity, with file/line references and concrete reproduction or test evidence. Keep summary secondary.

Read first:
- /Users/xforg/AI_SPACE/AGENTS.md
- docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md
- docs/changes/2026-05-18-dossier-cover-0-impl-notes.md
- docs/changes/2026-05-19-dossier-cover-1-impl-notes.md
- docs/changes/2026-05-19-dossier-p0-p1-backlog-impl-notes.md
- docs/changes/2026-05-19-dossier-cover-2-remaining-impl-notes.md
- tests/cover.test.ts
- src/cover/*

Review scope:
- Artifact scanning and deterministic ordering.
- High-confidence implements/reviews edges, labels, confidence, and evidence.
- Cover view model creation.
- Decision/open-question/reading-path extraction.
- Activity inbox behavior for --since last, explicit manifest paths, and git refs.
- Single-file output: privacy warning, rendered document bundle, embedded source bundle, offline/no remote assets.
- CLI behavior and error handling.
- Whether Cover-0/1 behavior was preserved while Cover-2 was added.

Please do not redesign the product or add LLM/provenance/watch/MCP features unless you first document why a current test proves a bug. If fixes are needed, keep them small and include focused tests.

Run:
- pnpm typecheck
- pnpm test
- pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose

Write the review to docs/reviews/2026-05-19-dossier-cover-implementation-review.md.
```

## 2. What Codex implemented

### Cover-0

- Added `dossier build [workspace]`.
- Scans `docs/specs`, `docs/changes`, and `docs/reviews`.
- Builds a deterministic cover view model.
- Supports high-confidence `implements` and `reviews` edges.
- Adds reader-facing edge `label` and `confidence`.
- Renders verdict strip, grouped artifact list, and evidence table.

Primary files:

- `src/cover/scan.ts`
- `src/cover/edges.ts`
- `src/cover/view-model.ts`
- `src/cover/render.ts`
- `src/cover/types.ts`
- `tests/cover.test.ts`

### Cover-1

- Added artifact map list fallback.
- Added deterministic key decision extraction.
- Added deterministic open-question extraction.
- Added PM / Engineer / Reviewer reading paths.
- Moved verbose evidence into a collapsed evidence drawer.
- Kept offline/no-remote-assets behavior.

Primary files:

- `src/cover/extract.ts`
- `src/cover/view-model.ts`
- `src/cover/render.ts`
- `tests/cover.test.ts`

### Cover-2 and P0/P1 backlog

- Added `.dossier/build-manifest.json`.
- Added `--since last` manifest comparison.
- Added explicit manifest path support through `--since path/to/build-manifest.json`.
- Added `--since <git-ref>` comparison against committed artifact content.
- Added Activity Inbox groups for new artifacts, changed artifacts, and open items.
- Added `--single-file`.
- Added privacy warning when no `.dossierignore` or redaction rules exist.
- Added collapsed `Rendered Documents` bundle using offline `iframe srcdoc`.
- Kept collapsed `Embedded Sources` source markdown bundle.
- Implemented skill registry filename and directory pattern dispatch.
- Removed reverse `implements` from the vision spec.
- Updated Cover IA spec milestones/checklist.

Primary files:

- `src/cover/manifest.ts`
- `src/cover/render.ts`
- `src/cover/view-model.ts`
- `src/cli.ts`
- `src/skills/registry.ts`
- `tests/cover.test.ts`
- `tests/render-spec.test.ts`

## 3. Verification already run by Codex

Latest successful commands from the implementation pass:

```bash
pnpm typecheck
pnpm test
pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose
```

Observed test result:

```text
Test Files  2 passed (2)
Tests       22 passed (22)
```

Observed dogfood build shape:

```text
cover artifacts: 18, edges: 19, graph: list-fallback, activity: 18 new/0 changed
wrote /Users/xforg/AI_SPACE/dossier/.dossier/out/index.html
```

Note: the Dossier directory is currently untracked from the parent `/Users/xforg/AI_SPACE` git repository, so `--since HEAD` reports the current Dossier artifacts as new in the dogfood run. That is expected until the `dossier/` subtree is tracked or moved to its own repo.

## 4. Review targets that deserve extra suspicion

Please inspect these closely:

1. `src/cover/manifest.ts`
   - Does git ref baseline handling work for nested workspaces, macOS `/var` vs `/private/var`, and explicit manifest paths?
   - Does `git show <ref>:<path>` handle filenames safely enough for this MVP?
   - Should deleted artifacts appear in Activity Inbox now or stay future work?

2. `src/cover/render.ts`
   - `--single-file` renders each artifact into `iframe srcdoc`. Check whether using `artifact.content` after frontmatter removal is the right source, or whether rendered documents should preserve full frontmatter metadata.
   - Check generated size and readability of 17+ embedded iframes.
   - Confirm no real remote assets are introduced outside code examples or escaped embedded source.

3. `src/cover/view-model.ts`
   - `open_items` currently shows all current open questions when a baseline exists, not only newly introduced questions. Decide whether that matches the Cover-2 activity contract.

4. `src/cover/extract.ts`
   - Decision/open-question extraction is deterministic but heuristic. Verify it does not over-extract historical checklist items as current blockers.

5. `src/skills/registry.ts`
   - Filename and directory pattern matching is deliberately small. Check whether glob semantics are sufficient and deterministic.

6. `docs/specs` status hygiene
   - Product implementation specs are `implemented`, but old handoff/rework briefs remain `status: ready`. Decide whether to archive them after review.

## 5. Known boundaries, not bugs unless the spec says otherwise

- No LLM calls.
- No provenance/session adapter.
- No watch mode.
- No MCP server.
- No complex graph layout library.
- Deleted artifact reporting is not implemented yet.
- `.dossier/out/index.html` and `.dossier/build-manifest.json` are generated output and ignored by `.gitignore`.

## 6. Files changed or added in the Cover implementation pass

High-signal implementation files:

- `src/cli.ts`
- `src/cover/edges.ts`
- `src/cover/extract.ts`
- `src/cover/manifest.ts`
- `src/cover/render.ts`
- `src/cover/scan.ts`
- `src/cover/types.ts`
- `src/cover/view-model.ts`
- `src/skills/registry.ts`

Tests:

- `tests/cover.test.ts`
- `tests/render-spec.test.ts`

Docs:

- `docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md`
- `docs/specs/2026-05-17-dossier-vision-spec.md`
- `docs/changes/2026-05-18-dossier-cover-0-impl-notes.md`
- `docs/changes/2026-05-19-dossier-cover-1-impl-notes.md`
- `docs/changes/2026-05-19-dossier-p0-p1-backlog-impl-notes.md`
- `docs/changes/2026-05-19-dossier-cover-2-remaining-impl-notes.md`

## 7. Desired review output

Write a review document with this structure:

```markdown
---
title: Dossier Cover implementation review
status: implemented
owner: claude
created: 2026-05-19
updated: 2026-05-19
reviews_target:
  - docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md
  - docs/specs/2026-05-19-claude-code-cover-implementation-review-handoff.md
---

# Dossier Cover implementation review

## Verdict

PASS / NEEDS_REWORK / BLOCKED

## Findings

- P0/P1/P2 findings first, with file and line references.

## Verification

- Commands run and exact pass/fail summary.

## Residual Risk

- What remains intentionally out of scope.
```
