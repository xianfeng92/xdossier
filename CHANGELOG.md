# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.5] - 2026-05-22

### Fixed

- **Text contrast meets WCAG AA [P0]**: Updated `--ink-faint` and `--ink-muted` tokens (and their cover equivalents) to darker values (#76766f, #4b4b45) to ensure a 4.5:1 contrast ratio against the paper background.
- **Mobile decorative left margins dropped [P0]**: Removed the 72px decorative left margins on mobile viewports (<1024px) for various section-level elements (checkpoints, summaries, traces), reclaiming ~22% of viewport width.
- **Tooltip clipping on narrow screens [P1]**: Term tooltips now horizontally center themselves and clamp to the viewport width, with a fixed fallback for very small screens, preventing off-screen clipping.

### Changed

- **Reader toggle becomes native segmented control [P1]**: Redesigned the reader level toggle as a unified pill-shaped control with an active floating state, improving visual hierarchy.
- **Calm tables [P1]**: Simplified table aesthetics by removing vertical borders and header fills, increasing cell padding to 14px 20px, and removing background noise from inline code within cells.
- **Dossier IA: Artifact Map closer to Relation Graph [P1]**: Rearranged the dossier cover layout to place the artifact map immediately after the relation graph, and refactored the judgment stack into a 2-column grid for better scanning.

## [0.2.4] - 2026-05-22

### Fixed

- **dossier.html mobile iframe scroll-trap [P0]**: On screens smaller than 768px, the rendered document iframes in the multi-file dossier view are now hidden to prevent scrolling traps. A hint is shown suggesting the use of a desktop browser or clicking the source links.
- **research.html table overflow on mobile [P0]**: Tables in all rendered documents (via `render-spec`) now support horizontal scrolling on small screens instead of breaking the layout.

### Changed

- **Relation graph title wrapping [P1]**: SVG nodes now support titles up to 32 characters by wrapping into two lines. Node height now dynamically adjusts (60px for short titles, 80px for wrapped ones), and the vertical gap between layers is increased to 100px.
- **Landing page reader-mode explanation [P1]**: Expanded the "3-tier reader mode" bullet points on both Chinese and English landing pages to mention specific pedagogical elements (popovers, cards, checkpoints, analogies).
- **Landing page layout improvements [P2]**: Language switcher moved inside the main 880px container in both landing pages.
- **Landing page styling [nit]**: Increased padding for list items in the "Why" sections from 14px to 24px to match the hero section's airy spacing.

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
