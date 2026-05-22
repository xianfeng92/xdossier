# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
