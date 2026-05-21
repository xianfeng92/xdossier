// Markdown → token stream / HTML, via marked@18.

import { marked, Renderer, type MarkedOptions, type Token, type Tokens } from "marked";
import type { DossierToken } from "./semantic.js";
import type { RenderAnnotations, SectionSummaryAnnotation } from "../types.js";
import { parseAsciiDiagram, type AsciiDiagram } from "./ascii-diagram.js";
import {
  collectSectionSemanticTrace,
  type SectionSemanticTraceLink,
  type SemanticTraceAnchor,
} from "../semantic-trace.js";
import {
  detectDocumentLanguage,
  localizeTraceLabel,
  semanticTraceLabelsForLanguage,
  type SemanticTraceLabels,
} from "../semantic-labels.js";

// Re-export the type so other modules don't need a marked import.
export type MarkdownToken = Token;

const markedOptions: MarkedOptions = {
  gfm: true,
  breaks: false,
  pedantic: false,
};

export function parseMarkdownToTokens(markdown: string): MarkdownToken[] {
  return [...marked.lexer(markdown, markedOptions)];
}

export function renderTokensToHtml(tokens: MarkdownToken[], annotations?: RenderAnnotations): string {
  const options = { ...markedOptions, renderer: createRenderer() };
  const chunks: string[] = [];
  let sectionOpen = false;
  const traceLabels = semanticTraceLabelsForLanguage(detectDocumentLanguage(tokensText(tokens as DossierToken[])));
  const sectionSummaries = new Map(
    (annotations?.section_summaries ?? []).map((item) => [item.section_id, item]),
  );
  const readingPath = new Map(
    (annotations?.reading_path ?? []).map((item) => [item.section_id, item]),
  );
  const sectionTraces = collectSectionSemanticTrace(
    annotations,
    collectSemanticTraceAnchors(tokens as DossierToken[]),
  );
  const sectionContexts = collectSectionContexts(tokens as DossierToken[]);

  for (const token of tokens as DossierToken[]) {
    if (token.type === "heading" && token.depth === 1) continue;

    if (token.type === "heading" && token.depth === 2) {
      if (sectionOpen) chunks.push("</section>");
      chunks.push(`<section id="${escapeAttribute(token._dossierId ?? "s0")}">`);
      chunks.push(renderSectionCover(token, sectionSummaries, readingPath));
      sectionOpen = true;
      const sectionId = token._dossierId;
      const summary = sectionId ? sectionSummaries.get(sectionId) : undefined;
      const traceLinks = sectionId ? sectionTraces.get(sectionId) ?? [] : [];
      if ((summary || traceLinks.length) && sectionId) {
        chunks.push(renderSectionBrief(summary, sectionContexts.get(sectionId), traceLinks, traceLabels));
      }
      continue;
    }

    chunks.push(marked.parser([token], options));
    if (token.type === "heading" && token.depth === 2) {
      const sectionId = token._dossierId;
      const summary = sectionId ? sectionSummaries.get(sectionId) : undefined;
      const traceLinks = sectionId ? sectionTraces.get(sectionId) ?? [] : [];
      if ((summary || traceLinks.length) && sectionId) {
        chunks.push(renderSectionBrief(summary, sectionContexts.get(sectionId), traceLinks, traceLabels));
      }
    }
    if (token.type === "heading" && token.depth === 3) {
      const subsectionId = token._dossierId;
      const traceLinks = subsectionId ? sectionTraces.get(subsectionId) ?? [] : [];
      if (traceLinks.length) chunks.push(renderSubsectionSemanticTrace(traceLinks, traceLabels));
    }
  }

  if (sectionOpen) chunks.push("</section>");
  return chunks.join("\n");
}

function renderSectionCover(
  token: DossierToken,
  summariesById: Map<string, SectionSummaryAnnotation>,
  readingPathById: Map<string, NonNullable<RenderAnnotations["reading_path"]>[number]>,
): string {
  const id = token._dossierId ?? "s0";
  const title = token._dossierText ?? ("text" in token && typeof token.text === "string" ? token.text : "");
  const ordinal = String(token._dossierSectionNum ?? 0).padStart(2, "0");
  const kicker = sectionCoverKicker(id, summariesById, readingPathById);
  const kickerHtml = kicker
    ? `\n  <p class="section-cover-kicker">${escapeHtml(kicker)}</p>`
    : "";
  return `<header class="section-cover" data-detail-level="section-cover">
  <div class="section-cover-num">${escapeHtml(ordinal)}</div>
  <h2 id="${escapeAttribute(id)}" class="section-cover-title">${renderInlineMarkdown(title)}</h2>${kickerHtml}
</header>`;
}

