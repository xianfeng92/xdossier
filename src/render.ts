// Main render pipeline. See spec §5 (steps 1–8).
//
// Steps (from docs/specs/2026-05-18-dossier-mvp-0-spec.md §5):
//   1. read & utf8 decode (caller already did)
//   2. gray-matter → { data, content } — see ./parse/frontmatter.ts
//   3. marked parse content → tokens — see ./parse/markdown.ts
//   4. semantic pass on tokens (callout / ascii-diagram / section wrap) — see ./parse/semantic.ts
//   5. toc extract — see ./parse/toc.ts
//   6. tokens → HTML fragment via custom renderer
//   7. load skill template/style/script
//   8. placeholder substitution → final HTML string
//
// Signature kept stable for downstream callers (cli.ts and future build steps).

import type { ContentMode, RenderAnnotations, RenderInput } from "./types.js";
import { parseFrontmatter } from "./parse/frontmatter.js";
import { parseMarkdownToTokens, renderTokensToHtml } from "./parse/markdown.js";
import { applySemantic } from "./parse/semantic.js";
import { extractToc } from "./parse/toc.js";
import { loadAllSkills } from "./skills/loader.js";
import { emit } from "./emit.js";
import { createSectionSummaryScaffold } from "./enrich/section-summaries.js";
import { classifyContentMode } from "./enrich/content-mode.js";

export async function render(input: RenderInput): Promise<string> {
  const frontmatter = parseFrontmatter(input.markdown);
  const tokens = applySemantic(parseMarkdownToTokens(frontmatter.content));
  const toc = input.withToc ? extractToc(tokens) : null;
  const annotations = withContentMode(
    input.annotations ?? createSectionSummaryScaffold(input.markdown),
    classifyContentMode(tokens, frontmatter.data).mode,
    input.contentModeOverride,
  );
  const contentHtml = renderTokensToHtml(tokens, annotations);
  const skill = loadAllSkills().find((s) => s.id === input.skillId);

  if (!skill) {
    throw new Error(`unknown skill: ${input.skillId}`);
  }

  const h1 = tokens.find((token) => token.type === "heading" && token.depth === 1);

  return emit({
    frontmatter: frontmatter.data,
    sourceTitle: h1?.type === "heading" ? h1.text : undefined,
    contentHtml,
    toc,
    skill,
    annotations,
    reader: input.reader ?? "beginner",
    contentModeOverride: input.contentModeOverride,
  });
}

function withContentMode(
  annotations: RenderAnnotations,
  detectedMode: ContentMode,
  override?: ContentMode,
): RenderAnnotations {
  return {
    ...annotations,
    content_mode: override ?? annotations.content_mode ?? detectedMode,
  };
}
