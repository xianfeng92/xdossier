---
title: Dossier Frontmatter Relations Lens Implementation Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Frontmatter Relations Lens Implementation Notes

## Summary

Promoted explicit frontmatter relationships into the Dossier semantic lens so a single rendered artifact can show its artifact graph even without an annotations file.

## Changes

- Added deterministic conversion from frontmatter `implements`, `reviews`, and `reviews_target` fields into a `relationship_map` block titled `Frontmatter relations`.
- Kept existing collapsed header relation details as a path-level fallback, while adding the structured `Relations` lens and TOC entry before source prose.
- Preserved the offline render boundary: the conversion reads only current frontmatter values and does not resolve files or call an LLM.

## Verification

- `pnpm test tests/render-spec.test.ts -t "frontmatter artifact relations"`
- `pnpm test tests/render-spec.test.ts`
- `pnpm typecheck`
- `pnpm test`
- Spec frontmatter/status check over `docs/specs/*.md`
- Dogfood render: `/tmp/dossier-dogfood/vision-frontmatter-relations.html`
  - bytes: `83410`
  - relationship edges: `1`
  - Dossier Lens TOC includes `Relations`
  - relationship evidence includes `frontmatter reviews includes docs/reviews/2026-05-18-dossier-vision-multi-role-review.md`
