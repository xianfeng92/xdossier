import type { CoverArtifact } from "../cover/types.js";
import type {
  ReviewDocumentSummary,
  ReviewFinding,
  ReviewFindingSeverity,
  ReviewFindingStatus,
  ReviewLoopSummary,
} from "./types.js";

const SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);
const STATUSES = new Set(["open", "fixed", "accepted", "deferred", "wontfix"]);

export function buildReviewLoopSummary(artifacts: CoverArtifact[]): ReviewLoopSummary {
  const reviewArtifacts = artifacts
    .filter((artifact) => artifact.kind === "review" || artifact.path.startsWith("docs/reviews/"))
    .sort((a, b) => a.path.localeCompare(b.path));
  const findings = reviewArtifacts.flatMap(extractReviewFindings);
  const reviews: ReviewDocumentSummary[] = reviewArtifacts.map((artifact) => {
    const reviewFindings = findings.filter((finding) => finding.review_artifact === artifact.path);
    const openCount = reviewFindings.filter((finding) => finding.status === "open").length;
    return {
      id: artifact.id,
      path: artifact.path,
      title: artifact.title,
      href: `../../${artifact.path}`,
      verdict: extractVerdict(artifact),
      status: reviewStatus(artifact),
      finding_count: reviewFindings.length,
      open_count: openCount,
    };
  });

  return {
    review_count: reviews.length,
    finding_count: findings.length,
    open_count: findings.filter((finding) => finding.status === "open").length,
    blocker_count: findings.filter((finding) =>
      finding.status === "open" && (finding.severity === "P0" || finding.severity === "P1")
    ).length,
    fixed_count: findings.filter((finding) => finding.status === "fixed" || finding.status === "accepted").length,
    deferred_count: findings.filter((finding) => finding.status === "deferred" || finding.status === "wontfix").length,
    reviews,
    findings,
  };
}

function extractReviewFindings(artifact: CoverArtifact): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const seen = new Set<string>();
  for (const finding of [
    ...extractTableFindings(artifact),
    ...extractHeadingFindings(artifact),
    ...extractBulletFindings(artifact),
  ]) {
    const key = `${finding.id}\u0000${finding.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(finding);
  }
  return findings;
}

function extractTableFindings(artifact: CoverArtifact): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  for (const line of artifact.content.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*-+/.test(line) || /\|\s*id\s*\|/i.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => stripMarkdown(cell.trim()));
    if (cells.length < 3) continue;
    const id = normalizeFindingId(cells[0]);
    const severity = normalizeSeverity(cells[1]);
    if (!id || !severity) continue;
    const status = normalizeStatus(cells[3]) ?? defaultFindingStatus(artifact);
    findings.push({
      id,
      severity,
      title: cells[2],
      status,
      review_artifact: artifact.path,
      href: `../../${artifact.path}#${slugify(id)}`,
    });
  }
  return findings;
}

function extractHeadingFindings(artifact: CoverArtifact): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const headingPattern = /^#{2,5}\s+(F\d+)\s*(?:\((P[0-3])\)|[·:-]\s*(P[0-3]))?\s*(?:[-—:·]\s*)?(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(artifact.content))) {
    const id = normalizeFindingId(match[1]);
    const severity = normalizeSeverity(match[2] ?? match[3]) ?? "P2";
    const title = stripMarkdown(match[4]?.trim() ?? "");
    if (!id || !title) continue;
    const nextStart = headingPattern.lastIndex;
    const nextHeadingIndex = artifact.content.slice(nextStart).search(/^#{2,5}\s+/m);
    const body = nextHeadingIndex >= 0
      ? artifact.content.slice(nextStart, nextStart + nextHeadingIndex)
      : artifact.content.slice(nextStart);
    findings.push({
      id,
      severity,
      title,
      status: findStatusInBlock(body) ?? defaultFindingStatus(artifact),
      review_artifact: artifact.path,
      href: `../../${artifact.path}#${slugify(`${id}-${title}`)}`,
      evidence: findFieldInBlock(body, "Evidence"),
    });
  }
  return findings;
}

