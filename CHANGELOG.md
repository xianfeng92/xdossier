# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2026-05-22

### Changed

- README default language is now Chinese (`README.md` is the Chinese version; English version moved to `README.en.md`). Both versions ship in the npm tarball. Switch between them via the language link at the top of either file.
- GitHub Pages landing (`/`) defaults to Chinese; English version available at `/index.en.html`. Switch via the link at the top of either page.
- `README.zh-CN.md` removed (the Chinese is now the default `README.md`).

## [0.2.2] - 2026-05-22

### Fixed

- Small dossier relation graphs now stretch into a readable 500-800px viewBox, with a single-root caption for dossiers that have not grown edges yet.
- Cover pages suppress the duplicate textual edge-list when the SVG relation graph renders, while keeping it as the degraded-graph fallback.
- `xdossier cover` now exits 64 with a first-run setup hint when no expected docs directories exist, and renders an empty-state index when they exist but contain no markdown.
- `xdossier render --verbose` now warns when automatic cover refresh fails; default non-verbose behavior remains silent.

## [0.2.1] - 2026-05-22

### Fixed

- `xdossier --version` and `xdossier --help` reported a stale `0.1.0` even though the published package was `0.2.0`. Version is now read from `package.json` at runtime so the CLI string can never drift from the npm-published version again.

### Added

- README + README.zh-CN: a short FAQ section pre-empting the three most common HN-style objections (vs. markdown viewer, why no LLM clustering, why HTML over wiki/Notion/Obsidian).

## [0.2.0] - 2026-05-22

### Added

- **First npm release**: `npm install -g xdossier` now works. Published as `xdossier@0.2.0` on the npm registry.
- **Multi-doc dossier view (MVP-1)**: `xdossier cover <workspace>` clusters related specs, changes, and reviews into topic-rooted dossiers, emits a per-dossier HTML cover with an inline SVG relation graph, and writes a workspace-level project index.
- Per-dossier covers link to each member's rendered HTML (sibling `.html` preferred over `.md`).
- Member HTML now carries a `↩ in dossier: <title>` banner pointing back to its cover, driven by `.dossier/out/membership.json`.
- `--only-dossier-containing <path>` flag for incremental cover rebuilds.
- `xdossier render` auto-refreshes the parent dossier cover when membership data is available (opt out with `--no-cover-refresh`).
- Example Claude Code PostToolUse hook at `hooks/post-tool-use.sh` and a new "Auto-render in Claude Code" section in the README.

### Changed

- `xdossier build` is now an alias for the recommended `xdossier cover`; both produce identical output.
- The relation graph is rendered as a full-width SVG section (was squeezed inside the artifact-map column).

## [0.1.0] - 2026-05-21

### Added

- Initial public release of `xdossier`.
- Pedagogy layer with three `reader_profile` modes: beginner / intermediate / expert, shown in the UI as 零基础 / 系统化 / 速查.
- Teaching annotations for prerequisites, learning checkpoints, analogies, and glossary popovers.
- `content_mode` auto-classification for tutorial, concept, reference, and course-style documents.
- Four visual reinforcements for long specs: section covers, pull quotes, inline SVG diagrams, and comparison cards.
- Single-file HTML output with inlined CSS and JavaScript for offline sharing.
- Claude Code hook support for automatic render workflows.
- `/xdossier` slash command entry for agent-side rendering.
- Global `xdossier` CLI symlink flow.
- Test coverage for the release surface: 150 tests.

### Changed

- Positioned the README and demo surface around pedagogical HTML archives rather than generic Markdown-to-HTML conversion.
- Promoted the live GitHub Pages demo as the default zero-install evaluation path.
- Kept multi-document dossier view as the visible MVP-1 roadmap while shipping the single-document pedagogy layer first.

### Removed

- Removed remote runtime resource requirements from generated HTML; the renderer emits self-contained files.
- Removed the need to author custom HTML for the supported spec visuals; semantic Markdown/frontmatter remains the input path.
