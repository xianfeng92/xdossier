---
title: Dossier Cover Information Architecture Spec
status: implemented
kind: mvp-spec
owner: codex
created: 2026-05-18
updated: 2026-05-19
implemented_milestones: ["Cover-0", "Cover-1", "Cover-2"]
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
reviews: ["docs/reviews/2026-05-18-dossier-vision-multi-role-review.md"]
---

> This spec defines the MVP-1 `render-dossier-cover` information architecture. It does not implement the renderer.
> It converts the accepted review recommendation into a concrete contract for the next build step.

## 0. One Sentence

> A Dossier cover is not a prettier table of contents. It is the first screen that lets a busy reader decide what the AI produced, how the artifacts relate, what is decided, what remains open, and what to read next.

## 1. Problem

MVP-0 made a single Markdown document easier to read as HTML. That helps with the "long flat spec" pain, but it does not solve the heavier daily problem:

- AI sessions create multiple related artifacts.
- The relationship between artifacts is the expensive part to reconstruct.
- A reader often wants a judgment before they want a full document.
- A generated summary is not enough because it hides evidence and prevents drill-down.

The Dossier cover must therefore become a judgment surface, not a decorative index page.

## 2. Reader Tasks

The cover must optimize for five concrete tasks:

| Task | Reader question | Cover obligation |
|---|---|---|
| Continue or stop | Can this AI-produced work be acted on? | Show status, confidence, blockers, and next action in the first screen. |
| Rebuild context | What did the AI produce? | Show artifacts by kind, status, and relationship. |
| Inspect decisions | What was decided and why? | Extract 3-5 high-impact decisions with evidence links. |
| Preserve uncertainty | What is still unresolved? | Show open questions separately from decisions. |
| Hand off | What should each reader read first? | Provide role-based reading paths. |

Non-goal: this cover is not a chat-history viewer, observability dashboard, or team commenting surface.

## 3. North Star Acceptance

A person who did not participate in the AI session opens only the Dossier cover. Within 3 minutes, they can answer:

1. What artifacts did the AI produce?
2. What is the main storyline or intent behind those artifacts?
3. What is already decided?
4. What is still open or risky?
5. What should they read or do next?

If they cannot answer these from the cover, the failure is information architecture, not visual polish.

## 4. Layout Contract

The default `render-dossier-cover` template has seven zones, in this order.

| Zone | Purpose | Required contents | Fallback |
|---|---|---|---|
| `verdict-strip` | 30-second orientation | title, status, confidence, next action, artifact count, latest update | title + artifact count |
| `activity-inbox` | Show what changed since last run | new artifacts, changed artifacts, blocked/open items | omit when no baseline exists |
| `artifact-map` | Build spatial model | clickable graph plus grouped artifact list | grouped list only |
| `key-decisions` | Surface actionable judgments | 3-5 decisions with source artifact and evidence anchor | "No high-confidence decisions found" |
| `open-questions` | Preserve uncertainty | unresolved questions, owner if known, blocking impact | "No open questions found" |
| `reading-paths` | Reduce choice cost | recommended paths for PM, engineer, reviewer/handoff receiver | one default path by artifact order |
| `evidence-drawer` | Explain trust | relation sources, confidence, extraction rule, provenance links when available | static evidence table |

Reference material such as full data models, prior art, naming history, and low-priority risks belongs below these zones or behind `<details>`.

## 5. View Model

MVP-1 should introduce a cover view model separate from the raw index model. The renderer consumes this shape; scanners and heuristics can evolve behind it.

```typescript
type DossierCoverView = {
  dossier: {
    id: string;
    title: string;
    status: "draft" | "ready" | "implemented" | "archived" | "mixed";
    description: string;
    updated_at: string;
    confidence: "high" | "medium" | "low";
    next_action?: string;
  };
  activity: {
    new_artifacts: ArtifactRef[];
    changed_artifacts: ArtifactRef[];
    open_items: OpenQuestionRef[];
  };
  artifacts: CoverArtifact[];
  edges: CoverEdge[];
  decisions: CoverDecision[];
  open_questions: CoverOpenQuestion[];
  reading_paths: ReadingPath[];
  evidence: CoverEvidence[];
};

type CoverArtifact = {
  id: string;
  path: string;
  title: string;
  kind: "vision-spec" | "mvp-spec" | "adr" | "change" | "review" | "note" | "design" | "other";
  status?: "draft" | "ready" | "implemented" | "archived";
  summary?: string;
  rendered_html_path?: string;
};

type CoverEdge = {
  from: string;
  to: string;
  relation: "implements" | "reviews" | "follows" | "supersedes" | "references" | "answers";
  source: "frontmatter" | "filename" | "inline" | "session" | "inferred";
  confidence: "high" | "medium" | "low";
  label: string;
  evidence?: string;
};
```

MVP-1 must add `confidence` and `label` to reader-facing edges. `source` is machine-facing; `label` is what the reader sees.

## 6. Deterministic Extraction Rules

MVP-1 remains no-LLM by default.

### 6.1 Artifact Collection

1. Scan `docs/specs/`, `docs/changes/`, and `docs/reviews/`.
2. Include files referenced by `implements` and `reviews` even when they live outside those directories.
3. Extract `title`, `status`, `kind`, `created`, `updated`, `implements`, and `reviews` from frontmatter.
4. Fallback title order: frontmatter `title`, first `h1`, filename slug.

