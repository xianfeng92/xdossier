import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildCoverEdges } from "../src/cover/edges.js";
import { scanArtifacts } from "../src/cover/scan.js";
import { createReviewPacket, defaultReviewPacketPath } from "../src/review/packet.js";
import { buildReviewLoopSummary } from "../src/review/extract.js";

async function makeReviewWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dossier-review-"));
  await mkdir(join(root, "docs/specs"), { recursive: true });
  await mkdir(join(root, "docs/changes"), { recursive: true });
  await mkdir(join(root, "docs/reviews"), { recursive: true });
  await writeFile(
    join(root, "docs/specs/2026-05-22-review-loop-spec.md"),
    `---
title: Review Loop Spec
status: ready
kind: mvp-spec
updated: 2026-05-22
reviews:
  - docs/reviews/2026-05-22-review-loop-review.md
---

# Review Loop Spec

## Decision: Keep review local

The packet should not call a remote service.

## Open Questions

- [ ] Decide whether packet output should default to stdout.
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/changes/2026-05-22-review-loop-impl.md"),
    `---
title: Review Loop Impl
status: implemented
kind: change
implements:
  - docs/specs/2026-05-22-review-loop-spec.md
---

# Review Loop Impl
`,
    "utf8",
  );
  await writeFile(
    join(root, "docs/reviews/2026-05-22-review-loop-review.md"),
    `---
title: Review Loop Review
kind: review
status: needs-rework
reviews_target:
  - docs/specs/2026-05-22-review-loop-spec.md
verdict: NEEDS_REWORK
---

# Review Loop Review

## Verdict

NEEDS_REWORK - one blocker remains.

## Findings

| ID | Severity | One-line | Status |
|---|---|---|---|
| F1 | P0 | Packet omits the suggested review path. | open |
| F2 | P2 | Cover copy needs a clearer fixed-state label. | fixed |

### F3 (P1) - Cover does not surface review blockers

- File: src/cover/render.ts
- Evidence: Review docs are scanned but not summarized.
- Status: open

- [P3] Minor wording issue in generated checklist
  - Status: deferred
`,
    "utf8",
  );
  return root;
}

describe("review packet", () => {
  test("generates a deterministic packet for a target artifact", async () => {
    const root = await makeReviewWorkspace();
    const artifacts = await scanArtifacts(root);
    const edges = buildCoverEdges(artifacts);

    const packet = createReviewPacket({
      workspaceRoot: root,
      targetPath: "docs/specs/2026-05-22-review-loop-spec.md",
      artifacts,
      edges,
      today: "2026-05-22",
    });

    expect(packet.suggestedReviewPath).toBe("docs/reviews/2026-05-22-review-loop-spec-review.md");
    expect(packet.markdown).toContain("# Dossier Review Packet");
    expect(packet.markdown).toContain("Target: `docs/specs/2026-05-22-review-loop-spec.md`");
    expect(packet.markdown).toContain("Title: Review Loop Spec");
    expect(packet.markdown).toContain("Suggested review doc: `docs/reviews/2026-05-22-review-loop-spec-review.md`");
    expect(packet.markdown).toContain("Review Loop Impl");
    expect(packet.markdown).toContain("Correctness and behavioral regressions");
    expect(packet.markdown).toContain("## Expected Review Output");
    expect(packet.markdown).toContain("reviews_target:");
  });

  test("computes the default review packet path under .dossier", () => {
    expect(defaultReviewPacketPath("docs/specs/2026-05-22-review-loop-spec.md", "2026-05-22"))
      .toBe(".dossier/review-packets/2026-05-22-review-loop-spec-review-packet.md");
  });

  test("xdossier review writes a packet file", async () => {
    const root = await makeReviewWorkspace();
    const cliPath = join(import.meta.dirname, "../src/cli.ts");
    const outPath = join(root, ".dossier/review-packets/custom-packet.md");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "review", join(root, "docs/specs/2026-05-22-review-loop-spec.md"), "-o", outPath],
      { cwd: join(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`wrote ${outPath}`);
    const packet = await readFile(outPath, "utf8");
    expect(packet).toContain("# Dossier Review Packet");
    expect(packet).toContain("Review Loop Spec");
  });
});

describe("review extraction", () => {
  test("extracts review findings from tables, headings, and bullets", async () => {
    const root = await makeReviewWorkspace();
    const artifacts = await scanArtifacts(root);

    const summary = buildReviewLoopSummary(artifacts);

    expect(summary.review_count).toBe(1);
    expect(summary.open_count).toBe(2);
    expect(summary.blocker_count).toBe(2);
    expect(summary.fixed_count).toBe(1);
    expect(summary.deferred_count).toBe(1);
    expect(summary.reviews[0]).toMatchObject({
      verdict: "NEEDS_REWORK",
      status: "needs-rework",
      path: "docs/reviews/2026-05-22-review-loop-review.md",
    });
    expect(summary.findings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      status: finding.status,
      title: finding.title,
    }))).toEqual([
      {
        id: "F1",
        severity: "P0",
        status: "open",
        title: "Packet omits the suggested review path.",
      },
      {
        id: "F2",
        severity: "P2",
        status: "fixed",
        title: "Cover copy needs a clearer fixed-state label.",
      },
      {
        id: "F3",
        severity: "P1",
        status: "open",
        title: "Cover does not surface review blockers",
      },
      {
        id: "B1",
        severity: "P3",
        status: "deferred",
        title: "Minor wording issue in generated checklist",
      },
    ]);
  });
});
