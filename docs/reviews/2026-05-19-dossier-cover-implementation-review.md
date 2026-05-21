---
title: Dossier Cover implementation review
status: implemented
owner: claude
created: 2026-05-19
updated: 2026-05-19
reviews_target:
  - docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md
  - docs/specs/2026-05-19-claude-code-cover-implementation-review-handoff.md
---

# Dossier Cover implementation review

## Verdict

**NEEDS_REWORK** — Cover-0 / Cover-1 contracts hold up and all 22 tests pass. Two
real defects sit in shipped behavior and one in the Cover-2 activity contract.
Tests do not currently catch them. None are deep redesigns; each has a small,
local fix.

| ID | Severity | One-line |
|---|---|---|
| F1 | P0 | `--single-file` embeds rendered artifacts with frontmatter stripped → every iframe shows `badge draft`, no `updated`, no `owner`. |
| F2 | P1 | Open-question extraction recurses into specs that document the heuristic itself, producing pseudo-questions like `"headings containing Open Questions, 开放问题, 风险, or Next;"`. |
| F3 | P1 | `activity.open_items` is a copy of `open_questions` regardless of baseline → activity-inbox carries no delta semantics. |
| F4 | P2 | `--no-graph` is parsed but has no effect on output; renderer always uses the list fallback. |
| F5 | P2 | `matchesDirectoryPattern` cannot match a nested absolute path (e.g. `/.../docs/specs/sub`). Latent gap, not exercised today. |
| F6 | P2 | `contentHash` excludes frontmatter → status-only edits (e.g. `draft → implemented`) never show as `changed`. |
| F7 | P2 | Build `--out` help text describes render-mode semantics; build treats it as a directory. |
| F8 | P3 | `dossier.confidence` is binary `high|low`; the typed view exposes `medium` but the code never emits it. `next_action` is hardcoded. |

## Findings

### F1 (P0) — `--single-file` rendered documents lose all frontmatter

`src/cover/render.ts:113-122` calls
`renderMarkdown({ markdown: artifact.content, … })`, but `artifact.content` is
already the post-frontmatter body produced by `scanArtifacts → parseFrontmatter`
(`src/cover/scan.ts:79`). Inside `src/render.ts:24`, the pipeline re-runs
`parseFrontmatter` on that body, which has no `---` block left, so
`frontmatter.data === {}` and `emit.ts` falls back to default values.

**Reproduction**

```bash
pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose
```

Decode the first iframe's `srcdoc`:

- `<title>` correctly shows `Dossier Cover-0 implementation notes` (H1 fallback)
- `badge draft` — but the source frontmatter is `status: implemented`
- meta-grid has **no** `updated`, `owner`, `implements`, or `reviews` rows

All 18 embedded documents are equally misleading. A single-file export shared
with a reader would tell them every artifact is `draft`. This contradicts the
North Star "rebuild context" reader task in spec §2.

**Fix sketch (small)**

Pass the raw markdown to the renderer. Either:

- carry the original file bytes on `CoverArtifact` (alongside `content`), or
- pass `artifact.frontmatter` + `artifact.content` to a `render({ frontmatter, content, … })` overload that skips the second `parseFrontmatter` call.

Add a regression test in `tests/cover.test.ts` along the lines of:

```ts
expect(html).not.toMatch(/<span class="badge draft">draft<\/span>[\s\S]+MVP-0 Spec/);
expect(html).toMatch(/<span class="badge implemented">implemented<\/span>/);
```

The existing `single-file embeds rendered artifact documents` test only checks
for the presence of `frontmatter` as a substring (line 458) which today matches
the *empty* `<header class="frontmatter">` shell.

---

### F2 (P1) — Open-question extraction over-extracts spec self-description

`src/cover/extract.ts:137-161` walks every section whose heading matches
`/open questions?|开放问题|风险|next|下一步/i`, and then turns every bullet under
that heading into a `CoverOpenQuestion`. It also returns bullets from rows of
the IA spec section §6.4 that *describe* the heuristic itself.

