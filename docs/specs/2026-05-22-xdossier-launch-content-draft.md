---
title: xdossier launch content draft (v0.2.0)
status: ready
kind: launch-content
created: 2026-05-22
updated: 2026-05-22
---

# xdossier Launch Content Draft — v0.2.0 (Multi-doc Dossier View)

> v1 of this draft (for v0.1.0 launch) led with reader modes. v0.2.0 ships multi-doc dossier view, which is the bigger differentiator. This draft leads with that.

## Positioning recap

- **The job-to-be-done**: "I asked Claude / Codex / Cursor to design a feature. It wrote 8 markdown files. I want to understand what was decided, what was built, and what's still open — in 5 minutes, not 50."
- **The unique surface**: `xdossier cover <workspace>` auto-clusters those 8 files into a navigable HTML dossier with a relation graph, then back-links every member's rendered HTML to the cover.
- **The supporting feature (v0.1)**: each single document also renders in three reader profiles (零基础 / 系统化 / 速查).
- **What this is NOT**: a chat history viewer, an agent runtime, or a generic markdown→html tool.

## 1. Show HN

### Title (recommended)

```
Show HN: xdossier – Cluster AI-generated specs and changes into one HTML dossier
```

### Title (alternates)

```
Show HN: xdossier – Auto-build a relationship graph for AI-generated design docs
Show HN: I made AI's 8-file feature specs readable in 5 minutes (multi-doc HTML dossier)
```

### Body

I write a lot of features with Claude Code, Codex, and Cursor. One "design this feature" conversation often produces a vision spec, an MVP spec, several implementation notes, and one or two reviews — 6–12 markdown files, all related, none linking to each other. After a week, I can no longer remember which note implemented which decision.

xdossier is a tiny CLI that fixes the read-side of that workflow:

- `xdossier cover docs/` walks your `docs/specs/`, `docs/changes/`, `docs/reviews/` tree. It detects related-doc clusters from frontmatter (`implements:`, `reviews:`) and filename stems.
- For each cluster, it emits a single HTML dossier cover with an inline SVG graph (spec → impl notes → reviews), key decisions, open questions, and recommended reading paths.
- It also writes a project-level index linking every dossier.
- Every member's rendered HTML carries a `↩ in dossier: <title>` banner so you can navigate back from any leaf.
- A PostToolUse hook for Claude Code keeps it all in sync — edit a `.md`, the dossier refreshes itself.

Each single document also renders with three reader profiles (beginner / systematic / reference) — same HTML, different density. Click the toggle to switch; no re-render.

Tested on a real 41-document workspace: clustered into 6 topic dossiers + 12 orphans, no LLM in the loop, all heuristics from frontmatter and filename stems.

Live demo (v0.2.0): https://xianfeng92.github.io/xdossier/demo/dossier.html — the MVP-0 spec of xdossier itself, rendered as a self-documenting dossier (1 spec + 8 impl notes + 3 reviews, all in one HTML).

GitHub: https://github.com/xianfeng92/xdossier
Release notes: https://github.com/xianfeng92/xdossier/releases/tag/v0.2.0

Apache 2.0, Node ≥20, zero external dependencies in the rendered HTML, no SaaS.

