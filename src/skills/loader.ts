// Skill loader — scans src/skills/*/SKILL.md and returns SkillMeta[].
// Cached per-process; small set, no need for invalidation in MVP-0.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import type { SkillMeta } from "../types.js";

let cache: SkillMeta[] | null = null;

function skillsRoot(): string {
  // src/skills/loader.ts → src/skills/
  const here = dirname(fileURLToPath(import.meta.url));
  return here;
}

export function loadAllSkills(): SkillMeta[] {
  if (cache) return cache;

  const root = skillsRoot();
  const entries = readdirSync(root);
  const skills: SkillMeta[] = [];

  for (const name of entries) {
    const dir = join(root, name);
    let isDir: boolean;
    try {
      isDir = statSync(dir).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    const skillMdPath = join(dir, "SKILL.md");
    let raw: string;
    try {
      raw = readFileSync(skillMdPath, "utf8");
    } catch {
      // Directory without SKILL.md is ignored (e.g. future shared/ for helpers).
      continue;
    }

    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const id = typeof fm.name === "string" ? fm.name : name;

    skills.push({
      id,
      name: typeof fm.label === "string" ? fm.label : id,
      description: typeof fm.description === "string" ? fm.description : undefined,
      applies_to: (fm.applies_to as SkillMeta["applies_to"]) ?? {},
      dir,
    });
  }

  cache = skills;
  return skills;
}

/** Test helper: discard cached registry. Not for production use. */
export function _resetCache(): void {
  cache = null;
}
