// Skill dispatch — per MVP-0 spec §6.5.
// Layers are evaluated from explicit user intent to broader structural hints.

import { basename, dirname } from "node:path";
import type {
  SkillId,
  SkillMeta,
  SkillSelection,
  SkillSelectionInput,
  SkillSelectionReason,
} from "../types.js";
import { loadAllSkills } from "./loader.js";

const FALLBACK: SkillId = "render-spec";

export function selectSkill(input: SkillSelectionInput): SkillSelection {
  const skills = loadAllSkills();
  const has = (id: SkillId) => skills.some((s) => s.id === id);

  // Layer 1: CLI override.
  if (input.cliOverride) {
    if (!has(input.cliOverride)) {
      throw new Error(`unknown skill: ${input.cliOverride}`);
    }
    return { skillId: input.cliOverride, reason: "cli-flag" };
  }

  // Layer 2: frontmatter render_skill.
  const fmSkill = input.frontmatter.render_skill;
  if (typeof fmSkill === "string") {
    if (!has(fmSkill)) {
      throw new Error(
        `frontmatter render_skill names an unknown skill: ${fmSkill}`,
      );
    }
    return { skillId: fmSkill, reason: "frontmatter-render-skill" };
  }

  // Layer 3: frontmatter kind.
  const fmKind = input.frontmatter.kind;
  if (typeof fmKind === "string") {
    const matches = skills.filter((s) =>
      s.applies_to.frontmatter_kind?.includes(fmKind),
    );
    if (matches.length) return pickByPriority(matches, "frontmatter-kind");
  }

  // Layer 4: filename patterns.
  const filename = basename(input.filepath);
  const filenameMatches = skills.filter((s) =>
    s.applies_to.filename_patterns?.some((pattern) => matchesGlob(filename, pattern)),
  );
  if (filenameMatches.length) return pickByPriority(filenameMatches, "filename-pattern");

  // Layer 5: directory patterns.
  const directory = normalizePath(dirname(input.filepath));
  const directoryMatches = skills.filter((s) =>
    s.applies_to.directory_patterns?.some((pattern) => matchesDirectoryPattern(directory, pattern)),
  );
  if (directoryMatches.length) return pickByPriority(directoryMatches, "directory-pattern");

  // Layer 6: fallback.
  if (!has(FALLBACK)) {
    throw new Error(
      `internal: fallback skill ${FALLBACK} not found in registry`,
    );
  }
  return { skillId: FALLBACK, reason: "fallback" };
}

function matchesDirectoryPattern(directory: string, pattern: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return directory === prefix ||
      directory.endsWith(`/${prefix}`) ||
      directory.includes(`/${prefix}/`) ||
      directory.startsWith(`${prefix}/`);
  }
  if (matchesGlob(directory, normalizedPattern)) return true;
  return new RegExp(`(?:^|/)${globBody(normalizedPattern)}$`).test(directory);
}

function matchesGlob(value: string, pattern: string): boolean {
  return new RegExp(`^${globBody(normalizePath(pattern))}$`).test(normalizePath(value));
}

function globBody(pattern: string): string {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        out += ".*";
        i++;
      } else {
        out += "[^/]*";
      }
    } else {
      out += escapeRegex(char ?? "");
    }
  }
  return out;
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function pickByPriority(
  matches: SkillMeta[],
  reason: SkillSelectionReason,
): SkillSelection {
  const sorted = [...matches].sort(
    (a, b) => (b.applies_to.priority ?? 0) - (a.applies_to.priority ?? 0),
  );
  return {
    skillId: sorted[0].id,
    reason,
    matched_skills: sorted.length > 1 ? sorted.map((s) => s.id) : undefined,
  };
}
