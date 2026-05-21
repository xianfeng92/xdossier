# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-21

### Added

- Initial public release of `xdossier`.
- Pedagogy layer with three `reader_profile` modes: beginner / intermediate / expert, shown in the UI as 零基础 / 系统化 / 速查.
- Teaching annotations for prerequisites, learning checkpoints, analogies, and glossary popovers.
- `content_mode` auto-classification for tutorial, concept, reference, and course-style documents.
- Four visual reinforcements for long specs: section covers, pull quotes, inline SVG diagrams, and comparison cards.
- Single-file HTML output with inlined CSS and JavaScript for offline sharing.
- Claude Code hook support for automatic render workflows.
- `/dossier` slash command entry for agent-side rendering.
- Global `xdossier` CLI symlink flow.
- Test coverage for the release surface: 150 tests.

### Changed

- Positioned the README and demo surface around pedagogical HTML archives rather than generic Markdown-to-HTML conversion.
- Promoted the live GitHub Pages demo as the default zero-install evaluation path.
- Kept multi-document dossier view as the visible MVP-1 roadmap while shipping the single-document pedagogy layer first.

### Removed

- Removed remote runtime resource requirements from generated HTML; the renderer emits self-contained files.
- Removed the need to author custom HTML for the supported spec visuals; semantic Markdown/frontmatter remains the input path.
