# AI Enrichment Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add v0.4 AI Enrichment Contract validation, metadata, and CLI enforcement.

**Architecture:** Keep schema-shape parsing in `src/annotations.ts`; add source-aware validation in a focused `src/enrich/contract.ts` module. The CLI `contract` command and `render --annotations` both call the same validator.

**Tech Stack:** TypeScript ESM, existing markdown semantic parser, Vitest, no new runtime dependency.

---

### Task 1: Contract Metadata

**Files:**
- Modify: `src/types.ts`
- Modify: `src/annotations.ts`
- Modify: `src/enrich/section-summaries.ts`
- Modify: `src/enrich/agent-cli.ts`
- Test: `tests/enrich.test.ts`

- [ ] Write tests that parse `contract` metadata and assert scaffold output includes `name`, `version`, `producer`, and `created_at`.
- [ ] Run `npm test -- --run tests/enrich.test.ts -t "contract metadata"` and confirm it fails.
- [ ] Add `EnrichmentContractAnnotation` to `RenderAnnotations`.
- [ ] Parse optional `contract` in `parseAnnotationsJson`.
- [ ] Emit contract metadata from scaffold and agent provider paths.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Source-Aware Validation

**Files:**
- Create: `src/enrich/contract.ts`
- Test: `tests/enrich-contract.test.ts`

- [ ] Write tests for a valid annotation set and for a missing `s999` section reference.
- [ ] Run `npm test -- --run tests/enrich-contract.test.ts` and confirm it fails.
- [ ] Implement source anchor extraction from Markdown with `parseMarkdownToTokens` and `applySemantic`.
- [ ] Walk all annotation section references and return errors/warnings.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: CLI and Render Enforcement

**Files:**
- Modify: `src/cli.ts`
- Test: `tests/enrich-contract.test.ts`

- [ ] Write CLI tests for `xdossier contract <md> --annotations <json>` success and failure.
- [ ] Write a render CLI test proving `render --annotations` rejects a missing section id.
- [ ] Run focused tests and confirm they fail.
- [ ] Add `contract` command parsing and implementation.
- [ ] Call the validator in the existing render annotations path.
- [ ] Re-run focused tests and confirm they pass.

### Task 4: Full Verification

Run:

```bash
npm run typecheck -- --pretty false
npm test -- --run
pnpm typecheck
pnpm test -- --run
```

All commands must exit `0` before v0.4 can be considered complete.
