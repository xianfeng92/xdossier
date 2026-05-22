import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseAnnotationsJson } from "../src/annotations.js";
import { validateEnrichmentContract } from "../src/enrich/contract.js";

const markdown = `---
title: Contract Demo
---

# Contract Demo

## Context

Explain the source.

### Detail

Nested detail.

## Decision

Choose the contract.
`;

const validAnnotations = {
  schema_version: 2,
  contract: {
    name: "dossier-ai-enrichment",
    version: "0.4",
    producer: "dossier-enrich:test",
    created_at: "2026-05-23",
  },
  document_overview: {
    summary: "Contract demo.",
  },
  reading_path: [
    { label: "Context", section_id: "s1", description: "Start here." },
    { label: "Detail", section_id: "s1-1", description: "Nested detail." },
  ],
  semantic_blocks: [
    {
      type: "decision_grid",
      title: "Decisions",
      source_section_id: "s2",
      items: [
        {
          label: "Contract",
          value: "v0.4",
          rationale: "Validate AI output.",
          section_id: "s2",
        },
      ],
    },
  ],
  section_summaries: [
    { section_id: "s1", summary: "Explain the source." },
    { section_id: "s2", summary: "Choose the contract." },
  ],
  checkpoints: [
    { section_id: "s1", items: ["Explain the source anchor."] },
  ],
  analogies: [
    { section_id: "s2", concept: "contract", analogy: "contract 就像闸门，因为它挡住坏注解" },
  ],
};

async function makeWorkspace(): Promise<{ root: string; mdPath: string; annotationsPath: string; badAnnotationsPath: string }> {
  const root = await mkdtemp(join(tmpdir(), "dossier-contract-"));
  await mkdir(join(root, "docs/specs"), { recursive: true });
  const mdPath = join(root, "docs/specs/contract-demo.md");
  const annotationsPath = join(root, "docs/specs/contract-demo.annotations.json");
  const badAnnotationsPath = join(root, "docs/specs/contract-demo.bad.annotations.json");
  await writeFile(mdPath, markdown, "utf8");
  await writeFile(annotationsPath, `${JSON.stringify(validAnnotations, null, 2)}\n`, "utf8");
  await writeFile(badAnnotationsPath, `${JSON.stringify({
    ...validAnnotations,
    section_summaries: [
      { section_id: "s999", summary: "Missing." },
    ],
  }, null, 2)}\n`, "utf8");
  return { root, mdPath, annotationsPath, badAnnotationsPath };
}

describe("AI enrichment contract", () => {
  test("validates source-aware annotation references", () => {
    const annotations = parseAnnotationsJson(JSON.stringify(validAnnotations));

    const report = validateEnrichmentContract({
      markdown,
      annotations,
      sourceLabel: "contract-demo.annotations.json",
    });

    expect(report).toMatchObject({
      ok: true,
      error_count: 0,
      warning_count: 0,
      anchor_count: 3,
      reference_count: 8,
    });
  });

  test("reports annotations that point at missing source anchors", () => {
    const annotations = parseAnnotationsJson(JSON.stringify({
      ...validAnnotations,
      section_summaries: [
        { section_id: "s999", summary: "Missing." },
      ],
      reading_path: [
        { label: "Ghost", section_id: "s3", description: "No such section." },
      ],
    }));

    const report = validateEnrichmentContract({
      markdown,
      annotations,
      sourceLabel: "bad.annotations.json",
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toContain("bad.annotations.json: section_summaries[0].section_id references missing source anchor s999");
    expect(report.errors).toContain("bad.annotations.json: reading_path[0].section_id references missing source anchor s3");
  });

  test("validates contract metadata even for programmatic annotations", () => {
    const report = validateEnrichmentContract({
      markdown,
      annotations: {
        ...parseAnnotationsJson(JSON.stringify(validAnnotations)),
        contract: {
          name: "dossier-ai-enrichment",
          version: "0.4",
          producer: "dossier-enrich:test",
          created_at: "today",
        },
      },
      sourceLabel: "programmatic.annotations.json",
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toContain("programmatic.annotations.json: contract.created_at must be YYYY-MM-DD");
  });

  test("contract CLI validates annotation files against source markdown", async () => {
    const { root, mdPath, annotationsPath } = await makeWorkspace();
    const cliPath = join(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "contract", mdPath, "--annotations", annotationsPath],
      { cwd: join(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("contract: ok");
    expect(result.stdout).toContain("8 references");
    expect(root).toBeTruthy();
  });

  test("contract CLI rejects annotation files with missing source anchors", async () => {
    const { mdPath, badAnnotationsPath } = await makeWorkspace();
    const cliPath = join(import.meta.dirname, "../src/cli.ts");

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "contract", mdPath, "--annotations", badAnnotationsPath],
      { cwd: join(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("references missing source anchor s999");
  });

  test("render CLI rejects invalid enrichment contracts before writing HTML", async () => {
    const { mdPath, badAnnotationsPath } = await makeWorkspace();
    const cliPath = join(import.meta.dirname, "../src/cli.ts");
    const outPath = `${mdPath}.html`;

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cliPath, "render", mdPath, "--annotations", badAnnotationsPath, "-o", outPath],
      { cwd: join(import.meta.dirname, ".."), encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("annotation contract failed");
    await expect(readFile(outPath, "utf8")).rejects.toThrow();
  });
});
