---
title: Dossier Annotation TLDR / Section Brief Experiment Spec
status: implemented
kind: mvp-spec
owner: codex
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-17-dossier-vision-spec.md
reviews: []
---

# Dossier Annotation TLDR / Section Brief Experiment Spec

## 0. One Sentence

Add an annotation/enrich path so a local AI CLI or human can provide per-section reading briefs without putting LLM calls inside the render path.

## 1. Problem

`render-spec` can already style markdown structure, but it cannot infer meaning. Section-level briefs are the smallest useful test of the larger enrich pipeline because they improve skimming while keeping the renderer deterministic.

## 2. Scope

This experiment adds only:

- an explicit `--annotations <path>` option for `dossier render`;
- a small JSON schema for `section_summaries` / section briefs;
- rendering of matching briefs directly under H2 headings;
- a `dossier enrich <file.md>` command with `scaffold`, `codex`, and `claude` providers;
- tests proving unmatched annotations are ignored and summary text is escaped.

## 3. Annotation Shape

```json
{
  "schema_version": 1,
  "source": "manual-or-llm",
  "section_summaries": [
    {
      "section_id": "s1",
      "summary": "One sentence that explains the section.",
      "key_points": ["2-3 concrete points the reader should retain"],
      "reader_hint": "Optional short guidance on how to use this section."
    }
  ]
}
```

The loader also accepts `id` as an alias for `section_id` so it can consume the draft shape proposed during design discussion. Parsed annotations normalize to `section_id`.

`key_points` and `reader_hint` are optional. They are mainly for local AI CLI providers, where the goal is stronger readability than a plain TLDR.

## 4. Render Contract

- `dossier render file.md` remains unchanged and does not read annotations.
- `dossier render file.md --annotations ann.json` reads the JSON, validates it, and passes it into the pure render pipeline.
- Matching summaries render as `<p class="section-summary" data-annotation="section-summary">...</p>` immediately after the matching H2.
- Matching key points render as `<ul class="section-key-points" data-annotation="section-key-points">...</ul>`.
- Matching reader hints render as `<p class="section-reader-hint" data-annotation="section-reader-hint">...</p>`.
- Unknown section ids are ignored because they do not correspond to any rendered section.
- Annotation fields are plain text and HTML-escaped; markdown inside annotation fields is not parsed in this experiment.

## 5. Enrich Contract

`dossier enrich <file.md>` writes `<file>.annotations.json` by default.

Provider modes:

- `--provider scaffold` is the default. It creates deterministic, local section-summary scaffolds without AI.
- `--provider codex` invokes `codex exec` non-interactively and asks it to return structured JSON.
- `--provider claude` invokes `claude -p` non-interactively and asks it to return structured JSON.

The provider output is validated with the same annotation parser used by render. If provider output includes markdown fences or extra text, the first JSON object is extracted and validated.

## 6. Non-goals

- No content hash cache.
- No `.dossier/annotations/<hash>.json` auto-discovery.
- No callout promotion, glossary, diagrams, or cover extraction changes.
- No direct LLM calls in `dossier render`.
- No provider-specific session persistence or tool use beyond the local CLI call.

## 7. Acceptance

- Unit tests cover render insertion and CLI argument parsing.
- Unit tests cover mock local-agent provider parsing.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- A CLI render with `--annotations` produces HTML containing `.section-summary`.
- A CLI enrich with `--provider codex` produces structured annotation JSON on this machine when Codex CLI auth is available.
