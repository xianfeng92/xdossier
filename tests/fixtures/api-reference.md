---
title: API Reference
kind: reference
status: ready
---

# API Reference

## Artifacts

| Field | Type | Description |
|---|---|---|
| id | string | Stable artifact identifier |
| title | string | Human-readable title |
| kind | string | Artifact category |
| status | string | Current lifecycle status |

## BuildOptions

| Field | Type | Description |
|---|---|---|
| workspaceRoot | string | Workspace root directory |
| outDir | string | Optional output directory |
| singleFile | boolean | Pack all assets into one HTML file |
| verbose | boolean | Print diagnostic information |

## RenderOptions

| Field | Type | Description |
|---|---|---|
| markdown | string | Source markdown text |
| skillId | string | Selected render skill |
| withToc | boolean | Whether to emit a table of contents |
| annotations | object | Optional deterministic render annotations |

## ErrorCodes

| Code | Meaning | Recovery |
|---|---|---|
| 1 | Input missing | Check the path |
| 2 | Parse failed | Fix markdown frontmatter |
| 3 | Unknown skill | Use render-spec |
