import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { classifyContentMode } from "../src/enrich/content-mode.js";
import { parseFrontmatter } from "../src/parse/frontmatter.js";
import { parseMarkdownToTokens } from "../src/parse/markdown.js";
import { applySemantic } from "../src/parse/semantic.js";

const here = resolve(import.meta.dirname);

async function classifyFile(path: string) {
  const md = await readFile(path, "utf8");
  return classifyMarkdown(md);
}

function classifyMarkdown(markdown: string) {
  const parsed = parseFrontmatter(markdown);
  const tokens = applySemantic(parseMarkdownToTokens(parsed.content));
  return classifyContentMode(tokens, parsed.data);
}

describe("content_mode classifier", () => {
  test("classifies the vision spec as concept", async () => {
    const result = await classifyFile(resolve(here, "../docs/specs/2026-05-17-dossier-vision-spec.md"));

    expect(result.mode).toBe("concept");
    expect(result.scores.concept).toBeGreaterThanOrEqual(30);
    expect(result.reason).toMatch(/concept|fallback/i);
  });

  test("classifies the MVP-0 spec as concept", async () => {
    const result = await classifyFile(resolve(here, "../docs/specs/2026-05-18-dossier-mvp-0-spec.md"));

    expect(result.mode).toBe("concept");
  });

  test("classifies a linear quickstart fixture as tutorial", async () => {
    const result = await classifyFile(resolve(here, "fixtures/quickstart-tutorial.md"));

    expect(result.mode).toBe("tutorial");
    expect(result.scores.tutorial).toBeGreaterThan(result.scores.reference);
  });

  test("classifies a table-heavy API fixture as reference", async () => {
    const result = await classifyFile(resolve(here, "fixtures/api-reference.md"));

    expect(result.mode).toBe("reference");
    expect(result.scores.reference).toBeGreaterThan(result.scores.tutorial);
  });

  test("frontmatter content_mode overrides heuristic scores", () => {
    const result = classifyMarkdown(`---
title: Override
content_mode: reference
---

# Override

## 1. Install

\`\`\`bash
pnpm install
\`\`\`
`);

    expect(result.mode).toBe("reference");
    expect(result.reason).toContain("frontmatter");
  });

  test("falls back to concept when all heuristic scores are weak", () => {
    const result = classifyMarkdown(`# Sparse

## Notes

Tiny.
`);

    expect(result.mode).toBe("concept");
    expect(Math.max(...Object.values(result.scores))).toBeLessThan(30);
    expect(result.reason).toContain("fallback");
  });
});
