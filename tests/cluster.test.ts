import { describe, expect, test } from "vitest";
import { clusterArtifacts } from "../src/cover/cluster.js";
import type { CoverArtifact, CoverKind, CoverStatus } from "../src/cover/types.js";

type ArtifactInput = {
  path: string;
  kind?: CoverKind;
  title?: string;
  status?: CoverStatus;
  implements?: string[];
  reviews?: string[];
  reviews_target?: string[];
};

function mkArtifact(opts: ArtifactInput): CoverArtifact {
  return {
    id: opts.path,
    path: opts.path,
    title: opts.title ?? opts.path,
    kind: opts.kind ?? "change",
    status: opts.status,
    frontmatter: {},
    raw_content: "",
    content: "",
    implements: opts.implements ?? [],
    reviews: opts.reviews ?? [],
    reviews_target: opts.reviews_target ?? [],
  };
}

function memberPaths(dossierId: string, artifacts: CoverArtifact[]): string[] {
  const dossier = clusterArtifacts(artifacts).dossiers.find((item) => item.id === dossierId);
  return dossier?.members.map((member) => member.path) ?? [];
}

describe("clusterArtifacts", () => {
  test("clusters a spec, impl-notes, and review that share a filename stem", () => {
    const artifacts = [
      mkArtifact({ path: "docs/specs/2026-05-22-foo-spec.md", kind: "design" }),
      mkArtifact({ path: "docs/changes/2026-05-22-foo-impl-notes.md" }),
      mkArtifact({ path: "docs/reviews/2026-05-22-foo-review.md", kind: "review" }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.dossiers).toHaveLength(1);
    expect(result.orphans).toHaveLength(0);
    expect(result.dossiers[0]?.members).toHaveLength(3);
    expect(result.dossiers[0]?.members[0]?.path).toBe("docs/specs/2026-05-22-foo-spec.md");
    expect(result.dossiers[0]?.scores.get("docs/specs/2026-05-22-foo-spec.md")).toBe(Infinity);
  });

  test("assigns a member using a root frontmatter implements signal without filename match", () => {
    const artifacts = [
      mkArtifact({
        path: "specs/2026-05-22-foo-spec.md",
        kind: "mvp-spec",
        implements: ["docs/changes/x.md"],
      }),
      mkArtifact({ path: "docs/changes/x.md" }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.orphans).toHaveLength(0);
    expect(result.dossiers[0]?.members.map((member) => member.path)).toContain("docs/changes/x.md");
    expect(result.dossiers[0]?.scores.get("docs/changes/x.md")).toBe(100);
  });

  test("assigns a member using a bidirectional implements signal from member to root", () => {
    const specPath = "specs/2026-05-22-foo-spec.md";
    const artifacts = [
      mkArtifact({ path: specPath, kind: "vision-spec" }),
      mkArtifact({ path: "docs/changes/2026-05-23-unrelated-impl-notes.md", implements: [specPath] }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.orphans).toHaveLength(0);
    expect(result.dossiers[0]?.scores.get("docs/changes/2026-05-23-unrelated-impl-notes.md")).toBe(80);
  });

  test("keeps multiple roots in their correct clusters without cross-contamination", () => {
    const alphaSpec = "docs/specs/2026-05-22-alpha-spec.md";
    const betaSpec = "docs/specs/2026-05-22-beta-spec.md";
    const artifacts = [
      mkArtifact({
        path: alphaSpec,
        kind: "design",
        implements: ["docs/changes/alpha-frontmatter.md"],
        reviews: ["docs/reviews/alpha-frontmatter.md"],
      }),
      mkArtifact({
        path: betaSpec,
        kind: "mvp-spec",
        implements: ["docs/changes/beta-frontmatter.md"],
      }),
      mkArtifact({ path: "docs/changes/alpha-frontmatter.md" }),
      mkArtifact({ path: "docs/reviews/alpha-frontmatter.md", kind: "review" }),
      mkArtifact({ path: "docs/changes/beta-frontmatter.md" }),
      mkArtifact({ path: "docs/changes/2026-05-22-beta-impl-notes.md" }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.dossiers).toHaveLength(2);
    expect(result.orphans).toHaveLength(0);
    expect(memberPaths("2026-05-22-alpha", artifacts)).toEqual([
      alphaSpec,
      "docs/changes/alpha-frontmatter.md",
      "docs/reviews/alpha-frontmatter.md",
    ]);
    expect(memberPaths("2026-05-22-beta", artifacts)).toEqual([
      betaSpec,
      "docs/changes/beta-frontmatter.md",
      "docs/changes/2026-05-22-beta-impl-notes.md",
    ]);
  });

  test("leaves an unrelated change as an orphan", () => {
    const artifacts = [
      mkArtifact({ path: "docs/specs/2026-05-22-foo-spec.md", kind: "design" }),
      mkArtifact({ path: "docs/changes/2026-05-23-bar-impl-notes.md" }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.orphans.map((artifact) => artifact.path)).toEqual([
      "docs/changes/2026-05-23-bar-impl-notes.md",
    ]);
    expect(result.dossiers[0]?.members).toHaveLength(1);
  });

  test("returns all artifacts as orphans when no roots exist", () => {
    const artifacts = [
      mkArtifact({ path: "docs/changes/2026-05-22-foo-impl-notes.md" }),
      mkArtifact({ path: "docs/reviews/2026-05-22-foo-review.md", kind: "review" }),
    ];

    const result = clusterArtifacts(artifacts);

    expect(result.dossiers).toEqual([]);
    expect(result.orphans).toEqual(artifacts);
    expect(result.trace).toEqual([]);
  });

  test("records readable signal names in trace tuples", () => {
    const artifacts = [
      mkArtifact({
        path: "docs/specs/2026-05-22-foo-spec.md",
        kind: "design",
        implements: ["docs/changes/2026-05-22-foo-impl-notes.md"],
      }),
      mkArtifact({ path: "docs/changes/2026-05-22-foo-impl-notes.md" }),
    ];

    const result = clusterArtifacts(artifacts);
    const trace = result.trace.find((entry) => entry.artifact === "docs/changes/2026-05-22-foo-impl-notes.md");

    expect(trace?.root).toBe("docs/specs/2026-05-22-foo-spec.md");
    expect(trace?.signals).toEqual(
      expect.arrayContaining(["spec.implements lists member", "filename stem match"]),
    );
  });
});
