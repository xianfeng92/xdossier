---
title: Dossier Semantic Item Trace Anchors Impl Notes
status: implemented
kind: impl-notes
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Semantic Item Trace Anchors Impl Notes

## Summary

Semantic item cards now have stable anchors, and source-section trace chips can link to exact semantic items instead of only linking to the parent lens block.

## Implemented

- Added item-specific trace links for decision, evidence, risk, checklist, open-question, and concept-glossary items.
- Added stable item ids to rendered decision cards, evidence cards, risk cards, checklist rows, open-question rows, and concept cards.
- Localized item trace prefixes through the existing language-aware trace label path, including `Decision`, `Evidence`, `Risk`, `Checklist`, `Question`, and `Glossary` in English and their Chinese equivalents.
- Updated render-spec tests so Section Map and source-section traces assert exact item links where the source section owns a specific semantic item.

## Verification

- Red test: `pnpm test tests/render-spec.test.ts -- --runInBand` failed before implementation because decision cards had no item ids and source traces only linked to parent blocks.
- Green test: `pnpm test tests/render-spec.test.ts -- --runInBand` passed after implementation.
- Dogfood render: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-semantic-item-anchors.html --verbose` produced item anchors for all rendered decision, risk, checklist, open-question, relationship, and glossary items in the Dossier Lens.
- Dogfood trace audit found 59 source-section or Section Map item trace chip texts, all localized with Chinese item prefixes and zero English `Decision:` / `Risk:` / `Question:` / `Evidence:` / `Checklist:` / `Glossary:` trace prefixes.
- Browser DOM check against `http://127.0.0.1:8769/vision-semantic-item-anchors.html` found 59 item trace links, 59 localized Chinese item prefixes, 0 English item prefixes, and 0 offscreen or parent-overflowing item chips.
- Full verification: `pnpm typecheck`, `pnpm test`, spec frontmatter validation, `git diff --check`, and touched-file trailing-whitespace scan passed.

## Follow-up

- Continue using this item-level trace pattern for future semantic blocks so source prose can point to the smallest useful structured card.
