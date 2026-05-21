---
title: xdossier launch content draft
status: draft
kind: launch-content
created: 2026-05-22
updated: 2026-05-22
---

# xdossier Launch Content Draft

## 1. Show HN

### Title

Strongest:

Show HN: xdossier - tiered HTML archives for AI-written specs

Alternatives:

Show HN: xdossier, a reader-mode HTML renderer for long AI specs

Show HN: Turn AI-written specs into beginner/expert HTML dossiers

### Body

I write a lot of specs with Claude Code, Codex, and Cursor. The output is useful, but it often becomes 800-1500 lines of Markdown that only the person who wrote it can tolerate.

xdossier turns those AI-written specs into single-file HTML with reader modes: beginner, systematic, and expert.

The same document can show prerequisites, checkpoints, analogies, and glossary popovers for a beginner, then collapse into a denser reference view for someone who just needs decisions.

It also recognizes common spec structures like decision grids, scope boundaries, comparison cards, inline diagrams, and section covers.

GitHub: https://github.com/xianfeng92/xdossier

Live demo: https://xianfeng92.github.io/xdossier/demo/pedagogy.html

The first version is intentionally narrow: technical docs and AI-agent work artifacts, not a universal website builder.

## 2. X / Twitter Thread

1. I open-sourced xdossier: a tiny CLI that turns AI-written specs into single-file HTML with reader modes for beginners, peers, and experts.

GitHub: https://github.com/xianfeng92/xdossier

2. The best demo is the reader toggle.

Open https://xianfeng92.github.io/xdossier/demo/pedagogy.html and click the mode buttons: 零基础 / 系统化 / 速查.

Same HTML file. Different reading density.

3. The pedagogy layer adds the bits Markdown usually loses:

- prereq cards
- checkpoints
- analogies
- glossary popovers

So a dense AI-written spec can teach context without slowing down someone who only wants the decision.

4. This is not a Markdown viewer with nicer CSS.

xdossier treats the spec as a structured artifact: section covers, decision grids, scope boundaries, comparison cards, inline diagrams, and a TOC designed for scanning.

5. Under the hood: AI writes normal Markdown; xdossier classifies the content mode, enriches optional teaching annotations, then renders a designed single-file HTML page.

The input stays reviewable in git. The output becomes readable in a browser.

6. Thanks to @thariqs for the HTML > Markdown argument, and to nexu-io/html-anything for proving agent-written HTML can be a real workflow.

xdossier takes that idea toward technical specs and pedagogical archives.

## 3. Reddit Posts

### r/LocalLLaMA

Title:

I made a tool that turns AI-written specs into HTML beginners and experts can both read

Body:

I use Claude Code, Codex, and Cursor for a lot of local-first project work. The funny failure mode is that the agents often produce useful specs, ADRs, and change notes, but the final artifact is still a giant Markdown file.

That works for the agent. It is not always great for humans.

I made `xdossier`, a small CLI that renders those specs into single-file HTML with reader modes: beginner, systematic, and expert.

Beginner mode can show prerequisites, checkpoints, analogies, and glossary popovers. Expert mode collapses the teaching layer and makes the same document feel more like a reference.

Three concrete use cases:

- Turning a Claude Code implementation spec into a shareable HTML brief for a teammate.
- Keeping a local archive of agent-written design docs without needing a doc platform.
- Publishing an OSS launch or research note as one offline-friendly HTML file.

It is not a model, agent runtime, or hosted service. It is a render layer for the artifacts that agent workflows already create.

GitHub: https://github.com/xianfeng92/xdossier

Live demo: https://xianfeng92.github.io/xdossier/demo/pedagogy.html

### r/ChatGPTCoding

Title:

I got tired of reading 1000-line AI specs, so I made them into reader-mode HTML

Body:

When Claude Code or Codex helps me finish a feature, I often end up with a solid spec or implementation note that is also painfully long.

Markdown is fine as the source format, but it is not always the best reading format.

So I made `xdossier`: a CLI that turns AI-written Markdown specs into single-file HTML with reader modes.

The same file can show beginner context, checkpoints, analogies, and glossary popovers, then collapse into a denser expert view.

The goal is simple: keep the Markdown in git, but make the thing humans read feel designed.

GitHub: https://github.com/xianfeng92/xdossier

Demo: https://xianfeng92.github.io/xdossier/demo/pedagogy.html
