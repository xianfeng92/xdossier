---
title: Dossier Annotation TLDR / Section Brief Experiment Implementation Notes
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-19-dossier-annotation-tldr-experiment-spec.md
reviews: []
---

# Dossier Annotation TLDR / Section Brief Experiment Implementation Notes

## Implemented

- Added `RenderAnnotations` and `SectionSummaryAnnotation` to `src/types.ts`.
- Added `src/annotations.ts` to parse and validate annotation JSON.
- Added `--annotations <path>` to `dossier render`.
- Added `dossier enrich <file.md>` with provider modes:
  - `scaffold` for deterministic local section-summary scaffolds.
  - `codex` via `codex exec`.
  - `claude` via `claude -p`.
- Added `src/enrich/section-summaries.ts` for deterministic scaffolding.
- Added `src/enrich/agent-cli.ts` for Codex/Claude CLI provider calls and output parsing.
- Passed annotations through `src/render.ts` into `renderTokensToHtml`.
- Inserted escaped `.section-summary`, `.section-key-points`, and `.section-reader-hint` blocks directly after matching H2 headings.
- Added restrained `render-spec` styling for section summaries.
- Added focused tests for summary insertion, richer section briefs, CLI argument parsing, and mock local-agent provider parsing.

## Contract

Render remains deterministic and offline. `dossier render` only consumes a local JSON file. `dossier enrich` is the opt-in AI boundary and may call local Codex/Claude CLI providers when explicitly requested.

## Verification

```bash
pnpm test tests/render-spec.test.ts
pnpm test tests/render-spec.test.ts tests/enrich.test.ts
pnpm typecheck
pnpm test
```

All passed on 2026-05-19.

Additional CLI smoke:

```bash
pnpm dev enrich tests/fixtures/minimal.md --out /tmp/dossier-minimal-enriched.json --verbose
pnpm dev enrich tests/fixtures/minimal.md --provider codex --out /tmp/dossier-minimal-codex.json --verbose
pnpm dev render tests/fixtures/minimal.md --annotations /tmp/dossier-minimal-codex.json -o /tmp/dossier-minimal-codex.html --verbose
```

Codex provider produced 2 structured section briefs with TLDR + key points. Claude provider could not be live-verified in this run because the local Claude CLI reported a usage limit reset time.

## Still Deferred

- content-hash annotation cache
- automatic `.dossier/annotations/` lookup
- callout promotion, glossary, diagram, and cover-level annotation use
- provider-specific configuration beyond `--provider` and `--model`
