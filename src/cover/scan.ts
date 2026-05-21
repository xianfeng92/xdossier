import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseFrontmatter } from "../parse/frontmatter.js";
import type { CoverArtifact, CoverKind, CoverStatus } from "./types.js";

const SCAN_DIRS = ["docs/specs", "docs/changes", "docs/reviews"];

export async function scanArtifacts(workspaceRoot: string): Promise<CoverArtifact[]> {
  const root = resolve(workspaceRoot);
  const artifactPaths = new Set<string>();

  for (const scanDir of SCAN_DIRS) {
    const dir = join(root, scanDir);
    if (!existsSync(dir)) continue;
    for (const file of await listMarkdownFiles(dir)) {
      artifactPaths.add(toWorkspacePath(root, file));
    }
  }

  const artifacts = new Map<string, CoverArtifact>();
  const queue = [...artifactPaths].sort();

  while (queue.length > 0) {
    const artifactPath = queue.shift();
    if (!artifactPath || artifacts.has(artifactPath)) continue;

    const artifact = await readArtifact(root, artifactPath);
    artifacts.set(artifact.path, artifact);

    for (const ref of [
      ...artifact.implements,
      ...artifact.reviews,
      ...artifact.reviews_target,
    ]) {
      if (!artifacts.has(ref) && !queue.includes(ref)) {
        queue.push(ref);
        queue.sort();
      }
    }
  }

  return [...artifacts.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(abs);
    }
  }

  return files.sort();
}

async function readArtifact(root: string, workspacePath: string): Promise<CoverArtifact> {
  const abs = join(root, workspacePath);
  const markdown = await readFile(abs, "utf8");
  const parsed = parseFrontmatter(markdown);
  const frontmatter = parsed.data;
  const kind = normalizeKind(frontmatter.kind) ?? inferKind(workspacePath);
  const status = normalizeStatus(frontmatter.status);
  const title = stringValue(frontmatter.title) || firstHeading(parsed.content) || titleFromPath(workspacePath);
  const updatedAt = dateValue(frontmatter.updated) || dateValue(frontmatter.created);

  return {
    id: workspacePath,
    path: workspacePath,
    title,
    kind,
    status,
    frontmatter,
    raw_content: markdown,
    content: parsed.content,
    updated_at: updatedAt || undefined,
    implements: resolveRefs(root, dirname(abs), arrayValue(frontmatter.implements)),
    reviews: resolveRefs(root, dirname(abs), arrayValue(frontmatter.reviews)),
    reviews_target: resolveRefs(root, dirname(abs), arrayValue(frontmatter.reviews_target)),
  };
}

function resolveRefs(root: string, sourceDir: string, refs: string[]): string[] {
  return refs
    .map((ref) => resolveRef(root, sourceDir, ref))
    .filter((ref): ref is string => Boolean(ref))
    .sort();
}

function resolveRef(root: string, sourceDir: string, ref: string): string | null {
  const cleanRef = ref.split("#")[0]?.trim();
  if (!cleanRef || !cleanRef.endsWith(".md")) return null;

  const absoluteCandidate = isAbsolute(cleanRef)
    ? cleanRef
    : join(root, cleanRef);
  if (existsSync(absoluteCandidate)) {
    return toWorkspacePath(root, absoluteCandidate);
  }

  const relativeCandidate = join(sourceDir, cleanRef);
  if (existsSync(relativeCandidate)) {
    return toWorkspacePath(root, relativeCandidate);
  }

  return null;
}

function toWorkspacePath(root: string, abs: string): string {
  return relative(root, abs).split(/[/\\]/).join("/");
}

function firstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function titleFromPath(filepath: string): string {
  return basename(filepath, ".md")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferKind(filepath: string): CoverKind {
  if (filepath.startsWith("docs/changes/")) return "change";
  if (filepath.startsWith("docs/reviews/")) return "review";
  if (filepath.startsWith("docs/specs/") && filepath.includes("vision")) return "vision-spec";
  if (filepath.startsWith("docs/specs/") && filepath.includes("mvp")) return "mvp-spec";
  if (filepath.startsWith("docs/specs/") && filepath.includes("adr")) return "adr";
  if (filepath.startsWith("docs/specs/")) return "design";
  return "other";
}

function normalizeKind(value: unknown): CoverKind | null {
  if (typeof value !== "string") return null;
  if (
    value === "vision-spec" ||
    value === "mvp-spec" ||
    value === "adr" ||
    value === "change" ||
    value === "review" ||
    value === "note" ||
    value === "design" ||
    value === "other"
  ) {
    return value;
  }
  if (value === "spec") return "design";
  return null;
}

function normalizeStatus(value: unknown): CoverStatus | undefined {
  if (
    value === "draft" ||
    value === "ready" ||
    value === "implemented" ||
    value === "archived"
  ) {
    return value;
  }
  return undefined;
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}

function dateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}
