Assets used by the project README (and any future docs).

- `reader-toggle-hero.png` — 1440×900 screenshot of a rendered HTML archive showing the 3-tier reader toggle (零基础 / 系统化 / 速查) and pedagogy annotations. Regenerate with `node bin/xdossier.js render docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md` then headless screenshot at 1440×900.
- `dossier-cover-hero.png` — 1600×1500 screenshot of a per-dossier cover showing the full-width SVG relation graph (1 spec → 7 changes → 1 review). Regenerate with `node bin/xdossier.js cover <workspace>` then headless screenshot of `.dossier/out/<dossier-id>/index.html` at 1600×1500.
- `project-index-hero.png` — 1600×1100 screenshot of the project index linking 6 dossiers + 12 orphans. Regenerate with `node bin/xdossier.js cover <workspace>` then headless screenshot of `.dossier/out/index.html` at 1600×1100.
