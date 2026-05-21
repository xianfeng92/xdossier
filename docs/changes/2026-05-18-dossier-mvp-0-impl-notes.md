---
title: Dossier MVP-0 implementation notes
status: implemented
owner: codex
created: 2026-05-18
updated: 2026-05-18
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
reviews: []
---

# Dossier MVP-0 implementation notes

## Implemented

- Implemented the single-document render pipeline: frontmatter parsing, marked tokenization, semantic pass, TOC extraction, token rendering, and template emission.
- Kept runtime dependencies unchanged: `marked@18` and `gray-matter` only.
- Rendered `docs/specs/2026-05-17-dossier-vision-spec.md` into a self-contained HTML file with inline CSS and inline TOC script.
- Un-skipped the end-to-end tests and added frontmatter/parser coverage plus a regression check that generated HTML starts at `<!DOCTYPE html>`.

## Decisions and deviations

- Added `kind: vision-spec` to the vision spec frontmatter so skill dispatch selects `render-spec` via `frontmatter-kind`, matching the handoff acceptance command.
- The vision spec currently has 18 `h2` sections (`0` through `17`), not 17. The renderer outputs all 18 rather than hiding a real section.
- Browser-based `file://` verification was blocked by the Codex in-app browser URL policy. I did not bypass it; automated checks covered the generated structure and offline-resource constraints instead.
- Top callouts are rendered inline as `.callout` blocks in content rather than moved into a separate `.top-callouts` container. This preserves markdown order and keeps the MVP-0 heuristic simple.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm render:self`
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --verbose`
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --skill bogus-name`

## r1 visual rework

- Fixed H2/H3 double numbering by detecting source heading prefixes such as `0.`, `1.1`, and `6.5`, using those as display numbers, and rendering the heading text without the source prefix.
- Fixed TOC text by sharing the cleaned heading text and stripping inline HTML tags before escaping, so entries no longer show `&lt;em&gt;` or `&lt;strong&gt;`.
- Restored the §0 hero treatment by rendering the first non-callout blockquote in section `0` as `.tagline`.
- Split long frontmatter titles on ` — ` into a short `<h1>` plus `<p class="subtitle">`.
- Hid empty frontmatter meta values such as empty `reviews: []`.
- Added status badge modifiers for `ready`, `draft`, `implemented`, and `archived`; `ready` now renders as `<span class="badge ready">ready</span>`.
- No new dependencies, directives, custom admonition syntax, or MVP-1 visual blocks were introduced.
