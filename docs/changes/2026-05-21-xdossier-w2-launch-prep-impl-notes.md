---
title: xdossier W2 Launch Prep Impl Notes
status: implemented
created: 2026-05-21
updated: 2026-05-21
implements: ["README.md", "CHANGELOG.md", "docs/specs/2026-05-22-xdossier-launch-content-draft.md"]
---

# xdossier W2 Launch Prep Impl Notes

## README live demo wiring

- Replaced the first GIF placeholder with a centered live-demo badge linking to `https://xianfeng92.github.io/xdossier/demo/pedagogy.html`.
- Added the zero-install Pages link to `https://xianfeng92.github.io/xdossier/`, with explicit reader-mode copy for 零基础 / 系统化 / 速查.
- Replaced the side-by-side screenshot placeholder with a two-tab pedagogy demo instruction.
- Removed the roadmap GIF placeholder entirely; the existing roadmap table now carries that section.

## CHANGELOG first version

- Added `CHANGELOG.md` using Keep a Changelog 1.1 structure.
- Left `## [Unreleased]` empty for future accumulation.
- Added `## [0.1.0] - 2026-05-21` as the first public release.
- `Added` records the release surface: pedagogy layer, `reader_profile`, prereq/checkpoint/analogy/glossary popover, `content_mode`, four visual reinforcements, single-file HTML output, Claude Code hook support, `/dossier` slash command, global symlink flow, and 150 tests.
- `Changed` focuses on launch positioning: pedagogy-first README/demo surface, live demo as zero-install evaluation path, and MVP-1 dossier view kept as roadmap.
- `Removed` records the important simplifications: no remote runtime resource requirements and no need to hand-author HTML for supported spec visuals.

## GitHub topics and homepage

Intended command:

```bash
gh repo edit xianfeng92/xdossier \
  --homepage https://xianfeng92.github.io/xdossier/ \
  --add-topic ai \
  --add-topic agent \
  --add-topic markdown \
  --add-topic html \
  --add-topic documentation \
  --add-topic claude-code \
  --add-topic codex \
  --add-topic cursor \
  --add-topic spec \
  --add-topic pedagogical \
  --add-topic single-file-html
```

Result in this Codex sandbox:

```text
Get "https://api.github.com/repos/xianfeng92/xdossier/topics": proxyconnect tcp: dial tcp 127.0.0.1:7891: connect: operation not permitted
```

Retried without proxy environment:

```text
error connecting to api.github.com
check your internet connection or https://githubstatus.com
```

Tried GitHub connector `_get_repo` as a fallback, but connector startup also failed:

```text
MCP startup failed: ... error sending request for url (https://chatgpt.com/backend-api/wham/apps)
```

Because the environment blocked external GitHub writes, topics/homepage are not verified as updated in this run. The command above is the exact handoff command to run in a normal authenticated shell.

## Launch content draft choices

- Wrote `docs/specs/2026-05-22-xdossier-launch-content-draft.md` with `status: draft` and `kind: launch-content`.
- Show HN copy stays specific and modest: the pain is agent-written specs becoming long Markdown, and the solution is reader-mode single-file HTML.
- X thread is six tweets, all under 280 characters in the local character-count check; it includes GitHub, the pedagogy demo URL, reader toggle instructions, teaching elements, Markdown-viewer contrast, build notes, and thanks to @thariqs plus nexu-io/html-anything.
- Reddit drafts split by audience:
  - `r/LocalLLaMA`: agent collaboration artifact readability, with Claude Code / Codex / Cursor workflow and three concrete use cases.
  - `r/ChatGPTCoding`: more conversational framing around finishing a spec and not wanting to read 1000 lines of Markdown.

## Sanity verification

- `pnpm typecheck && pnpm test`: passed; 4 test files, 150 tests passed.
- `xdossier render README.md -o /tmp/readme-preview.html`: passed; wrote `/tmp/readme-preview.html` at 81,590 bytes.
- README placeholder scan for the three requested TODO strings: no matches.
- Current git surface after this task:
  - modified: `README.md`
  - added: `CHANGELOG.md`
  - added: `docs/specs/2026-05-22-xdossier-launch-content-draft.md`
  - added: `docs/changes/2026-05-21-xdossier-w2-launch-prep-impl-notes.md`
