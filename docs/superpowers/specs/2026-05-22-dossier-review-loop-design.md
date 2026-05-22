# Dossier Review Loop Design

## Goal

v0.3 turns review from a loose Markdown convention into a deterministic local loop:

1. `xdossier review <target>` creates a review packet that can be handed to Codex, Claude, Gemini, or a human reviewer.
2. The reviewer writes a Markdown review under `docs/reviews/`.
3. `xdossier cover` ingests review verdicts and findings, then shows open blockers, fixed findings, and review status on the dossier cover.

The core renderer remains offline and reproducible. v0.3 does not call an LLM, does not require network access, and does not store review state outside the repository.

## Product Contract

### Review packet

`xdossier review <target>` accepts either a Markdown artifact or a workspace root. It writes a Markdown packet to `.dossier/review-packets/` by default, with `-o, --out <path>` for an explicit destination.

The packet contains:

- Target path, title, status, kind, updated date.
- Suggested review document path under `docs/reviews/YYYY-MM-DD-<target-slug>-review.md`.
- Related artifacts inferred from current cover edges.
- Open questions and decisions already known for the target dossier.
- A reviewer checklist focused on correctness, trust boundaries, findability, portability, and verification.
- A required output shape for the final review document.

The packet is a prompt artifact, not the final review. It is safe to paste into an AI reviewer because it contains only repository-local context and paths.

### Review ingestion

`xdossier cover` treats review documents as first-class artifacts. It extracts:

- `verdict` from frontmatter or a `## Verdict` section.
- Findings from stable Markdown patterns:
  - table rows like `| F1 | P0 | ... |`
  - headings like `### F1 (P0) - ...`
  - bullets like `- [P1] ...`
- Finding status from `Status: open|fixed|accepted|deferred|wontfix`, checkbox state, or review frontmatter status.

The cover renders a `Review Loop` section with:

- Review count.
- Open finding count.
- Blocker count for `P0` and `P1` open findings.
- Fixed/deferred counts.
- A short list of the highest-priority open findings with links to the source review.
- A small review verdict list so readers know which review docs still demand action.

### Markdown review convention

The preferred review document shape is:

```markdown
---
title: Example review
kind: review
status: needs-rework
reviews_target:
  - docs/specs/example.md
verdict: NEEDS_REWORK
---

# Example review

## Verdict

NEEDS_REWORK - short reason.

## Findings

- [P1] Search index misses folded content
  - File: src/cover/render.ts
  - Evidence: ...
  - Status: open

## Verification

- pnpm test -- --run
```

Existing review docs do not need to be rewritten. The extractor is intentionally tolerant and supports the formats already present in this repository.

## Architecture

New review-specific code lives in `src/review/`:

- `types.ts` owns `ReviewFinding`, `ReviewDocumentSummary`, and `ReviewLoopSummary`.
- `extract.ts` parses existing `CoverArtifact[]` into a review loop summary.
- `packet.ts` generates deterministic Markdown review packets from scanned artifacts and cover edges.

Existing cover code consumes the review module:

- `src/cover/types.ts` adds `review_loop` to `DossierCoverView`.
- `src/cover/view-model.ts` calls `buildReviewLoopSummary(artifacts)`.
- `src/cover/render.ts` renders a local-only `Review Loop` section.
- `src/cli.ts` adds the `review` command and writes packet files.

## Error Handling

- Missing review target exits with code `1`.
- A target outside a detectable workspace exits with code `1` and explains that `docs/specs`, `docs/changes`, or `docs/reviews` is required.
- Packet write failures exit with code `64`.
- Review extraction is best-effort: malformed rows are ignored, not fatal.

## Testing

The implementation is test-first:

- Unit tests for packet generation.
- Unit tests for review finding extraction across table, heading, and bullet styles.
- CLI test for `xdossier review <file> -o <packet.md>`.
- Cover rendering test for the `Review Loop` section and local-only output.
- Full regression with `npm test -- --run`, `npm run typecheck -- --pretty false`, `pnpm typecheck`, and `pnpm test -- --run`.

## Non-Goals

- No LLM provider integration in v0.3.
- No GitHub PR API integration.
- No persistent database.
- No automatic rewrite of review documents.
- No attempt to prove a finding is fixed from code diff alone.
