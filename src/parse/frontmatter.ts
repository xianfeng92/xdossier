// gray-matter wrapper, kept thin so callers don't import gray-matter directly.
// See docs/specs/2026-05-18-dossier-mvp-0-spec.md §5 step 2.

import type { ParsedFrontmatter } from "../types.js";
import matter from "gray-matter";

export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  if (!markdown.startsWith("---")) {
    return { data: {}, content: markdown };
  }

  try {
    const parsed = matter(markdown);
    return {
      data: parsed.data as Record<string, unknown>,
      content: parsed.content.replace(/^\r?\n/, ""),
    };
  } catch (e) {
    throw new Error(`malformed YAML frontmatter: ${(e as Error).message}`);
  }
}