function extractBulletFindings(artifact: CoverArtifact): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  let bulletIndex = 1;
  const bulletPattern = /^-\s+\[(P[0-3])\]\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = bulletPattern.exec(artifact.content))) {
    const severity = normalizeSeverity(match[1]);
    const title = stripMarkdown(match[2]?.trim() ?? "");
    if (!severity || !title) continue;
    const nextStart = bulletPattern.lastIndex;
    const nextBulletIndex = artifact.content.slice(nextStart).search(/^-\s+\[P[0-3]\]\s+/m);
    const body = nextBulletIndex >= 0
      ? artifact.content.slice(nextStart, nextStart + nextBulletIndex)
      : artifact.content.slice(nextStart);
    const id = `B${bulletIndex++}`;
    findings.push({
      id,
      severity,
      title,
      status: findStatusInBlock(body) ?? defaultFindingStatus(artifact),
      review_artifact: artifact.path,
      href: `../../${artifact.path}#${slugify(`${id}-${title}`)}`,
      evidence: findFieldInBlock(body, "Evidence"),
    });
  }
  return findings;
}

function extractVerdict(artifact: CoverArtifact): string {
  const frontmatterVerdict = stringValue(artifact.frontmatter.verdict);
  if (frontmatterVerdict) return frontmatterVerdict;
  const verdictStart = artifact.content.search(/^##\s+Verdict\s*$/m);
  const verdictSection = verdictStart >= 0 ? sectionBodyAfterHeading(artifact.content, verdictStart) : "";
  const boldVerdict = verdictSection.match(/\*\*([^*]+)\*\*/)?.[1];
  if (boldVerdict) return stripMarkdown(boldVerdict).split(/\s+/)[0] ?? "";
  const firstWord = stripMarkdown(verdictSection).trim().split(/\s+/)[0] ?? "";
  return firstWord || "UNKNOWN";
}

function sectionBodyAfterHeading(markdown: string, headingIndex: number): string {
  const lineEnd = markdown.indexOf("\n", headingIndex);
  const bodyStart = lineEnd >= 0 ? lineEnd + 1 : markdown.length;
  const nextHeading = markdown.slice(bodyStart).search(/^##\s+/m);
  return nextHeading >= 0 ? markdown.slice(bodyStart, bodyStart + nextHeading) : markdown.slice(bodyStart);
}

function reviewStatus(artifact: CoverArtifact): string {
  return stringValue(artifact.frontmatter.status) || artifact.status || "unknown";
}

function defaultFindingStatus(artifact: CoverArtifact): ReviewFindingStatus {
  const raw = reviewStatus(artifact).toLowerCase();
  if (raw === "implemented" || raw === "fixed" || raw === "approved" || raw === "ready") return "fixed";
  if (raw === "archived" || raw === "deferred") return "deferred";
  return "open";
}

function findStatusInBlock(block: string): ReviewFindingStatus | undefined {
  const match = block.match(/(?:^|\n)\s*-?\s*Status:\s*([A-Za-z_-]+)/i);
  return normalizeStatus(match?.[1]);
}

function findFieldInBlock(block: string, field: string): string | undefined {
  const pattern = new RegExp(`(?:^|\\n)\\s*-?\\s*${field}:\\s*(.+)`, "i");
  const value = block.match(pattern)?.[1]?.trim();
  return value ? stripMarkdown(value) : undefined;
}

function normalizeFindingId(value: string | undefined): string | undefined {
  const match = value?.trim().match(/^(F\d+)$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function normalizeSeverity(value: string | undefined): ReviewFindingSeverity | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized && SEVERITIES.has(normalized) ? normalized as ReviewFindingSeverity : undefined;
}

function normalizeStatus(value: string | undefined): ReviewFindingStatus | undefined {
  const normalized = value?.trim().toLowerCase().replaceAll("_", "-");
  if (!normalized) return undefined;
  const canonical = normalized === "done" || normalized === "closed" ? "fixed" : normalized;
  return STATUSES.has(canonical) ? canonical as ReviewFindingStatus : undefined;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
