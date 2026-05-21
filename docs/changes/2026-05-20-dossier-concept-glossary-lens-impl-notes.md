---
title: Dossier Concept Glossary Lens Impl Notes
status: implemented
owner: codex
created: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
  - docs/specs/2026-05-19-dossier-deterministic-scaffold-lens-spec.md
---

# Dossier Concept Glossary Lens Impl Notes

## Summary

Added a `concept_glossary` semantic block so generated HTML can teach the reader the document vocabulary before the source prose. This targets a concrete understanding gap from prior reviews: Dossier already had reading paths, decisions, questions, and evidence, but still lacked a stable place for key terms such as Artifact, Dossier, TraceIR, provenance, or skill-local concepts.

The deterministic scaffold only emits glossary blocks from explicit glossary / term / concept tables. It does not invent terms from ordinary prose.

## Contract

Annotation shape:

```json
{
  "type": "concept_glossary",
  "title": "Core concepts",
  "source_section_id": "s1",
  "items": [
    {
      "term": "Artifact",
      "plain_language": "A source document or output the reader needs to understand.",
      "example": "A vision spec or review note.",
      "model_field": "Artifact.kind",
      "section_id": "s1"
    }
  ]
}
```

## Files Changed

- `src/types.ts`
  - added `ConceptGlossaryBlockAnnotation` and `ConceptGlossaryItemAnnotation`.
- `src/annotations.ts`
  - parses and validates `concept_glossary` blocks.
- `src/emit.ts`
  - renders glossary cards near the structure-map/model layer.
  - adds TOC label support.
- `src/semantic-trace.ts`
  - links source sections back to glossary blocks with `section-semantic-glossary` chips.
- `src/enrich/section-summaries.ts`
  - extracts deterministic glossary blocks from explicit concept / glossary / term tables.
  - preserves H3/H4 subheading context for glossary-table extraction while keeping roadmap stage extraction limited to H3 headings.
- `src/enrich/agent-cli.ts`
  - teaches Codex/Claude provider prompts about `concept_glossary`.
- `src/skills/render-spec/style.css`
  - styles glossary cards and model/example fields.
- `tests/render-spec.test.ts`
  - covers parsing, rendering, TOC entry, and source trace chips.
- `tests/enrich.test.ts`
  - covers deterministic scaffold extraction and provider prompt shape.

## Verification

- Red: `pnpm test tests/render-spec.test.ts -t "concept glossary"` failed because the parser rejected `concept_glossary`.
- Green: `pnpm test tests/render-spec.test.ts -t "concept glossary"` passed after parser/render/trace implementation.
- Red: `pnpm test tests/enrich.test.ts -t "concept glossary"` failed because scaffold output had no glossary block.
- Green: `pnpm test tests/enrich.test.ts -t "concept glossary"` passed after deterministic table extraction.
- Red: `pnpm test tests/enrich.test.ts -t "local agent provider"` failed because the provider prompt lacked `concept_glossary`.
- Green: `pnpm test tests/enrich.test.ts -t "local agent provider"` passed after prompt/schema update.
- Red: `pnpm test tests/enrich.test.ts -t "nested concept"` failed because a concept table under an H4 subheading was invisible to the scaffold.
- Green: `pnpm test tests/enrich.test.ts -t "nested concept"` passed after retaining nested subheading context for table extraction.
- Regression guard: `pnpm test tests/enrich.test.ts -t "roadmap|H3|Nested Section"` passed after the nested-heading change.
- `pnpm typecheck` passed.
- `pnpm test` passed: 92 tests.
- `docs/specs` frontmatter/status check passed: 11 files.

## Dogfood

- Vision spec scaffold render:
  - command: `pnpm dev enrich docs/specs/2026-05-17-dossier-vision-spec.md --provider scaffold -o /tmp/dossier-dogfood/vision-concept-glossary.annotations.json --verbose`
  - command: `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md --annotations /tmp/dossier-dogfood/vision-concept-glossary.annotations.json -o /tmp/dossier-dogfood/vision-concept-glossary.html --verbose`
  - output: 18 summaries, overview, 4 reading path items, 8 semantic blocks.
  - glossary: 1 block titled `8.5.1 内置展示元素词表`, 8 concept cards.
  - first terms: `metadata-strip`, `status-badge`, `toc-panel`, `callout`, `section-card`.
  - static byte count: `148,063`.
- MVP-0 spec scaffold render:
  - output: 15 summaries, overview, 4 reading path items, 7 semantic blocks.
  - glossary: 0 blocks, because no explicit glossary/concept table exists in that spec.
  - static byte count: `139,544`.
- Browser verification through local HTTP:
  - URL: `http://127.0.0.1:8773/vision-concept-glossary.html#lens-concept-glossary-2`
  - observed block id: `lens-concept-glossary-2`
  - card count: 8
  - TOC includes `Glossary`
  - source trace chips: 2
  - screenshot: `/tmp/dossier-dogfood/vision-concept-glossary-browser.png`