function sectionCoverKicker(
  sectionId: string,
  summariesById: Map<string, SectionSummaryAnnotation>,
  readingPathById: Map<string, NonNullable<RenderAnnotations["reading_path"]>[number]>,
): string {
  const readingDescription = readingPathById.get(sectionId)?.description?.trim();
  if (readingDescription) return readingDescription;
  const summary = summariesById.get(sectionId)?.summary?.trim();
  if (!summary) return "";
  return firstSentence(summary);
}

function firstSentence(text: string): string {
  const match = text.match(/^.+?[。！？.!?](?=\s|$)/);
  return (match?.[0] ?? text).trim();
}

function collectSemanticTraceAnchors(tokens: DossierToken[]): SemanticTraceAnchor[] {
  return tokens
    .filter((token): token is DossierToken & { type: "heading"; depth: 2 | 3; text: string } =>
      token.type === "heading" && (token.depth === 2 || token.depth === 3) && Boolean(token._dossierId))
    .map((token) => ({
      id: token._dossierId ?? "",
      level: token.depth,
      text: token._dossierText ?? token.text,
    }));
}

function tokensText(tokens: DossierToken[]): string {
  return tokens
    .map((token) => {
      if ("text" in token && typeof token.text === "string") return token.text;
      if ("raw" in token && typeof token.raw === "string") return token.raw;
      return "";
    })
    .join("\n");
}

type SectionRenderContext = {
  title: string;
  textLength: number;
  isShort: boolean;
  isReferenceLike: boolean;
};

const SHORT_SECTION_TEXT_LIMIT = 120;

function collectSectionContexts(tokens: DossierToken[]): Map<string, SectionRenderContext> {
  const contexts = new Map<string, SectionRenderContext>();
  let current: { id: string; title: string; textLength: number } | null = null;

  const flush = () => {
    if (!current) return;
    contexts.set(current.id, {
      title: current.title,
      textLength: current.textLength,
      isShort: current.textLength < SHORT_SECTION_TEXT_LIMIT,
      isReferenceLike: looksReferenceLike(current.title),
    });
  };

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      flush();
      current = {
        id: token._dossierId ?? "",
        title: token._dossierText ?? token.text,
        textLength: 0,
      };
      continue;
    }
    if (current) current.textLength += tokenTextLength(token);
  }
  flush();

  return contexts;
}

function renderSectionBrief(
  annotation: SectionSummaryAnnotation | undefined,
  context?: SectionRenderContext,
  traceLinks: SectionSemanticTraceLink[] = [],
  traceLabels: SemanticTraceLabels = semanticTraceLabelsForLanguage("zh-CN"),
): string {
  const pieces = annotation
    ? [`<p class="section-summary" data-annotation="section-summary">${escapeHtml(annotation.summary)}</p>`]
    : [];
  const shouldShowDenseBrief = !context?.isShort;

  if (annotation && shouldShowDenseBrief) {
    const keyPoints = annotation.key_points?.filter((point) => point.trim()) ?? [];
    const visibleKeyPoints = keyPoints.slice(0, 2);
    const extraKeyPoints = keyPoints.slice(2);
    if (visibleKeyPoints.length) {
      pieces.push(
        `<ul class="section-key-points" data-annotation="section-key-points" data-density="compact">${visibleKeyPoints
          .map((point) => `<li>${escapeHtml(point)}</li>`)
          .join("")}</ul>`,
      );
    }
    if (extraKeyPoints.length) {
      pieces.push(renderExtraKeyPoints(extraKeyPoints));
    }
    if (annotation.reader_hint?.trim()) {
      const readerHint = annotation.reader_hint.trim();
      pieces.push(
        `<p class="section-reader-hint section-reader-chip" data-annotation="section-reader-hint" aria-label="${escapeAttribute(traceLabels.readerHintAriaPrefix)}: ${escapeAttribute(readerHint)}"><span class="section-reader-hint-label" aria-hidden="true">${escapeHtml(traceLabels.readerHintLabel)}</span><span>${escapeHtml(readerHint)}</span></p>`,
      );
    }
  }
  if (traceLinks.length) {
    pieces.push(renderSectionSemanticTrace(traceLinks, traceLabels));
  }

  if (context?.isReferenceLike) {
    return `<details class="section-brief section-brief-collapsible" data-annotation="section-brief">
  <summary>本节摘要</summary>
  ${pieces.join("\n")}
</details>`;
  }
  return pieces.join("\n");
}