In the current dogfood output, the `Open Questions` panel contains:

- "headings containing Open Questions, 开放问题, 风险, or Next;"
- "unchecked tasks - [ ];"
- "table rows under an open-question section;"
- "review verdicts that contain needs, blocked, fix, or risk."
- "Dossier 不是一个 Markdown 渲染器" (and similar narrative bullets from §6 / Next-step sections of vision/handoff specs)

These are not real open questions. They are recursive bites from spec prose.
The extractor cannot distinguish "this heading lists open questions" from
"this heading describes how we extract open questions" because it operates
purely on heading regex.

**Fix sketch (small, deterministic)**

- Treat only `- [ ]` bullets and *table rows* as open questions, not arbitrary
  prose bullets. The bullet path is already in `extractUncheckedTasks`; the
  prose-bullet path in `extractOpenQuestionSections` is the noise source.
- Or: ignore sections inside `kind: vision-spec` / `kind: mvp-spec` whose body
  is markdown describing *categories* of extraction (e.g., when the section
  body itself contains the string `extraction` or matches `headings containing`).
- Add a fixture test that includes a `## Open Questions` section whose bullets
  are *about* the extraction algorithm, and assert they do **not** appear.

Lower severity than F1 because it's noise rather than wrong status, but it
defeats the panel's purpose: the reader cannot tell which items are real.

---

### F3 (P1) — Activity-inbox `open_items` ignores baseline

`src/cover/view-model.ts:97-104` populates `activity.open_items` by iterating
`openQuestions` unconditionally. The spec §4 row defines `activity-inbox`
purpose as "Show what changed since last run", and the handoff §4-3 calls this
out as a question.

In the dogfood build (`--since HEAD`):

- `open-questions` panel: 10 items
- activity-inbox `Open items` group: same 10 items

That makes the activity zone indistinguishable from the static panel and
breaks the "what's new since baseline" contract. A reader running `--since`
expects deltas, not a duplicate.

**Fix sketch (small)**

Compute open questions for the baseline manifest's artifact set (or carry
prior open-question hashes in the manifest) and diff. As a stop-gap, omit
`open_items` from the activity-inbox until proper diffing exists — the
boundary note in `cover-2 impl-notes.md` could then say so explicitly.

---

### F4 (P2) — `--no-graph` is dead

`src/cli.ts:125` sets `graph = false`, but `buildDossierCover` does not accept
a `graph` parameter (`src/cover/render.ts:23-29`), and `renderArtifactMap`
already always uses the edge-list fallback. The flag only changes the
`verbose` log line at `src/cli.ts:183`. Either remove the flag from `HELP_TEXT`
until a graph layout exists, or thread it through and have the renderer
suppress the `edge-list` section when `false`.

---

### F5 (P2) — Directory-pattern glob misses nested absolute paths

`src/skills/registry.ts:71-79`: for pattern `docs/specs/**` with directory
`/Users/.../dossier/docs/specs/sub`:

- `directory === prefix` (`docs/specs`) — false
- `directory.endsWith("/docs/specs")` — false (it ends with `/sub`)
- `directory.startsWith("docs/specs/")` — false (absolute path)

Result: a file in `docs/specs/sub/foo.md` would not dispatch via directory
pattern in dispatch layer 5. Not exercised today (specs live flat), but a
latent gap. A `directory.includes("/docs/specs/")` test would cover the
nested-absolute case.

---

### F6 (P2) — `contentHash` excludes frontmatter

`src/cover/manifest.ts:31-37` hashes `artifact.content` (post-frontmatter).
A document whose only edit is `status: draft → implemented` will not appear
in `Changed artifacts`. That is the most decision-relevant edit Dossier
exists to surface. Suggest hashing the raw bytes, or `JSON.stringify(frontmatter) + content`.

---

### F7 (P2) — Build `--out` help text is misleading

