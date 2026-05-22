import { describe, expect, test } from "vitest";
import { formatEnrichSummary, formatPedagogySummary, parseArgv } from "../src/cli.js";
import { parseAnnotationsJson } from "../src/annotations.js";

describe("enrich command", () => {
  test("CLI parses enrich input and output path", () => {
    expect(parseArgv(["enrich", "doc.md", "--out", "doc.annotations.json"])).toMatchObject({
      command: "enrich",
      input: "doc.md",
      out: "doc.annotations.json",
      provider: "scaffold",
    });
  });

  test("CLI parses local agent provider options", () => {
    expect(parseArgv(["enrich", "doc.md", "--provider", "claude", "--model", "sonnet"])).toMatchObject({
      command: "enrich",
      input: "doc.md",
      provider: "claude",
      model: "sonnet",
    });
    expect(parseArgv(["enrich", "doc.md", "--provider", "bogus"])).toMatchObject({
      command: "error",
      message: "unknown enrich provider: bogus",
    });
  });

  test("CLI parses v0.4 contract validation options", () => {
    expect(parseArgv(["contract", "doc.md", "--annotations", "doc.annotations.json"])).toMatchObject({
      command: "contract",
      input: "doc.md",
      annotations: "doc.annotations.json",
      printSchema: false,
    });
    expect(parseArgv(["contract", "--print-schema"])).toMatchObject({
      command: "contract",
      printSchema: true,
    });
    expect(parseArgv(["contract", "doc.md"])).toMatchObject({
      command: "error",
      message: "contract: --annotations requires a value",
    });
  });

  test("CLI enrich summary reports semantic lens fields, not only section summaries", () => {
    expect(formatEnrichSummary({
      schema_version: 1,
      document_overview: {
        summary: "Readable artifact.",
      },
      reading_path: [
        { label: "Start", section_id: "s1", description: "Start here." },
        { label: "Review", section_id: "s2", description: "Then review." },
      ],
      semantic_blocks: [
        {
          type: "structure_map",
          title: "Model",
          nodes: [
            { id: "start", label: "Start", kind: "context", summary: "Start here." },
          ],
        },
      ],
      section_summaries: [
        { section_id: "s1", summary: "First." },
        { section_id: "s2", summary: "Second." },
      ],
    })).toBe("2 summaries, overview, 2 reading path items, 1 semantic block");
  });

  test("CLI pedagogy summary reports provider-generated teaching annotation counts", () => {
    expect(formatPedagogySummary({
      schema_version: 2,
      section_summaries: [],
      prerequisites: [
        { term: "frontmatter", plain_language: "metadata at the top" },
        { term: "annotation", plain_language: "data for rendering" },
      ],
      checkpoints: [
        { section_id: "s1", items: ["Explain the boundary"] },
        { section_id: "s2", items: [] },
        { section_id: "s3", items: ["Choose the provider"] },
      ],
      analogies: [
        {
          section_id: "s1",
          concept: "renderer",
          analogy: "renderer 就像排版工，因为它只摆放已确定的内容",
        },
      ],
    })).toBe("prereq: 2, checkpoints: 2 sections, analogies: 1");
  });

  test("agent prompt keeps few-shot pedagogy quality examples", async () => {
    const { buildSectionSummaryPrompt } = await import("../src/enrich/agent-cli.js");

    const prompt = buildSectionSummaryPrompt("# Demo\n\n## Context\n\nExplain render_skill and reader modes.");

    expect(prompt).toContain("Few-shot examples");
    expect(prompt).toContain("render_skill");
    expect(prompt).toContain("能说出四种 mode");
    expect(prompt).toContain("Synonym rephrasing test");
    expect(prompt).toContain("CHECKPOINT selectivity self-check");
  });

  test("creates a deterministic section summary scaffold from H2 sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Enrich Demo
---

# Enrich Demo

## First Section

This section explains the key reader promise. It has a second sentence.

## Empty Section

## Second Section

- Build the annotation contract.
- Keep render offline.
`;

    const annotations = createSectionSummaryScaffold(md, "demo.md");

    expect(annotations).toMatchObject({
      schema_version: 1,
      source: "dossier-enrich:section-summary-scaffold",
      section_summaries: [
        {
          section_id: "s1",
          summary: "This section explains the key reader promise.",
        },
        {
          section_id: "s3",
          summary: "Build the annotation contract. Keep render offline.",
        },
      ],
    });
  });

  test("scaffold emits schema v2 pedagogy defaults and content mode", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Enrich Demo
prerequisites:
  - markdown
  - frontmatter
---

# Enrich Demo

## First Section

This section explains the key reader promise. It has a second sentence.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations).toMatchObject({
      schema_version: 2,
      content_mode: "concept",
      prerequisites: [
        { term: "markdown", plain_language: "markdown" },
        { term: "frontmatter", plain_language: "frontmatter" },
      ],
      checkpoints: [],
      analogies: [],
    });
  });

  test("parseAnnotationsJson keeps schema v1 compatible with pedagogy fields absent", () => {
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      section_summaries: [
        { section_id: "s1", summary: "Old file still works." },
      ],
    }));

    expect(annotations).toEqual({
      schema_version: 1,
      section_summaries: [
        { section_id: "s1", summary: "Old file still works." },
      ],
    });
    expect(annotations.content_mode).toBeUndefined();
    expect(annotations.prerequisites).toBeUndefined();
  });

  test("parseAnnotationsJson accepts schema v2 pedagogy annotations", () => {
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 2,
      content_mode: "tutorial",
      prerequisites: [
        {
          term: "frontmatter",
          plain_language: "markdown 文件顶部的 YAML 元数据",
          why_needed: "决定渲染模式",
          fallback_link: "#s1",
        },
      ],
      checkpoints: [
        { section_id: "s1", items: ["说出 reader profile 的三档"] },
      ],
      analogies: [
        {
          section_id: "s1",
          concept: "reader_profile",
          analogy: "像同一份菜单的不同分量。",
        },
      ],
      section_summaries: [],
    }));

    expect(annotations).toMatchObject({
      schema_version: 2,
      content_mode: "tutorial",
      prerequisites: [
        {
          term: "frontmatter",
          plain_language: "markdown 文件顶部的 YAML 元数据",
          why_needed: "决定渲染模式",
          fallback_link: "#s1",
        },
      ],
      checkpoints: [
        { section_id: "s1", items: ["说出 reader profile 的三档"] },
      ],
      analogies: [
        {
          section_id: "s1",
          concept: "reader_profile",
          analogy: "像同一份菜单的不同分量。",
        },
      ],
    });
  });

  test("parseAnnotationsJson accepts v0.4 enrichment contract metadata", () => {
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 2,
      contract: {
        name: "dossier-ai-enrichment",
        version: "0.4",
        producer: "dossier-enrich:codex",
        created_at: "2026-05-23",
      },
      section_summaries: [],
    }));

    expect(annotations.contract).toEqual({
      name: "dossier-ai-enrichment",
      version: "0.4",
      producer: "dossier-enrich:codex",
      created_at: "2026-05-23",
    });
  });

  test("scaffold emits v0.4 enrichment contract metadata", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const annotations = createSectionSummaryScaffold("# Contract\n\n## Context\n\nBody.");

    expect(annotations.contract).toMatchObject({
      name: "dossier-ai-enrichment",
      version: "0.4",
      producer: "dossier-enrich:section-summary-scaffold",
    });
    expect(annotations.contract?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("deterministic scaffold produces a semantic lens without a local agent", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Offline Dossier
---

# Offline Dossier

## Background

This section explains why the work matters.

## Architecture Decisions

The design chooses deterministic rendering with optional annotations.

## MVP Roadmap

Ship the smallest useful loop first.

## Risks

The output can still become pretty markdown if structure is missing.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.document_overview).toEqual({
      summary: "Offline Dossier: This section explains why the work matters.",
      reader_goal: "Use the structure map and reading path to understand the document before reading the source prose.",
      status_note: "No status metadata declared.",
      next_step: "Start with Background, then follow the source sections that matter.",
    });
    expect(annotations.reading_path).toEqual([
      {
        label: "Background",
        section_id: "s1",
        description: "Start here to understand the context and problem.",
      },
      {
        label: "Architecture Decisions",
        section_id: "s2",
        description: "Use this section to understand the key decision and rationale.",
      },
      {
        label: "MVP Roadmap",
        section_id: "s3",
        description: "Use this section to follow the execution path.",
      },
      {
        label: "Risks",
        section_id: "s4",
        description: "Use this section to inspect risks before acting.",
      },
    ]);
    expect(annotations.semantic_blocks).toEqual([
      {
        type: "structure_map",
        title: "Document model",
        summary: "A deterministic map of the main sections and how to read them.",
        source_section_id: "s1",
        nodes: [
          {
            id: "background",
            label: "Background",
            kind: "context",
            summary: "This section explains why the work matters.",
            section_id: "s1",
          },
          {
            id: "architecture-decisions",
            label: "Architecture Decisions",
            kind: "decision",
            summary: "The design chooses deterministic rendering with optional annotations.",
            section_id: "s2",
          },
          {
            id: "mvp-roadmap",
            label: "MVP Roadmap",
            kind: "path",
            summary: "Ship the smallest useful loop first.",
            section_id: "s3",
          },
          {
            id: "risks",
            label: "Risks",
            kind: "risk",
            summary: "The output can still become pretty markdown if structure is missing.",
            section_id: "s4",
          },
        ],
        edges: [
          { from: "background", to: "architecture-decisions", label: "frames" },
          { from: "architecture-decisions", to: "mvp-roadmap", label: "turns into" },
          { from: "mvp-roadmap", to: "risks", label: "stress-tested by" },
        ],
      },
    ]);
  });

  test("deterministic scaffold annotations render as a Dossier Lens", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `---
title: Offline Render
---

# Offline Render

## Context

This section gives the reader a starting point.

## Decision

The renderer should show structure before source prose.
`;

    const annotations = createSectionSummaryScaffold(md);
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div class="toc-lens-group" aria-label="Dossier lens navigation">[\s\S]*?Structure Map/);
    expect(html).toMatch(/<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">/);
    expect(html).toMatch(/<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(html).toMatch(/<a class="section-semantic-chip section-semantic-model" href="#lens-structure-map-1-node-context">Model: Context<\/a>/);
    expect(html.indexOf('id="lens-structure-map-1"')).toBeLessThan(html.indexOf('<section id="s1">'));
  });

  test("deterministic scaffold creates a scope boundary from non-goal tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `---
title: Scope Demo
---

# Scope Demo

## Context

This document explains the product boundary.

## Non-Goals

| Not Doing | Because |
|---|---|
| Observability dashboard | It serves agent developers |
| Chat transcript viewer | It flattens the artifact |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "scope_boundary",
        title: "Scope boundaries",
        source_section_id: "s2",
        in_scope: [],
        out_of_scope: [
          "Observability dashboard: It serves agent developers.",
          "Chat transcript viewer: It flattens the artifact.",
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-scope-boundary-2">[\s\S]*?Scope/);
    expect(html).toMatch(/<section id="lens-scope-boundary-2" class="comparison-cards" data-block="scope_boundary">/);
    expect(html).toMatch(/<h4 class="comparison-card-head">[\s\S]*?Out of scope[\s\S]*?<\/h4>[\s\S]*?Observability dashboard: It serves agent developers\./);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-scope" href="#lens-scope-boundary-2">Scope<\/a>/);
  });

  test("deterministic scaffold does not treat target users as scope boundaries", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# User Shape

## 目标用户

需要可读 AI 产物的人。

- 会读 markdown。
- 会 review git diff。

## 这个项目不做什么

- SaaS workspace。
`;

    const annotations = createSectionSummaryScaffold(md);
    const scopeBlocks = annotations.semantic_blocks?.filter((block) => block.type === "scope_boundary");

    expect(scopeBlocks).toEqual([
      {
        type: "scope_boundary",
        title: "范围边界",
        source_section_id: "s2",
        in_scope: [],
        out_of_scope: ["SaaS workspace。"],
      },
    ]);
  });

  test("deterministic scaffold creates scope boundaries from explicit Chinese goals and non-goals", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Scope Pair

## 背景

这个项目需要清晰边界。

## 目标

- 让新用户知道先学什么、后学什么
- 让前端讲清楚每个阶段的目标和产物

## 非目标

- 本轮不扩成通用训练平台
- 本轮不追求 benchmark 刷榜
`;

    const annotations = createSectionSummaryScaffold(md);
    const scopeBlocks = annotations.semantic_blocks?.filter((block) => block.type === "scope_boundary");

    expect(scopeBlocks).toEqual([
      {
        type: "scope_boundary",
        title: "范围边界：目标",
        source_section_id: "s2",
        in_scope: [
          "让新用户知道先学什么、后学什么。",
          "让前端讲清楚每个阶段的目标和产物。",
        ],
        out_of_scope: [],
      },
      {
        type: "scope_boundary",
        title: "范围边界：非目标",
        source_section_id: "s3",
        in_scope: [],
        out_of_scope: [
          "本轮不扩成通用训练平台。",
          "本轮不追求 benchmark 刷榜。",
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-scope-boundary-2">[\s\S]*?范围边界：目标/);
    expect(html).toMatch(/<a href="#lens-scope-boundary-3">[\s\S]*?范围边界：非目标/);
    expect(html).toMatch(/<section id="lens-scope-boundary-2" class="comparison-cards" data-block="scope_boundary">[\s\S]*?<h4 class="comparison-card-head">[\s\S]*?范围内[\s\S]*?<\/h4>[\s\S]*?让新用户知道先学什么、后学什么。/);
    expect(html).toMatch(/<section id="lens-scope-boundary-3" class="comparison-cards" data-block="scope_boundary">[\s\S]*?<h4 class="comparison-card-head">[\s\S]*?范围外[\s\S]*?<\/h4>[\s\S]*?本轮不扩成通用训练平台。/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-scope" href="#lens-scope-boundary-2">范围<\/a>/);
    expect(html).toMatch(/<section id="s3">[\s\S]*?<a class="section-semantic-chip section-semantic-scope" href="#lens-scope-boundary-3">范围<\/a>/);
  });

  test("deterministic scaffold creates a checklist from explicit success criteria", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Success Demo

## Context

This document explains the product goal.

## Success Criteria

1. Weak: render the first artifact.
2. Strong: a colleague can explain the artifact in three minutes.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "checklist",
        title: "Acceptance checks",
        source_section_id: "s2",
        items: [
          {
            label: "Weak",
            detail: "render the first artifact.",
            status: "required",
            section_id: "s2",
          },
          {
            label: "Strong",
            detail: "a colleague can explain the artifact in three minutes.",
            status: "required",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-checklist-2">[\s\S]*?Checklist/);
    expect(html).toMatch(/<div id="lens-checklist-2" class="semantic-block checklist-lens" data-annotation="semantic-checklist">/);
    expect(html).toMatch(/<span class="checklist-status">REQ<\/span>[\s\S]*?<h3>Weak<\/h3>[\s\S]*?render the first artifact\./);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-checklist" href="#lens-checklist-2">Checklist<\/a>/);
  });

  test("deterministic scaffold does not create checklists from prose-only acceptance sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Prose Acceptance

## 验收标准

页面必须先呈现结构化导读。
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.filter((block) => block.type === "checklist")).toEqual([]);
  });

  test("deterministic scaffold disambiguates multiple checklist lenses by source section", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Multi Checklist Demo

## 成功标准

- 弱成功：读者能先判断是否值得继续读。
- 强成功：读者能复述核心模型。

## 仍需用户肉眼复核

- [ ] 视觉密度：首屏不要只看到 frontmatter。
- [ ] TOC 联动：滚动时当前章节高亮。
`;

    const annotations = createSectionSummaryScaffold(md);
    const checklistBlocks = annotations.semantic_blocks?.filter((block) => block.type === "checklist") ?? [];

    expect(checklistBlocks.map((block) => block.title)).toEqual([
      "验收检查：成功标准",
      "验收检查：仍需用户肉眼复核",
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-checklist-2">[\s\S]*?验收检查：成功标准/);
    expect(html).toMatch(/<a href="#lens-checklist-3">[\s\S]*?验收检查：仍需用户肉眼复核/);
    expect((html.match(/<span>Checklist<\/span>/g) ?? []).length).toBe(0);
  });

  test("deterministic scaffold creates open questions from explicit question lists", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Question Demo

## Context

This document explains the product goal.

## Open Questions

- Which source owns the artifact graph? Blocks Cover-1 confidence.
- Should enrich run by default?
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "open_questions",
        title: "Open questions",
        source_section_id: "s2",
        items: [
          {
            question: "Which source owns the artifact graph?",
            impact: "Blocks Cover-1 confidence.",
            status: "blocked",
            section_id: "s2",
          },
          {
            question: "Should enrich run by default?",
            status: "open",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-open-questions-2">[\s\S]*?Open Questions/);
    expect(html).toMatch(/<div id="lens-open-questions-2" class="semantic-block open-questions-lens" data-annotation="semantic-open-questions">/);
    expect(html).toMatch(/<span class="open-question-status">BLOCKED<\/span>[\s\S]*?<h3>Which source owns the artifact graph\?<\/h3>[\s\S]*?Blocks Cover-1 confidence\./);
    expect(html).toMatch(/<p class="open-question-impact"><span>Impact<\/span> Blocks Cover-1 confidence\.<\/p>/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-question" href="#lens-open-questions-2">Questions<\/a>/);
  });

  test("deterministic scaffold does not invent open question items from prose-only sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Prose Questions

## 开放问题

我们还需要决定数据源，但这里没有拆成可执行问题列表。
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.filter((block) => block.type === "open_questions")).toEqual([]);
  });

  test("deterministic scaffold cleans table-derived open question context", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Question Table Demo

## Open Questions

| ID | Question | Leaning |
|---|---|---|
| Q1 | Which parser owns table extraction? | Use marked tokens |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "open_questions",
        title: "Open questions",
        source_section_id: "s1",
        items: [
          {
            question: "Q1: Which parser owns table extraction?",
            context: "Use marked tokens.",
            status: "open",
            section_id: "s1",
          },
        ],
      },
    ]);
  });

  test("deterministic scaffold creates a roadmap from staged H3 sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Roadmap Demo

## Context

This document explains the product goal.

## MVP Roadmap

### Stage 1: Baseline

Frame the project.

- baseline report
- success rubric

### Stage 2: Ship

Publish the dossier.

- release notes
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "roadmap",
        title: "MVP Roadmap",
        source_section_id: "s2",
        summary: "Frame the project.",
        items: [
          {
            label: "Stage 1",
            title: "Baseline",
            summary: "Frame the project.",
            outputs: ["baseline report", "success rubric"],
            section_id: "s2-1",
          },
          {
            label: "Stage 2",
            title: "Ship",
            summary: "Publish the dossier.",
            outputs: ["release notes"],
            section_id: "s2-2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-roadmap-2">[\s\S]*?Roadmap/);
    expect(html).toMatch(/<div id="lens-roadmap-2" class="semantic-block roadmap-lens" data-annotation="semantic-roadmap">/);
    expect(html).toMatch(/<article id="lens-roadmap-2-item-1" class="roadmap-card">[\s\S]*?Stage 1[\s\S]*?<h3>Baseline<\/h3>[\s\S]*?baseline report/);
    expect(html).toMatch(/<h3 id="s2-1">[\s\S]*?Stage 1: Baseline[\s\S]*?<\/h3>\s*<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="Semantic trace for this subsection">[\s\S]*?<a class="section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-2-item-1">Roadmap: Stage 1<\/a>/);
  });

  test("deterministic scaffold does not invent roadmaps from prose-only roadmap sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Prose Roadmap

## Roadmap

We will probably start small, then improve the renderer later.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.filter((block) => block.type === "roadmap")).toEqual([]);
  });

  test("deterministic scaffold creates a requirement grid from explicit H3 requirement lists", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Requirement Demo

## Context

This document explains why the requirements exist.

## Frontend Teaching Requirements

### Learning Roadmap

Show a staged navigation that explains:

- Level name
- Current recommended base model
- What the learner gets after finishing

### Probe-first Views

Put behavior evaluation before training metrics.

- case-by-case compare
- error buckets
`;

    const annotations = createSectionSummaryScaffold(md);
    const requirementBlocks = annotations.semantic_blocks?.filter((block: any) => block.type === "requirement_grid") ?? [];

    expect(requirementBlocks).toEqual([
      {
        type: "requirement_grid",
        title: "Frontend Teaching Requirements",
        source_section_id: "s2",
        items: [
          {
            label: "Learning Roadmap",
            detail: "Show a staged navigation that explains:",
            requirements: [
              "Level name",
              "Current recommended base model",
              "What the learner gets after finishing",
            ],
            section_id: "s2-1",
          },
          {
            label: "Probe-first Views",
            detail: "Put behavior evaluation before training metrics.",
            requirements: ["case-by-case compare", "error buckets"],
            section_id: "s2-2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-requirement-grid-2">[\s\S]*?Requirements/);
    expect(html).toMatch(/<div id="lens-requirement-grid-2" class="semantic-block requirement-grid" data-annotation="semantic-requirement-grid">/);
    expect(html).toMatch(/<article id="lens-requirement-grid-2-item-1" class="requirement-card">[\s\S]*?<h3>Learning Roadmap<\/h3>[\s\S]*?Current recommended base model/);
    expect(html).toMatch(/<h3 id="s2-1">[\s\S]*?Learning Roadmap[\s\S]*?<\/h3>\s*<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="Semantic trace for this subsection">[\s\S]*?<a class="section-semantic-chip section-semantic-requirement" href="#lens-requirement-grid-2-item-1">Requirement: Learning Roadmap<\/a>/);
  });

  test("deterministic scaffold creates a reference list from explicit reference links", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Reference Demo

## Context

This document explains why the references matter.

## References

- [Google Gemma](https://example.com/gemma)
- [GitHub Repo](https://github.com/example/repo)
`;

    const annotations = createSectionSummaryScaffold(md);
    const referenceBlocks = annotations.semantic_blocks?.filter((block: any) => block.type === "reference_list") ?? [];

    expect(referenceBlocks).toEqual([
      {
        type: "reference_list",
        title: "References",
        source_section_id: "s2",
        items: [
          {
            label: "Google Gemma",
            href: "https://example.com/gemma",
          },
          {
            label: "GitHub Repo",
            href: "https://github.com/example/repo",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-reference-list-2">[\s\S]*?References/);
    expect(html).toMatch(/<div id="lens-reference-list-2" class="semantic-block reference-list" data-annotation="semantic-reference-list">/);
    expect(html).toMatch(/<a id="lens-reference-list-2-item-1" class="reference-card external-ref" href="https:\/\/example\.com\/gemma">[\s\S]*?<h3>Google Gemma<\/h3>[\s\S]*?<span class="reference-href">example\.com<\/span>/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-reference" href="#lens-reference-list-2">References<\/a>/);
  });

  test("rendering blocks unsafe annotation reference hrefs", async () => {
    const { render } = await import("../src/render.js");
    const md = `# Unsafe Annotation Links

## References

Reference text.
`;

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 2,
        section_summaries: [],
        semantic_blocks: [
          {
            type: "reference_list",
            title: "References",
            source_section_id: "s1",
            items: [
              {
                label: "Unsafe",
                href: "javascript:alert(1)",
                description: "Should not become an active script URL.",
              },
            ],
          },
        ],
      } as any,
    });

    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).toMatch(/<a id="lens-reference-list-1-item-1" class="reference-card" href="#blocked-url">/);
    expect(html).toContain('<span class="reference-href">blocked unsafe URL</span>');
  });

  test("deterministic scaffold creates a reference list from opportunity links with lessons", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Opportunity Demo

## Context

This document compares learning projects.

## 机会判断

值得借鉴的对象包括：

- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory): 统一入口、统一 recipe、统一训练方法心智模型
- [Unsloth](https://github.com/unslothai/unsloth): 低门槛、本地可跑、对新模型和 UI 体验反应快

本项目应该从这些项目吸收两件事：

- 学习路径要分阶段
- evaluation 和 probe 必须是一等公民
`;

    const annotations = createSectionSummaryScaffold(md);
    const referenceBlocks = annotations.semantic_blocks?.filter((block: any) => block.type === "reference_list") ?? [];

    expect(referenceBlocks).toEqual([
      {
        type: "reference_list",
        title: "机会判断",
        source_section_id: "s2",
        items: [
          {
            label: "LLaMA-Factory",
            href: "https://github.com/hiyouga/LLaMA-Factory",
            description: "统一入口、统一 recipe、统一训练方法心智模型。",
          },
          {
            label: "Unsloth",
            href: "https://github.com/unslothai/unsloth",
            description: "低门槛、本地可跑、对新模型和 UI 体验反应快。",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-reference-list-2">[\s\S]*?参考/);
    expect(html).toMatch(/<div id="lens-reference-list-2" class="semantic-block reference-list" data-annotation="semantic-reference-list">/);
    expect(html).toMatch(/<a id="lens-reference-list-2-item-1" class="reference-card external-ref" href="https:\/\/github\.com\/hiyouga\/LLaMA-Factory">[\s\S]*?<h3>LLaMA-Factory<\/h3>[\s\S]*?<p>统一入口、统一 recipe、统一训练方法心智模型。<\/p>[\s\S]*?<span class="reference-href">github\.com<\/span>/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-reference" href="#lens-reference-list-2">参考资料<\/a>/);
  });

  test("deterministic scaffold creates takeaway cards from explicit opportunity lesson lists", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Takeaway Demo

## Context

This document compares learning projects.

## 机会判断

值得借鉴的对象包括：

- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory): 统一入口、统一 recipe、统一训练方法心智模型
- [Unsloth](https://github.com/unslothai/unsloth): 低门槛、本地可跑、对新模型和 UI 体验反应快

本项目应该从这些项目吸收四件事：

- 学习路径要分阶段，不要把几十个参数直接甩给用户
- evaluation 和 probe 必须是一等公民，不能只展示 loss
- 默认路径必须足够轻量，能在本地或低配环境跑完
- agent 必须能判断当前状态、下一步命令和产物位置
`;

    const annotations = createSectionSummaryScaffold(md);
    const takeawayBlocks = annotations.semantic_blocks?.filter((block: any) => block.type === "takeaway_grid") ?? [];

    expect(takeawayBlocks).toEqual([
      {
        type: "takeaway_grid",
        title: "借鉴要点：机会判断",
        source_section_id: "s2",
        items: [
          {
            label: "学习路径要分阶段",
            detail: "不要把几十个参数直接甩给用户。",
            section_id: "s2",
          },
          {
            label: "evaluation 和 probe 必须是一等公民",
            detail: "不能只展示 loss。",
            section_id: "s2",
          },
          {
            label: "默认路径必须足够轻量",
            detail: "能在本地或低配环境跑完。",
            section_id: "s2",
          },
          {
            label: "agent 必须能判断当前状态",
            detail: "下一步命令和产物位置。",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    const lensNavHtml = html.slice(
      html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">'),
      html.indexOf("</div>", html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">')) + "</div>".length,
    );
    expect(lensNavHtml).toMatch(/<a href="#lens-takeaway-grid-3">[\s\S]*?借鉴要点：机会判断/);
    expect(html).toMatch(/<div id="lens-takeaway-grid-3" class="semantic-block takeaway-grid" data-annotation="semantic-takeaway-grid">/);
    expect(html).toMatch(/<article id="lens-takeaway-grid-3-item-1" class="takeaway-card">[\s\S]*?<p class="takeaway-label">借鉴要点<\/p>[\s\S]*?<h3>学习路径要分阶段<\/h3>[\s\S]*?<p>不要把几十个参数直接甩给用户。<\/p>/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-takeaway" href="#lens-takeaway-grid-3">借鉴要点<\/a>/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-takeaway" href="#lens-takeaway-grid-3-item-4">要点：agent 必须能判断当前状态<\/a>/);
  });

  test("deterministic scaffold creates a principle grid from explicit design principles", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Principle Demo

## Context

This document explains the product boundary.

## Design Principles

- teaching-first: project first reads as a learning path.
- agent-native: every stage can be explained by agents.
`;

    const annotations = createSectionSummaryScaffold(md);
    const principleBlocks = annotations.semantic_blocks?.filter((block: any) => block.type === "principle_grid") ?? [];

    expect(principleBlocks).toEqual([
      {
        type: "principle_grid",
        title: "Design Principles",
        source_section_id: "s2",
        items: [
          {
            label: "teaching-first",
            guidance: "project first reads as a learning path.",
            section_id: "s2",
          },
          {
            label: "agent-native",
            guidance: "every stage can be explained by agents.",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-principle-grid-2">[\s\S]*?Principles/);
    expect(html).toMatch(/<div id="lens-principle-grid-2" class="semantic-block principle-grid" data-annotation="semantic-principle-grid">/);
    expect(html).toMatch(/<article id="lens-principle-grid-2-item-1" class="principle-card">[\s\S]*?<h3>teaching-first<\/h3>[\s\S]*?project first reads as a learning path\./);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-principle" href="#lens-principle-grid-2">Principles<\/a>/);
  });

  test("deterministic scaffold ignores H3 headings when choosing section summaries", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Nested Section

## Why It Exists

### A Hidden Reality

The real explanation should become the section summary.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "The real explanation should become the section summary.",
      },
    ]);
    expect(annotations.reading_path?.[0]?.description).toBe(
      "Start here to understand the context and problem.",
    );
  });

  test("deterministic scaffold creates a decision grid from explicit decision tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Decision Demo

## Context

This document explains the product goal.

## Architecture Decisions

| Decision | Default | Rationale |
|---|---|---|
| Renderer boundary | Keep render deterministic | Avoid hiding provider behavior |
| Enrich output | Annotation JSON | Keep HTML offline |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "decision_grid",
        title: "Architecture Decisions",
        source_section_id: "s2",
        items: [
          {
            label: "Renderer boundary",
            value: "Keep render deterministic.",
            rationale: "Avoid hiding provider behavior.",
            section_id: "s2",
          },
          {
            label: "Enrich output",
            value: "Annotation JSON.",
            rationale: "Keep HTML offline.",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-decision-grid-2">[\s\S]*?Decisions/);
    expect(html).toMatch(/<div id="lens-decision-grid-2" class="semantic-block decision-grid" data-annotation="semantic-decision-grid">/);
    expect(html).toMatch(/<div id="lens-decision-grid-2"[\s\S]*?<a class="semantic-source-link" href="#s2">View source § 2<\/a>/);
    expect(html).toMatch(/<p class="decision-label">Renderer boundary<\/p>[\s\S]*?<p class="decision-value">Keep render deterministic\.<\/p>[\s\S]*?Avoid hiding provider behavior\./);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2">Decisions<\/a>/);
  });

  test("deterministic scaffold does not invent decision grids from prose-only decision sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Prose Decisions

## Key Decisions

The project has several design choices, but this paragraph does not provide structured decisions.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.filter((block) => block.type === "decision_grid")).toEqual([]);
  });

  test("deterministic scaffold creates a decision grid from explicit decision paragraphs", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Explicit Decision Demo

## Naming

**✅ Decision: dossier** —— Names the artifact archive directly.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "decision_grid",
        title: "Naming",
        source_section_id: "s1",
        items: [
          {
            label: "Naming",
            value: "dossier.",
            rationale: "Names the artifact archive directly.",
            section_id: "s1",
          },
        ],
      },
    ]);
  });

  test("deterministic scaffold creates a decision grid from explicit default strategy lists", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Gemma Strategy Demo

## Context

This document explains why the project needs a model strategy.

## Gemma 4 E2B 基座策略

本项目中的默认模型策略：

- 默认教学基座：\`google/gemma-4-E2B-it\`
- 对照实验基座：\`google/gemma-4-E2B\`
- 后续升级路线：\`google/gemma-4-E4B-it\`，以及更大 Gemma 4 checkpoint 的专题扩展
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toContainEqual({
      type: "decision_grid",
      title: "Gemma 4 E2B 基座策略",
      source_section_id: "s2",
      items: [
        {
          label: "默认教学基座",
          value: "google/gemma-4-E2B-it.",
          rationale: "声明为默认教学基座。",
          section_id: "s2",
        },
        {
          label: "对照实验基座",
          value: "google/gemma-4-E2B.",
          rationale: "声明为对照实验基座。",
          section_id: "s2",
        },
        {
          label: "后续升级路线",
          value: "google/gemma-4-E4B-it，以及更大 Gemma 4 checkpoint 的专题扩展。",
          rationale: "声明为后续升级路线。",
          section_id: "s2",
        },
      ],
    });

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-decision-grid-2" class="semantic-block decision-grid" data-annotation="semantic-decision-grid">/);
    expect(html).toMatch(/<article id="lens-decision-grid-2-item-1" class="decision-card">[\s\S]*?<p class="decision-label">默认教学基座<\/p>[\s\S]*?<p class="decision-value">google\/gemma-4-E2B-it\.<\/p>[\s\S]*?声明为默认教学基座。/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2-item-1">决策：默认教学基座<\/a>/);
  });

  test("deterministic scaffold creates a concept glossary from explicit concept tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Glossary Demo

## Core Concepts

| Concept | Plain explanation | Example | Model field |
|---|---|---|---|
| Artifact | A source document or output a reader needs to understand | Vision spec or review note | Artifact.kind |
| Dossier | A readable archive assembled around artifacts | Project cover page | Dossier.id |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "concept_glossary",
        title: "Core Concepts",
        source_section_id: "s1",
        items: [
          {
            term: "Artifact",
            plain_language: "A source document or output a reader needs to understand.",
            example: "Vision spec or review note.",
            model_field: "Artifact.kind",
            section_id: "s1",
          },
          {
            term: "Dossier",
            plain_language: "A readable archive assembled around artifacts.",
            example: "Project cover page.",
            model_field: "Dossier.id",
            section_id: "s1",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-concept-glossary-2">[\s\S]*?Glossary/);
    expect(html).toMatch(/<article id="lens-concept-glossary-2-item-1" class="concept-card">[\s\S]*?<h3>Artifact<\/h3>[\s\S]*?A source document or output a reader needs to understand\./);
    expect(html).toMatch(/<section id="s1">[\s\S]*?<a class="section-semantic-chip section-semantic-glossary" href="#lens-concept-glossary-2">Glossary<\/a>/);
    expect(html).toMatch(/<section id="s1">[\s\S]*?<a class="section-semantic-chip section-semantic-glossary" href="#lens-concept-glossary-2-item-1">Glossary: Artifact<\/a>/);
  });

  test("deterministic scaffold creates a concept glossary from nested concept table headings", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Nested Glossary Demo

## Rendering Protocol

The section explains how HTML elements work.

#### Built-in element vocabulary

| Element | Purpose | Input source |
|---|---|---|
| metadata-strip | Shows title and status | frontmatter |
| preview-popover | Shows referenced paragraph previews | markdown links |
`;

    const annotations = createSectionSummaryScaffold(md);
    const glossary = annotations.semantic_blocks?.find((block) => block.type === "concept_glossary");

    expect(glossary).toEqual({
      type: "concept_glossary",
      title: "Built-in element vocabulary",
      source_section_id: "s1",
      items: [
        {
          term: "metadata-strip",
          plain_language: "Shows title and status.",
          model_field: "frontmatter",
          section_id: "s1",
        },
        {
          term: "preview-popover",
          plain_language: "Shows referenced paragraph previews.",
          model_field: "markdown links",
          section_id: "s1",
        },
      ],
    });
  });

  test("deterministic scaffold creates a relationship map from explicit relationship tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Relationship Demo

## Artifact Relationships

| From | Relation | To | Evidence |
|---|---|---|---|
| Vision spec | frames | MVP spec | MVP spec implements the vision contract |
| Review note | hardens | Change note | Change note records the accepted fixes |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "relationship_map",
        title: "Artifact Relationships",
        source_section_id: "s1",
        summary: "Artifact Relationships contains 2 explicit relationships.",
        items: [
          {
            from: "Vision spec",
            relation: "frames",
            to: "MVP spec",
            evidence: "MVP spec implements the vision contract.",
            section_id: "s1",
          },
          {
            from: "Review note",
            relation: "hardens",
            to: "Change note",
            evidence: "Change note records the accepted fixes.",
            section_id: "s1",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-relationship-map-2">[\s\S]*?Relations/);
    expect(html).toMatch(/<li id="lens-relationship-map-2-item-1" class="relationship-edge">[\s\S]*?Vision spec[\s\S]*?frames[\s\S]*?MVP spec[\s\S]*?MVP spec implements the vision contract\./);
    expect(html).toMatch(/<section id="s1">[\s\S]*?<a class="section-semantic-chip section-semantic-relationship" href="#lens-relationship-map-2-item-1">Relation: Vision spec to MVP spec<\/a>/);
  });

  test("deterministic scaffold does not treat relation rule tables as relationship maps", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Edge Rules Demo

## Edge Collection

| Signal | Relation | Confidence | Label example |
|---|---|---|---|
| frontmatter \`implements\` | \`implements\` | high | MVP spec implements the vision spec |
| markdown link | \`references\` | medium | Vision spec references the MVP spec |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.some((block) => block.type === "relationship_map")).toBe(false);
  });

  test("deterministic scaffold creates an evidence grid from explicit evidence tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Evidence Demo

## Context

This document explains the product goal.

## Verification Evidence

| Claim | Evidence | Source |
|---|---|---|
| Tests pass | 76 tests passed | pnpm test |
| Typecheck passes | TypeScript compile clean | pnpm typecheck |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "evidence_grid",
        title: "Verification Evidence",
        source_section_id: "s2",
        items: [
          {
            label: "Tests pass",
            evidence: "76 tests passed.",
            source: "pnpm test",
            section_id: "s2",
          },
          {
            label: "Typecheck passes",
            evidence: "TypeScript compile clean.",
            source: "pnpm typecheck",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-evidence-grid-2" class="semantic-block evidence-grid" data-annotation="semantic-evidence-grid">/);
    expect(html).toMatch(/Tests pass[\s\S]*?76 tests passed\.[\s\S]*?pnpm test/);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-evidence" href="#lens-evidence-grid-2">Evidence<\/a>/);
  });

  test("deterministic scaffold does not invent evidence grids from prose-only evidence sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Prose Evidence

## Evidence

The implementation has some tests and manual checks, but this paragraph does not provide structured evidence items.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks?.filter((block) => block.type === "evidence_grid")).toEqual([]);
  });

  test("deterministic scaffold creates a risk register from explicit risk tables", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Risk Demo

## Context

This document explains the product goal.

## Risks and Mitigations

| Risk | Trigger | Mitigation |
|---|---|---|
| Output looks like decorated markdown | Semantic lens is missing | Extract risk tables into a risk register |
| Reader misses manual review gates | Checklist rows stay buried | Link risk cards back to source sections |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "risk_register",
        title: "Risks and Mitigations",
        source_section_id: "s2",
        items: [
          {
            label: "Output looks like decorated markdown",
            trigger: "Semantic lens is missing.",
            mitigation: "Extract risk tables into a risk register.",
            section_id: "s2",
          },
          {
            label: "Reader misses manual review gates",
            trigger: "Checklist rows stay buried.",
            mitigation: "Link risk cards back to source sections.",
            section_id: "s2",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-risk-register-2">[\s\S]*?Risks/);
    expect(html).toMatch(/<div id="lens-risk-register-2" class="semantic-block risk-register" data-annotation="semantic-risk-register">/);
    expect(html).toMatch(/Output looks like decorated markdown[\s\S]*?Semantic lens is missing\.[\s\S]*?Extract risk tables into a risk register\./);
    expect(html).toMatch(/<section id="s2">[\s\S]*?<a class="section-semantic-chip section-semantic-risk" href="#lens-risk-register-2">Risks<\/a>/);
  });

  test("deterministic scaffold does not treat open-question tables as risk registers", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Open Question Demo

## 开放问题（不阻塞 MVP-0 启动，但要在过程中决断）

| Q | 问题 | 何时决断 |
|---|---|---|
| Q1 | h2 自动加 \`§ N\` 是不是 hardcoded？如果用户 markdown 里已经写了 "1. " 是不是会重复？ | Day 4 视觉 review 时定 |
| Q2 | 错误信息走中文还是英文？ | Day 1 选英文 |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toContainEqual({
      section_id: "s1",
      summary: "开放问题（不阻塞 MVP-0 启动，但要在过程中决断）包含 2 个开放问题。",
      reader_hint: "继续前先用本节确认开放问题。",
    });
    expect(annotations.semantic_blocks).toContainEqual(expect.objectContaining({
      type: "structure_map",
      nodes: [
        expect.objectContaining({
          label: "开放问题（不阻塞 MVP-0 启动，但要在过程中决断）",
          kind: "question",
          section_id: "s1",
        }),
      ],
    }));
    expect(annotations.semantic_blocks?.filter((block) => block.type === "risk_register")).toEqual([]);
    expect(annotations.semantic_blocks).toContainEqual({
      type: "open_questions",
      title: "开放问题",
      source_section_id: "s1",
      items: [
        {
          question: "Q1: h2 自动加 § N 是不是 hardcoded？",
          context: "如果用户 markdown 里已经写了 1. 是不是会重复？ / Day 4 视觉 review 时定。",
          status: "open",
          section_id: "s1",
        },
        {
          question: "Q2: 错误信息走中文还是英文？",
          context: "Day 1 选英文。",
          status: "open",
          section_id: "s1",
        },
      ],
    });
  });

  test("deterministic scaffold treats acceptance review evidence columns as evidence", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Review Demo

## 自动化验收

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | \`pnpm typecheck\` clean | ✅ | \`tsc -p . --noEmit\` exit 0 |
| 2 | \`pnpm test\` 全绿 | ✅ | 76/76 passed |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries[0]?.summary).toBe("自动化验收包含 2 项可验证证据。");
    expect(annotations.reading_path?.[0]?.description).toBe("用本节核对验证证据。");
    expect(annotations.semantic_blocks).toEqual([
      expect.objectContaining({ type: "structure_map" }),
      {
        type: "evidence_grid",
        title: "自动化验收",
        source_section_id: "s1",
        items: [
          {
            label: "pnpm typecheck clean",
            evidence: "tsc -p . --noEmit exit 0.",
            section_id: "s1",
          },
          {
            label: "pnpm test 全绿",
            evidence: "76/76 passed.",
            section_id: "s1",
          },
        ],
      },
    ]);
  });

  test("deterministic scaffold keeps compliance summaries structural while reading paths explain purpose", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Review Demo

## § 7 "决不要做的事" 合规审查

10 项铁律全部遵守：

| ❌ 不要做 | Codex 是否触碰 |
|---|---|
| 改 package.json 加新 deps | ✗ — 仅 marked + gray-matter，未动 |
| 用 commander / cac / yargs | ✗ — 仍是手写 argv |
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries[0]?.summary).toBe("§ 7 \"决不要做的事\" 合规审查包含 2 项检查。");
    expect(annotations.reading_path?.[0]?.description).toBe("用本节核对验证证据。");
  });

  test("deterministic scaffold promotes compliance tables to checklist lenses", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Review Demo

## § 7 "决不要做的事" 合规审查

10 项铁律全部遵守：

| ❌ 不要做 | Codex 是否触碰 |
|---|---|
| 改 package.json 加新 deps | ✗ — 仅 marked + gray-matter，未动 |
| 用 commander / cac / yargs | ✗ — 仍是手写 argv |
| 用 eta / ejs / handlebars | \`template.replace(...)\` |
`;

    const annotations = createSectionSummaryScaffold(md);
    const checklistBlocks = annotations.semantic_blocks?.filter((block) => block.type === "checklist") ?? [];

    expect(checklistBlocks).toEqual([
      {
        type: "checklist",
        title: "验收检查",
        source_section_id: "s1",
        items: [
          {
            label: "改 package.json 加新 deps",
            detail: "仅 marked + gray-matter，未动。",
            status: "done",
            section_id: "s1",
          },
          {
            label: "用 commander / cac / yargs",
            detail: "仍是手写 argv。",
            status: "done",
            section_id: "s1",
          },
          {
            label: "用 eta / ejs / handlebars",
            detail: "template.replace(...)。",
            status: "done",
            section_id: "s1",
          },
        ],
      },
    ]);

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-checklist-2" class="semantic-block checklist-lens" data-annotation="semantic-checklist">/);
    expect(html).toMatch(/<span class="checklist-status">完成<\/span>[\s\S]*?<h3>改 package\.json 加新 deps<\/h3>/);
    expect(html).toMatch(/<section id="s1">[\s\S]*?<a class="section-semantic-chip section-semantic-checklist" href="#lens-checklist-2">检查清单<\/a>/);
  });

  test("deterministic scaffold keeps all ten compliance checklist rows", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Review Demo

## § 7 "决不要做的事" 合规审查

| ❌ 不要做 | Codex 是否触碰 |
|---|---|
| 改 package.json 加新 deps | 未动 |
| 用 commander / cac / yargs | 仍是手写 argv |
| 用 eta / ejs / handlebars | template.replace |
| 引入 highlight.js | 未引入 |
| 设计 admonition 语法 | 仅基于前缀启发 |
| 实现 dossier / 关系图 / 多文档 | 未触碰 |
| 引入 AI / LLM 调用 | 未引入 |
| 改 ADR | 未改 |
| 删 v1 手工版 HTML | 未删 |
| 改 spec 核心决策 | 未改 |
`;

    const annotations = createSectionSummaryScaffold(md);
    const checklist = annotations.semantic_blocks?.find((block) => block.type === "checklist");

    expect(checklist?.items).toHaveLength(10);
    expect(checklist?.items.at(-1)).toMatchObject({
      label: "改 spec 核心决策",
      status: "done",
    });
  });

  test("deterministic scaffold treats manual visual review lists as checklists despite incidental open text", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const { render } = await import("../src/render.js");
    const md = `# Review Demo

## 3. 仍需用户肉眼复核（2 项，文件已 \`open\` 在浏览器）

这两项自动化无法判断，建议你在浏览器里花 2 分钟看完：

- [ ] **视觉精度 ≥ 80% 对比 v1 手工版**：左右开两个 tab，对比 \`vision-v1.html\` vs \`vision-auto.html\`。重点看：frontmatter card、TOC 排版、ASCII 图、表格、callout 配色。
- [ ] **TOC scroll-spy 联动**：在自动版里滚到 §7，左侧 TOC 是否高亮 §7 entry？
`;

    const annotations = createSectionSummaryScaffold(md);
    const structureMap = annotations.semantic_blocks?.find((block) => block.type === "structure_map");
    const checklist = annotations.semantic_blocks?.find((block) => block.type === "checklist");

    expect(annotations.section_summaries[0]?.summary).toBe("仍需用户肉眼复核（2 项，文件已 open 在浏览器）包含 2 项检查。");
    expect(annotations.section_summaries[0]?.summary).not.toContain("左右开两个 tab");
    expect(annotations.section_summaries[0]?.reader_hint).toBe("用本节核对验证证据。");
    expect(annotations.document_overview?.next_step).toBe("从「仍需用户肉眼复核（2 项，文件已 open 在浏览器）」开始，再按相关章节继续。");
    expect(annotations.reading_path?.[0]?.description).toBe("用本节核对验证证据。");
    expect(structureMap).toMatchObject({
      nodes: [
        expect.objectContaining({
          label: "仍需用户肉眼复核（2 项，文件已 open 在浏览器）",
          kind: "evidence",
        }),
      ],
    });
    expect(checklist).toEqual({
      type: "checklist",
      title: "验收检查",
      source_section_id: "s1",
      items: [
        expect.objectContaining({
          label: "视觉精度 ≥ 80% 对比 v1 手工版",
          status: "required",
          section_id: "s1",
        }),
        expect.objectContaining({
          label: "TOC scroll-spy 联动",
          status: "required",
          section_id: "s1",
        }),
      ],
    });

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<section id="s1">[\s\S]*?<a class="section-semantic-chip section-semantic-checklist" href="#lens-checklist-2">检查清单<\/a>/);
    expect(html).not.toMatch(/<section id="s1">[\s\S]*?section-semantic-question/);
  });

  test("deterministic scaffold keeps preamble sections out of reading path and model nodes", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Very Long Product Title — A detailed promise that would duplicate the one-line summary in the overview
---

# Very Long Product Title

## 0. One Sentence

This concise summary should become the overview without repeating the long title.

## 1. Why It Exists

The reader needs the actual problem framing first.

## 2. Design Model

The design model explains the moving pieces.
`;

    const annotations = createSectionSummaryScaffold(md);
    const structureMap = annotations.semantic_blocks?.find((block) => block.type === "structure_map");

    expect(annotations.document_overview?.summary).toBe(
      "The reader needs the actual problem framing first.",
    );
    expect(annotations.section_summaries.map((item) => item.section_id)).toEqual(["s2", "s3"]);
    expect(annotations.reading_path?.map((item) => item.label)).toEqual([
      "Why It Exists",
      "Design Model",
    ]);
    expect(structureMap?.source_section_id).toBe("s2");
    expect(structureMap?.nodes.map((node) => node.label)).toEqual([
      "Why It Exists",
      "Design Model",
    ]);
  });

  test("deterministic scaffold promotes high-signal sections into the reading path", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Dossier

## Background

Reader needs the problem framing first.

## Notes

Useful but not the main model.

## More Notes

More supporting detail.

## Appendix

Reference material for later.

## Architecture Model

This section explains the system model.

## Risks

This section explains what could break.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.reading_path?.map((item) => item.label)).toEqual([
      "Background",
      "Architecture Model",
      "Risks",
    ]);
    expect(annotations.reading_path?.map((item) => item.section_id)).toEqual([
      "s1",
      "s5",
      "s6",
    ]);
  });

  test("deterministic scaffold writes reader-purpose reading path descriptions instead of copying summaries", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Vision

## 为什么这个项目存在

这份文档先解释长文档为什么不能继续只是漂亮 Markdown，因为读者需要先知道上下文、痛点和判断边界，然后再进入原文细节。

## 背景补充

补充历史信息。

## 核心架构

解释架构选择。

## Dossier 设计与实现（重点章）

定义核心概念。

## 附录

参考资料。

## 开放问题

- Q1: 哪些关系需要人工确认？
`;

    const annotations = createSectionSummaryScaffold(md);
    const summariesById = new Map(
      annotations.section_summaries.map((summary) => [summary.section_id, summary.summary]),
    );

    expect(annotations.reading_path?.map((item) => item.description)).toEqual([
      "先用本节建立背景和问题。",
      "用本节理解关键决策及其理由。",
      "用本节建立文档的核心模型。",
      "继续前先用本节确认开放问题。",
    ]);
    for (const item of annotations.reading_path ?? []) {
      expect(item.description).not.toBe(summariesById.get(item.section_id));
      expect(item.description).not.toMatch(/漂亮 Markdown|补充历史|解释架构选择|定义核心概念|哪些关系/);
    }
  });

  test("deterministic scaffold writes reader-facing status notes from frontmatter", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Dossier — 结构化阅读方案
kind: mvp-spec
status: ready
updated: 2026-05-20
---

# Dossier

## 背景

这份文档说明为什么 HTML 需要先呈现结构化阅读状态，而不只是把 Markdown 换成漂亮页面。

## 核心架构

解释 reader lens 如何帮助理解。
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.document_overview?.status_note).toBe("已就绪 · mvp spec · 更新 2026-05-20");
    expect(annotations.document_overview?.status_note).not.toMatch(/scaffold|标题和首段|Deterministic/i);
  });

  test("deterministic scaffold writes document-kind reader goals from frontmatter", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Dossier — 项目愿景
kind: vision-spec
status: ready
---

# Dossier

## 为什么这个项目存在

这份文档解释产品意图、范围边界和后续实施输入。

## 核心架构

解释核心模型。
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.document_overview?.reader_goal).toBe("用这份 vision spec 对齐产品意图、范围边界和后续实施输入。");
    expect(annotations.document_overview?.reader_goal).not.toMatch(/结构地图|阅读路径/);
  });

  test("deterministic scaffold keeps a distinct core concept section in the reading path", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Dossier

## Background

Reader needs the problem framing first.

## Core Architecture

This section explains the first model layer.

## Supporting Notes

Extra details can wait.

## Dossier Design

This section explains the product's core concept.

## Open Questions

This section explains what remains unresolved.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.reading_path?.map((item) => item.label)).toEqual([
      "Background",
      "Core Architecture",
      "Dossier Design",
      "Open Questions",
    ]);
  });

  test("deterministic scaffold prefers a Dossier design chapter over a generic data model", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Dossier

## Why

Reader needs the problem framing first.

## Core Architecture

This section explains the architecture.

## Data Model

This section explains records and fields.

## Dossier Design and Implementation

This section explains the core product concept.

## Open Questions

This section explains what remains unresolved.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.reading_path?.map((item) => item.label)).toEqual([
      "Why",
      "Core Architecture",
      "Dossier Design and Implementation",
      "Open Questions",
    ]);
  });

  test("deterministic scaffold uses high-signal sections in the structure map for long documents", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Dossier

## Background

Reader needs the problem framing first.

## Notes

Useful but not the main model.

## More Notes

More supporting detail.

## Appendix

Reference material for later.

## Extra Context

Additional context for readers who need it.

## Core Architecture

This section explains the architecture model.

## Dossier Design and Implementation

This section explains the core product concept.

## Open Questions

This section explains what remains unresolved.
`;

    const annotations = createSectionSummaryScaffold(md);
    const structureMap = annotations.semantic_blocks?.find((block) => block.type === "structure_map");
    const expectedLabels = [
      "Background",
      "Core Architecture",
      "Dossier Design and Implementation",
      "Open Questions",
    ];

    expect(annotations.reading_path?.map((item) => item.label)).toEqual(expectedLabels);
    expect(structureMap?.nodes.map((node) => node.label)).toEqual(expectedLabels);
    expect(structureMap?.nodes.map((node) => node.label)).not.toContain("Appendix");
  });

  test("deterministic scaffold labels structure-map edges by section roles", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Product Dossier

## Context

This section explains why the work exists.

## Architecture Decision

This section chooses the model.

## Execution Path

This section turns the model into steps.

## Risks

This section checks what could break.
`;

    const annotations = createSectionSummaryScaffold(md);
    const structureMap = annotations.semantic_blocks?.find((block) => block.type === "structure_map");

    expect(structureMap?.edges).toEqual([
      { from: "context", to: "architecture-decision", label: "frames" },
      { from: "architecture-decision", to: "execution-path", label: "turns into" },
      { from: "execution-path", to: "risks", label: "stress-tested by" },
    ]);
  });

  test("deterministic scaffold localizes CJK lens text and avoids duplicate dash titles", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Dossier — 把 AI 文档渲染成 HTML
---

# Dossier

## 0. 一句话

把 AI 文档渲染成 HTML，让读者先理解结构再读正文。

## 1. 为什么

读者需要先看到问题背景。

## 2. 验收标准

页面必须先呈现结构化导读。
`;

    const annotations = createSectionSummaryScaffold(md);
    const structureMap = annotations.semantic_blocks?.find((block) => block.type === "structure_map");

    expect(annotations.document_overview).toEqual({
      summary: "读者需要先看到问题背景。",
      reader_goal: "先用结构地图和阅读路径理解文档，再进入原文。",
      status_note: "未声明状态元数据。",
      next_step: "从「为什么」开始，再按相关章节继续。",
    });
    expect(structureMap?.title).toBe("文档结构");
    expect(structureMap?.summary).toBe("按原文顺序生成的主要章节阅读地图。");
    expect(structureMap?.edges).toEqual([
      { from: "s2", to: "s3", label: "由证据验证" },
    ]);
  });

  test("deterministic scaffold de-noises table and diagram-first summaries", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `---
title: Noisy Markdown
---

# Noisy Markdown

## 1. Scope Table

| ❌ 不做 | 因为 |
|---|---|
| Dashboard | Not target |
| Chat transcript | Too flat |

## 2. Diagram First

\`\`\`
┌── Source ──┐
│ raw graph  │
└────────────┘
\`\`\`

Readable prose after the diagram should become the summary. It has another sentence.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "Dashboard: Not target. Chat transcript: Too flat.",
      },
      {
        section_id: "s2",
        summary: "Readable prose after the diagram should become the summary.",
      },
    ]);
    expect(annotations.reading_path?.map((item) => item.description)).toEqual([
      "Start here to understand the context and problem.",
      "Start here to understand the context and problem.",
    ]);
    for (const description of annotations.reading_path?.map((item) => item.description) ?? []) {
      expect(description).not.toMatch(/[|┌└─]/);
    }
  });

  test("deterministic scaffold completes lead-in paragraphs with following lists", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Lead-in Demo

## Architecture

Key design choices:

- Index owns relationships.
- Render stays deterministic.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "Key design choices: Index owns relationships. Render stays deterministic.",
        reader_hint: "Use this section to understand the decision and its rationale.",
      },
    ]);
    expect(annotations.reading_path?.[0]?.description).toBe(
      "Use this section to understand the key decision and rationale.",
    );
  });

  test("deterministic scaffold clips long prose summaries for scan-friendly cards", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Long Summary

## Why This Exists

The generated HTML needs a brief summary that lets the reader scan cards before returning to the source prose because otherwise the summary becomes a smaller copy of the original markdown paragraph and makes the document harder to understand.
`;

    const annotations = createSectionSummaryScaffold(md);
    const summary = annotations.section_summaries[0]?.summary ?? "";

    expect(summary).toBe(
      "The generated HTML needs a brief summary that lets the reader scan cards before returning to the source prose because...",
    );
    expect(summary.length).toBeLessThanOrEqual(120);
    expect(annotations.reading_path?.[0]?.description).toBe(
      "Start here to understand the context and problem.",
    );
    expect(annotations.semantic_blocks?.[0]?.type).toBe("structure_map");
    expect(annotations.semantic_blocks?.[0]?.summary).not.toBe(summary);
    if (annotations.semantic_blocks?.[0]?.type === "structure_map") {
      expect(annotations.semantic_blocks[0].nodes[0]?.summary).toBe(summary);
    }
  });

  test("deterministic scaffold clips mixed-language summaries without broken Latin word fragments", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Mixed Summary

## 为什么这个项目存在

你和 AI 协作的产物，绝大多数是文档：spec、方案、设计、ADR、review、change note、研究笔记、简历草稿。这些文档现在以 markdown 形态躺在 docs/ 里。你要理解它们，靠的是：VS Code 的 markdown preview、GitHub web 渲染、浏览器里复制出来的长文本。
`;

    const annotations = createSectionSummaryScaffold(md);
    const summary = annotations.section_summaries[0]?.summary ?? "";

    expect(summary.length).toBeLessThanOrEqual(120);
    expect(summary).toBe("你和 AI 协作的产物，绝大多数是文档：spec、方案、设计、ADR、review、change note、研究笔记、简历草稿。");
    expect(summary).not.toMatch(/\b[A-Za-z]{2,}\.\.\.$/);
  });

  test("deterministic scaffold prefers complete CJK sentence boundaries over next-sentence fragments", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Sentence Boundary

## 不做什么

开发者 observability dashboard（Langfuse / LangSmith / Phoenix 形态）: 那是为 agent 开发者调试用的；本项目为使用 agent 把工作做完的人服务。又一个 chat history 页面不是目标，它会把结构重新拍扁成线性记录。
`;

    const annotations = createSectionSummaryScaffold(md);
    const summary = annotations.section_summaries[0]?.summary ?? "";

    expect(summary).toBe("开发者 observability dashboard（Langfuse / LangSmith / Phoenix 形态）: 那是为 agent 开发者调试用的；本项目为使用 agent 把工作做完的人服务。");
    expect(summary).not.toContain("chat");
  });

  test("deterministic scaffold clips list summaries at complete CJK sentence boundaries", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# List Boundary

## 这个项目不做什么

- 开发者 observability dashboard（Langfuse / LangSmith / Phoenix 形态）: 那是为 agent 开发者调试用的；本项目为使用 agent 把工作做完的人服务。又一个 chat history 页面不是目标，它会把结构重新拍扁成线性记录。
`;

    const annotations = createSectionSummaryScaffold(md);
    const summary = annotations.section_summaries[0]?.summary ?? "";

    expect(summary).toBe("开发者 observability dashboard（Langfuse / LangSmith / Phoenix 形态）: 那是为 agent 开发者调试用的；本项目为使用 agent 把工作做完的人服务。");
    expect(summary).not.toContain("chat");
  });

  test("deterministic scaffold emits section key points and reader hints for dense sections", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Structured Brief

## Architecture Decisions

The renderer should expose the model before the source prose. More detail follows.

- Keep render deterministic.
- Put LLM output in annotations.
- Preserve source markdown.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "The renderer should expose the model before the source prose.",
        key_points: [
          "Keep render deterministic.",
          "Put LLM output in annotations.",
        ],
        reader_hint: "Use this section to understand the decision and its rationale.",
      },
    ]);
  });

  test("deterministic scaffold avoids duplicating list-first summary as key points", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# List First

## Risks

- Renderer output can look like decorated markdown.
- Section briefs can become repetitive.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "Renderer output can look like decorated markdown. Section briefs can become repetitive.",
        reader_hint: "Use this section to check risks before implementation.",
      },
    ]);
  });

  test("deterministic scaffold skips empty lead-in paragraphs when choosing key points", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Reader Shape

## Target Users

People who need to understand generated work quickly.

Precise profile:

- Can read markdown.
- Can review git diffs.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "People who need to understand generated work quickly.",
        key_points: [
          "Can read markdown.",
          "Can review git diffs.",
        ],
      },
    ]);
  });

  test("deterministic scaffold preserves angle-bracket placeholders inside inline code", async () => {
    const { createSectionSummaryScaffold } = await import("../src/enrich/section-summaries.js");
    const md = `# Local Sources

## Capture Sources

Use \`~/.claude/projects/<encoded>/*.jsonl\` to locate session traces.
`;

    const annotations = createSectionSummaryScaffold(md);

    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "Use ~/.claude/projects/<encoded>/*.jsonl to locate session traces.",
      },
    ]);
  });

  test("local agent provider prompt is parsed into annotations", async () => {
    const { createSectionSummariesWithAgent } = await import("../src/enrich/agent-cli.js");
    const md = `# Demo\n\n## First\n\nExplain the first section.\n`;
    const annotations = await createSectionSummariesWithAgent(md, {
      provider: "claude",
      cwd: "/tmp",
      runner: async (command, args, options) => {
        expect(command).toBe("claude");
        expect(args).toContain("-p");
        expect(options.input).toContain('"document_overview"');
        expect(options.input).toContain('"contract"');
        expect(options.input).toContain('"version": "0.4"');
        expect(options.input).toContain('"semantic_blocks"');
        expect(options.input).toContain('"structure_map"');
        expect(options.input).toContain('"evidence_grid"');
        expect(options.input).toContain('"risk_register"');
        expect(options.input).toContain('"scope_boundary"');
        expect(options.input).toContain('"checklist"');
        expect(options.input).toContain('"open_questions"');
        expect(options.input).toContain('"concept_glossary"');
        expect(options.input).toContain('"relationship_map"');
        expect(options.input).toContain('semantic_blocks should contain a concept_glossary');
        expect(options.input).toContain('semantic_blocks should contain a relationship_map');
        expect(options.input).toContain('Use blocked when an open question blocks a next action');
        expect(options.input).toContain('"section_id": "s1"');
        return {
          stdout: '```json\n{"schema_version":1,"source":"dossier-enrich:agent","document_overview":{"summary":"The document explains the first section.","reader_goal":"Know where to start."},"reading_path":[{"label":"Start","section_id":"s1","description":"Read the first section."}],"semantic_blocks":[{"type":"structure_map","title":"Document model","summary":"The document starts with context and leaves one decision open.","source_section_id":"s1","nodes":[{"id":"context","label":"Context","kind":"context","summary":"The first section sets context.","section_id":"s1"},{"id":"question","label":"Open decision","kind":"question","summary":"One choice remains undecided.","section_id":"s1"}],"edges":[{"from":"context","to":"question","label":"reveals"}]},{"type":"relationship_map","title":"Document relationships","source_section_id":"s1","summary":"The first section points to an open decision.","items":[{"from":"Context","relation":"reveals","to":"Open decision","evidence":"The document leaves one choice open.","section_id":"s1"}]},{"type":"evidence_grid","title":"Evidence","source_section_id":"s1","items":[{"label":"Source paragraph","evidence":"The first section is present.","source":"section text","section_id":"s1"}]},{"type":"scope_boundary","title":"Scope","in_scope":["Explain the first section"],"out_of_scope":["Invent extra facts"],"source_section_id":"s1"},{"type":"checklist","title":"Checks","items":[{"label":"Context is clear","detail":"The reader knows where to start.","status":"required","section_id":"s1"}],"source_section_id":"s1"},{"type":"open_questions","title":"Open questions","source_section_id":"s1","items":[{"question":"What remains undecided?","context":"The document leaves one choice open.","impact":"Blocks the next implementation slice.","status":"open","section_id":"s1"}]}],"section_summaries":[{"section_id":"s1","summary":"The first section sets context."}]}\n```',
          stderr: "",
        };
      },
    });

    expect(annotations).toEqual({
      schema_version: 2,
      source: "dossier-enrich:claude",
      contract: expect.objectContaining({
        name: "dossier-ai-enrichment",
        version: "0.4",
        producer: "dossier-enrich:claude",
      }),
      document_overview: {
        summary: "The document explains the first section.",
        reader_goal: "Know where to start.",
      },
      reading_path: [
        {
          label: "Start",
          section_id: "s1",
          description: "Read the first section.",
        },
      ],
      semantic_blocks: [
        {
          type: "structure_map",
          title: "Document model",
          summary: "The document starts with context and leaves one decision open.",
          source_section_id: "s1",
          nodes: [
            {
              id: "context",
              label: "Context",
              kind: "context",
              summary: "The first section sets context.",
              section_id: "s1",
            },
            {
              id: "question",
              label: "Open decision",
              kind: "question",
              summary: "One choice remains undecided.",
              section_id: "s1",
            },
          ],
          edges: [
            {
              from: "context",
              to: "question",
              label: "reveals",
            },
          ],
        },
        {
          type: "relationship_map",
          title: "Document relationships",
          source_section_id: "s1",
          summary: "The first section points to an open decision.",
          items: [
            {
              from: "Context",
              relation: "reveals",
              to: "Open decision",
              evidence: "The document leaves one choice open.",
              section_id: "s1",
            },
          ],
        },
        {
          type: "evidence_grid",
          title: "Evidence",
          source_section_id: "s1",
          items: [
            {
              label: "Source paragraph",
              evidence: "The first section is present.",
              source: "section text",
              section_id: "s1",
            },
          ],
        },
        {
          type: "scope_boundary",
          title: "Scope",
          in_scope: ["Explain the first section"],
          out_of_scope: ["Invent extra facts"],
          source_section_id: "s1",
        },
        {
          type: "checklist",
          title: "Checks",
          items: [
            {
              label: "Context is clear",
              detail: "The reader knows where to start.",
              status: "required",
              section_id: "s1",
            },
          ],
          source_section_id: "s1",
        },
        {
          type: "open_questions",
          title: "Open questions",
          source_section_id: "s1",
          items: [
            {
              question: "What remains undecided?",
              context: "The document leaves one choice open.",
              impact: "Blocks the next implementation slice.",
              status: "open",
              section_id: "s1",
            },
          ],
        },
      ],
      section_summaries: [
        {
          section_id: "s1",
          summary: "The first section sets context.",
        },
      ],
      prerequisites: [],
      checkpoints: [],
      analogies: [],
    });
  });

  test("local agent provider asks for and parses pedagogy annotations", async () => {
    const { createSectionSummariesWithAgent } = await import("../src/enrich/agent-cli.js");
    const md = `# Demo\n\n## Runtime Model\n\nThe renderer stays deterministic while enrich writes annotations.\n`;
    const annotations = await createSectionSummariesWithAgent(md, {
      provider: "codex",
      cwd: "/tmp",
      runner: async (command, args, options) => {
        expect(command).toBe("codex");
        expect(args).toContain("exec");
        expect(options.input).toContain('"schema_version": 2');
        expect(options.input).toContain('"contract"');
        expect(options.input).toContain('"prerequisites"');
        expect(options.input).toContain('"checkpoints"');
        expect(options.input).toContain('"analogies"');
        expect(options.input).toContain("3-5");
        expect(options.input).toContain("only concepts that truly block a zero-knowledge reader");
        expect(options.input).toContain("test understanding, not memorization");
        expect(options.input).toContain("X 就像 Y，因为 Z");
        return {
          stdout: JSON.stringify({
            schema_version: 2,
            source: "dossier-enrich:agent",
            content_mode: "concept",
            prerequisites: [
              {
                term: "annotation JSON",
                plain_language: "renderer reads this data",
                why_needed: "It is the boundary between enrich and render.",
              },
            ],
            checkpoints: [
              {
                section_id: "s1",
                items: ["Explain why render stays offline"],
              },
            ],
            analogies: [
              {
                section_id: "s1",
                concept: "enrich provider",
                analogy: "enrich provider 就像备课助手，因为它准备讲义但不上台讲课",
              },
            ],
            section_summaries: [
              {
                section_id: "s1",
                summary: "The runtime model keeps render deterministic.",
              },
            ],
          }),
          stderr: "",
        };
      },
    });

    expect(annotations.schema_version).toBe(2);
    expect(annotations.prerequisites).toEqual([
      {
        term: "annotation JSON",
        plain_language: "renderer reads this data",
        why_needed: "It is the boundary between enrich and render.",
      },
    ]);
    expect(annotations.checkpoints).toEqual([
      {
        section_id: "s1",
        items: ["Explain why render stays offline"],
      },
    ]);
    expect(annotations.analogies).toEqual([
      {
        section_id: "s1",
        concept: "enrich provider",
        analogy: "enrich provider 就像备课助手，因为它准备讲义但不上台讲课",
      },
    ]);
  });

  test("local agent provider treats missing pedagogy fields as empty arrays", async () => {
    const { createSectionSummariesWithAgent } = await import("../src/enrich/agent-cli.js");
    const annotations = await createSectionSummariesWithAgent(`# Demo\n\n## First\n\nText.\n`, {
      provider: "claude",
      cwd: "/tmp",
      runner: async () => ({
        stdout: JSON.stringify({
          schema_version: 2,
          source: "dossier-enrich:agent",
          section_summaries: [
            {
              section_id: "s1",
              summary: "First section.",
            },
          ],
        }),
        stderr: "",
      }),
    });

    expect(annotations.prerequisites).toEqual([]);
    expect(annotations.checkpoints).toEqual([]);
    expect(annotations.analogies).toEqual([]);
  });

  test("local agent provider falls back to scaffold and records a warning for unparseable output", async () => {
    const { createSectionSummariesWithAgent } = await import("../src/enrich/agent-cli.js");
    const warnings: string[] = [];
    const annotations = await createSectionSummariesWithAgent(`# Demo\n\n## First\n\nText.\n`, {
      provider: "codex",
      cwd: "/tmp",
      onWarning: (message) => warnings.push(message),
      runner: async () => ({
        stdout: "I cannot produce JSON today.",
        stderr: "",
      }),
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("failed to parse codex output");
    expect(annotations.source).toBe("dossier-enrich:codex:fallback");
    expect(annotations.schema_version).toBe(2);
    expect(annotations.section_summaries).toEqual([
      {
        section_id: "s1",
        summary: "Text.",
      },
    ]);
    expect(annotations.prerequisites).toEqual([]);
    expect(annotations.checkpoints).toEqual([]);
    expect(annotations.analogies).toEqual([]);
  });
});
