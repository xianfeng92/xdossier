import type {
  ArtifactRef,
  CoverArtifact,
  CoverDecision,
  CoverOpenQuestion,
  ReadingPath,
} from "./types.js";

const DECISION_HEADING_RE = /\bdecision\b|决策|锁定|选择|不做|verdict|结论/i;
const OPEN_HEADING_RE = /open questions?|开放问题|风险|next|下一步/i;
const REVIEW_BLOCKER_RE = /\b(needs|blocked|fix|risk)\b/i;
const KIND_RANK = new Map([
  ["adr", 0],
  ["mvp-spec", 1],
  ["vision-spec", 2],
  ["review", 3],
  ["change", 4],
]);

export function extractDecisions(artifacts: CoverArtifact[]): CoverDecision[] {
  const decisions: CoverDecision[] = [];

  for (const artifact of rankedArtifacts(artifacts)) {
    decisions.push(...extractDecisionHeadings(artifact));
    decisions.push(...extractDecisionTables(artifact));
  }

  return dedupeBy(decisions, (decision) => `${decision.source_artifact}\u0000${decision.title}`)
    .slice(0, 5);
}

export function extractOpenQuestions(artifacts: CoverArtifact[]): CoverOpenQuestion[] {
  const items: CoverOpenQuestion[] = [];

  for (const artifact of rankedArtifacts(artifacts)) {
    items.push(...extractUncheckedTasks(artifact));
    items.push(...extractOpenQuestionSections(artifact));
    if (artifact.kind === "review") items.push(...extractReviewBlockers(artifact));
  }

  return dedupeBy(items, (item) => `${item.source_artifact}\u0000${item.title}`)
    .slice(0, 10);
}

export function generateReadingPaths(
  artifacts: CoverArtifact[],
  decisions: CoverDecision[],
  openQuestions: CoverOpenQuestion[],
): ReadingPath[] {
  const byPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  const vision = artifacts.find((artifact) => artifact.kind === "vision-spec");
  const mvpSpecs = artifacts.filter((artifact) => artifact.kind === "mvp-spec");
  const adrs = artifacts.filter((artifact) => artifact.kind === "adr");
  const changes = artifacts.filter((artifact) => artifact.kind === "change");
  const reviews = artifacts.filter((artifact) => artifact.kind === "review");
  const decisionSources = decisions
    .map((decision) => byPath.get(decision.source_artifact))
    .filter((artifact): artifact is CoverArtifact => Boolean(artifact));
  const openQuestionSources = openQuestions
    .map((question) => byPath.get(question.source_artifact))
    .filter((artifact): artifact is CoverArtifact => Boolean(artifact));

  return [
    {
      role: "PM / decision maker",
      steps: refs([...decisionSources, ...openQuestionSources, ...maybe(vision)]),
    },
    {
      role: "Engineer / implementer",
      steps: refs([...mvpSpecs, ...adrs, ...changes, ...reviews]),
    },
    {
      role: "Reviewer / handoff receiver",
      steps: refs([...reviews, ...openQuestionSources, ...changes]),
    },
  ].map((path) => ({
    ...path,
    steps: path.steps.length > 0 ? path.steps : refs(artifacts.slice(0, 3)),
  }));
}

function extractDecisionHeadings(artifact: CoverArtifact): CoverDecision[] {
  const lines = artifact.content.split(/\r?\n/);
  const decisions: CoverDecision[] = [];

  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeading(lines[i] ?? "");
    if (!heading || !DECISION_HEADING_RE.test(heading.text)) continue;

    decisions.push({
      title: cleanMarkdown(heading.text),
      source_artifact: artifact.path,
      href: artifactHref(artifact, heading.text),
      evidence: firstMeaningfulLine(lines.slice(i + 1)),
    });
  }

  return decisions;
}

function extractDecisionTables(artifact: CoverArtifact): CoverDecision[] {
  const lines = artifact.content.split(/\r?\n/);
  const decisions: CoverDecision[] = [];

  for (let i = 0; i < lines.length - 2; i++) {
    if (!looksLikeTableSeparator(lines[i + 1] ?? "")) continue;
    const headers = parseTableRow(lines[i] ?? "");
    const decisionIndex = headers.findIndex((header) => /decision|决策|verdict|倾向/i.test(header));
    if (decisionIndex < 0) continue;

    for (let rowIndex = i + 2; rowIndex < lines.length; rowIndex++) {
      const rowLine = lines[rowIndex] ?? "";
      if (!rowLine.trim().startsWith("|")) break;
      const cells = parseTableRow(rowLine);
      const title = cleanMarkdown(cells[decisionIndex] ?? "");
      if (!title) continue;
      decisions.push({
        title,
        source_artifact: artifact.path,
        href: artifactHref(artifact, title),
        evidence: cells.join(" | "),
      });
    }
  }

  return decisions;
}