`src/cli.ts:50` says `-o, --out <path>   Output HTML path (default: <input>.html same dir)`. In `build` mode this value is treated as a **directory** and `index.html` is written inside (`src/cover/render.ts:68-69`). Help text should
distinguish render-mode vs build-mode `--out` semantics or be split.

---

### F8 (P3) — Coarse `confidence` + hardcoded `next_action`

`src/cover/view-model.ts:46`:
`confidence: edges.some((edge) => edge.confidence === "high") ? "high" : "low"`
— `medium` is never emitted, even though the `DossierCoverView` type exposes
it. `next_action` at line 47 is a fixed string regardless of state. Both are
acceptable MVP cuts but worth a comment that they are placeholders.

---

## Targets from the handoff that came back clean

- **Artifact scan determinism** (`src/cover/scan.ts`): sorted twice (BFS queue and final return), idempotent across runs. ✔
- **High-confidence edges** (`src/cover/edges.ts`): correctly inverts `reviews` direction so the review points at its target; high confidence + frontmatter source preserved. ✔
- **Git ref baseline** (`src/cover/manifest.ts:77-126`): handles `/var` vs `/private/var` via `realpath` on both sides, computes workspace prefix relative to git root, uses `git ls-tree -r --name-only <ref> -- <prefix>/<dir>` with `--` so unusual filenames are safe enough for this MVP. ✔ Behavior matches the test that re-inits a fresh repo, mutates files, and asserts `Changed artifacts`. ✔
- **Explicit manifest path** (`--since path/to/build-manifest.json`): handled at `manifest.ts:46-53`. ✔
- **`--since last` graceful first run**: returns `undefined`, activity-inbox not rendered. ✔ (test passes; HTML asserted to not contain `activity-inbox`.)
- **No remote assets** in cover or in single-file output: confirmed by both `cover.test.ts` and a grep of the dogfood `index.html`. ✔
- **Cover-0 → Cover-2 layering**: Cover-0 behavior (verdict + artifact list + edges) untouched by Cover-1/2 additions; the additional fields are opt-in via input flags. ✔
- **Vision spec no longer self-implements**: the regression test at `cover.test.ts:462-471` and the actual frontmatter both check out. ✔

## Verification

```
pnpm typecheck                                                      → clean (no output)
pnpm test                                                            → 2 files, 22 tests, all pass
pnpm dev build /Users/xforg/AI_SPACE/dossier --since HEAD --single-file --verbose
  → cover artifacts: 18, edges: 19, graph: list-fallback, activity: 18 new/0 changed
  → wrote /Users/xforg/AI_SPACE/dossier/.dossier/out/index.html (614485 bytes)
```

Inspection of the generated `index.html`:

- 18 `srcdoc=` iframes found, every decoded one shows `badge draft` regardless
  of source `status` (F1 evidence).
- `Open Questions` panel and `Activity inbox → Open items` are identical
  10-item lists (F3 evidence); the lists themselves contain the spec-prose
  artifacts that prove F2.
- No `<script src=`, no `<link href="http`, no `@import`, no `url(http` in
  either the cover or the embedded iframe docs.

## Residual Risk (intentionally out of scope, per the handoff)

- No LLM, no provenance/session adapter, no watch mode, no MCP server, no
  graph layout library, no deleted-artifact reporting.
- Old handoff / rework briefs (`2026-05-18-codex-handoff-brief.md`,
  `2026-05-18-codex-rework-brief-r1.md`,
  `2026-05-19-claude-code-cover-implementation-review-handoff.md`) remain
  `status: ready`. They are now historical — archiving is a small docs-hygiene
  follow-up, not a defect.
- `privacyWarning` only inspects workspace-root `.dossierignore`,
  `redact-patterns.json`, and `.dossier/redact-patterns.json`. Configuration
  files in other locations would be missed. Acceptable until a privacy config
  schema is defined.

## Recommendation

Land small fixes for F1, F2, F3, and F4 before claiming the Cover IA spec is
`implemented` for shareable output. F1 in particular makes single-file export
misleading enough that I would not share that file externally today. F5–F8
can ride along or wait for the next pass.
