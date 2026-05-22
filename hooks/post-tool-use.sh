#!/usr/bin/env bash
# xdossier PostToolUse hook for Claude Code.
# Installs via .claude/settings.json - see README "Auto-render in Claude Code".
set -e
file="$1"
[[ -n "$file" ]] || exit 0
[[ "$file" == *.md ]] || exit 0
case "$file" in
  */docs/specs/*.md|*/docs/changes/*.md|*/docs/reviews/*.md) ;;
  *) exit 0 ;;
esac

# xdossier render auto-refreshes the parent dossier cover via --only-dossier-containing internally.
# So this hook only needs to call render; cover refresh is implicit.
exec xdossier render "$file"
