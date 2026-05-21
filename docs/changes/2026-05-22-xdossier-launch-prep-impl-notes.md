---
title: xdossier launch prep implementation notes
status: implemented
kind: impl-notes
created: 2026-05-22
updated: 2026-05-22
---

# xdossier Launch Prep Implementation Notes

## Thariq handle verification

- Result: Thariq Shihipar's X handle is `@trq212`, not `@thariqs`.
- Evidence: GitHub profile `https://github.com/ThariqS` lists `X @trq212`; third-party profile mirrors for Thariq also resolve to `@trq212`.
- Updated `docs/specs/2026-05-22-xdossier-launch-content-draft.md` thread item 6 from `@thariqs` to `@trq212`.

## Live demo URL verification

Requested URLs:

- `https://xianfeng92.github.io/xdossier/`
- `https://xianfeng92.github.io/xdossier/demo/pedagogy.html`
- `https://xianfeng92.github.io/xdossier/demo/vision.html`
- `https://xianfeng92.github.io/xdossier/demo/research.html`

Status:

- Ran the requested `curl` loop once; all four returned `000`.
- Waited 30 seconds and ran the requested loop again; all four still returned `000`.
- Failure reason in this shell: `curl` tried to use `HTTP_PROXY` / `HTTPS_PROXY` at `127.0.0.1:7891`, and connecting to that local proxy is not permitted in the sandbox.
- Fallback attempt with proxy env vars unset also returned `000` because DNS resolution is unavailable in this shell.
- Conclusion: not verified as HTTP 200 from this sandbox. Re-run the same URL loop from a normal networked shell before posting.

## README badge placement

- Added the CI, npm version, and Apache 2.0 badge row immediately after the existing live demo badge row.
- Reason: this keeps launch trust metadata in the first screen without moving the live demo CTA down into the body.
- Note: the npm version badge can show not found until `xdossier@0.1.0` is published.

## GitHub release

- Attempted the provided command template first, but its `awk` range extracts an empty notes file in this CHANGELOG because the start and end regex both match `## [0.1.0]`.
- Attempted the corrected release command below so release notes come from the full `[0.1.0]` section:

```bash
gh release create v0.1.0 \
  --title "v0.1.0 — Pedagogical HTML for AI specs" \
  --notes-file <(awk '
    /^## \[0\.1\.0\]/ { in_section=1 }
    in_section && /^## \[/ && !/^## \[0\.1\.0\]/ { exit }
    in_section { print }
  ' CHANGELOG.md)
```

- Result: failed before creating the release.
- Error: `proxyconnect tcp: dial tcp 127.0.0.1:7891: connect: operation not permitted`.
- Action needed: re-run the command above from a normal networked shell.

## npm pack verification

- Ran `pnpm pack --pack-destination /tmp`.
- Artifact: `/tmp/xdossier-0.1.0.tgz`.
- Size: 129K, under the 1 MB target.
- Included expected release files: `bin/xdossier.js`, `dist/**/*.js`, `dist/**/*.js.map`, `dist/skills/render-spec/*`, `README.md`, `LICENSE`, and `package.json`.
- Checked for forbidden/unwanted paths: no `docs/specs/`, `.git`, `tests`, or `node_modules` entries were present.
- No package `files` field changes were needed.

## Launch-day checklist design

- Added `docs/specs/2026-05-22-xdossier-launch-day-checklist.md` with `status: ready` and `kind: checklist`.
- The checklist separates automated/agent-verified items from manual launch actions: npm publish, demo GIF capture/upload, HN/X/Reddit posting, timing, copy-paste sources, and 24h post-launch monitoring.
- It explicitly keeps `pnpm publish --access public` as a user-run command because npm publish requires account state and is not safely reversible.
