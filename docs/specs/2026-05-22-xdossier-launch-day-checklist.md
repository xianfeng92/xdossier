---
title: xdossier launch-day checklist
status: ready
kind: checklist
created: 2026-05-22
updated: 2026-05-22
---

# xdossier Launch-Day Checklist

## ✅ Pre-launch verification

- Thariq Shihipar's X handle verified as `@trq212`; launch thread credit updated from `@thariqs`.
- README first-screen metadata completed with CI, npm version, and Apache 2.0 badges under the live demo badge.
- GitHub Pages live demo check attempted twice with the requested `curl` loop; local shell networking is blocked by the configured `127.0.0.1:7891` proxy, so verify again from a normal networked shell before posting.
- `pnpm pack --pack-destination /tmp` produced `/tmp/xdossier-0.1.0.tgz`.
- Tarball size checked at 129K, under the 1 MB target.
- Tarball contents checked: includes `bin/`, `dist/`, `README.md`, `LICENSE`, and `package.json`; does not include `docs/specs/`, `.git`, `tests`, or `node_modules`.
- GitHub Release creation attempted with `gh release create v0.1.0`; local shell networking blocked the API request, so rerun from a normal networked shell.

Release command to rerun:

```bash
gh release create v0.1.0 \
  --title "v0.1.0 — Pedagogical HTML for AI specs" \
  --notes-file <(awk '
    /^## \[0\.1\.0\]/ { in_section=1 }
    in_section && /^## \[/ && !/^## \[0\.1\.0\]/ { exit }
    in_section { print }
  ' CHANGELOG.md)
```

## npm publish

Run manually after npm login and one final package check:

```bash
pnpm publish --access public
```

Do not run this from an automated agent session. Publishing `0.1.0` is the irreversible public package step.

## Demo GIF

1. Open QuickTime Player.
2. Start a new screen recording.
3. Open `https://xianfeng92.github.io/xdossier/demo/pedagogy.html`.
4. Switch the reader mode through all three states: 零基础 -> 系统化 -> 速查.
5. Stop recording and save as `demo.gif`.
6. Upload the asset to `.github/assets/demo.gif` in the GitHub repo.
7. Update `README.md` to reference `.github/assets/demo.gif` near the live demo section.

## Posting order

1. Hacker News: post the Show HN title and body first.
2. X / Twitter: post the thread after HN is live, so the thread can reference the HN discussion if useful.
3. Reddit: post to `r/LocalLLaMA` and `r/ChatGPTCoding` after the first two surfaces are visible.

## Recommended launch window

- US Eastern Tuesday through Thursday, 8-10am.
- Avoid Friday afternoons, weekends, and major AI launch/news windows if they are obvious on the day.

## Copy-paste sources

- HN title and body: `docs/specs/2026-05-22-xdossier-launch-content-draft.md`, section `1. Show HN`.
- X / Twitter thread: `docs/specs/2026-05-22-xdossier-launch-content-draft.md`, section `2. X / Twitter Thread`.
- Reddit `r/LocalLLaMA`: `docs/specs/2026-05-22-xdossier-launch-content-draft.md`, section `3. Reddit Posts`, subsection `r/LocalLLaMA`.
- Reddit `r/ChatGPTCoding`: `docs/specs/2026-05-22-xdossier-launch-content-draft.md`, section `3. Reddit Posts`, subsection `r/ChatGPTCoding`.

## Post-launch 24h watch

- HN: ranking movement, comments that reveal positioning confusion, requests for examples, and any bug reports about the live demo.
- GitHub: first-wave stars, issues, forks, and whether README/demo links are being clicked through.
- npm: package page visibility and install metadata after publish.
- Reddit/X: repeated objections, wording that resonates, and questions that should become README FAQ or issue labels.
