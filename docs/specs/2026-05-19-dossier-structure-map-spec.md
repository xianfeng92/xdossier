---
title: Dossier Structure Map Spec
status: implemented
kind: mvp-spec
owner: codex
created: 2026-05-19
updated: 2026-05-20
implements:
  - docs/specs/2026-05-19-dossier-semantic-lens-spec.md
reviews: []
---

# Dossier Structure Map Spec

## 0. One Sentence

Add a document-level structure map so enriched HTML can show the reader how the main concepts relate before the original Markdown prose begins.

## 1. Problem

The semantic lens already renders overview, reading path, roadmap, decisions, scope, checklist, and open questions. That is useful, but the modules can still read as a set of good cards placed above the Markdown. A reader needs a compact document model: what are the core concepts, what role does each concept play, and how do they connect.

## 2. Goal

For a long spec, the first structured layer should answer:

- what conceptual pieces the document contains;
- whether a piece is context, path, decision, risk, evidence, output, question, or action;
- which source section supports each piece;
- how the pieces frame, refine, validate, stress-test, or leave questions for each other.

## 3. Annotation Contract

Add an optional `structure_map` semantic block:

```json
{
  "type": "structure_map",
  "title": "Document model",
  "source_section_id": "s1",
  "summary": "Context leads to a path, then the path is checked by acceptance gates.",
  "nodes": [
    {
      "id": "path",
      "label": "Learning path",
      "kind": "path",
      "summary": "The staged route a reader should follow.",
      "section_id": "s7"
    }
  ],
  "edges": [
    {
      "from": "path",
      "to": "acceptance",
      "label": "verified by"
    }
  ]
}
```

Node `kind` must be one of `context`, `path`, `decision`, `risk`, `evidence`, `output`, `question`, or `action`. Edge endpoints must reference existing node ids.

## 4. Render Contract

- Structure maps render in a `semantic-model-flow` after the overview and before roadmap/judgment panels.
- Each node has a stable anchor: `lens-structure-map-<n>-node-<node-id>`.
- The Dossier Lens TOC includes `Structure Map`.
- Source sections referenced by structure-map nodes render semantic trace chips linking back to the exact node.
- Edges render as compact connection rows using node labels, not raw ids.
- Edge labels should be meaningful relation phrases, not only generic sequence labels.
- `dossier render` remains deterministic and never calls an LLM.

## 5. Enrich Contract

`dossier enrich --provider codex|claude` should request a structure map when the source document has several concepts a reader must relate. Preferred output is 3-6 nodes and 1-6 edges.

## 6. Acceptance

- Unit tests cover parsing and rendering a structure map.
- Unit tests cover invalid edges that reference missing nodes.
- Unit tests cover structure-map TOC links and source-section trace chips.
- Unit tests cover deterministic role-aware edge labels for scaffold-generated structure maps.
- Unit tests cover provider prompt/schema shape.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- A dogfood render of the Dossier vision spec shows a structure map before source prose.