function extractUncheckedTasks(artifact: CoverArtifact): CoverOpenQuestion[] {
  return artifact.content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/)?.[1]?.trim())
    .filter((title): title is string => Boolean(title))
    .map((title) => openQuestionFromTitle(artifact, title));
}

function extractOpenQuestionSections(artifact: CoverArtifact): CoverOpenQuestion[] {
  const lines = artifact.content.split(/\r?\n/);
  const items: CoverOpenQuestion[] = [];

  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeading(lines[i] ?? "");
    if (!heading || !OPEN_HEADING_RE.test(heading.text)) continue;

    for (const rawLine of collectSectionLines(lines, i + 1, heading.depth)) {
      const line = rawLine.trim();
      if (line.startsWith("|") && !looksLikeTableSeparator(line)) {
        const cells = parseTableRow(line);
        const title = cells.find((cell) => cell && !/question|问题|owner|blocks?|risk|风险/i.test(cell));
        if (title) items.push(openQuestionFromTitle(artifact, title));
      }
    }
  }

  return items;
}

function extractReviewBlockers(artifact: CoverArtifact): CoverOpenQuestion[] {
  const items: CoverOpenQuestion[] = [];

  for (const line of artifact.content.split(/\r?\n/)) {
    const trimmed = cleanMarkdown(line.trim());
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("|")) continue;
    if (REVIEW_BLOCKER_RE.test(trimmed)) {
      items.push(openQuestionFromTitle(artifact, trimmed));
    }
  }

  return items;
}

function openQuestionFromTitle(artifact: CoverArtifact, title: string): CoverOpenQuestion {
  const cleanTitle = cleanMarkdown(title);
  return {
    title: cleanTitle,
    source_artifact: artifact.path,
    href: artifactHref(artifact, cleanTitle),
    blocks: extractBlocks(cleanTitle),
  };
}

function collectSectionLines(lines: string[], start: number, headingDepth: number): string[] {
  const collected: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const heading = parseHeading(lines[i] ?? "");
    if (heading && heading.depth <= headingDepth) break;
    collected.push(lines[i] ?? "");
  }
  return collected;
}

function rankedArtifacts(artifacts: CoverArtifact[]): CoverArtifact[] {
  return [...artifacts].sort((a, b) => {
    const rankA = KIND_RANK.get(a.kind) ?? 10;
    const rankB = KIND_RANK.get(b.kind) ?? 10;
    if (rankA !== rankB) return rankA - rankB;
    return a.path.localeCompare(b.path);
  });
}

function refs(artifacts: CoverArtifact[]): ArtifactRef[] {
  return dedupeBy(artifacts, (artifact) => artifact.path).map((artifact) => ({
    id: artifact.id,
    path: artifact.path,
    title: artifact.title,
    href: sourceHref(artifact.path),
  }));
}

function maybe<T>(value: T | undefined): T[] {
  return value ? [value] : [];
}

function parseHeading(line: string): { depth: number; text: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  return {
    depth: match[1]?.length ?? 1,
    text: cleanMarkdown(match[2] ?? ""),
  };
}

function firstMeaningfulLine(lines: string[]): string {
  return cleanMarkdown(lines.find((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("|") && !looksLikeTableSeparator(trimmed);
  }) ?? "");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanMarkdown(cell.trim()));
}

function looksLikeTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function extractBlocks(title: string): string | undefined {
  const match = title.match(/\bblocks?\s+([^.;]+(?:\s+[^.;]+)*)/i);
  if (match?.[1]) return match[1].trim();
  const blocked = title.match(/\bblocked\s+(.+)/i);
  if (blocked?.[1]) return blocked[1].trim();
  return undefined;
}

function artifactHref(artifact: CoverArtifact, anchorText: string): string {
  return `${sourceHref(artifact.path)}#${slug(anchorText)}`;
}

function sourceHref(path: string): string {
  return `../../${path}`;
}

function slug(value: string): string {
  const normalized = cleanMarkdown(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
