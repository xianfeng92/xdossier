// Groups cover artifacts into topic-rooted dossiers.
import { basename } from "node:path";
import type { CoverArtifact } from "./types.js";

export type Dossier = {
  id: string;
  root: CoverArtifact;
  members: CoverArtifact[];
  scores: Map<string, number>;
};

export type ClusterResult = {
  dossiers: Dossier[];
  orphans: CoverArtifact[];
  trace: Array<{ artifact: string; root: string; score: number; signals: string[] }>;
};

type ScoreResult = {
  score: number;
  signals: string[];
};

const ROOT_KINDS: readonly string[] = ["vision-spec", "mvp-spec", "design", "spec"];
const STEM_SUFFIXES = ["-impl-notes", "-review", "-spec"];

export function clusterArtifacts(artifacts: CoverArtifact[]): ClusterResult {
  const roots = artifacts.filter(isRootCandidate).sort((a, b) => a.path.localeCompare(b.path));
  if (roots.length === 0) {
    return { dossiers: [], orphans: artifacts, trace: [] };
  }

  const rootPaths = new Set(roots.map((root) => root.path));
  const dossiers = roots.map((root): Dossier => ({
    id: filenameStem(root.path),
    root,
    members: [root],
    scores: new Map([[root.path, Infinity]]),
  }));
  const dossierByRootPath = new Map(dossiers.map((dossier) => [dossier.root.path, dossier]));
  const orphans: CoverArtifact[] = [];
  const trace: ClusterResult["trace"] = [];

  for (const artifact of artifacts) {
    if (rootPaths.has(artifact.path)) continue;

    const best = bestRootFor(artifact, roots);
    trace.push({
      artifact: artifact.path,
      root: best.root.path,
      score: best.score.score,
      signals: best.score.signals,
    });

    if (best.score.score >= 60) {
      const dossier = dossierByRootPath.get(best.root.path);
      dossier?.members.push(artifact);
      dossier?.scores.set(artifact.path, best.score.score);
    } else {
      orphans.push(artifact);
    }
  }

  return { dossiers, orphans, trace };
}

function isRootCandidate(artifact: CoverArtifact): boolean {
  if (ROOT_KINDS.includes(artifact.kind)) return true;
  return artifact.kind === "other" && filenameBase(artifact.path).endsWith("-spec");
}

function bestRootFor(artifact: CoverArtifact, roots: CoverArtifact[]): { root: CoverArtifact; score: ScoreResult } {
  let bestRoot = roots[0];
  let bestScore = bestRoot ? scoreAgainstRoot(artifact, bestRoot) : { score: 0, signals: [] };

  for (const root of roots.slice(1)) {
    const score = scoreAgainstRoot(artifact, root);
    const betterScore = score.score > bestScore.score;
    const tieWithEarlierPath = score.score === bestScore.score && root.path.localeCompare(bestRoot.path) < 0;
    if (betterScore || tieWithEarlierPath) {
      bestRoot = root;
      bestScore = score;
    }
  }

  return { root: bestRoot, score: bestScore };
}

function scoreAgainstRoot(artifact: CoverArtifact, root: CoverArtifact): ScoreResult {
  let score = 0;
  const signals: string[] = [];

  if (root.implements.includes(artifact.path)) {
    score += 100;
    signals.push("spec.implements lists member");
  }
  if (root.reviews.includes(artifact.path)) {
    score += 100;
    signals.push("spec.reviews lists member");
  }
  if (artifact.implements.includes(root.path)) {
    score += 80;
    signals.push("member.implements lists spec");
  }
  if (artifact.reviews_target.includes(root.path)) {
    score += 80;
    signals.push("member.reviews_target lists spec");
  }
  if (filenameStem(artifact.path) === filenameStem(root.path)) {
    score += 60;
    signals.push("filename stem match");
  }
  if (prefixOverlapRatio(filenameStem(artifact.path), filenameStem(root.path)) >= 0.8) {
    score += 30;
    signals.push("filename prefix overlap >= 0.8");
  }
  // The spec allows the simplest docs-subtree interpretation: both paths under docs/.
  if (artifact.path.startsWith("docs/") && root.path.startsWith("docs/")) {
    score += 5;
    signals.push("same docs subtree");
  }

  return { score, signals };
}

function filenameStem(filepath: string): string {
  const base = filenameBase(filepath);
  const suffix = STEM_SUFFIXES.find((item) => base.endsWith(item));
  return suffix ? base.slice(0, -suffix.length) : base;
}

function filenameBase(filepath: string): string {
  return basename(filepath).replace(/\.[^.]+$/, "");
}

function prefixOverlapRatio(leftStem: string, rightStem: string): number {
  const left = tokens(leftStem);
  const right = tokens(rightStem);
  const length = Math.max(left.length, right.length);
  if (length === 0) return 0;

  let matching = 0;
  while (matching < left.length && matching < right.length && left[matching] === right[matching]) {
    matching += 1;
  }

  return matching / length;
}

function tokens(stem: string): string[] {
  return stem.split("-").filter(Boolean);
}