Happy to take questions on the clustering algorithm (it's 100 lines, scored by signal — `src/cover/cluster.ts`).

### First comment (post immediately after the submission lands)

Some context that didn't fit the post:

**Why not let an LLM do the clustering?** I wanted the inverse: clustering deterministic, comprehensible, and 0-cost so the tool can run inside a PostToolUse hook on every save. The trade-off is the algorithm needs both a filename convention (`<date>-<topic>-{spec,impl-notes,review}.md`) and accurate frontmatter to do its best work — but it degrades gracefully (filename-stem matching alone catches most groups).

**Why HTML instead of a Markdown viewer with a sidebar?** Two reasons. (1) Spatial structure — relation graphs, expandable source bundles, fixed top banners — don't translate to a stream of markdown blocks. (2) Single-file output: I can email an HTML dossier to someone without a clone, an install, or a render context.

**Inspiration**: Thariq Shihipar's *Unreasonable Effectiveness of HTML* and nexu-io/html-anything. xdossier is the "archive-first, multi-doc" variant of those ideas.

## 2. X / Twitter Thread

Use 3 images:
- T1: dossier cover hero (`docs/assets/dossier-cover-hero.png`) — SVG graph + 8 members visible
- T3: project index hero (`docs/assets/project-index-hero.png`) — 6 dossiers + orphan table
- T5: reader-toggle hero (`docs/assets/reader-toggle-hero.png`) — 3 reader profiles

---

**T1 (hook)** [attach dossier-cover-hero.png]

I just open-sourced xdossier v0.2.0.

Your AI agent writes 8 markdown files for one feature. xdossier auto-clusters them into a navigable HTML dossier — relation graph, key decisions, open questions, all in one file.

🔗 https://github.com/xianfeng92/xdossier

---

**T2 (problem)**

You ask Claude / Codex / Cursor to design a feature.

It writes:
• 1 vision spec
• 1 MVP spec
• 6 implementation notes
• 2 reviews

Each is well-written. Together they're a maze. After a week nobody, including future-you, can mentally re-stitch them.

---

**T3 (the project index)** [attach project-index-hero.png]

`xdossier cover docs/` walks your folder. It detects related-doc clusters from `implements:` / `reviews:` frontmatter and filename stems.

This is a 41-document workspace → clustered into 6 topic dossiers + 12 orphans. 100% deterministic, no LLM.

---

**T4 (the dossier cover)**

Click into a dossier and you get:
↳ inline SVG relation graph (spec → impl notes → reviews)
↳ key decisions extracted from review files
↳ open questions still pending
↳ recommended reading paths by reader role
↳ links to every member's rendered HTML

---

**T5 (the reader profiles)** [attach reader-toggle-hero.png]

Bonus from v0.1: each rendered doc has three reader profiles. Same HTML. Toggle 零基础 / 系统化 / 速查 at the top. Prereq cards, glossary popovers, learning checkpoints appear or hide based on profile.

No re-render. No re-build. Just CSS.

---

**T6 (the bidirectional)**

Open any member document — its HTML carries a `↩ in dossier: <title>` banner at the top, with a back-link to the cover. The cover links forward to rendered HTML, not raw markdown.

Every leaf → the index. Every index → the leaf.

---

**T7 (the invisibility move)**

The Claude Code PostToolUse hook is the keystone. Edit a `.md`, the `.html` regenerates, the parent dossier cover refreshes. No command to remember.

Drop a 6-line shell script into `.claude/settings.json` and you never run `xdossier` directly again.

---

**T8 (CTA)**

Try the live demo (the MVP-0 dossier of xdossier itself, self-documenting):
🔗 https://xianfeng92.github.io/xdossier/demo/dossier.html

Star the repo if you'd use this:
🔗 https://github.com/xianfeng92/xdossier

Inspired by @trq212's *Unreasonable Effectiveness of HTML*. Apache 2.0.

## 3. Reddit Posts

### r/ClaudeAI (highest intent)

**Title**:
```
I built a tool that auto-clusters Claude-written specs/changes/reviews into one navigable HTML dossier — and Claude Code's hook keeps it refreshed
```

**Body**:

If you use Claude Code daily, you've probably accumulated dozens of files under `docs/specs/`, `docs/changes/`, `docs/reviews/`. The agent writes good stuff, but each file is an island. After a few weeks you can't find what was decided where, or which implementation note answered which open question.

I made [xdossier](https://github.com/xianfeng92/xdossier) — a CLI that walks your `docs/` tree and:

1. **Auto-clusters** related files into topic dossiers, using frontmatter (`implements:`, `reviews:`) and filename stems. No LLM, all heuristics.
2. **Renders each cluster** as one HTML dossier cover with an inline SVG relation graph, key decisions, open questions, and recommended reading paths.
3. **Renders each individual doc** with three reader profiles (beginner / systematic / reference) — same HTML, different density, runtime toggle.
4. **Auto-refreshes via PostToolUse hook** — drop the example `hooks/post-tool-use.sh` into your Claude Code settings, and every time Claude writes a `.md`, the parent dossier cover updates itself.

This is the "invisibility" part I'm proudest of. You stop thinking about the tool; it just keeps your `.dossier/out/` fresh.

**Live demo** (xdossier's own MVP-0 spec, dogfooded): https://xianfeng92.github.io/xdossier/demo/dossier.html

**GitHub**: https://github.com/xianfeng92/xdossier

Apache 2.0, Node 20+, zero dependencies in the output HTML (works offline).

Curious if anyone else uses Claude Code's PostToolUse hook for similar workflow automation — what other "agent writes → tool reacts" loops have you set up?

### r/LocalLLaMA

**Title**:
```
xdossier v0.2.0 — auto-cluster AI-written specs/changes/reviews into one HTML dossier with an inline SVG relation graph
```

**Body**:

I work with Claude Code, Codex, and Cursor for a lot of local-first project work. Whatever the model, the consistent failure mode is the same: the agent writes 6–12 markdown files for one feature, each one well-written in isolation, and after a week nobody (including me) can re-stitch them mentally.

I open-sourced [xdossier](https://github.com/xianfeng92/xdossier) to fix the read-side of this workflow.

The flagship feature in v0.2.0: `xdossier cover <workspace>` walks `docs/specs/`, `docs/changes/`, `docs/reviews/`, auto-clusters related files into topic dossiers using frontmatter (`implements:` / `reviews:`) and filename stems, and emits one HTML per cluster with:

- inline SVG relation graph (spec → impl notes → reviews, clickable)
- extracted key decisions and open questions
- a project-level index linking every dossier
- a back-link banner on every member's rendered HTML

Tested on a real 41-document workspace → 6 dossiers + 12 orphans, 100% deterministic. No LLM in the clustering loop.

Bonus from v0.1: each doc renders with 3 reader profiles (beginner / systematic / reference). Same HTML, different density, runtime CSS toggle.

**Demo** (self-documenting — the MVP-0 dossier of xdossier itself): https://xianfeng92.github.io/xdossier/demo/dossier.html

**Repo**: https://github.com/xianfeng92/xdossier

Apache 2.0, Node 20+, single-file HTML output works offline (no CDN, no JS deps in the output).

### r/programming (broad audience, more skeptical — keep claims tighter)

**Title**:
```
Show /r/programming: xdossier — turn related AI-generated specs into a navigable HTML dossier with a relation graph
```

**Body**:

I wrote a CLI that consumes the markdown specs / change notes / review docs that AI coding agents produce, clusters related ones into topic dossiers using frontmatter and filename heuristics, and emits one HTML per cluster.

Each dossier cover has:
- an inline SVG relation graph (spec → impl notes → reviews)
- extracted decisions and open questions
- a project-level index page
- back-links from each member's HTML to its cover

The clustering algorithm is ~100 lines, zero LLM, scored by signal (`+100` frontmatter, `+60` filename stem, `+5` shared subtree).

There's also a single-doc renderer with three reader profiles — beginner / systematic / reference — that toggle at runtime via CSS.

It's deliberately scoped to technical archive documents (specs, ADRs, design docs, change notes, reviews). Not a generic markdown→html tool, not a chat history viewer, not a wiki.

GitHub: https://github.com/xianfeng92/xdossier
Live demo: https://xianfeng92.github.io/xdossier/demo/dossier.html

Built on TS + Node 20+, Apache 2.0.

Would love feedback on the clustering heuristics specifically — `src/cover/cluster.ts` is small and the scoring rules are documented in the spec.

## 4. Posting strategy

### Order

1. **HN first** (Tue or Wed, 6:30–8:00 AM Pacific). HN ranks the first ~3 hours heavily.
2. **Twitter thread** ~30 min after HN submission. Include the HN link in T8 if it's gaining traction.
3. **r/ClaudeAI** ~2 hours after HN, when you can quote-link HN comments.
4. **r/LocalLLaMA** the same day, evening Pacific.
5. **r/programming** next day (don't double-up if HN/Twitter is still active — Reddit notices duplicate launches and downvotes).

### Don't do

- ❌ Post the same body across all platforms verbatim — reddit auto-modding flags it.
- ❌ Edit titles after posting.
- ❌ Reply defensively to skeptical comments. "Good point, here's where I'd push back: …" beats "actually you're missing the point."
- ❌ Cross-post to /r/SideProject, /r/coolgithubprojects on the same day — they're low signal and dilute attention.

### Best case / realistic / worst case

- **Best**: HN front page 4–8 hours → 200–400 stars in 48h → first 3 issues filed.
- **Realistic**: HN /new for 90 min → 30–60 stars → 1–2 thoughtful comments per platform.
- **Worst**: silence. No damage; v0.2.0 is shipped, evidence is in the repo, you can re-launch v0.3.0 with the same content reframed.

### After launch (24h watch)

- **HN**: rank, comments revealing positioning confusion, repeated objections — those become README FAQ.
- **GitHub**: where star spikes come from (Referer headers in traffic insights).
- **Twitter**: who quotes your thread — those are the people to DM for follow-up.
- **Issues**: triage on arrival; first 24h of issues set the tone for newcomers reading later.

## 5. Pre-launch checklist (delta from v0.1.0)

- [x] v0.2.0 tagged and pushed
- [x] GitHub release v0.2.0 published with full changelog
- [x] CI green on Node 20 + 22
- [x] Pages demo deployed, /demo/dossier.html accessible
- [x] README hero updated to dossier-cover-hero.png
- [x] CHANGELOG \[0.2.0\] published with 5 phases of MVP-1
- [ ] **Open**: npm publish (still `npm install -g github:...` only)
- [ ] **Open**: launch GIF or asciicast (issue #2 is the long-form version of this)

The first item gates broad reach; the second sweetens the README hero. Either is a follow-up, neither blocks launch.