### 6.2 Edge Collection

| Signal | Relation | Confidence | Label example |
|---|---|---|---|
| frontmatter `implements` | `implements` | high | `MVP-0 spec implements the vision spec` |
| frontmatter `reviews` | `reviews` | high | `Multi-role review reviews the vision spec` |
| markdown link to another artifact | `references` | medium | `Vision spec references the MVP-0 spec` |
| filename sequence like `v2`, `v3`, `r1` | `follows` | medium | `r1 review follows the first review` |
| same session, same topic prefix | `references` | low | `Likely produced in the same dossier` |

Only high and medium confidence edges are shown in the primary map. Low confidence edges move to the evidence drawer by default.

### 6.3 Decisions

Extract only high-confidence decisions in MVP-1:

- ADR documents count as decision sources.
- Headings containing `Decision`, `决策`, `锁定`, `选择`, or `不做` create candidate decisions.
- Tables with columns similar to `决策`, `原因`, `拒绝的选项`, `倾向`, or `verdict` create candidate decisions.
- Keep at most five; rank by artifact kind in this order: `adr`, `mvp-spec`, `vision-spec`, `review`, `change`.

If confidence is weak, do not invent a decision. Show an empty state.

### 6.4 Open Questions

Extract open questions from:

- headings containing `Open Questions`, `开放问题`, `风险`, or `Next`;
- unchecked tasks `- [ ]`;
- table rows under an open-question section;
- review verdicts that contain `needs`, `blocked`, `fix`, or `risk`.

Each open question should include `source_artifact`, optional `owner`, optional `blocks`, and an anchor link when available.

## 7. Reading Paths

The cover must generate at least three role-based paths:

| Role | Default path |
|---|---|
| PM / decision maker | Verdict -> Key Decisions -> Open Questions -> Risks -> Vision spec |
| Engineer / implementer | Artifact Map -> MVP spec -> ADRs -> Change notes -> Tests/reviews |
| Reviewer / handoff receiver | Verdict -> Review artifacts -> Evidence drawer -> Open Questions -> Changed artifacts |

Reading paths should be rendered as compact ordered links, not prose paragraphs.

## 8. Responsive and Offline Behavior

Desktop:

- two-column cover after the verdict strip;
- artifact map and decisions visible without scrolling too far;
- evidence drawer collapsed by default.

Mobile:

- graph falls back to grouped edge list;
- reading paths appear before evidence;
- no hover-only interactions.

Offline/share:

- no remote assets;
- inline CSS and minimal inline JS only;
- source paths remain visible;
- share/export mode must show a privacy warning if `.dossierignore` or redaction rules were not applied.

## 9. CLI Surface

MVP-1 should add a build command:

```bash
dossier build [workspace] [options]

Options:
  -o, --out <dir>          Output directory, default .dossier/out
  --single-file            Pack the cover and rendered documents into one HTML file
  --since <ref>            Populate activity-inbox from git ref or previous build manifest
  --no-graph               Render artifact map as grouped lists only
  --verbose                Print extraction and confidence reasons
```

`dossier render <file.md>` remains the MVP-0 single-document command.

## 10. Milestones

| Milestone | Scope | Acceptance |
|---|---|---|
| Cover-0 | collect artifacts, build high-confidence edges, render verdict + artifact list | current Dossier repo produces an index with vision, MVP-0, review, and change notes grouped correctly |
| Cover-1 | add artifact map, decisions, open questions, reading paths, evidence drawer | 3-minute understanding test passes on the Dossier repo |
| Cover-2 | add `--since`, activity inbox, and single-file export privacy warning | user can see what changed since the last build |

MVP-1 was complete at Cover-1. Cover-2 has now shipped in the same cycle as the activity/export extension.

## 11. Acceptance Checklist

- [x] `dossier build /Users/xforg/AI_SPACE/dossier` emits a cover page.
- [x] Cover shows at least the vision spec, MVP-0 spec, multi-role review, and implementation notes.
- [x] `implements` and `reviews` edges appear with reader-facing labels and confidence.
- [x] Low-confidence inferred edges do not clutter the primary map.
- [x] Key decisions and open questions are separate zones.
- [x] Reading paths contain links, not summary prose.
- [x] Mobile fallback is readable without hover.
- [x] Output works offline with no remote assets.
- [x] A new reader can answer the five north-star questions in 3 minutes.

## 12. Open Decisions

| Decision | Default for implementation |
|---|---|
| Graph layout library | No runtime graph library in MVP-1; hand-layout small DAGs, list fallback for large sets. |
| LLM summaries | Not in MVP-1; optional in MVP-2 after deterministic IA works. |
| Where to store build baseline | `.dossier/build-manifest.json` when `--since` is enabled. |
| Privacy defaults | Local build shows local content; share/export mode warns unless ignore/redaction config is present. |

## 13. Relationship to Existing Specs

- Extends `2026-05-17-dossier-vision-spec.md` §7 and §10.2.
- Preserves `2026-05-18-dossier-mvp-0-spec.md`: single-document render remains the entry command.
- Converts `2026-05-18-dossier-vision-multi-role-review.md` into an implementable MVP-1 IA contract.
