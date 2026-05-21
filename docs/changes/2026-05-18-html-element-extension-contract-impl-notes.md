---
title: Dossier vision spec HTML element extension contract notes
status: implemented
owner: codex
created: 2026-05-18
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
reviews: []
---

# Dossier vision spec HTML element extension contract notes

## Summary

Accepted the UI/design review recommendation that the vision spec should define Dossier's HTML display protocol, not only show an attractive example template.

## Changes

- Added `§8.5 HTML 展示元素与扩展协议` to the vision spec.
- Defined an initial display-element vocabulary, including `metadata-strip`, `status-badge`, `toc-panel`, `callout`, `artifact-card`, `edge-link`, `mini-dag`, `preview-popover`, `diff-block`, `timeline`, `evidence-card`, `decision-card`, and `provenance-panel`.
- Clarified element trigger priority across frontmatter, Markdown structure, Dossier index data, and skill-local conventions.
- Added the stable skill template slot contract and MVP-1 dossier-aware slot expansion.
- Added the user extension ladder: profile, frontmatter, skill, and element-level extension.
- Clarified the AI writing constraints: prefer Markdown/frontmatter semantics, avoid raw HTML as the main input protocol, and require fallback rules for new display elements.

## Verification

- Regenerated `docs/specs/2026-05-17-dossier-vision-spec.html` with `pnpm render:self`.
