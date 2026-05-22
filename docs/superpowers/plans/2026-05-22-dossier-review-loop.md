# Dossier Review Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v0.3 Dossier Review Loop: deterministic review packets plus cover-level review finding ingestion.

**Architecture:** Keep review logic isolated in `src/review/`. The CLI writes review packet Markdown; cover view-model imports extracted review summaries and render.ts displays them in a local-only section.

**Tech Stack:** TypeScript ESM, Vitest, existing `gray-matter` frontmatter parser through `scanArtifacts`, existing cover artifacts and edges.

---

### Task 1: Review Packet

**Files:**
- Create: `src/review/types.ts`
- Create: `src/review/packet.ts`
- Modify: `src/cli.ts`
- Test: `tests/review.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that call `createReviewPacket()` and the CLI `review` command. The packet must include the target title, suggested review path, related artifact, checklist, and expected review output.

- [ ] **Step 2: Verify red**

Run: `npm test -- --run tests/review.test.ts -t "review packet"`
Expected: FAIL because `src/review/packet.ts` does not exist and `review` is not a known CLI command.

- [ ] **Step 3: Implement packet generation**

Create focused helpers that scan artifacts, find the target artifact, collect related edges, and write deterministic Markdown. The default packet path is `.dossier/review-packets/YYYY-MM-DD-<slug>-review-packet.md`.

- [ ] **Step 4: Verify green**

Run: `npm test -- --run tests/review.test.ts -t "review packet"`
Expected: PASS.

### Task 2: Review Finding Extraction

**Files:**
- Modify: `src/review/types.ts`
- Create: `src/review/extract.ts`
- Test: `tests/review.test.ts`

- [ ] **Step 1: Write failing tests**

Add extraction tests for table rows (`| F1 | P0 | ... |`), heading findings (`### F2 (P1) - ...`), and bullet findings (`- [P2] ...` with `Status: fixed`).

- [ ] **Step 2: Verify red**

Run: `npm test -- --run tests/review.test.ts -t "extracts review findings"`
Expected: FAIL because extraction is not implemented.

- [ ] **Step 3: Implement extractor**

Implement best-effort deterministic parsing. Normalize severity to `P0|P1|P2|P3`, status to `open|fixed|accepted|deferred|wontfix`, and verdict from frontmatter or `## Verdict`.

- [ ] **Step 4: Verify green**

Run: `npm test -- --run tests/review.test.ts -t "extracts review findings"`
Expected: PASS.

### Task 3: Cover Review Loop Section

**Files:**
- Modify: `src/cover/types.ts`
- Modify: `src/cover/view-model.ts`
- Modify: `src/cover/render.ts`
- Test: `tests/cover.test.ts`

- [ ] **Step 1: Write failing cover test**

Add a test that renders a workspace with a review doc containing open and fixed findings. Assert the cover includes `<section class="review-loop" id="review-loop">`, blocker counts, open finding titles, and no remote assets.

- [ ] **Step 2: Verify red**

Run: `npm test -- --run tests/cover.test.ts -t "Review Loop"`
Expected: FAIL because the cover does not render the review section.

- [ ] **Step 3: Implement cover integration**

Call `buildReviewLoopSummary(artifacts)` in `buildCoverView()`, add `review_loop` to `DossierCoverView`, and render the `Review Loop` section near the top of the cover.

- [ ] **Step 4: Verify green**

Run: `npm test -- --run tests/cover.test.ts -t "Review Loop"`
Expected: PASS.

### Task 4: Full Verification

**Files:**
- Existing test files only.

- [ ] **Step 1: Run full checks**

Run:

```bash
npm run typecheck -- --pretty false
npm test -- --run
pnpm typecheck
pnpm test -- --run
```

Expected: all commands exit `0`.

- [ ] **Step 2: Inspect diff**

Run: `git status --short && git diff --stat`
Expected: v0.2.6 and v0.3 files are present; no unrelated files are reverted.
