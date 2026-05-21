# Contributing

Thanks for being interested! This document covers the development workflow and the bar new contributions need to meet.

## Quickstart

```bash
git clone https://github.com/<owner>/<NAME>
cd <NAME>
pnpm install
pnpm test              # should be all green
pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md
```

## Development workflow

1. **Open an issue first** for non-trivial changes. PRs without prior discussion may be closed.
2. **Branch from `main`**. We use trunk-based development; long-lived branches rot.
3. **Write tests before implementation** when feasible. See `tests/` for patterns.
4. **Run** `pnpm typecheck && pnpm test` locally before pushing. CI will run both on every PR.
5. **One PR, one concern**. Splitting refactors from features speeds review.

## Code style

- **TypeScript** strict mode (see `tsconfig.json`)
- **No new npm dependencies** without an issue + justification. We prize the zero-dependency runtime.
- **Single-file HTML invariant**: any new render output must inline CSS + JS. No `<script src=https://>`, no `<link rel="stylesheet" href=https://>`, no `<img src="http">` (hyperlinks `<a href>` are fine).
- **No raw HTML in markdown input** as the primary protocol. New visual elements must trigger from frontmatter, markdown structure, or annotations.

## Commit messages

We follow conventional-commits-lite:

```
<type>: <imperative summary, ≤72 chars>

<optional body explaining why, not what>
```

Types: `feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `build`

Examples:
- `feat: add prerequisite-card element to render-spec skill`
- `fix: hyperlinks in reference lens lose href when external-ref class applied`

## Adding a new skill

Skills live in `src/skills/<skill-id>/`:

```
src/skills/render-<X>/
├── SKILL.md           # metadata + applies_to
├── template.html      # with {{TITLE}}, {{CONTENT_HTML}}, etc. placeholders
├── style.css          # all visual rules
├── reader-toggle.js   # if reader toggle is needed
└── example.html       # exemplar output for visual regression
```

In `SKILL.md` frontmatter:

```yaml
---
name: render-foo
label: "Foo document"
description: 渲染一份 foo 类文档
applies_to:
  frontmatter_kind: ["foo"]
  filename_patterns: ["*-foo.md"]
  directory_patterns: ["docs/foo/**"]
  priority: 5
---
```

After adding, the skill loader picks it up automatically. Add at least one integration test under `tests/`.

## Adding a new pedagogy element

Pedagogy elements (prerequisite-card, learning-checkpoint, glossary-popover, analogy-callout, etc.) follow these rules:

1. **Annotation-driven**: data lives in `RenderAnnotations` (see `src/types.ts`), not raw markdown HTML
2. **Reader-tier aware**: use `data-detail-level="<tier>"` attribute so CSS can show/hide by reader mode
3. **Graceful fallback**: when the annotation is absent, the HTML must remain valid and readable
4. **Semantic first**: the element must express a teaching role (前置 / 自测 / 类比 / 分章), not a visual decoration

Document new elements in `docs/specs/` and link from the implementation impl-notes.

## Tests

We use vitest. Three layers:

- **Unit**: each module in `src/` has a test in `tests/<module>.test.ts`
- **Integration**: render fixtures (`tests/fixtures/*.md`) and assert on HTML structure
- **Smoke**: `pnpm test:smoke` (planned) runs `<NAME> render` on every spec in `docs/specs/`

Bar for new code: **add a test that would fail without your change**.

## Documentation

- Implementation notes → `docs/changes/<date>-<topic>-impl-notes.md`
- Specs / proposals → `docs/specs/<date>-<topic>-spec.md` (frontmatter must include `status:`)
- Reviews → `docs/reviews/<date>-<topic>-review.md`

Frontmatter conventions:

```yaml
status: draft | ready | implemented | archived
kind: spec | adr | review | change | research
owner: <name>
created: YYYY-MM-DD
updated: YYYY-MM-DD
implements: ["docs/specs/..."]
reviews: ["docs/reviews/..."]
```

## Releasing

(For maintainers — contributors don't need this section)

1. Bump version in `package.json`
2. Update `CHANGELOG.md` with grouped entries (features / fixes / breaking)
3. `pnpm build` to verify dist
4. `pnpm publish` (publishes to npm)
5. `git tag v<version> && git push --tags`
6. Create GitHub release with the changelog excerpt

## Code of conduct

This project follows the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). Be kind. Disagreements are technical, not personal.

## Reporting issues

- **Bugs**: use the bug issue template (`.github/ISSUE_TEMPLATE/bug.yml`)
- **Feature requests**: use the feature template (`.github/ISSUE_TEMPLATE/feature.yml`)
- **Security**: see [SECURITY.md](./SECURITY.md) — do **not** open a public issue

## Questions?

Open a [Discussion](https://github.com/<owner>/<NAME>/discussions) (preferred for design questions) or an issue.
