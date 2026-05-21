---
title: Dossier Section Map Semantic Roles Impl Notes
status: implemented
owner: codex
created: 2026-05-20
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
---

# Dossier Section Map Semantic Roles Impl Notes

## Summary

Added semantic role chips to `Section Map` cards. The map already summarized source H2 sections, but it did not say which sections were used by the Dossier Lens. Each card now reuses the same semantic trace graph as the source prose and exposes compact role chips such as `Path: Main path`, `Decisions`, or `Checklist`.

This keeps the source map from being only a prettier table of contents: readers can see section purpose before jumping into the original prose.

Follow-up: the role chips are now real links to the semantic lens rather than inert `span data-semantic-href` markers. Each Section Map card is an `article` with a main source-section link plus independent lens links, avoiding invalid nested anchors while keeping both navigation paths usable.

Second follow-up: Section Map role chips keep the first four roles visible for scanability, but extra roles now render inside a compact `more roles` disclosure instead of being silently dropped.

## Files Changed

- `src/emit.ts`
  - imports `collectSectionSemanticTrace`;
  - builds TOC-derived trace anchors for H2/H3 entries;
  - renders Section Map cards as `article` containers with a primary source-section link and separate semantic role links.
  - preserves role overflow in a `source-section-role-extra` disclosure.
- `src/skills/render-spec/style.css`
  - adds a flex row for Section Map role chips;
  - styles the primary card link separately from the semantic role links;
  - styles the extra-role disclosure.
- `tests/render-spec.test.ts`
  - adds a red/green assertion that the source section map exposes semantic roles for a section referenced by reading path, decision, and checklist lenses;
  - adds a red/green assertion that Section Map role chips are real `href` links, not inert `data-semantic-href` markers.
  - adds a red/green assertion that the fifth semantic role is retained in a `more roles` disclosure.
- `docs/specs/2026-05-19-dossier-semantic-lens-spec.md`
  - records the new render contract and acceptance coverage.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -t "renders document overview"` failed before implementation because `source-section-semantic-roles` was missing.
- Green: `pnpm test tests/render-spec.test.ts -t "renders document overview"` passed after implementation.
- Red follow-up: `pnpm test tests/render-spec.test.ts -- -t "renders document overview, reading path, roadmap, and decisions before prose"` failed because Section Map cards still rendered as a single `<a>` with non-clickable `span data-semantic-href` role chips.
- Green follow-up: `pnpm test tests/render-spec.test.ts -- -t "renders document overview, reading path, roadmap, and decisions before prose"` passed after changing the card to `article + source-section link + semantic role links`.
- Red overflow follow-up: `pnpm test tests/render-spec.test.ts -- -t "renders document overview, reading path, roadmap, and decisions before prose"` failed because the fifth `Questions` role for `s2` was silently dropped.
- Green overflow follow-up: `pnpm test tests/render-spec.test.ts -- -t "renders document overview, reading path, roadmap, and decisions before prose"` passed after adding `source-section-role-extra`.
- `pnpm typecheck` passed.
- `pnpm test tests/render-spec.test.ts` passed: 38 tests.
- `pnpm test tests/enrich.test.ts` passed: 48 tests.
- `pnpm test` passed: 104 tests.
- `docs/specs` frontmatter/status check passed: 11 files, 0 problems, only `docs/specs/2026-05-17-dossier-vision-spec.md` remains `status: ready`.
- Dogfood render:
  - `docs/specs/2026-05-17-dossier-vision-spec.md` with scaffold annotations wrote `/tmp/dossier-dogfood/vision-section-map-roles.html` (`144,017` bytes by static byte count), with 12 Section Map role rows and 18 role chips before source prose.
  - `docs/specs/2026-05-18-dossier-mvp-0-spec.md` with scaffold annotations wrote `/tmp/dossier-dogfood/mvp0-section-map-roles.html` (`138,842` bytes by static byte count), with 10 Section Map role rows and 18 role chips before source prose.
- Follow-up dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-section-map-role-overflow.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-section-map-role-overflow.html`
  - Section Map cards: 18 `article.source-section-map-card`
  - source-section main links: 18 `a.source-section-map-main`
  - semantic role links: 16 `a.source-section-role-chip`
  - extra role disclosures: 0 (the vision spec's Section Map cards do not exceed the visible role budget)
  - inert role markers: 0 `data-semantic-href`
  - semantic blocks: 9
  - inline section summaries: 18
  - external asset check: no `<script src=...>` and no remote `<link href="http...">`.
- Targeted overflow smoke:
  - inline render with one source section carrying 6 semantic roles;
  - role links: 6
  - extra role disclosures: 1
  - disclosure label: `2 more roles`
  - overflow includes `Questions` link to `#lens-open-questions-4`
  - inert role markers: 0 `data-semantic-href`
- Browser verification note: opening the dogfood `file://` artifact through the in-app Browser was blocked by the Browser URL policy, so visual browser inspection was not used for this slice.
