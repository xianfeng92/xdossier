import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { escapeHtml } from "../parse/markdown.js";
import type { Dossier } from "./cluster.js";
import type { CoverArtifact } from "./types.js";

export type MembershipRole = "root" | "member" | "orphan";

export type MembershipEntry = {
  dossier_id: string | null;
  dossier_title?: string;
  cover_href: string;
  member_count?: number;
  role: MembershipRole;
};

export type MembershipLookup = {
  version: 1;
  workspace_root: string;
  generated_at: string;
  members: Record<string, MembershipEntry>;
};

export async function writeMembershipLookup(input: {
  workspaceRoot: string;
  outDir: string;
  generatedAt: string;
  dossiers: Dossier[];
  orphans: CoverArtifact[];
}): Promise<void> {
  const members: MembershipLookup["members"] = {};

  for (const dossier of input.dossiers) {
    const memberCount = dossier.members.length;
    for (const artifact of dossier.members) {
      members[artifact.path] = {
        dossier_id: dossier.id,
        dossier_title: dossier.root.title,
        cover_href: coverHrefForDossier(dossier.id),
        member_count: memberCount,
        role: artifact.path === dossier.root.path ? "root" : "member",
      };
    }
  }

  for (const artifact of input.orphans) {
    members[artifact.path] = {
      dossier_id: null,
      dossier_title: "Project index",
      cover_href: "../../.dossier/out/index.html",
      role: "orphan",
    };
  }

  const lookup: MembershipLookup = {
    version: 1,
    workspace_root: input.workspaceRoot,
    generated_at: input.generatedAt,
    members,
  };

  await writeFile(join(input.outDir, "membership.json"), `${JSON.stringify(lookup, null, 2)}\n`, "utf8");
}

export async function renderDossierBannerForInput(inputPath: string): Promise<string | undefined> {
  const workspaceRoot = findMembershipWorkspaceRoot(inputPath);
  if (!workspaceRoot) return undefined;

  let lookup: MembershipLookup;
  try {
    lookup = JSON.parse(await readFile(join(workspaceRoot, ".dossier/out/membership.json"), "utf8")) as MembershipLookup;
  } catch {
    return undefined;
  }

  if (lookup.version !== 1 || typeof lookup.members !== "object" || lookup.members === null) {
    return undefined;
  }

  const memberPath = relative(workspaceRoot, resolve(inputPath)).split(sep).join("/");
  if (memberPath.startsWith("..")) return undefined;

  const entry = lookup.members[memberPath];
  if (!isMembershipEntry(entry)) return undefined;
  return renderDossierBanner(entry);
}

function findMembershipWorkspaceRoot(inputPath: string): string | undefined {
  let current = dirname(resolve(inputPath));

  while (true) {
    if (
      existsSync(join(current, ".dossier/out/membership.json")) &&
      (existsSync(join(current, "docs/specs")) ||
        existsSync(join(current, "docs/changes")) ||
        existsSync(join(current, "docs/reviews")))
    ) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function renderDossierBanner(entry: MembershipEntry): string | undefined {
  if (entry.role === "orphan") {
    return `<a class="dossier-banner" href="${escapeAttribute(entry.cover_href)}" data-role="orphan">
  <span class="dossier-banner-arrow">↩</span>
  <span class="dossier-banner-label">unassigned ·</span>
  <span class="dossier-banner-title">project index</span>
</a>`;
  }

  if (!entry.dossier_id || !entry.dossier_title || typeof entry.member_count !== "number") {
    return undefined;
  }

  return `<a class="dossier-banner" href="${escapeAttribute(entry.cover_href)}" data-dossier-id="${escapeAttribute(entry.dossier_id)}" data-role="${escapeAttribute(entry.role)}">
  <span class="dossier-banner-arrow">↩</span>
  <span class="dossier-banner-label">in dossier:</span>
  <span class="dossier-banner-title">${escapeHtml(entry.dossier_title)}</span>
  <span class="dossier-banner-meta">· ${entry.member_count} docs</span>
</a>`;
}

function isMembershipEntry(value: unknown): value is MembershipEntry {
  if (!isRecord(value)) return false;
  if (value.role !== "root" && value.role !== "member" && value.role !== "orphan") return false;
  if (typeof value.cover_href !== "string") return false;
  if (value.role === "orphan") return true;
  return (
    typeof value.dossier_id === "string" &&
    typeof value.dossier_title === "string" &&
    typeof value.member_count === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coverHrefForDossier(dossierId: string): string {
  return `../../.dossier/out/${dossierId}/index.html`;
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