function renderSectionSemanticTrace(traceLinks: SectionSemanticTraceLink[], labels: SemanticTraceLabels): string {
  const links = traceLinks
    .map((link) => `<a class="section-semantic-chip section-semantic-${escapeAttribute(link.kind)}" href="${escapeAttribute(link.href)}">${escapeHtml(localizeTraceLabel(link, labels))}</a>`)
    .join("");
  return `<nav class="section-semantic-trace" data-annotation="section-semantic-trace" aria-label="${escapeAttribute(labels.semanticTraceSectionAria)}">
  <span class="section-semantic-trace-label">${escapeHtml(labels.semanticTraceLead)}</span>
  ${links}
</nav>`;
}

function renderSubsectionSemanticTrace(traceLinks: SectionSemanticTraceLink[], labels: SemanticTraceLabels): string {
  const links = traceLinks
    .map((link) => `<a class="section-semantic-chip section-semantic-${escapeAttribute(link.kind)}" href="${escapeAttribute(link.href)}">${escapeHtml(localizeTraceLabel(link, labels))}</a>`)
    .join("");
  return `<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="${escapeAttribute(labels.semanticTraceSubsectionAria)}">
  <span class="section-semantic-trace-label">${escapeHtml(labels.semanticTraceLead)}</span>
  ${links}
</nav>`;
}

function renderExtraKeyPoints(points: string[]): string {
  const lis = points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  return `<details class="section-key-points-extra" data-annotation="section-key-points-extra">
  <summary>还有 ${points.length} 条要点</summary>
  <ul>${lis}</ul>
</details>`;
}

function createRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = function heading(token: Tokens.Heading): string {
    const t = token as DossierToken & Tokens.Heading;
    const id = t._dossierId ? ` id="${escapeAttribute(t._dossierId)}"` : "";
    const text = this.parser.parseInline(token.tokens);

    if (token.depth === 2) {
      const num = t._dossierDisplayNum ?? String(t._dossierSectionNum ?? 0);
      const cleanText = t._dossierText ? renderInlineMarkdown(t._dossierText) : text;
      return `<h2${id}><span class="sec-num">§ ${escapeHtml(num)}</span><span>${cleanText}</span></h2>`;
    }
    if (token.depth === 3) {
      const num = t._dossierDisplayNum;
      const cleanText = t._dossierText ? renderInlineMarkdown(t._dossierText) : text;
      const prefix = num
        ? `<span class="sub-num">${escapeHtml(num)}</span>`
        : "";
      return `<h3${id}>${prefix}${cleanText}</h3>`;
    }

    return `<h${token.depth}${id}>${text}</h${token.depth}>`;
  };

  renderer.code = function code(token: Tokens.Code): string {
    const t = token as DossierToken & Tokens.Code;
    const lang = typeof token.lang === "string" ? token.lang.trim().split(/\s+/)[0] : "";
    const codeClass = lang ? ` class="lang-${escapeAttribute(lang)}"` : "";
    if (t._dossierKind === "ascii-diagram") {
      const parsedDiagram = parseAsciiDiagram(token.text);
      if (parsedDiagram) return renderAsciiDiagramSvg(parsedDiagram);
    }
    const preClass = t._dossierKind === "ascii-diagram" ? ` class="ascii-diagram"` : "";
    return `<pre${preClass}><code${codeClass}>${escapeHtml(token.text)}</code></pre>`;
  };

  renderer.blockquote = function blockquote(token: Tokens.Blockquote): string {
    const t = token as DossierToken & Tokens.Blockquote;
    if (t._dossierKind?.startsWith("callout-")) {
      const calloutLines = token.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (calloutLines.length > 1 && calloutLines.every((line) => /^⚠️?|^📝|^🎯/.test(line))) {
        return calloutLines
          .map((line) => {
            const variant = calloutVariant(line);
            const body = marked.parseInline(line, markedOptions) as string;
            return `<div class="callout ${escapeAttribute(variant)}" data-document-note><p>${body}</p></div>`;
          })
          .join("\n");
      }
      const variant = t._dossierKind.replace("callout-", "");
      return `<div class="callout ${escapeAttribute(variant)}" data-document-note>${this.parser.parse(token.tokens)}</div>`;
    }
    if (t._dossierKind === "tagline") {
      return `<div class="tagline" data-promotable="brief"><span class="tagline-label">TL;DR</span>${this.parser.parse(token.tokens)}</div>`;
    }
    if (t._dossierKind === "pull-quote") {
      return `<figure class="pull-quote">
  <span class="pull-quote-mark" aria-hidden="true">&quot;</span>
  <blockquote class="pull-quote-body">
    ${this.parser.parse(token.tokens)}
  </blockquote>
  <span class="pull-quote-mark-end" aria-hidden="true">&quot;</span>
</figure>`;
    }
    return `<blockquote>${this.parser.parse(token.tokens)}</blockquote>`;
  };

  renderer.link = function link(token: Tokens.Link): string {
    const text = this.parser.parseInline(token.tokens);
    const href = token.href.trim();
    const externalClass = /^https?:\/\//i.test(href) ? ` class="external-ref"` : "";
    const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
    return `<a href="${escapeAttribute(href)}"${externalClass}${title}>${text}</a>`;
  };

  return renderer;
}

