# `xdossier`

<p align="right">
  <strong>English</strong> · <a href="./README.zh-CN.md">简体中文</a>
</p>

> **Turn your AI's specs into HTML that beginners, peers, and experts can all read.**
>
> Tiered reading modes · Term popovers · Learning checkpoints · Multi-doc archives · Zero deps · Single-file HTML.

<p align="center">
  <a href="https://xianfeng92.github.io/xdossier/demo/pedagogy.html">
    <img src="https://img.shields.io/badge/Live%20Demo-Click%20to%20see%20reader%20toggle-1e3a8a?style=for-the-badge" alt="Live demo">
  </a>
</p>

<p align="center">
  <a href="https://github.com/xianfeng92/xdossier/actions/workflows/ci.yml">
    <img src="https://github.com/xianfeng92/xdossier/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/xdossier">
    <img src="https://img.shields.io/npm/v/xdossier.svg?color=1e3a8a" alt="npm version">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-1e3a8a" alt="Apache 2.0">
  </a>
</p>

🌐 **Try it now without installing**: [xianfeng92.github.io/xdossier](https://xianfeng92.github.io/xdossier/) — switch reader modes (beginner / systematic / reference) in the live HTML.

<p align="center">
  <a href="https://xianfeng92.github.io/xdossier/demo/pedagogy.html">
    <img src="docs/assets/reader-toggle-hero.png" alt="xdossier reader-mode toggle in a rendered HTML archive" width="720">
  </a>
  <br>
  <em>Same single-file HTML — three reader profiles. Click to try the live demo.</em>
</p>

<p align="center">
  <img src="docs/assets/dossier-cover-hero.png" alt="xdossier multi-doc dossier cover with relation graph and project index" width="720">
  <br>
  <em>Multi-doc view: an inline SVG relation graph plus a project-wide index linking every related spec, change, and review.</em>
</p>

## Why this exists

You and your AI agent generate dozens of markdown files: specs, ADRs, design docs, change notes. Each one is **800+ lines of dense text** that:

- Overwhelms a beginner who needs context
- Bores a senior who needs the decision summary
- Frustrates anyone trying to navigate relationships between docs

`xdossier` is a **pedagogical HTML archive** for AI-generated technical docs. Reader picks a mode; the same single-file HTML adapts.

> 💡 **Want to see the difference?** Open the [pedagogy demo](https://xianfeng92.github.io/xdossier/demo/pedagogy.html) in two tabs. Set one to *beginner* and the other to *reference*. Same HTML file; the spatial structure adapts.

## What you get

- **3-tier reader mode** (beginner / systematic / reference) — toggle in HTML, no rerender, no rebuild. Term popovers, prerequisite cards, learning checkpoints, analogies — all appear/hide based on reader profile.
- **Auto content-mode detection** — tutorial / concept / reference / course (heuristic, 0 token).
- **Single-file HTML** — share by double-click; works offline; no CDN.
- **Multi-doc dossier view** — clusters related specs/changes/reviews by `implements:` / `reviews:` frontmatter or filename stem; emits a per-dossier cover with an inline SVG relation graph plus a project-wide index. Each member's rendered HTML carries a back-link to its dossier.
- **Spec semantic blocks** — risk register, decision grid, principle grid, scope boundary, concept glossary, structure map — auto-rendered from markdown without authoring HTML.
- **Inline SVG diagrams** — ASCII layered-box art → real SVG with arrows.
- **Pull quotes, section covers, comparison cards** — visual rhythm so 1000-line specs don't read as a wall.

## Quickstart

```bash
# From npm (recommended):
npm install -g xdossier
xdossier render docs/specs/my-spec.md

# Or build a dossier cover linking all related specs, changes, and reviews:
xdossier cover docs/

# Or clone locally:
git clone https://github.com/xianfeng92/xdossier.git
cd xdossier
pnpm install
pnpm dev render docs/specs/my-spec.md
```

Open the generated `.html` in any browser. Click the reader-mode toggle at the top to switch tiers.

`xdossier cover docs/` opens a project index at `docs/.dossier/out/index.html` and a per-dossier cover at `docs/.dossier/out/<dossier-id>/index.html`.

## Auto-render in Claude Code

1. Install `xdossier` globally:

```bash
npm install -g xdossier
# or, from a local checkout:
pnpm link
```

2. Add a PostToolUse hook to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "/Users/<you>/path/to/xdossier/hooks/post-tool-use.sh \"${tool.fileEdit.file_path}\"" }]
    }]
  }
}
```

`# verify settings.json keys with your Claude Code version`

3. After this, any time Claude Code writes `docs/specs|changes|reviews/*.md`, the corresponding `.html` regenerates and the parent dossier cover refreshes. No command to remember.

## Built on

- [thariqs/html-effectiveness](https://thariqs.github.io/html-effectiveness/) — the philosophy that HTML > Markdown for AI output.
- [nexu-io/html-anything](https://github.com/nexu-io/html-anything) — SKILL.md protocol pioneer.

`xdossier` extends both: artifact-first (not on-demand), pedagogy-first (not just visual), multi-document (not single-file).

## How does it compare?

| | `xdossier` | html-anything | markdown-viewer/skills | Marky / MacMD |
|---|---|---|---|---|
| Tiered reader modes | ✅ | ❌ | ❌ | ❌ |
| Term popovers / glossary | ✅ | ❌ | ❌ | ❌ |
| Multi-doc relationship graph | ✅ | ❌ | ❌ | ❌ |
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
1. **Discover** — read frontmatter, classify content-mode, extract section structure.
2. **Enrich** — generate teaching annotations (prereq / checkpoint / analogy) via scaffold (0 token) or codex/claude provider.
3. **Render** — single-file HTML with reader-toggle, inlined CSS + JS, no external resources.

## Use cases

- AI-written spec → designed HTML for your team.
- Design doc archive an intern can read on Monday and a principal can speed-read on Tuesday.
- Multi-version résumé archive: 5 versions + change annotations, tiered by reader profile for different recruiters.
- Open-source project docs that don't require markdown viewer plugins.

## Status

| Component | Status |
|---|---|
| Single-doc rendering (MVP-0) | ✅ Implemented |
| Pedagogy layer (P0/P1/P2) | ✅ Implemented |
| Multi-doc dossier view (MVP-1) | ✅ Implemented |
| MCP server (MVP-2) | 📝 Spec'd |
| Claude Code session adapter | 📝 Spec'd |

## Contributing

We welcome new skills, new pedagogy elements, and new render targets. See [CONTRIBUTING.md](./CONTRIBUTING.md).

Looking for a first contribution? Try the open [`good first issue`](https://github.com/xianfeng92/xdossier/issues?q=is%3Aopen+label%3A%22good+first+issue%22) tickets.

## License

Apache-2.0 — see [LICENSE](./LICENSE).

## Inspiration

[Thariq Shihipar](https://thariqs.github.io/html-effectiveness/) argued in May 2026 that the Claude Code team had stopped writing internal docs in Markdown and switched to HTML. Anthropic's reasoning: HTML carries spatial structure (sidebars, collapsibles, anchored navigation) that Markdown can't. `xdossier` takes the next step: **make that HTML pedagogical**, so the same document teaches a junior and briefs a senior.
