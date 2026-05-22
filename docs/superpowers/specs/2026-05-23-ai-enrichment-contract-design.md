# AI Enrichment Contract Design

## Goal

v0.4 makes AI enrichment auditable before it reaches the deterministic renderer. The contract answers three questions:

1. Which enrichment contract produced this annotations JSON?
2. Does the JSON satisfy the schema shape?
3. Do all section references point to real anchors in the source Markdown?

The renderer stays offline. AI providers remain optional producers of structured annotations, never hidden runtime dependencies.

## Contract Surface

Annotations may include:

```json
{
  "schema_version": 2,
  "contract": {
    "name": "dossier-ai-enrichment",
    "version": "0.4",
    "producer": "dossier-enrich:scaffold",
    "created_at": "2026-05-23"
  }
}
```

The `contract` block is optional for backwards compatibility, but every v0.4 producer should emit it. `schema_version: 1` and older `schema_version: 2` files still parse; validation warns when contract metadata is absent.

## Source-Aware Validation

Shape validation is already handled by `parseAnnotationsJson`. v0.4 adds a second layer:

- Build the source anchor set from the Markdown using the same semantic parser as render.
- Verify `section_summaries`, `reading_path`, `semantic_blocks`, pedagogy checkpoints, and analogies only reference existing `sN` or `sN-M` anchors.
- Verify `contract.version` is `0.4` when present.
- Return a report with `ok`, `errors`, `warnings`, and counts.

## CLI

Add:

```bash
xdossier contract <input.md> --annotations <input.annotations.json>
```

Behavior:

- Exit `0` and print `contract: ok (...)` when valid.
- Exit `2` and print concrete errors when shape or source-anchor validation fails.
- `--print-schema` prints a compact JSON description of the supported contract.

`xdossier render --annotations` also runs source-aware validation and fails before rendering if annotations reference missing source anchors.

## Producer Updates

`dossier enrich --provider scaffold|codex|claude` emits the v0.4 contract block. Provider prompts explicitly require the block so AI output is self-describing.

Fallback annotations keep `producer` as `dossier-enrich:<provider>:fallback`.

## Non-Goals

- No network calls.
- No external schema dependency.
- No strict rejection of older annotations that omit `contract`.
- No automatic repair of bad section ids.
