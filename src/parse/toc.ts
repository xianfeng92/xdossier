// Extract TOC entries (h2 + h3) from a marked token stream.
// See spec §13 ADR D13: h2 + h3 only, h1 excluded.

import type { TocEntry } from "../types.js";
import type { MarkdownToken } from "./markdown.js";
import type { DossierToken } from "./semantic.js";

export function extractToc(tokens: MarkdownToken[]): TocEntry[] {
  const toc: TocEntry[] = [];
  let currentH2: TocEntry | undefined;
  let sectionNum = 0;
  let subsectionNum = 0;

  for (const token of tokens as DossierToken[]) {
    if (token.type !== "heading") continue;

    if (token.depth === 2) {
      sectionNum = token._dossierSectionNum ?? sectionNum + 1;
      subsectionNum = 0;
      currentH2 = {
        level: 2,
        id: token._dossierId ?? `s${sectionNum}`,
        text: cleanTocText(token._dossierText ?? token.text),
        number: token._dossierDisplayNum ?? String(sectionNum),
        children: [],
      };
      toc.push(currentH2);
    } else if (token.depth === 3 && currentH2) {
      subsectionNum = token._dossierSubsectionNum ?? subsectionNum + 1;
      currentH2.children ??= [];
      currentH2.children.push({
        level: 3,
        id: token._dossierId ?? `${currentH2.id}-${subsectionNum}`,
        text: cleanTocText(token._dossierText ?? token.text),
        number: token._dossierDisplayNum ?? `${currentH2.number ?? sectionNum}.${subsectionNum}`,
      });
    }
  }

  return toc;
}

function cleanTocText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}
