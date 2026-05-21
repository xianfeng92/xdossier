# `xdossier`

> **Turn your AI's specs into HTML that beginners, peers, and experts can all read.**
>
> Tiered reading modes · Term popovers · Learning checkpoints · Multi-doc archives · Zero deps · Single-file HTML.

[TODO: 30s GIF showing reader-toggle切换 beginner → intermediate → expert]

## Why this exists

You and your AI agent generate dozens of markdown files: specs, ADRs, design docs, change notes. Each one is **800+ lines of dense text** that:

- Overwhelms a beginner who needs context
- Bores a senior who needs the decision summary
- Frustrates anyone trying to navigate relationships between docs

`xdossier` is a **pedagogical HTML archive** for AI-generated technical docs. Reader picks a mode; the same single-file HTML adapts.

[TODO: side-by-side screenshot: same spec in beginner mode vs expert mode]

## What you get

- **3-tier reader mode** (零基础 / 系统化 / 速查) — toggle in HTML, no rerender, no rebuild. Term popovers, prerequisite cards, learning checkpoints, analogies — all appear/hide based on reader profile
- **Auto content-mode detection** — tutorial / concept / reference / course (heuristic, 0 token)
- **Single-file HTML** — share by double-click; works offline; no CDN
- **Spec semantic blocks** — risk register, decision grid, principle grid, scope boundary, concept glossary, structure map — auto-rendered from markdown without authoring HTML
- **Inline SVG diagrams** — ASCII layered-box art → real SVG with arrows
- **Pull quotes, section covers, comparison cards** — visual rhythm so 1000-line specs don't read as a wall

🛠 **Coming (MVP-1)**: Multi-document **dossier view** — automatically link related specs (`implements:` / `reviews:` frontmatter), render a relationship graph as a navigable archive cover

## Quickstart

```bash
# Zero install:
npx xdossier@latest render docs/specs/my-spec.md

# Or globally:
npm i -g xdossier
xdossier render docs/specs/my-spec.md
```

Open the generated `.html` in any browser. Click the reader-mode toggle at the top to switch tiers.

## Built on

- [thariqs/html-effectiveness](https://thariqs.github.io/html-effectiveness/) — the philosophy that HTML > Markdown for AI output
- [nexu-io/html-anything](https://github.com/nexu-io/html-anything) — SKILL.md protocol pioneer

`xdossier` extends both: artifact-first (not on-demand), pedagogy-first (not just visual), multi-document (not single-file).

## How does it compare?

| | `xdossier` | html-anything | markdown-viewer/skills | Marky / MacMD |
|---|---|---|---|---|
| Tiered reader modes | ✅ | ❌ | ❌ | ❌ |
| Term popovers / glossary | ✅ | ❌ | ❌ | ❌ |
| Multi-doc relationship graph | ⏳ MVP-1 | ❌ | ❌ | ❌ |
| Single-file offline HTML | ✅ | ✅ | partial | partial |
| Spec/ADR semantic blocks | ✅ | ❌ | partial | ❌ |
| Visual surfaces (deck/social/poster) | ❌ | ✅ | partial | ❌ |
| Live markdown preview | ❌ | ❌ | ❌ | ✅ |

We're not trying to be the universal AI-HTML generator. We do **one thing well**: technical-doc archives that real humans (not just senior engineers) can read.

## How it works

```
markdown.md  →  enrich (heuristic + optional LLM)  →  render-spec skill  →  single-file HTML
       (your AI writes)        (annotations.json)         (template + CSS)        (share / commit)
```

Three layers:
1. **Discover** — read frontmatter, classify content-mode, extract section structure
2. **Enrich** — generate teaching annotations (prereq / checkpoint / analogy) via scaffold (0 token) or codex/claude provider
3. **Render** — single-file HTML with reader-toggle, inlined CSS + JS, no external resources

## Use cases

- AI-written spec → designed HTML for your team
- Design doc archive that an intern can read on Monday and a principal can speed-read on Tuesday
- DecisionF-style 简历版本档案：5 版简历 + 改动注释，按读者档位呈现给不同 HR
- Open-source project docs that don't require markdown viewer plugins

## Status

| Component | Status |
|---|---|
| Single-doc rendering (MVP-0) | ✅ Implemented |
| Pedagogy layer (P0/P1/P2) | ✅ Implemented |
| Multi-doc dossier view (MVP-1) | ⏳ In design |
| MCP server (MVP-2) | 📝 Spec'd |
| Claude Code session adapter | 📝 Spec'd |

[TODO: Roadmap GIF or board screenshot]

## Contributing

We welcome new skills, new pedagogy elements, and new render targets. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Apache-2.0 — see [LICENSE](./LICENSE)

## Inspiration

[Thariq Shihipar](https://thariqs.github.io/html-effectiveness/) argued in May 2026 that the Claude Code team had stopped writing internal docs in Markdown and switched to HTML. Anthropic's reasoning: HTML carries spatial structure (sidebars, collapsibles, anchored navigation) that Markdown can't. `xdossier` takes the next step: **make that HTML pedagogical**, so the same document teaches a junior and briefs a senior.
