import type { Token } from "marked";
import type { ContentMode } from "../types.js";

export type ContentModeScores = Record<ContentMode, number>;

export type ContentModeClassification = {
  mode: ContentMode;
  scores: ContentModeScores;
  reason: string;
};

const CONTENT_MODES: ContentMode[] = ["tutorial", "concept", "reference", "course"];
const VALID_MODES = new Set<string>(CONTENT_MODES);

export function classifyContentMode(
  tokens: Token[],
  frontmatter: Record<string, unknown> = {},
): ContentModeClassification {
  const explicit = stringField(frontmatter, "content_mode").toLowerCase();
  const scores: ContentModeScores = {
    tutorial: scoreTutorial(tokens),
    concept: scoreConcept(tokens),
    reference: scoreReference(tokens),
    course: scoreCourse(frontmatter),
  };

  if (VALID_MODES.has(explicit)) {
    return {
      mode: explicit as ContentMode,
      scores,
      reason: `frontmatter content_mode=${explicit}`,
    };
  }

  if (frontmatter.lesson || frontmatter.module || frontmatter.week) {
    return {
      mode: "course",
      scores: { ...scores, course: Math.max(scores.course, 90) },
      reason: "frontmatter lesson/module/week signal",
    };
  }

  const ranked = CONTENT_MODES
    .map((mode) => ({ mode, score: scores[mode] }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 30) {
    return {
      mode: "concept",
      scores,
      reason: "fallback: all heuristic scores below 30",
    };
  }

  return {
    mode: best.mode,
    scores,
    reason: `heuristic: ${best.mode} scored ${best.score}`,
  };
}

function scoreTutorial(tokens: Token[]): number {
  const codeRatio = codeBlockRatioByLang(tokens, ["bash", "sh", "shell", "zsh"]);
  const verbRatio = headingsStartWithVerb(tokens);
  const sequential = hasSequentialH2Numbers(tokens) ? 1 : 0;
  const verificationRatio = phraseRatio(tokensText(tokens), [
    "you should see",
    "verify",
    "run",
    "install",
    "configure",
    "应看到",
    "验证",
    "运行",
    "安装",
    "配置",
  ]);
  return clip(codeRatio * 50 + verbRatio * 25 + sequential * 20 + verificationRatio * 20);
}

function scoreReference(tokens: Token[]): number {
  const tableRatio = tableBlockRatio(tokens);
  const flat = h2CountWithMinimalH3(tokens);
  const alphabetical = isH2Alphabetical(tokens) ? 1 : 0;
  const referenceWords = phraseRatio(tokensText(tokens), ["field", "type", "description", "api", "reference", "字段", "类型", "说明", "参考"]);
  return clip(tableRatio * 50 + flat * 30 + alphabetical * 20 + referenceWords * 15);
}

function scoreCourse(frontmatter: Record<string, unknown>): number {
  return frontmatter.lesson || frontmatter.module || frontmatter.week ? 90 : 0;
}

function scoreConcept(tokens: Token[]): number {
  const prose = paragraphWordScore(tokens);
  const definitions = definitionBlockquoteScore(tokens);
  const conceptWords = phraseRatio(tokensText(tokens), [
    "why",
    "principle",
    "model",
    "concept",
    "architecture",
    "vision",
    "为什么",
    "原则",
    "模型",
    "概念",
    "架构",
    "愿景",
  ]);
  const tutorial = scoreTutorial(tokens);
  const reference = scoreReference(tokens);
  const base = prose * 45 + definitions * 35 + conceptWords * 35;
  return clip(base - Math.max(0, tutorial - 45) * 0.35 - Math.max(0, reference - 45) * 0.35);
}

function codeBlockRatioByLang(tokens: Token[], langs: string[]): number {
  const codeBlocks = tokens.filter((token) => token.type === "code") as Array<Token & { lang?: string }>;
  const headings = headingTokens(tokens, 2).length;
  if (!codeBlocks.length) return 0;
  const langSet = new Set(langs);
  const shellBlocks = codeBlocks.filter((token) => langSet.has((token.lang ?? "").trim().split(/\s+/)[0].toLowerCase()));
  return Math.min(1, shellBlocks.length / Math.max(1, headings));
}

function headingsStartWithVerb(tokens: Token[]): number {
  const h2s = headingTokens(tokens, 2);
  if (!h2s.length) return 0;
  const verbs = /^(install|configure|run|verify|create|open|start|deploy|build|test|安装|配置|运行|验证|创建|打开|启动|部署|构建|测试)\b/i;
  const matches = h2s.filter((token) => verbs.test(stripLeadingNumber(token.text).trim())).length;
  return matches / h2s.length;
}

function hasSequentialH2Numbers(tokens: Token[]): boolean {
  const nums = headingTokens(tokens, 2)
    .map((token) => token.text.match(/^\s*(\d+)[.)、\s]/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number);
  if (nums.length < 3) return false;
  return nums.slice(0, 3).every((value, index) => value === index + 1);
}

function tableBlockRatio(tokens: Token[]): number {
  const tables = tokens.filter((token) => token.type === "table").length;
  const h2s = headingTokens(tokens, 2).length;
  if (!tables) return 0;
  return Math.min(1, tables / Math.max(1, h2s));
}

function h2CountWithMinimalH3(tokens: Token[]): number {
  const h2s = headingTokens(tokens, 2).length;
  if (h2s < 3) return 0;
  const h3s = headingTokens(tokens, 3).length;
  return h3s <= Math.max(1, Math.floor(h2s * 0.4)) ? 1 : 0;
}

function isH2Alphabetical(tokens: Token[]): boolean {
  const h2s = headingTokens(tokens, 2).map((token) => stripLeadingNumber(token.text).trim().toLowerCase());
  if (h2s.length < 4) return false;
  const sorted = [...h2s].sort((a, b) => a.localeCompare(b));
  let samePosition = 0;
  h2s.forEach((title, index) => {
    if (title === sorted[index]) samePosition += 1;
  });
  return samePosition / h2s.length >= 0.75;
}

function paragraphWordScore(tokens: Token[]): number {
  const paragraphs = tokens.filter((token) => token.type === "paragraph") as Array<Token & { text?: string }>;
  if (!paragraphs.length) return 0;
  const long = paragraphs.filter((token) => wordishCount(token.text ?? "") >= 18).length;
  return Math.min(1, long / Math.max(3, paragraphs.length * 0.45));
}

function definitionBlockquoteScore(tokens: Token[]): number {
  const blockquotes = tokens.filter((token) => token.type === "blockquote") as Array<Token & { text?: string }>;
  if (!blockquotes.length) return 0;
  const matches = blockquotes.filter((token) => /(\bis\b|means|是|指的是|定义)/i.test(token.text ?? "")).length;
  return Math.min(1, matches / Math.max(1, blockquotes.length));
}

function phraseRatio(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  const hits = phrases.filter((phrase) => lower.includes(phrase.toLowerCase())).length;
  return Math.min(1, hits / 4);
}

function headingTokens(tokens: Token[], depth: number): Array<Token & { depth: number; text: string }> {
  return tokens.filter((token): token is Token & { depth: number; text: string } =>
    token.type === "heading"
    && typeof (token as { depth?: unknown }).depth === "number"
    && (token as { depth: number }).depth === depth
    && typeof (token as { text?: unknown }).text === "string");
}

function tokensText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      const record = token as Record<string, unknown>;
      if (typeof record.text === "string") return record.text;
      if (typeof record.raw === "string") return record.raw;
      return "";
    })
    .join("\n");
}

function wordishCount(text: string): number {
  const latin = text.match(/[A-Za-z0-9_-]+/g) ?? [];
  const cjk = text.match(/[\u3400-\u9fff]/g) ?? [];
  return latin.length + Math.ceil(cjk.length / 2);
}

function stripLeadingNumber(text: string): string {
  return text.replace(/^\s*\d+(?:\.\d+)*[.)、\s-]*/, "");
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function clip(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
