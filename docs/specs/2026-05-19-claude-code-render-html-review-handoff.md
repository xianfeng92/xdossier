---
title: Claude Code handoff — render-spec HTML IA and section brief review
status: implemented
owner: codex
created: 2026-05-19
updated: 2026-05-19
review_targets:
  - "docs/reviews/2026-05-19-dossier-html-design-review.md"
  - "docs/changes/2026-05-19-dossier-first-screen-toc-impl-notes.md"
  - "docs/changes/2026-05-19-dossier-section-brief-density-impl-notes.md"
  - "src/emit.ts"
  - "src/parse/markdown.ts"
  - "src/skills/render-spec/style.css"
  - "src/skills/render-spec/toc-script.js"
  - "tests/render-spec.test.ts"
reviewer: claude-code
requested_by: user
reviews:
  - "docs/reviews/2026-05-19-dossier-render-html-ia-review.md"
implements:
  - "docs/reviews/2026-05-19-dossier-html-design-review.md"
---

# Claude Code review handoff

## Goal

Review Codex's recent `render-spec` HTML readability work. This is a review task, not a request to add new features first.

The implementation claims to complete these slices from `docs/reviews/2026-05-19-dossier-html-design-review.md`:

1. Slice 1 — First-screen IA rework.
2. Slice 2 — TOC progressive disclosure.
3. Slice 3 — Section brief density rules.

Please check whether the behavior is correct, deterministic, readable, and maintainable.

## Changed Files

Primary implementation files:

- `src/emit.ts`
- `src/parse/markdown.ts`
- `src/skills/render-spec/style.css`
- `src/skills/render-spec/toc-script.js`

Test and documentation files:

- `tests/render-spec.test.ts`
- `docs/reviews/2026-05-19-dossier-html-design-review.md`
- `docs/changes/2026-05-19-dossier-first-screen-toc-impl-notes.md`
- `docs/changes/2026-05-19-dossier-section-brief-density-impl-notes.md`

## Expected Behavior

### Slice 1 — First-screen IA

Expected:

- The first generated `.tagline` is promoted into a header-level `.executive-brief`.
- The original `.tagline` block is removed from body content to avoid duplicate TLDR.
- Leading callouts before the first section become a collapsed `.document-notes` block inside the header.
- Frontmatter metadata and relation details still render normally.
- Reading-time estimation should use the prepared body content without double-counting the promoted tagline.

Review risks:

- `src/emit.ts` uses regex-based HTML extraction for `.tagline` and leading `.callout` blocks. Check whether this is acceptably bounded for renderer-owned HTML, or too brittle.
- Check behavior when a document has multiple top-level callout groups, no `## 0` tagline, or a non-tagline blockquote before the first section.
- Check whether the document notes label should be localized for `zh-CN`.

### Slice 2 — Progressive TOC

Expected:

- TOC emits `data-progressive-toc`, `.toc-section`, and `.toc-children`.
- H3 child lists are hidden by default.
- Only the current H2 section's H3 children are expanded via `.is-current`.
- Active TOC links scroll into view during long document reading.
- Mobile TOC drawer behavior still works.

Review risks:

- Hash navigation to a later section should correctly update the active TOC state after scroll events.
- `scrollIntoView` should not cause visible jitter or steal scroll unexpectedly.
- H3 active state should still mark both the H3 link and its parent H2.

### Slice 3 — Section Brief Density

Expected:

- Section summaries remain visible.
- `key_points` are capped to 2 rendered items per section.
- `reader_hint` renders as a compact `.section-reader-chip`.
- Reader chip has an accessible label and a visual `READ` label marked `aria-hidden`.
- Mobile layout hides `.section-key-points` under 720px and resets section brief left margins.

Review risks:

- The two-point cap is deterministic but may discard useful information. Decide whether the cap belongs in renderer output or enrich generation.
- The mobile CSS rule is broad: confirm it does not hide ordinary section lists.
- The chip visual should not add too much inline noise in dense sections.

## Commands To Run

Use these from `/Users/xforg/AI_SPACE/dossier`:

```bash
pnpm typecheck
pnpm test
pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-render-review-base.html --verbose
```

If `/tmp/dossier-vision-codex.annotations.json` exists, also run:

```bash
pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md \
  --annotations /tmp/dossier-vision-codex.annotations.json \
  -o /tmp/dossier-render-review-enriched.html \
  --verbose
```

If it does not exist, generate a deterministic scaffold annotation file:

```bash
pnpm dev enrich docs/specs/2026-05-17-dossier-vision-spec.md \
  --provider scaffold \
  --out /tmp/dossier-render-review.annotations.json \
  --verbose
pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md \
  --annotations /tmp/dossier-render-review.annotations.json \
  -o /tmp/dossier-render-review-enriched.html \
  --verbose
```

## Suggested Browser Checks

Open the enriched HTML and inspect:

- First viewport: executive brief is visible in the header and `.document-notes` is collapsed.
- Body: no duplicate `.tagline` remains.
- TOC at top: H2-only list is visible; H3 lists are collapsed.
- Mid-document around `#s8`: current H2's H3 children expand; other H3 groups remain collapsed.
- Section brief around `#s8`: summary visible, exactly 2 key points, compact reader chip.
- Mobile width under 720px: key points hidden, summary and reader chip still usable.

## Known Verification From Codex

Codex reported the following after implementation:

- `pnpm typecheck` passed.
- `pnpm test` passed with 43 tests.
- Enriched dogfood render wrote `/tmp/dossier-section-brief-density-codex.html` at 70,399 bytes.
- Static inspection found 18 summaries, 18 key point lists, 18 reader chips, max 2 key points per section, and 0 sections with 3+ key points.
- Browser inspection of `#s8` found exactly 2 key points and a compact reader chip.

Please independently verify rather than trusting this report.

## Output Requested

Write review findings to:

`docs/reviews/2026-05-19-dossier-render-html-ia-review.md`

Please lead with findings, ordered by severity. Include file and line references. If no blocking issues are found, say so clearly and list any residual risks or suggested follow-up improvements.

Do not modify implementation files unless the user explicitly asks for fixes after the review.
