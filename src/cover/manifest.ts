import { existsSync } from "node:fs";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseFrontmatter } from "../parse/frontmatter.js";
import { extractOpenQuestions } from "./extract.js";
import type { BuildManifest, CoverArtifact, CoverKind, CoverOpenQuestion, CoverStatus } from "./types.js";

const MANIFEST_VERSION = 1;
const SCAN_DIRS = ["docs/specs", "docs/changes", "docs/reviews"];
const execFileAsync = promisify(execFile);

export function defaultManifestPath(workspaceRoot: string): string {
  return join(workspaceRoot, ".dossier/build-manifest.json");
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function openQuestionHash(question: Pick<CoverOpenQuestion, "source_artifact" | "title">): string {
  return contentHash(`${question.source_artifact}\u0000${question.title}`);
}

export function createBuildManifest(
  workspaceRoot: string,
  artifacts: CoverArtifact[],
): BuildManifest {
  return {
    version: MANIFEST_VERSION,
    built_at: new Date().toISOString(),
    workspace_root: workspaceRoot,
    artifacts: artifacts.map((artifact) => ({
      path: artifact.path,
      title: artifact.title,
      kind: artifact.kind,
      status: artifact.status,
      updated_at: artifact.updated_at,
      content_hash: contentHash(artifact.raw_content),
      open_question_hashes: openQuestionHashes(artifact),
    })),
  };
}

export async function readBaselineManifest(
  workspaceRoot: string,
  since: string | undefined,
): Promise<BuildManifest | undefined> {
  if (!since) return undefined;

  const candidate = since === "last"
    ? defaultManifestPath(workspaceRoot)
    : isAbsolute(since)
      ? since
      : resolve(workspaceRoot, since);

  if (existsSync(candidate)) {
    return readManifest(candidate);
  }

  if (since === "last") return undefined;

  try {
    return await readGitRefManifest(workspaceRoot, since);
  } catch (error) {
    if (looksLikeManifestPath(since)) {
      throw new Error(`baseline manifest not found for --since ${since}`);
    }
    throw new Error(`baseline manifest or git ref not found for --since ${since}: ${(error as Error).message}`);
  }
}

async function readManifest(path: string): Promise<BuildManifest> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as BuildManifest;
  if (parsed.version !== MANIFEST_VERSION || !Array.isArray(parsed.artifacts)) {
    throw new Error(`unsupported build manifest: ${path}`);
  }
  return parsed;
}

async function readGitRefManifest(
  workspaceRoot: string,
  ref: string,
): Promise<BuildManifest> {
  const workspaceRealPath = await realpath(workspaceRoot);
  const gitRoot = await realpath((await git(workspaceRoot, ["rev-parse", "--show-toplevel"])).trim());
  await git(workspaceRoot, ["rev-parse", "--verify", `${ref}^{tree}`]);

  const workspacePrefix = normalizePath(relative(gitRoot, workspaceRealPath));
  const pathspecs = SCAN_DIRS.map((dir) =>
    workspacePrefix && workspacePrefix !== "."
      ? `${workspacePrefix}/${dir}`
      : dir,
  );
  const output = await git(workspaceRoot, [
    "ls-tree",
    "-r",
    "--name-only",
    ref,
    "--",
    ...pathspecs,
  ]);
  const treePaths = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md"))
    .sort();
  const artifacts = [];

  for (const treePath of treePaths) {
    const content = await git(workspaceRoot, ["show", `${ref}:${treePath}`]);
    const workspacePath = toWorkspacePath(workspacePrefix, treePath);
    const parsed = parseFrontmatter(content);
    const artifact: CoverArtifact = {
      id: workspacePath,
      path: workspacePath,
      title: stringValue(parsed.data.title) || firstHeading(parsed.content) || titleFromPath(workspacePath),
      kind: normalizeKind(parsed.data.kind) ?? inferKind(workspacePath),
      status: normalizeStatus(parsed.data.status),
      frontmatter: parsed.data,
      raw_content: content,
      content: parsed.content,
      updated_at: dateValue(parsed.data.updated) || dateValue(parsed.data.created) || undefined,
      implements: [],
      reviews: [],
      reviews_target: [],
    };
    artifacts.push({
      path: artifact.path,
      title: artifact.title,
      kind: artifact.kind,
      status: artifact.status,
      updated_at: artifact.updated_at,
      content_hash: contentHash(artifact.raw_content),
      open_question_hashes: openQuestionHashes(artifact),
    });
  }

  return {
    version: MANIFEST_VERSION,
    built_at: new Date().toISOString(),
    workspace_root: workspaceRoot,
    artifacts,
  };
}

function openQuestionHashes(artifact: CoverArtifact): string[] {
  return extractOpenQuestions([artifact])
    .map(openQuestionHash)
    .sort();
}

export async function writeBuildManifest(
  workspaceRoot: string,
  manifest: BuildManifest,
): Promise<string> {
  const manifestPath = defaultManifestPath(workspaceRoot);
  await mkdir(join(workspaceRoot, ".dossier"), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function looksLikeManifestPath(value: string): boolean {
  return value.endsWith(".json") || value.startsWith(".") || value.includes("\\");
}

function toWorkspacePath(workspacePrefix: string, treePath: string): string {
  const normalized = normalizePath(treePath);
  if (!workspacePrefix || workspacePrefix === ".") return normalized;
  const prefix = `${workspacePrefix}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

function normalizePath(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).join("/");
}

function firstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function titleFromPath(filepath: string): string {
  return filepath
    .split("/")
    .at(-1)
    ?.replace(/\.md$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") ?? filepath;
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

function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}

function dateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value : "";
}
