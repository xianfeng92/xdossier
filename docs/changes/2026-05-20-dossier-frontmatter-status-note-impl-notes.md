---
title: Dossier Frontmatter Status Note Impl Notes
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

# Dossier Frontmatter Status Note Impl Notes

## Summary

Changed scaffold-generated `document_overview.status_note` from generator provenance into reader-facing document metadata.

Before this change, the semantic overview could tell readers `Deterministic scaffold generated from headings and first section content.` or `由标题和首段内容确定性生成的 scaffold。` That explained how Dossier produced the lens, but not what state the source artifact was in. The overview now prefers explicit frontmatter such as `status`, `kind`, `updated`, and `created`.

## Changes

- Added a deterministic `scaffoldStatusNote()` helper in `src/enrich/section-summaries.ts`.
- Rendered known Chinese statuses as reader-facing labels:
  - `draft` -> `草稿`;
  - `ready` -> `已就绪`;
  - `implemented` -> `已实现`;
  - `archived` -> `已归档`.
- Normalized document `kind` values such as `mvp-spec` into readable text such as `mvp spec`.
- Read YAML date objects and string dates for `updated` / `created`.
- Kept a clear fallback when no status metadata exists:
  - Chinese: `未声明状态元数据。`;
  - English: `No status metadata declared.`
- Added a regression test proving Chinese frontmatter produces `已就绪 · mvp spec · 更新 2026-05-20` and no scaffold implementation prose.

## Verification

- Red: `pnpm test tests/enrich.test.ts -- --runInBand` failed with `由标题和首段内容确定性生成的 scaffold。` for the new frontmatter status test.
- Green: `pnpm test tests/enrich.test.ts -- --runInBand` passed after the status-note helper and test expectation updates.
- `pnpm typecheck` passed.
- `pnpm test` passed: 3 test files, 107 tests.
- Spec frontmatter self-check passed: 11 specs checked, 0 problems, ready spec remains `docs/specs/2026-05-17-dossier-vision-spec.md`.
- Dogfood render:
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-dogfood/vision-frontmatter-status-note.html --verbose`
  - output: `/tmp/dossier-dogfood/vision-frontmatter-status-note.html`
  - overview status note: `已就绪 · vision spec · 更新 2026-05-18`
  - old scaffold status prose: 0 hits for `由标题`, `Deterministic`, and `scaffold` in the overview status note.
