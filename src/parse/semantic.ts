// Semantic pass — mutate marked tokens to apply Dossier conventions:
//   - blockquote starting with ⚠/📝/🎯 → tag as callout with variant
//   - <pre> whose content contains box-drawing chars (┌─│└─┐┘) → tag as ascii-diagram
//   - h2 headings → wrap subsequent content in <section id="sN">
//   - h2/h3 → attach generated id from text

import type { MarkdownToken } from "./markdown.js";

export type DossierToken = MarkdownToken & {
  _dossierKind?: "callout-warn" | "callout-note" | "callout-goal" | "ascii-diagram" | "tagline" | "pull-quote";
  _dossierSectionNum?: number;
  _dossierSubsectionNum?: number;
  _dossierDisplayNum?: string;
  _dossierId?: string;
  _dossierText?: string;
};

export function applySemantic(tokens: MarkdownToken[]): MarkdownToken[] {
  let sectionNum = 0;
  let subsectionNum = 0;
  let currentSectionDisplayNum = "";
  let taglineConsumed = false;

  for (const token of tokens as DossierToken[]) {
    if (token.type === "heading") {
      if (token.depth === 2) {
        sectionNum += 1;
        subsectionNum = 0;
        const parsed = parseHeadingNumber(token.text);
        token._dossierSectionNum = sectionNum;
        token._dossierId = `s${sectionNum}`;
        token._dossierDisplayNum = parsed?.number ?? String(sectionNum);
        token._dossierText = parsed?.text ?? token.text;
        currentSectionDisplayNum = token._dossierDisplayNum;
        taglineConsumed = false;
      } else if (token.depth === 3) {
        subsectionNum += 1;
        const parsed = parseHeadingNumber(token.text);
        token._dossierSectionNum = sectionNum;
        token._dossierSubsectionNum = subsectionNum;
        token._dossierId = sectionNum > 0 ? `s${sectionNum}-${subsectionNum}` : `h3-${subsectionNum}`;
        token._dossierDisplayNum = composeH3DisplayNum(
          parsed?.number,
          currentSectionDisplayNum,
          subsectionNum,
        );
        token._dossierText = parsed?.text ?? token.text;
      }
    } else if (token.type === "blockquote") {
      const kind = classifyCallout(token.text);
      if (kind) {
        token._dossierKind = `callout-${kind}`;
      } else if (currentSectionDisplayNum === "0" && !taglineConsumed) {
        token._dossierKind = "tagline";
        taglineConsumed = true;
      } else if (sectionNum > 0 && plainTextLength(token.text) >= 30) {
        token._dossierKind = "pull-quote";
      }
    } else if (token.type === "code" && looksLikeAsciiDiagram(token.text)) {
      token._dossierKind = "ascii-diagram";
    }
  }

  return tokens;
}

function composeH3DisplayNum(
  explicit: string | undefined,
  parentSectionNum: string,
  autoSubNum: number,
): string {
  if (explicit) {
    if (explicit.includes(".") || !parentSectionNum) return explicit;
    return `${parentSectionNum}.${explicit}`;
  }
  return parentSectionNum ? `${parentSectionNum}.${autoSubNum}` : String(autoSubNum);
}

const HEADING_NUMBER_RE = /^\s*(\d+(?:\.\d+)*)(?:\.)?\s+(.+)$/;

function parseHeadingNumber(text: string): { number: string; text: string } | null {
  const match = text.match(HEADING_NUMBER_RE);
  if (!match) return null;
  return { number: match[1], text: stripInlineHtml(match[2]) };
}

function stripInlineHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}

const ASCII_DIAGRAM_HINTS = ["┌─", "└─", "┐", "┘", "│  ", "├─"];

/** Heuristic exported for testability. */
export function looksLikeAsciiDiagram(text: string): boolean {
  return ASCII_DIAGRAM_HINTS.some((h) => text.includes(h));
}

const CALLOUT_PREFIXES: Record<string, "warn" | "note" | "goal"> = {
  "⚠️": "warn",
  "⚠": "warn",
  "📝": "note",
  "🎯": "goal",
};

/** Heuristic exported for testability. Returns null when not a callout. */
export function classifyCallout(
  blockquoteText: string,
): "warn" | "note" | "goal" | null {
  const trimmed = blockquoteText.trimStart();
  for (const [prefix, kind] of Object.entries(CALLOUT_PREFIXES)) {
    if (trimmed.startsWith(prefix)) return kind;
  }
  return null;
}

function plainTextLength(text: string): number {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_#[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}
