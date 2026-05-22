---
title: xdossier launch-day checklist (v0.2.0)
status: ready
kind: checklist
created: 2026-05-22
updated: 2026-05-22
---

# xdossier Launch-Day Checklist — v0.2.0

> Updated for v0.2.0 (multi-doc dossier view) launch. v0.1.0-era checklist items completed during the original release are kept here for traceability.

## ✅ Already done (v0.2.0 ship state)

| Item | Status | Evidence |
|---|---|---|
| v0.2.0 git tag pushed | ✅ | `v0.2.0` on origin |
| GitHub Release notes | ✅ | https://github.com/xianfeng92/xdossier/releases/tag/v0.2.0 |
| CHANGELOG `[0.2.0]` section | ✅ | CHANGELOG.md |
| CI green on Node 20 + 22 | ✅ | last run on commit `c55d8f3` |
| Pages demo `/demo/dossier.html` deployed | ✅ | self-documenting MVP-0 dossier, 1.1 MB raw, ~216 KB gzipped |
| Pages landing has 4 demo cards | ✅ | MVP-0 Dossier card prepended with "★ NEW — multi-doc view (v0.2.0)" |
| README hero (`docs/assets/dossier-cover-hero.png`) | ✅ | full-width SVG relation graph |
| README + README.zh-CN status row → "✅ Implemented" | ✅ | |
| Quickstart includes `pnpm dev cover docs/` | ✅ | both READMEs |
| 3 `good first issue` tickets filed | ✅ | issues #1 (closed), #2, #3 |
| Discussions enabled | ✅ | repo settings |
| Homepage URL set | ✅ | https://xianfeng92.github.io/xdossier/ |

## ✅ Done since v0.2.0 ship state

- **npm publish** — `xdossier@0.2.0` is live: https://www.npmjs.com/package/xdossier. Install command shrunk to `npm install -g xdossier` across README, README.zh-CN, and the Pages landing.
  - Token note: first publish used a Granular Token with **Bypass two-factor authentication** + **All packages** scope. For long-term automation, regenerate as a Granular Token scoped to `xdossier` only (bypass-2FA still on); delete the all-packages token after.

## ⏳ Open before launch

- [ ] **launch screencast** (issue #2) — optional but lifts the README. Asciinema preferred (smallest, embeddable). Record:
  1. `xdossier render docs/specs/foo.md` → open the HTML, toggle 零基础 → 速查.
  2. `xdossier cover docs/` → open project index, click into a dossier, point at SVG, click into a member.
  3. Edit a `.md`, save → highlight that the dossier auto-refreshes (PostToolUse hook).
  ~90 seconds. Upload to asciinema.org, embed in README.

Neither blocks the show-and-tell. Both are nice-to-have.

## Posting order

1. **HN first** — Tue or Wed, 6:30–8:00 AM Pacific (= 21:30–23:00 Beijing).
2. **Twitter thread** ~30 min after HN. Include HN link in T8 if HN is gaining traction.
3. **r/ClaudeAI** ~2 hours after HN.
4. **r/LocalLLaMA** same day evening Pacific.
5. **r/programming** next day if HN/Twitter aren't still active.

Copy-paste sources are in `docs/specs/2026-05-22-xdossier-launch-content-draft.md`:
- HN title + body: §1
- Twitter thread (8 tweets, 3 images): §2
- Reddit posts (3 subreddits, distinct bodies): §3
- Strategy + don't-do list: §4

## Post-launch 24h watch

- **HN**: rank, comments revealing positioning confusion, repeated objections → README FAQ.
- **GitHub Traffic Insights**: referrers (HN, Twitter, Reddit, …) → know which platform paid off.
- **Twitter quote-tweets**: who quotes the thread → people to DM.
- **Issues**: triage on arrival; first 24h shape the impression for everyone reading later.
- **PostToolUse hook bug reports**: this is the area most likely to surface install/path issues; have the README `# verify settings.json keys with your Claude Code version` line ready to point at.

## Recommended launch window (2026-05-23 ~ 2026-05-29)

- **Best**: Tue 2026-05-26 or Wed 2026-05-27 morning Pacific (=  evening Beijing).
- **Avoid**: Friday afternoon / weekend / any major AI launch announcement window.

## Best / Realistic / Worst case

- **Best**: HN front page 4–8h → 200–400 stars in 48h → first 3 issues filed.
- **Realistic**: HN `/new` for 90 min → 30–60 stars → 1–2 thoughtful comments per platform.
- **Worst**: silence. No damage; v0.2.0 evidence is on-record. Re-launch v0.3.0 (npm published + screencast) later with same content reframed.

## Tooling used during draft

Copy is in `docs/specs/2026-05-22-xdossier-launch-content-draft.md`. Hero images already in `docs/assets/`. Demo URL verified to load 9 SVG nodes / 9 edges / 9 inlined members.

## Historical (v0.1.0 launch artifacts — kept for traceability)

- Thariq Shihipar's X handle: `@trq212` (verified during v0.1.0 drafting).
- v0.1.0 tarball at 129 KB, well under 1 MB target.
- v0.1.0 release published 2026-05-21 14:44 UTC.
- v0.1.0 launch posts never actually went out — drafted in `docs/specs/2026-05-22-xdossier-launch-content-draft.md` v1 but held for v0.2.0 to land the unique differentiator first.

## Decision log

- **Why v0.2.0 over v0.1.0 for first public launch?** Multi-doc dossier view is the actually-unique surface. v0.1.0 (reader-mode HTML) is a useful-but-commodity offering; HN would have asked "yet another markdown→HTML?" Launching with v0.2.0 means the front-page submission has a defensible answer.
- **Why include a self-documenting demo?** Demoing xdossier on xdossier's own MVP-0 spec gives readers a recursive "aha" moment: the tool's own design process is the demo. Lower friction than mocking up synthetic content.
- **Why not run a Product Hunt launch on the same day?** PH and HN cannibalize attention and dilute referrer signal. Stagger: HN/Twitter/Reddit week 1; Product Hunt week 2-3 once HN comments seed FAQ content.