function renderAsciiDiagramSvg(diagram: AsciiDiagram): string {
  const width = 720;
  const nodeX = 80;
  const nodeWidth = 560;
  const nodeHeight = 58;
  const nodeGap = 80;
  const top = 12;
  const height = top * 2 + diagram.nodes.length * nodeHeight + (diagram.nodes.length - 1) * nodeGap;
  const nodeCenterX = nodeX + nodeWidth / 2;
  const nodes = diagram.nodes
    .map((node, index) => {
      const y = top + index * (nodeHeight + nodeGap);
      const textY = y + nodeHeight / 2;
      return `<g class="inline-diagram-node">
      <rect x="${nodeX}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="6" />
      ${renderSvgText(node.lines, nodeCenterX, textY)}
    </g>`;
    })
    .join("\n");
  const edges = diagram.edges
    .map((edge) => {
      const fromY = top + edge.from * (nodeHeight + nodeGap) + nodeHeight;
      const toY = top + edge.to * (nodeHeight + nodeGap);
      return `<line class="inline-diagram-edge" x1="${nodeCenterX}" y1="${fromY + 14}" x2="${nodeCenterX}" y2="${toY - 14}" marker-end="url(#ascii-diagram-arrow)" />`;
    })
    .join("\n");
  return `<figure class="inline-diagram" data-diagram="ascii-vertical-stack">
  <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttribute(diagram.nodes.map((node) => node.label).join(" to "))}">
    <defs>
      <marker id="ascii-diagram-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" />
      </marker>
    </defs>
    ${nodes}
    ${edges}
  </svg>
</figure>`;
}

function renderSvgText(lines: string[], x: number, y: number): string {
  const visibleLines = lines.length ? lines : [""];
  if (visibleLines.length === 1) {
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(visibleLines[0] ?? "")}</text>`;
  }
  const lineHeight = 18;
  const startY = y - ((visibleLines.length - 1) * lineHeight) / 2;
  const tspans = visibleLines
    .map((line, index) => `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeHtml(line)}</tspan>`)
    .join("");
  return `<text text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
}

function renderInlineMarkdown(text: string): string {
  return marked.parseInline(text, markedOptions) as string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function calloutVariant(line: string): "warn" | "note" | "goal" {
  if (line.startsWith("⚠")) return "warn";
  if (line.startsWith("🎯")) return "goal";
  return "note";
}

function looksReferenceLike(title: string): boolean {
  return /\b(appendix|appendices|reference|references)\b|附录|参考|索引|字段/i.test(title);
}

function tokenTextLength(token: DossierToken): number {
  if (token.type === "space") return 0;
  const record = token as Record<string, unknown>;
  const textValue = typeof record.text === "string" ? record.text : "";
  const rawValue = typeof record.raw === "string" ? record.raw : "";
  return (textValue || rawValue)
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_#[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}
