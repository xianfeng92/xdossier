// MVP-0 end-to-end acceptance tests.
import { describe, test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "../src/render.js";
import { parseFrontmatter } from "../src/parse/frontmatter.js";
import { selectSkill } from "../src/skills/registry.js";
import { parseArgv } from "../src/cli.js";

const here = resolve(import.meta.dirname);
const visionSpecPath = resolve(
  here,
  "../docs/specs/2026-05-17-dossier-vision-spec.md",
);

function duplicateIds(html: string): string[] {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

describe("MVP-0 end-to-end: vision spec → HTML", () => {
  test("renders structurally correct semantic HTML within bounded size", async () => {
    const md = await readFile(visionSpecPath, "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    // Strict acceptance (spec §1.3 items 1–10):
    expect(html).toMatch(/<title>Dossier/);
    expect(html.length).toBeLessThan(250_000);
    expect(html).toMatch(/<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">/);
    expect(html).toMatch(/<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(html).toMatch(/<nav id="source-section-map" class="source-section-map"/);
    expect(html).toMatch(/aside class="toc"/);
    expect((html.match(/<section id="s\d+"/g) ?? []).length).toBeGreaterThanOrEqual(17);
    expect(html).toMatch(/badge.*\bready\b/);
    expect(html).toMatch(/callout warn/);
    expect((html.match(/class="callout/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toMatch(/ascii-diagram/);
    expect(html).not.toMatch(/<script src=/);
    expect(html).not.toMatch(/<link[^>]+href="http/);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/);
    expect(html).not.toMatch(/TODO \(Codex\)/);

    expect(html).toMatch(/<section id="s1">/);
    expect(html).toMatch(/<header class="section-cover" data-detail-level="section-cover">[\s\S]*?<div class="section-cover-num">01<\/div>[\s\S]*?<h2 id="s1-title" class="section-cover-title">一句话<\/h2>/);
    expect(html).toMatch(/<h3 id="s2-1"><span class="sub-num">1\.1<\/span>一个被忽视的现实<\/h3>/);
    expect(html).not.toMatch(/<span class="sec-num">§ 1<\/span><span>0\. /);
    expect(html).not.toMatch(/<span class="sub-num">2\.1<\/span>1\.1 /);
    expect(html).toMatch(/<div class="executive-brief" aria-label="文档摘要">/);
    expect(html).not.toMatch(/<div class="tagline">/);
    expect(html).not.toMatch(/&lt;(em|strong)&gt;/);
    expect(html).toMatch(/<h1>Dossier<\/h1>\s*<p class="subtitle">把 AI 给你的每一份设计/);
    expect(html).not.toMatch(/<span class="meta-label">reviews<\/span><span class="meta-value"><\/span>/);
    expect(html).toMatch(/<html lang="zh-CN" data-reader="beginner" data-content-mode="concept">/);
    expect(html).toMatch(/<span class="badge ready">已就绪<\/span>/);
    expect(html).toMatch(/<span class="stat-label">阅读<\/span><span class="stat-value">约 \d+ 分钟<\/span>/);
    expect(html).toMatch(/<span class="stat-label">更新<\/span><span class="stat-value">2026-05-18<\/span>/);
    expect(html).toMatch(/<span class="stat-label">负责人<\/span><span class="stat-value">claude<\/span>/);
    expect(html).toMatch(/<span class="stat-label">创建<\/span><span class="stat-value">2026-05-17<\/span>/);
    expect(html).toMatch(/<span class="stat-label">评审<\/span><span class="stat-value">1<\/span>/);
    expect(html).toMatch(/<details class="frontmatter-details compact-relations"[^>]*>\s*<summary>1 个评审<\/summary>/);
    expect(html).toMatch(/<button class="toc-toggle" type="button" aria-label="打开或关闭目录"/);
    expect(html).toMatch(/<p class="toc-header">文档 · 18 节<\/p>/);
    expect(html).toMatch(/btn\.setAttribute\("aria-label", "复制代码"\)/);
    expect(html).toMatch(
      /<footer class="spec-footer">[\s\S]*?<span>Dossier — 把 AI 给你的每一份设计 \/ 方案 \/ 文档自动渲染成可读、可分享、可关联的 HTML 档案 · 已就绪 · 2026-05-18<\/span>[\s\S]*?<span>由 xdossier 渲染<\/span>/,
    );

    const headerHtml = html.slice(
      html.indexOf('<header class="frontmatter'),
      html.indexOf("</header>") + "</header>".length,
    );
    expect(headerHtml).not.toMatch(/>ready<|>Reading<|>Updated<|>Owner<|>Created<|>Reviews<|1 reviews/);
    expect(html).toMatch(
      /<div class="toc-lens-group" aria-label="Dossier 透镜导航">[\s\S]*?<p class="toc-lens-title">Dossier 透镜<\/p>[\s\S]*?<a href="#lens-overview">[\s\S]*?总览[\s\S]*?<a href="#lens-structure-map-1">[\s\S]*?结构图[\s\S]*?<a href="#source-sections">[\s\S]*?原文章节[\s\S]*?<a href="#source-section-map">[\s\S]*?章节地图/,
    );
    expect(html).toMatch(/<p class="semantic-label">结构图<\/p>[\s\S]*?<h2>文档结构<\/h2>/);
    expect(html).toMatch(/<p class="semantic-label">连接关系<\/p>/);
    expect(html).toMatch(/<p class="source-prose-title">原文章节<\/p>/);
    expect(html).toMatch(/<p class="source-prose-count">\d+ 个一级章节<\/p>/);
    expect(html).toMatch(/<nav id="source-section-map" class="source-section-map" aria-label="章节地图">/);
    expect(html).toMatch(/<p class="semantic-label">章节地图<\/p>/);

    const lensNavHtml = html.slice(
      html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">'),
      html.indexOf('<ol>', html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">') + 1),
    );
    expect(lensNavHtml).not.toMatch(/Dossier Lens|Overview|Structure Map|Source Sections|Section Map/);

    const fullLensNavHtml = html.slice(
      html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">'),
      html.indexOf('</div>', html.indexOf('<div class="toc-lens-group" aria-label="Dossier 透镜导航">')) + "</div>".length,
    );
    expect(fullLensNavHtml).not.toMatch(/href="#lens-relationship-map-\d+"/);
    expect(html).not.toMatch(/Frontmatter relations|Explicit artifact relationships declared in frontmatter/);

    const sourceMapHtml = html.slice(
      html.indexOf('<nav id="source-section-map" class="source-section-map" aria-label="章节地图">'),
      html.indexOf('<section id="s1">'),
    );
    expect(sourceMapHtml).toMatch(/路径：为什么这个项目存在/);
    expect(sourceMapHtml).toMatch(/模型：为什么这个项目存在/);
    expect(sourceMapHtml).not.toMatch(/Path: 为什么这个项目存在|Model: 为什么这个项目存在/);

    expect(html).toMatch(/<p class="structure-node-kind">背景<\/p>/);
    expect(html).toMatch(/<p class="structure-node-kind">决策<\/p>/);
    expect(html).toMatch(/<p class="structure-node-kind">问题<\/p>/);
    expect(html).toMatch(/<span class="checklist-status">必做<\/span>/);
    expect(html).toMatch(/<span class="open-question-status">开放<\/span>/);
    expect(html).not.toMatch(/>(?:CONTEXT|DECISION|QUESTION|REQ|OPEN)<\/(?:p|span)>/);

    const firstTracedSourceSection = html.slice(html.indexOf('<section id="s2">'), html.indexOf('<section id="s3">'));
    expect(firstTracedSourceSection).toMatch(
      /<nav class="section-semantic-trace" data-annotation="section-semantic-trace" aria-label="本节语义引用">[\s\S]*?<span class="section-semantic-trace-label">用于<\/span>[\s\S]*?<a class="section-semantic-chip section-semantic-path" href="#lens-overview">路径：为什么这个项目存在<\/a>[\s\S]*?<a class="section-semantic-chip section-semantic-model" href="#lens-structure-map-1-node-s2">模型：为什么这个项目存在<\/a>/,
    );

    const roadmapSubsectionTrace = html.slice(html.indexOf('<h3 id="s11-1">'), html.indexOf('<h3 id="s11-2">'));
    expect(roadmapSubsectionTrace).toMatch(
      /<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="小节语义引用">[\s\S]*?<span class="section-semantic-trace-label">用于<\/span>[\s\S]*?路线图：10\.1/,
    );
    expect(html).not.toMatch(/Used in|Path: 为什么这个项目存在|Model: 为什么这个项目存在|Roadmap: 10\.1|Semantic trace for this/);
  });

  test("preserves external markdown hyperlinks without loading external resources", async () => {
    const md = await readFile(visionSpecPath, "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect((html.match(/<a href="https:/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(html).not.toMatch(/<script src=/);
    expect(html).not.toMatch(/<link rel="stylesheet" href=/);
    expect(html).not.toMatch(/<img src="http/);
  });

  test("escapes raw HTML blocks instead of passing active markup through", async () => {
    const md = `# Unsafe HTML

## Payloads

<script>alert("xss")</script>
<iframe src="https://example.com"></iframe>
<svg onload="alert(1)"><circle /></svg>
`;

    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).not.toMatch(/<script>alert|<iframe\b|<svg\s+onload|<[^>]+\sonload=/i);
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;iframe src=&quot;https://example.com&quot;&gt;&lt;/iframe&gt;");
    expect(html).toContain("&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;circle /&gt;&lt;/svg&gt;");
  });

  test("blocks unsafe markdown link protocols while preserving safe links", async () => {
    const md = `# Link Safety

## Links

[safe](https://example.com) [relative](docs/spec.md) [anchor](#s1)
[js](javascript:alert(1)) [data](data:text/html,<script>alert(1)</script>)
`;

    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toContain('<a href="https://example.com" class="external-ref">safe</a>');
    expect(html).toContain('<a href="docs/spec.md">relative</a>');
    expect(html).toContain('<a href="#s1">anchor</a>');
    expect(html).not.toMatch(/href="javascript:|href="data:/i);
    expect((html.match(/href="#blocked-url"/g) ?? []).length).toBe(2);
  });

  test("renders the reader toggle and default pedagogy data attributes", async () => {
    const md = await readFile(visionSpecPath, "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).toMatch(/<html lang="zh-CN" data-reader="beginner" data-content-mode="concept">/);
    expect(html).toMatch(/<nav class="reader-toggle" role="radiogroup" aria-label="读者熟练度">/);
    expect(html).toMatch(/<button type="button" data-reader-set="beginner" aria-pressed="true">零基础<\/button>/);
    expect(html).toMatch(/<button type="button" data-reader-set="intermediate" aria-pressed="false">系统化<\/button>/);
    expect(html).toMatch(/<button type="button" data-reader-set="expert" aria-pressed="false">速查<\/button>/);
    expect(html).toContain('localStorage.setItem("dossier.reader", value)');
    expect(html).toContain('url.searchParams.get("reader")');
    expect(html).not.toMatch(/<script src=|<link rel="stylesheet" href=|<img src="http/i);
  });

  test("keeps section anchors unique while labeling section cover titles", async () => {
    const md = `# Anchor Demo

## First Section

Text.

## Second Section

More text.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
    expect(html).toContain('<section id="s1">');
    expect(html).toContain('<h2 id="s1-title" class="section-cover-title">First Section</h2>');
    expect(html).toContain('<a href="#s1"');
  });

  test("render options can override reader and content mode", async () => {
    const md = await readFile(visionSpecPath, "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      reader: "expert",
      contentModeOverride: "reference",
    });

    expect(html).toMatch(/<html lang="zh-CN" data-reader="expert" data-content-mode="reference">/);
    expect(html).toMatch(/<button type="button" data-reader-set="expert" aria-pressed="true">速查<\/button>/);
  });

  test("renders P0 pedagogy annotations into deterministic teaching elements", async () => {
    const md = `---
title: Pedagogy Demo
---

# Pedagogy Demo

## Context

Frontmatter lets the renderer understand metadata before markdown prose. The renderer keeps output deterministic.

## Implementation

The implementation injects teaching blocks into the matching section.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 2,
        content_mode: "concept",
        prerequisites: [
          {
            term: "frontmatter",
            plain_language: "markdown 文件顶部的 YAML 元数据",
            why_needed: "用来决定标题、状态和渲染模式",
            fallback_link: "#s1",
          },
        ],
        checkpoints: [
          {
            section_id: "s2",
            items: ["解释 reader profile 为什么只渲染一份 HTML", "说出 content_mode 的四种值"],
          },
        ],
        analogies: [
          {
            section_id: "s1",
            concept: "content_mode",
            analogy: "content_mode 就像菜单分类，reader_profile 就像分量选择。",
          },
        ],
        semantic_blocks: [
          {
            type: "concept_glossary",
            title: "Core concepts",
            source_section_id: "s1",
            items: [
              {
                term: "Frontmatter",
                plain_language: "markdown 文件顶部的 YAML 元数据",
                section_id: "s1",
              },
            ],
          },
        ],
        section_summaries: [
          { section_id: "s1", summary: "This section explains metadata." },
          { section_id: "s2", summary: "This section explains implementation." },
        ],
      } as any,
    });

    expect(html).toMatch(/<aside class="prerequisite-card" data-detail-level="prereq">[\s\S]*?frontmatter[\s\S]*?markdown 文件顶部的 YAML 元数据/);
    expect(html).toMatch(/<aside class="callout analogy" data-detail-level="analogy" data-section="s1">[\s\S]*?content_mode 就像菜单分类/);
    expect(html).toMatch(/<aside class="learning-checkpoint" data-detail-level="checkpoint" data-section="s2">[\s\S]*?解释 reader profile/);
    expect(html).toMatch(/<span class="term" data-detail-level="glossary" data-term="Frontmatter" data-definition="markdown 文件顶部的 YAML 元数据"/);
    expect((html.match(/class="term"/g) ?? []).length).toBe(1);
  });

  test("injects section covers with reading-path and summary fallback kickers", async () => {
    const md = `# Cover Demo

## First Section

The first section starts here.

## Second Section

The second section starts here.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 2,
        reading_path: [
          {
            label: "Start",
            section_id: "s1",
            description: "Why read this section from the reading path.",
          },
        ],
        section_summaries: [
          {
            section_id: "s1",
            summary: "This summary should lose to the reading path.",
          },
          {
            section_id: "s2",
            summary: "Use this first sentence. Ignore this second sentence.",
          },
        ],
      },
    });

    expect(html).toMatch(/<header class="section-cover" data-detail-level="section-cover">[\s\S]*?<div class="section-cover-num">01<\/div>[\s\S]*?<h2 id="s1-title" class="section-cover-title">First Section<\/h2>[\s\S]*?<p class="section-cover-kicker">Why read this section from the reading path\.<\/p>[\s\S]*?<\/header>/);
    expect(html).toMatch(/<header class="section-cover" data-detail-level="section-cover">[\s\S]*?<div class="section-cover-num">02<\/div>[\s\S]*?<h2 id="s2-title" class="section-cover-title">Second Section<\/h2>[\s\S]*?<p class="section-cover-kicker">Use this first sentence\.<\/p>[\s\S]*?<\/header>/);
  });

  test("upgrades long standalone non-callout blockquotes into pull quotes", async () => {
    const md = `# Quote Demo

## Principle

> L2 Index is the project constitution because capture and render both evolve around the same stable map.

> 📝 This remains a normal callout, not a pull quote.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).toMatch(/<figure class="pull-quote">[\s\S]*?<span class="pull-quote-mark" aria-hidden="true">&quot;<\/span>[\s\S]*?<blockquote class="pull-quote-body">[\s\S]*?project constitution[\s\S]*?<\/blockquote>[\s\S]*?<span class="pull-quote-mark-end" aria-hidden="true">&quot;<\/span>[\s\S]*?<\/figure>/);
    expect(html).toMatch(/<div class="callout note" data-document-note>/);
  });

  test("renders supported vertical ASCII box diagrams as inline SVG", async () => {
    const md = `# Diagram Demo

## Architecture

\`\`\`
┌──────────────────────────┐
│ Capture Layer            │
└──────────────────────────┘
             ↓
┌──────────────────────────┐
│ Artifact Layer           │
└──────────────────────────┘
             ↓
┌──────────────────────────┐
│ Render Layer             │
└──────────────────────────┘
\`\`\`
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).toMatch(/<figure class="inline-diagram" data-diagram="ascii-vertical-stack">[\s\S]*?<svg/);
    expect(html).toMatch(/<text[^>]*>Capture Layer<\/text>/);
    expect(html).toMatch(/<line[^>]+marker-end="url\(#ascii-diagram-arrow\)"/);
    expect(html).not.toMatch(/<pre class="ascii-diagram"><code>[\s\S]*Capture Layer/);
  });

  test("keeps unsupported ASCII diagrams and single boxes as pre fallback", async () => {
    const md = `# Diagram Fallback Demo

## Unsupported

\`\`\`
┌──────────┐
│ Root     │
└──────────┘
  ├─ Child A
  └─ Child B
\`\`\`

\`\`\`
┌──────────┐
│ Lone Box │
└──────────┘
\`\`\`
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect((html.match(/<pre class="ascii-diagram"><code>/g) ?? []).length).toBe(2);
    expect(html).not.toMatch(/class="inline-diagram"/);
  });

  test("renders scope_boundary semantic blocks as two-column comparison cards", async () => {
    const md = `# Scope Demo

## Scope

The source prose starts here.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 2,
        semantic_blocks: [
          {
            type: "scope_boundary",
            title: "Scope boundaries",
            source_section_id: "s1",
            in_scope: ["Render structured learning moments"],
            out_of_scope: ["Infer comparisons from arbitrary tables"],
          },
        ],
        section_summaries: [],
      },
    });

    expect(html).toMatch(/<section id="lens-scope-boundary-1" class="comparison-cards" data-block="scope_boundary">[\s\S]*?<header class="comparison-cards-title">Scope boundaries[\s\S]*?<\/header>[\s\S]*?<div class="comparison-cards-grid">/);
    expect(html).toMatch(/<article class="comparison-card comparison-card-in">[\s\S]*?<span class="comparison-card-icon" aria-hidden="true">✓<\/span>[\s\S]*?In scope[\s\S]*?Render structured learning moments/);
    expect(html).toMatch(/<article class="comparison-card comparison-card-out">[\s\S]*?<span class="comparison-card-icon" aria-hidden="true">✗<\/span>[\s\S]*?Out of scope[\s\S]*?Infer comparisons from arbitrary tables/);
  });

  test("vision spec render exposes P2 visual rhythm moments", async () => {
    const md = await readFile(visionSpecPath, "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect((html.match(/class="section-cover"/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect((html.match(/class="pull-quote"/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect((html.match(/class="inline-diagram"/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect((html.match(/class="comparison-cards"/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

describe("minimal fixture", () => {
  test("renders a deterministic scaffold lens by default", async () => {
    const md = `# Scaffolded Render

## Context

This explains why the work matters.

## Success Criteria

- Reader sees the structure before the source prose.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).toMatch(/<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">/);
    expect(html).toMatch(/<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(html).toMatch(/<div id="lens-checklist-2" class="semantic-block checklist-lens" data-annotation="semantic-checklist">/);
    expect(html).toMatch(/<nav id="source-section-map" class="source-section-map" aria-label="Section map">/);

    const overviewIndex = html.indexOf('id="lens-overview"');
    const sourceIndex = html.indexOf('<section id="s1">');
    expect(overviewIndex).toBeGreaterThan(0);
    expect(overviewIndex).toBeLessThan(sourceIndex);
  });

  test("section map lanes explain why each semantic route matters", async () => {
    const md = `# Lane Purpose Demo

## Context

This explains why the work matters.

## Architecture Decisions

The design chooses deterministic rendering with optional annotations.

## Risks

| Risk | Mitigation |
|---|---|
| Pretty markdown | Add a semantic route before source prose |
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).not.toMatch(/source-section-lane-route|Reading route/);
    expect(html).toMatch(
      /<a class="source-section-lane-link" href="#s1">[\s\S]*?<span class="source-section-lane-section">Context<\/span>[\s\S]*?<span class="source-section-lane-role">Model: Context<\/span>[\s\S]*?<span class="source-section-lane-purpose">This explains why the work matters\.<\/span>/,
    );
    expect(html).toMatch(
      /<a class="source-section-lane-link" href="#s2">[\s\S]*?<span class="source-section-lane-section">Architecture Decisions<\/span>[\s\S]*?<span class="source-section-lane-role">Model: Architecture Decisions<\/span>[\s\S]*?<span class="source-section-lane-purpose">Use this section to understand the decision and its rationale\.<\/span>/,
    );
    expect(html).toMatch(
      /<section class="source-section-lane source-section-lane-judgment">[\s\S]*?<a class="source-section-lane-link" href="#s3">[\s\S]*?<span class="source-section-lane-section">Risks<\/span>[\s\S]*?<span class="source-section-lane-role">Risks<\/span>[\s\S]*?<span class="source-section-lane-purpose">Use this section to check risks before implementation\.<\/span>/,
    );
  });

  test("scaffold does not repeat preamble tagline as overview and section summary", async () => {
    const md = `# Preamble Demo

## 0. One Sentence

Readable HTML should explain the artifact before the source prose.

## Context

This section explains why the work matters.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    const overviewHtml = html.slice(
      html.indexOf('<div id="lens-overview"'),
      html.indexOf('<div class="semantic-model-flow"'),
    );
    expect(overviewHtml).toContain("This section explains why the work matters.");
    expect(overviewHtml).not.toContain("Readable HTML should explain the artifact before the source prose.");

    const preambleSection = html.slice(html.indexOf('<section id="s1">'), html.indexOf('<section id="s2">'));
    expect(preambleSection).not.toMatch(/data-annotation="section-summary"/);
    expect(preambleSection).not.toMatch(/section-key-points|section-reader-hint/);
  });

  test("single frontmatter relation stays in header details instead of becoming a lens panel", async () => {
    const md = `---
title: One Review
kind: spec
status: ready
reviews:
  - docs/reviews/one-review.md
---

# One Review

## Context

Body.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<details class="frontmatter-details compact-relations"[^>]*>\s*<summary>1 reviews<\/summary>/);
    expect(html).not.toMatch(/Frontmatter relations|Explicit artifact relationships declared in frontmatter/);
    expect(html).not.toMatch(/data-annotation="semantic-relationship-map"[\s\S]*?docs\/reviews\/one-review\.md/);
  });

  test("section map removes duplicate reading-route lane and collapses card role chips", async () => {
    const md = `# Lane Reduction

## Context

This section explains why the work matters.

## Architecture Decisions

The design chooses deterministic rendering with optional annotations.

## Acceptance

- Reader sees the structure before prose.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    const sourceMapHtml = html.slice(
      html.indexOf('<nav id="source-section-map"'),
      html.indexOf('<section id="s1">'),
    );
    expect(sourceMapHtml).not.toMatch(/source-section-lane-route|Reading route/);
    expect(sourceMapHtml).toMatch(/source-section-lane-model/);
    expect(sourceMapHtml).toMatch(/source-section-lane-judgment/);
    expect(sourceMapHtml).toMatch(/<details class="source-section-role-summary" aria-label="Semantic roles"[^>]*>[\s\S]*?<summary>2 semantic roles<\/summary>[\s\S]*?Path: Context[\s\S]*?Model: Context/);
    expect(sourceMapHtml).not.toMatch(/<span class="source-section-semantic-roles"/);
  });

  test("semantic lens panels show only three items before a disclosure", async () => {
    const md = `# Long Lens

## Decisions

Body.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        semantic_blocks: [
          {
            type: "decision_grid",
            title: "Decisions",
            source_section_id: "s1",
            items: [
              { label: "A", value: "Alpha", rationale: "First.", section_id: "s1" },
              { label: "B", value: "Beta", rationale: "Second.", section_id: "s1" },
              { label: "C", value: "Gamma", rationale: "Third.", section_id: "s1" },
              { label: "D", value: "Delta", rationale: "Fourth.", section_id: "s1" },
            ],
          },
        ],
        section_summaries: [
          { section_id: "s1", summary: "Decision source." },
        ],
      },
    });

    expect(html).toMatch(/<div id="lens-decision-grid-1" class="semantic-block decision-grid" data-annotation="semantic-decision-grid">/);
    expect(html).toMatch(/<div class="decision-grid-cards">[\s\S]*?lens-decision-grid-1-item-1[\s\S]*?lens-decision-grid-1-item-2[\s\S]*?lens-decision-grid-1-item-3/);
    expect(html).toMatch(/<details class="semantic-block-extra"[^>]*>[\s\S]*?<summary>Show 1 more item<\/summary>[\s\S]*?lens-decision-grid-1-item-4/);
  });

  test("explicit annotations replace the default scaffold lens", async () => {
    const md = `# Explicit Only

## Context

This source section would otherwise receive a scaffold summary.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        document_overview: {
          summary: "External annotations own this render.",
        },
        section_summaries: [],
      },
    });

    expect(html).toMatch(/External annotations own this render\./);
    expect(html).not.toMatch(/semantic-structure-map/);
    expect(html).not.toMatch(/<nav id="source-section-map"/);
  });

  test("renders with no frontmatter title fallback", async () => {
    const md = "# Hello\n\n## Section A\n\nHi.\n";
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });
    expect(html).toMatch(/<title>Hello<\/title>/);
  });

  test("renders the minimal fixture without throwing", async () => {
    const md = await readFile(resolve(here, "fixtures/minimal.md"), "utf8");
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });
    expect(html).toMatch(/Section A/);
    expect(html).toMatch(/Section B/);
  });

  test("renders inline markdown inside numbered headings instead of exposing raw markdown", async () => {
    const md = "# Heading Inline Demo\n\n## 3. Manual `open` Review\n\nText.\n\n### 3.1 Check `scroll-spy`\n\nMore.\n";
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
    });

    expect(html).toMatch(/<h2 id="s1-title" class="section-cover-title">Manual <code>open<\/code> Review<\/h2>/);
    expect(html).toMatch(/<h3 id="s1-1"><span class="sub-num">3\.1<\/span>Check <code>scroll-spy<\/code><\/h3>/);
    expect(html).toMatch(/<span>Manual open Review<\/span>/);
    expect(html).toMatch(/<span>Check scroll-spy<\/span>/);
    expect(html).not.toContain("Manual `open` Review");
    expect(html).not.toContain("Check `scroll-spy`");
  });
});

describe("frontmatter parser", () => {
  test("parses fixture frontmatter and removes it from content", async () => {
    const md = await readFile(resolve(here, "fixtures/minimal.md"), "utf8");
    const parsed = parseFrontmatter(md);

    expect(parsed.data).toMatchObject({
      title: "Hello",
      status: "draft",
      kind: "spec",
    });
    expect(parsed.content).toMatch(/^# Hello/);
  });

  test("keeps markdown intact when frontmatter is absent", () => {
    const md = "# Hello\n\nNo frontmatter here.\n";
    expect(parseFrontmatter(md)).toEqual({ data: {}, content: md });
  });
});

describe("skill registry dispatch", () => {
  test("selects render-spec from filename patterns when frontmatter is absent", () => {
    const selection = selectSkill({
      frontmatter: {},
      filepath: resolve(here, "../docs/specs/example-spec.md"),
    });

    expect(selection).toMatchObject({
      skillId: "render-spec",
      reason: "filename-pattern",
    });
  });

  test("selects render-spec from directory patterns when filename is generic", () => {
    const selection = selectSkill({
      frontmatter: {},
      filepath: resolve(here, "../docs/specs/notes.md"),
    });

    expect(selection).toMatchObject({
      skillId: "render-spec",
      reason: "directory-pattern",
    });
  });

  test("selects render-spec from nested absolute directory patterns", () => {
    const selection = selectSkill({
      frontmatter: {},
      filepath: resolve(here, "../docs/specs/sub/notes.md"),
    });

    expect(selection).toMatchObject({
      skillId: "render-spec",
      reason: "directory-pattern",
    });
  });
});

describe("frontmatter header: eyebrow / stat-row / collapsed relations", () => {
  test("promotes the first tagline into a compact executive brief and collapses top document notes", async () => {
    const md = `---
title: Dossier — Human-readable AI artifacts
kind: vision-spec
status: ready
owner: codex
---

> ⚠️ This is a constitution-level note.
> 📝 This changed after review.

# Dossier

## 0. One Line

> **Turn AI output into a readable dossier.**

Supporting sentence stays in the body.

## 1. Why

Body text.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(
      /<div class="executive-brief" aria-label="文档摘要">[\s\S]*?<p class="executive-brief-label">摘要<\/p>[\s\S]*?Turn AI output into a readable dossier\.[\s\S]*?<\/div>/,
    );
    expect(html).toMatch(/<details class="document-notes"[^>]*>\s*<summary>2 条文档提示<\/summary>/);
    expect(html).toMatch(/<div class="document-notes-body">[\s\S]*?constitution-level note[\s\S]*?changed after review/);
    expect(html).not.toMatch(/<div class="tagline">/);
    expect(html).toMatch(/<section id="s1">[\s\S]*Supporting sentence stays in the body\./);

    const briefIndex = html.indexOf('<div class="executive-brief" aria-label="文档摘要">');
    const statIndex = html.indexOf('<div class="stat-row">');
    const notesIndex = html.indexOf('<details class="document-notes"');
    const firstSectionIndex = html.indexOf("<section id=\"s1\"");
    expect(briefIndex).toBeGreaterThan(0);
    expect(statIndex).toBeGreaterThan(0);
    expect(briefIndex).toBeLessThan(firstSectionIndex);
    expect(notesIndex).toBeLessThan(firstSectionIndex);
  });

  test("promotes top brief and document notes without clipping nested raw HTML", async () => {
    const md = `---
title: Nested HTML
status: ready
---

> ⚠️ <span class="note-label">Risk</span><div class="note-detail">Nested detail</div>

# Nested HTML

## 0. One Line

> <span class="lead">Readable</span><div class="brief-detail">Nested brief detail</div>
> Still part of the brief.

## 1. Body

Body text.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(
      /<div class="executive-brief" aria-label="文档摘要">[\s\S]*?brief-detail[\s\S]*?Nested brief detail[\s\S]*?Still part of the brief\./,
    );
    expect(html).toMatch(
      /<div class="document-notes-body">[\s\S]*?note-detail[\s\S]*?Nested detail[\s\S]*?<\/div>\s*<\/details>/,
    );
    expect(html).not.toMatch(/<div class="tagline"/);
    expect(html).toMatch(/<section id="s2">[\s\S]*Body text\./);
  });

  test("implements/reviews counts appear in stat row and full paths are tucked into a collapsed <details>", async () => {
    const md = `---
title: Multi Impl
kind: mvp-spec
status: implemented
implements:
  - docs/changes/a-impl-notes.md
  - docs/changes/b-impl-notes.md
  - docs/changes/c-impl-notes.md
reviews:
  - docs/reviews/single-review.md
---

# Multi Impl

## Section
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    // eyebrow derived from frontmatter.kind
    expect(html).toMatch(/<p class="eyebrow">MVP SPEC<\/p>/);

    // stat row carries counts, not raw paths
    expect(html).toMatch(/<span class="stat-label">Implements<\/span><span class="stat-value">3<\/span>/);
    expect(html).toMatch(/<span class="stat-label">Reviews<\/span><span class="stat-value">1<\/span>/);

    // relation details: collapsed by default, summary describes counts
    expect(html).toMatch(/<details class="frontmatter-details"[^>]*>\s*<summary>3 implements · 1 reviews<\/summary>/);

    // every path is rendered as <code> inside the relation list
    expect(html).toMatch(/<ul class="relation-list">.*<li><code>docs\/changes\/a-impl-notes\.md<\/code><\/li>/);
    expect(html).toMatch(/<li><code>docs\/changes\/b-impl-notes\.md<\/code><\/li>/);
    expect(html).toMatch(/<li><code>docs\/reviews\/single-review\.md<\/code><\/li>/);

    // regression: never the old comma-joined blob, never the old meta-grid shape
    expect(html).not.toMatch(/a-impl-notes\.md, docs\/changes\/b-impl-notes\.md/);
    expect(html).not.toMatch(/<div class="meta-item meta-item-wide">/);
  });

  test("promotes frontmatter artifact relations into a deterministic Relations lens", async () => {
    const md = `---
title: Multi Impl
kind: mvp-spec
status: implemented
implements:
  - docs/specs/source.md
reviews:
  - docs/reviews/single-review.md
---

# Multi Impl

## Section

Body.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<details class="frontmatter-details compact-relations"[^>]*>\s*<summary>1 implements · 1 reviews<\/summary>/);
    expect(html).toMatch(/<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(html).toMatch(/<div id="lens-relationship-map-2" class="semantic-block relationship-map-lens" data-annotation="semantic-relationship-map">/);
    expect(html).toMatch(/<p class="semantic-label">Relationship Map<\/p>[\s\S]*?<h2>Frontmatter relations<\/h2>/);
    expect(html).toMatch(/<li id="lens-relationship-map-2-item-1" class="relationship-edge">[\s\S]*?<span class="relationship-node relationship-from">Multi Impl<\/span>[\s\S]*?<span class="relationship-relation">implements<\/span>[\s\S]*?<span class="relationship-node relationship-to">docs\/specs\/source\.md<\/span>[\s\S]*?frontmatter implements includes docs\/specs\/source\.md/);
    expect(html).toMatch(/<li id="lens-relationship-map-2-item-2" class="relationship-edge">[\s\S]*?<span class="relationship-node relationship-from">docs\/reviews\/single-review\.md<\/span>[\s\S]*?<span class="relationship-relation">reviews<\/span>[\s\S]*?<span class="relationship-node relationship-to">Multi Impl<\/span>[\s\S]*?frontmatter reviews includes docs\/reviews\/single-review\.md/);
    expect(html).toMatch(/<div class="toc-lens-group" aria-label="Dossier lens navigation">[\s\S]*?<a href="#lens-relationship-map-2">[\s\S]*?Relations/);

    const headerEnd = html.indexOf("</header>");
    const relationsIndex = html.indexOf('id="lens-relationship-map-2"');
    const sourceIndex = html.indexOf('<section id="s1">');
    expect(relationsIndex).toBeGreaterThan(headerEnd);
    expect(relationsIndex).toBeLessThan(sourceIndex);
  });

  test("scalar frontmatter values render as labelled stat items", async () => {
    const md = `---
title: Plain
status: ready
owner: claude
updated: 2026-05-19
---

# Plain
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<span class="stat-label">Owner<\/span><span class="stat-value">claude<\/span>/);
    expect(html).toMatch(/<span class="stat-label">Updated<\/span><span class="stat-value">2026-05-19<\/span>/);
    expect(html).toMatch(/<span class="badge ready">ready<\/span>/);

    // no eyebrow when frontmatter has no kind
    expect(html).not.toMatch(/<p class="eyebrow">/);

    // no relation details when no implements/reviews
    expect(html).not.toMatch(/<details class="frontmatter-details"[^>]*>/);
  });
});

describe("semantic lens annotations", () => {
  test("renders document overview, reading path, roadmap, and decisions before prose", async () => {
    const md = `---
title: Gemma Roadmap
kind: spec
status: implemented
---

# Gemma Roadmap

## Background

The source prose starts here.

## Six-stage path

### Level 1

Baseline work.

### Level 2: Data and Schema

Data work.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      source: "test",
      document_overview: {
        summary: "This document turns finetune-lab into a staged Gemma learning roadmap.",
        reader_goal: "Understand the learning path without reading every paragraph first.",
        status_note: "Implemented direction, ready for downstream teaching UI work.",
        next_step: "Start with the staged path, then inspect acceptance criteria.",
      },
      reading_path: [
        {
          label: "Start",
          section_id: "s1",
          description: "Context and current baseline.",
        },
        {
          label: "Main path",
          section_id: "s2",
          description: "The staged learning route.",
        },
      ],
      semantic_blocks: [
        {
          type: "roadmap",
          title: "Six-stage learning path",
          source_section_id: "s2",
          summary: "Move from baseline framing to specialization.",
          items: [
            {
              label: "Level 1",
              title: "Baseline and Task Framing",
              summary: "Define the task, success rubric, and held-out examples.",
              outputs: ["baseline prompts", "success rubric"],
              section_id: "s2-1",
            },
            {
              label: "Level 2",
              title: "Data and Schema",
              summary: "Shape the data contract and validation rules.",
              outputs: ["data schema"],
            },
          ],
        },
        {
          type: "decision_grid",
          title: "Key decisions",
          source_section_id: "s2",
          items: [
            {
              label: "Default base",
              value: "google/gemma-4-E2B-it",
              rationale: "Stable enough to show behavior differences locally.",
              section_id: "s2",
            },
          ],
        },
        {
          type: "scope_boundary",
          title: "Scope boundaries",
          source_section_id: "s1",
          in_scope: ["Teach the staged learning path", "Explain the default base model"],
          out_of_scope: ["Build a production training platform", "Optimize for benchmark scores"],
        },
        {
          type: "checklist",
          title: "Acceptance checks",
          source_section_id: "s2",
          items: [
            {
              label: "Roadmap is visible",
              detail: "A reader can see the staged path before reading prose.",
              status: "required",
              section_id: "s2",
            },
            {
              label: "Scope is explicit",
              detail: "Non-goals are separated from goals.",
              status: "open",
            },
          ],
        },
        {
          type: "open_questions",
          title: "Open questions",
          source_section_id: "s1",
          items: [
            {
              question: "Which dataset should become the canonical teaching example?",
              context: "The roadmap names the learning route but leaves the first dataset choice open.",
              impact: "Blocks the first runnable workshop path.",
              status: "open",
              section_id: "s1",
            },
            {
              question: "Should evaluation run before UI work?",
              context: "The staged path has both evaluation and frontend requirements.",
              status: "blocked",
              section_id: "s2",
            },
          ],
        },
      ],
      section_summaries: [
        {
          section_id: "s1",
          summary: "Background explains why this roadmap matters.",
          key_points: ["Reader sees the baseline", "Context stays short"],
        },
        {
          section_id: "s2",
          summary: "The staged path is the main route through the work.",
          reader_hint: "Use this section to plan implementation.",
        },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">/);
    expect(html).toMatch(/<html lang="en" data-reader="beginner" data-content-mode="concept">/);
    expect(html).toMatch(/<dt>Reader Goal<\/dt>/);
    expect(html).toMatch(/<dt>Status<\/dt>/);
    expect(html).toMatch(/<dt>Next Step<\/dt>/);
    expect(html).toMatch(/<p class="semantic-label">Recommended Reading Path<\/p>/);
    expect(html).not.toMatch(/读者收益|当前状态|下一步|推荐阅读路径/);
    expect(html).toMatch(/This document turns finetune-lab into a staged Gemma learning roadmap/);
    expect(html).toMatch(
      /<div class="toc-lens-group" aria-label="Dossier lens navigation">[\s\S]*?Dossier Lens[\s\S]*?<a href="#lens-overview">[\s\S]*?Overview[\s\S]*?<a href="#lens-roadmap-1">[\s\S]*?Roadmap[\s\S]*?<a href="#lens-decision-grid-2">[\s\S]*?Decisions[\s\S]*?<a href="#lens-scope-boundary-3">[\s\S]*?Scope[\s\S]*?<a href="#lens-checklist-4">[\s\S]*?Checklist[\s\S]*?<a href="#lens-open-questions-5">[\s\S]*?Open Questions[\s\S]*?<a href="#source-sections">[\s\S]*?Source Sections[\s\S]*?<a href="#source-section-map">[\s\S]*?Section Map/,
    );
    expect(html).toMatch(
      /<a href="#s2" class="reading-path-card">[\s\S]*?<span class="reading-path-number">§ 2<\/span>[\s\S]*?<span class="reading-path-label">Main path<\/span>[\s\S]*?The staged learning route/,
    );
    expect(html).toMatch(/<div id="lens-roadmap-1" class="semantic-block roadmap-lens" data-annotation="semantic-roadmap">/);
    expect(html).toMatch(/<ol class="roadmap-stage-strip" aria-label="Roadmap stages">[\s\S]*?<a href="#lens-roadmap-1-item-1">[\s\S]*?Level 1[\s\S]*?Baseline and Task Framing[\s\S]*?<a href="#lens-roadmap-1-item-2">[\s\S]*?Level 2[\s\S]*?Data and Schema/);
    expect(html).toMatch(/<article id="lens-roadmap-1-item-1" class="roadmap-card">[\s\S]*?Level 1[\s\S]*?Baseline and Task Framing[\s\S]*?baseline prompts/);
    expect(html).toMatch(/<article id="lens-roadmap-1-item-2" class="roadmap-card">[\s\S]*?Level 2[\s\S]*?Data and Schema[\s\S]*?data schema/);
    expect(html).toMatch(/<div id="lens-decision-grid-2" class="semantic-block decision-grid" data-annotation="semantic-decision-grid">/);
    expect(html).toMatch(/<div id="lens-decision-grid-2"[\s\S]*?<a class="semantic-source-link" href="#s2">View source § 2<\/a>/);
    expect(html).toMatch(/Default base[\s\S]*?google\/gemma-4-E2B-it[\s\S]*?Stable enough/);
    expect(html).toMatch(/<article id="lens-decision-grid-2-item-1" class="decision-card">[\s\S]*?Default base/);
    expect(html).toMatch(/<article id="lens-decision-grid-2-item-1" class="decision-card">[\s\S]*?Default base[\s\S]*?<a class="semantic-source-link" href="#s2">Source § 2<\/a>/);
    expect(html).toMatch(/<article id="lens-roadmap-1-item-1" class="roadmap-card">[\s\S]*?<a class="semantic-source-link" href="#s2-1">Jump to subsection 2\.1<\/a>/);
    expect(html).toMatch(/<section id="lens-scope-boundary-3" class="comparison-cards" data-block="scope_boundary">/);
    expect(html).toMatch(/In scope[\s\S]*?Teach the staged learning path[\s\S]*?Out of scope[\s\S]*?Build a production training platform/);
    expect(html).toMatch(/<div id="lens-checklist-4" class="semantic-block checklist-lens" data-annotation="semantic-checklist">/);
    expect(html).toMatch(/Roadmap is visible[\s\S]*?A reader can see the staged path before reading prose/);
    expect(html).toMatch(/<div id="lens-open-questions-5" class="semantic-block open-questions-lens" data-annotation="semantic-open-questions">/);
    expect(html).toMatch(/Which dataset should become the canonical teaching example\?[\s\S]*?Blocks the first runnable workshop path/);
    expect(html).toMatch(/BLOCKED[\s\S]*?Should evaluation run before UI work\?/);
    expect(html).toMatch(
      /<div class="semantic-primary-flow">[\s\S]*?<div id="lens-roadmap-1" class="semantic-block roadmap-lens" data-annotation="semantic-roadmap">/,
    );
    expect(html).toMatch(
      /<div class="semantic-judgment-grid" aria-label="Key judgment panels">[\s\S]*?semantic-decision-grid[\s\S]*?comparison-cards[\s\S]*?semantic-checklist[\s\S]*?semantic-open-questions/,
    );
    expect(html).toMatch(
      /<div id="source-sections" class="source-prose-boundary" aria-label="Source sections">[\s\S]*?Source Sections[\s\S]*?2 top-level sections/,
    );
    expect(html).toMatch(
      /<nav id="source-section-map" class="source-section-map" aria-label="Section map">[\s\S]*?<article class="source-section-map-card">[\s\S]*?<a class="source-section-map-main" href="#s1">[\s\S]*?<span class="source-section-num">§ 1<\/span>[\s\S]*?<span class="source-section-title">Background<\/span>[\s\S]*?Background explains why this roadmap matters\./,
    );
    expect(html).toMatch(
      /<article class="source-section-map-card">[\s\S]*?<a class="source-section-map-main" href="#s2">[\s\S]*?<span class="source-section-num">§ 2<\/span>[\s\S]*?<span class="source-section-title">Six-stage path<\/span>[\s\S]*?Use this section to plan implementation\./,
    );
    expect(html).toMatch(/<a class="source-section-map-main" href="#s2">[\s\S]*?2 subsections/);
    expect(html).toMatch(
      /<span class="source-section-subsections" aria-label="Subsections">[\s\S]*?<a href="#s2-1">2\.1 Level 1<\/a>[\s\S]*?<a href="#s2-2">2\.2 Level 2: Data and Schema<\/a>[\s\S]*?<\/span>/,
    );
    expect(html).not.toMatch(/0 subsections/);
    const sourceMapHtml = html.slice(
      html.indexOf('<nav id="source-section-map" class="source-section-map" aria-label="Section map">'),
      html.indexOf('<section id="s1">'),
    );
    expect(sourceMapHtml).not.toMatch(/source-section-lane-route|Reading route/);
    expect(sourceMapHtml).toMatch(
      /<section class="source-section-lane source-section-lane-judgment">[\s\S]*?<p class="source-section-lane-title">Judgment and checks<\/p>[\s\S]*?<a class="source-section-lane-link" href="#s1">[\s\S]*?<span class="source-section-lane-role">Scope<\/span>[\s\S]*?<a class="source-section-lane-link" href="#s2">[\s\S]*?<span class="source-section-lane-role">Decisions<\/span>/,
    );
    expect(sourceMapHtml).toMatch(
      /<article class="source-section-map-card">[\s\S]*?<a class="source-section-map-main" href="#s2">[\s\S]*?<\/a>[\s\S]*?<details class="source-section-role-summary" aria-label="Semantic roles"[^>]*>[\s\S]*?<summary>7 semantic roles<\/summary>[\s\S]*?<a class="source-section-role-chip section-semantic-chip section-semantic-path" href="#lens-overview">Path: Main path<\/a>[\s\S]*?<a class="source-section-role-chip section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-1">Roadmap<\/a>[\s\S]*?<a class="source-section-role-chip section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2">Decisions<\/a>[\s\S]*?<a class="source-section-role-chip section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2-item-1">Decision: Default base<\/a>/,
    );
    expect(sourceMapHtml).not.toMatch(/source-section-semantic-roles|source-section-role-extra/);
    expect(sourceMapHtml).not.toMatch(/data-semantic-href/);

    const s1Html = html.slice(html.indexOf('<section id="s1">'), html.indexOf('<section id="s2">'));
    expect(s1Html).toMatch(
      /<nav class="section-semantic-trace" data-annotation="section-semantic-trace" aria-label="Semantic trace for this section">[\s\S]*?Used in[\s\S]*?<a class="section-semantic-chip section-semantic-path" href="#lens-overview">Path: Start<\/a>[\s\S]*?<a class="section-semantic-chip section-semantic-scope" href="#lens-scope-boundary-3">Scope<\/a>/,
    );
    expect(s1Html).toMatch(/<a class="section-semantic-chip section-semantic-question" href="#lens-open-questions-5">Questions<\/a>/);
    expect(s1Html).toMatch(/<a class="section-semantic-chip section-semantic-question" href="#lens-open-questions-5-item-1">Question: Which dataset should become the canonical teaching example\?<\/a>/);

    const s2Html = html.slice(html.indexOf('<section id="s2">'));
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-1">Roadmap<\/a>/);
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2">Decisions<\/a>/);
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-decision" href="#lens-decision-grid-2-item-1">Decision: Default base<\/a>/);
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-checklist" href="#lens-checklist-4">Checklist<\/a>/);
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-checklist" href="#lens-checklist-4-item-1">Checklist: Roadmap is visible<\/a>/);
    expect(s2Html).toMatch(/<a class="section-semantic-chip section-semantic-question" href="#lens-open-questions-5-item-2">Question: Should evaluation run before UI work\?<\/a>/);
    expect(s2Html).toMatch(
      /<h3 id="s2-1">[\s\S]*?Level 1[\s\S]*?<\/h3>\s*<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="Semantic trace for this subsection">[\s\S]*?<a class="section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-1-item-1">Roadmap: Level 1<\/a>/,
    );
    expect(s2Html).toMatch(
      /<h3 id="s2-2">[\s\S]*?Level 2: Data and Schema[\s\S]*?<\/h3>\s*<nav class="subsection-semantic-trace" data-annotation="subsection-semantic-trace" aria-label="Semantic trace for this subsection">[\s\S]*?<a class="section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-1-item-2">Roadmap: Level 2<\/a>/,
    );

    const overviewIndex = html.indexOf('<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">');
    const primaryFlowIndex = html.indexOf('<div class="semantic-primary-flow">');
    const judgmentGridIndex = html.indexOf('<div class="semantic-judgment-grid" aria-label="Key judgment panels">');
    const sourceBoundaryIndex = html.indexOf('<div id="source-sections" class="source-prose-boundary" aria-label="Source sections">');
    const sourceMapIndex = html.indexOf('<nav id="source-section-map" class="source-section-map" aria-label="Section map">');
    const proseIndex = html.indexOf("<section id=\"s1\"");
    expect(overviewIndex).toBeGreaterThan(0);
    expect(primaryFlowIndex).toBeGreaterThan(overviewIndex);
    expect(judgmentGridIndex).toBeGreaterThan(primaryFlowIndex);
    expect(sourceBoundaryIndex).toBeGreaterThan(judgmentGridIndex);
    expect(sourceBoundaryIndex).toBeLessThan(proseIndex);
    expect(sourceMapIndex).toBeGreaterThan(sourceBoundaryIndex);
    expect(sourceMapIndex).toBeLessThan(proseIndex);
    expect(overviewIndex).toBeLessThan(proseIndex);
    expect(judgmentGridIndex).toBeLessThan(proseIndex);
  });

  test("uses a compact artifact header when a semantic lens is present", async () => {
    const md = `---
title: Gemma Roadmap
kind: spec
status: implemented
owner: codex
updated: 2026-05-19
implements:
  - docs/specs/source.md
---

# Gemma Roadmap

## Background

The source prose starts here.
`;

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        document_overview: {
          summary: "This document turns prose into a structured artifact.",
          reader_goal: "Know the route before reading the source.",
        },
        reading_path: [
          {
            label: "Start",
            section_id: "s1",
            description: "Read the context only after the overview.",
          },
        ],
        section_summaries: [],
      },
    });

    expect(html).toMatch(/<header class="frontmatter artifact-header" data-semantic-lens="present">/);
    expect(html).toMatch(/<div class="artifact-title-row">[\s\S]*?<h1>Gemma Roadmap<\/h1>[\s\S]*?<div class="artifact-meta-rail">/);
    expect(html).toMatch(/<span class="badge ok">implemented<\/span>/);
    expect(html).toMatch(/<details class="frontmatter-details compact-relations"[^>]*>/);

    const headerEnd = html.indexOf("</header>");
    const overviewIndex = html.indexOf('<div id="lens-overview" class="semantic-overview" data-annotation="document-overview">');
    const sectionIndex = html.indexOf("<section id=\"s1\"");
    expect(headerEnd).toBeGreaterThan(0);
    expect(overviewIndex).toBeGreaterThan(headerEnd);
    expect(overviewIndex).toBeLessThan(sectionIndex);
  });

  test("styles reading path cards densely enough for the first viewport", async () => {
    const css = await readFile(resolve(here, "../src/skills/render-spec/style.css"), "utf8");

    expect(css).toMatch(/\.reading-path-cards\s*\{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(132px, 1fr\)\)/);
    expect(css).toMatch(/\.reading-path-card\s*\{[\s\S]*min-height: 72px/);
  });

  test("styles primary flow and judgment panels as separate scan zones", async () => {
    const css = await readFile(resolve(here, "../src/skills/render-spec/style.css"), "utf8");

    expect(css).toMatch(/\.semantic-primary-flow\s*\{[\s\S]*display: block/);
    expect(css).toMatch(/\.roadmap-stage-strip\s*\{[\s\S]*display: flex/);
    expect(css).toMatch(/\.roadmap-stage-strip a\s*\{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\)/);
    expect(css).toMatch(/main,\s*\.frontmatter,\s*\.semantic-lens,\s*section\s*\{[\s\S]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.toc-lens-group\s*\{[\s\S]*border-bottom: var\(--hairline\)/);
    expect(css).toMatch(/\.semantic-judgment-grid\s*\{[\s\S]*display: grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(240px, 1fr\)\)/);
    expect(css).toMatch(/\.semantic-judgment-grid \.semantic-block\s*\{[\s\S]*margin: 0/);
    expect(css).toMatch(/\.semantic-judgment-grid \.comparison-cards\s*\{[\s\S]*margin: 0/);
    expect(css).toMatch(/\.semantic-judgment-grid \.comparison-cards\[data-block="scope_boundary"\]\s*\{[\s\S]*grid-column: 1 \/ -1/);
    expect(css).toMatch(/\.semantic-judgment-grid \.comparison-cards-grid\s*\{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
    expect(css).toMatch(/\.semantic-judgment-grid \.open-questions-lens\s*\{[\s\S]*grid-column: span 2/);
    expect(css).toMatch(/\.open-question-items\s*\{[\s\S]*display: grid/);
    expect(css).toMatch(/\.open-question-status\s*\{[\s\S]*font-family: var\(--font-mono\)/);
    expect(css).toMatch(/\.source-prose-boundary\s*\{[\s\S]*border-top: var\(--hairline\)/);
    expect(css).toMatch(/\.source-section-map\s*\{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(220px, 1fr\)\)/);
    expect(css).toMatch(/\.source-section-map-lanes\s*\{[\s\S]*display: grid/);
    expect(css).toMatch(/\.source-section-lane-link\s*\{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.section-semantic-trace\s*\{[\s\S]*display: flex/);
    expect(css).toMatch(/\.subsection-semantic-trace\s*\{[\s\S]*display: flex/);
    expect(css).toMatch(/\.section-semantic-chip\s*\{[\s\S]*border: var\(--hairline\)/);
  });

  test("renders primary roadmap before the document model and still traces source sections", async () => {
    const md = `---
title: Structured Roadmap
kind: spec
status: ready
---

# Structured Roadmap

## Context

Why this project exists.

## Learning Path

The staged route.

## Acceptance

How to judge readiness.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      document_overview: {
        summary: "This document explains the project through a structured model.",
      },
      semantic_blocks: [
        {
          type: "structure_map",
          title: "Document model",
          summary: "Context leads to a path, then the path is checked by acceptance gates.",
          source_section_id: "s1",
          nodes: [
            {
              id: "context",
              label: "Why it exists",
              kind: "context",
              summary: "The framing and constraints behind the work.",
              section_id: "s1",
            },
            {
              id: "path",
              label: "Learning path",
              kind: "path",
              summary: "The staged route a reader should follow.",
              section_id: "s2",
            },
            {
              id: "checks",
              label: "Acceptance checks",
              kind: "evidence",
              summary: "The gates that prove the path is usable.",
              section_id: "s3",
            },
          ],
          edges: [
            { from: "context", to: "path", label: "frames" },
            { from: "path", to: "checks", label: "verified by" },
          ],
        },
        {
          type: "roadmap",
          title: "Staged route",
          source_section_id: "s2",
          items: [
            {
              label: "Stage 1",
              title: "Read the context",
              summary: "Start by understanding why the work exists.",
              section_id: "s2",
            },
          ],
        },
      ],
      section_summaries: [
        { section_id: "s1", summary: "Context names the reason for the work." },
        { section_id: "s2", summary: "Learning path names the staged route." },
        { section_id: "s3", summary: "Acceptance shows how to judge readiness." },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div class="semantic-model-flow">[\s\S]*?<div id="lens-structure-map-1" class="semantic-block structure-map-lens" data-annotation="semantic-structure-map">/);
    expect(html).toMatch(/<p class="semantic-label">Structure Map<\/p>[\s\S]*?<h2>Document model<\/h2>/);
    expect(html).toMatch(/<article id="lens-structure-map-1-node-context" class="structure-node structure-node-context" data-map-node-id="context">[\s\S]*?Why it exists[\s\S]*?The framing and constraints/);
    expect(html).toMatch(/<article id="lens-structure-map-1-node-path" class="structure-node structure-node-path" data-map-node-id="path">[\s\S]*?Learning path[\s\S]*?The staged route/);
    expect(html).toMatch(/<ol class="structure-edges">[\s\S]*?<span class="structure-edge-from">Why it exists<\/span>[\s\S]*?<span class="structure-edge-label">frames<\/span>[\s\S]*?<span class="structure-edge-to">Learning path<\/span>/);
    expect(html).toMatch(/<a href="#lens-roadmap-2">[\s\S]*?Roadmap[\s\S]*?<a href="#lens-structure-map-1">[\s\S]*?Structure Map/);

    const modelIndex = html.indexOf('<div class="semantic-model-flow">');
    const roadmapIndex = html.indexOf('<div class="semantic-primary-flow">');
    const sourceIndex = html.indexOf('<section id="s1">');
    expect(modelIndex).toBeGreaterThan(0);
    expect(roadmapIndex).toBeGreaterThan(0);
    expect(roadmapIndex).toBeLessThan(modelIndex);
    expect(sourceIndex).toBeGreaterThan(modelIndex);

    const contextSection = html.slice(html.indexOf('<section id="s1">'), html.indexOf('<section id="s2">'));
    expect(contextSection).toMatch(/<a class="section-semantic-chip section-semantic-model" href="#lens-structure-map-1-node-context">Model: Why it exists<\/a>/);
    expect(contextSection).not.toMatch(/<a class="section-semantic-chip section-semantic-model" href="#lens-structure-map-1">Model<\/a>/);

    const sourceMapHtml = html.slice(
      html.indexOf('<nav id="source-section-map" class="source-section-map" aria-label="Section map">'),
      html.indexOf('<section id="s1">'),
    );
    expect(sourceMapHtml).toMatch(
      /<section class="source-section-lane source-section-lane-model">[\s\S]*?<p class="source-section-lane-title">Model and concepts<\/p>[\s\S]*?<a class="source-section-lane-link" href="#s1">[\s\S]*?<span class="source-section-lane-role">Model: Why it exists<\/span>[\s\S]*?<a class="source-section-lane-link" href="#s2">[\s\S]*?<span class="source-section-lane-role">Model: Learning path<\/span>/,
    );
    expect(sourceMapHtml).toMatch(/<a class="source-section-role-chip section-semantic-chip section-semantic-model" href="#lens-structure-map-1-node-context">Model: Why it exists<\/a>/);
    expect(sourceMapHtml).not.toMatch(/<a class="source-section-role-chip section-semantic-chip section-semantic-model" href="#lens-structure-map-1">Model<\/a>/);

    const pathSection = html.slice(html.indexOf('<section id="s2">'), html.indexOf('<section id="s3">'));
    expect(pathSection).toMatch(/<a class="section-semantic-chip section-semantic-model" href="#lens-structure-map-1-node-path">Model: Learning path<\/a>/);
    expect(pathSection).toMatch(/<a class="section-semantic-chip section-semantic-roadmap" href="#lens-roadmap-2-item-1">Roadmap: Stage 1<\/a>/);
  });

  test("keeps scaffold roadmap ahead of frontmatter relationship history", async () => {
    const md = `---
title: Beginner Finetune Roadmap
kind: spec
status: implemented
implements:
  - docs/changes/level-1.md
  - docs/changes/level-2.md
reviews:
  - docs/reviews/roadmap-review.md
---

# Beginner Finetune Roadmap

## 背景

这个项目帮助新手理解微调路线。

## 六阶段学习路径

### Level 1: Baseline

学习目标：

- 先建立 prompt baseline

默认产物：

- baseline prompt 集合

### Level 2: Data

学习目标：

- 理解 instruction data

默认产物：

- samples.jsonl
`;

    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    const primaryIndex = html.indexOf('<div class="semantic-primary-flow">');
    const modelIndex = html.indexOf('<div class="semantic-model-flow">');
    const relationIndex = html.indexOf('data-annotation="semantic-relationship-map"');
    const sourceIndex = html.indexOf('<section id="s1">');

    expect(primaryIndex).toBeGreaterThan(0);
    expect(modelIndex).toBeGreaterThan(primaryIndex);
    expect(relationIndex).toBeGreaterThan(primaryIndex);
    expect(sourceIndex).toBeGreaterThan(modelIndex);
    expect(html).toMatch(/<div class="toc-lens-group" aria-label="Dossier 透镜导航">[\s\S]*?<a href="#lens-roadmap-2">[\s\S]*?路线图[\s\S]*?<a href="#lens-structure-map-1">[\s\S]*?结构图[\s\S]*?<a href="#lens-relationship-map-\d+">[\s\S]*?关系图/);
  });

  test("renders evidence grids with source traces", async () => {
    const md = `---
title: Evidence Lens
kind: spec
status: ready
---

# Evidence Lens

## Context

Why this project exists.

## Verification Evidence

How the reader can verify the claim.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "evidence_grid",
          title: "Verification Evidence",
          source_section_id: "s2",
          items: [
            {
              label: "Unit tests",
              evidence: "76 tests passed.",
              source: "pnpm test",
              section_id: "s2",
            },
          ],
        },
      ],
      section_summaries: [
        { section_id: "s1", summary: "Context names the reason for the work." },
        { section_id: "s2", summary: "Verification evidence names how to check the claim." },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-evidence-grid-1">[\s\S]*?Evidence/);
    expect(html).toMatch(/<div id="lens-evidence-grid-1" class="semantic-block evidence-grid" data-annotation="semantic-evidence-grid">/);
    expect(html).toMatch(/<article id="lens-evidence-grid-1-item-1" class="evidence-card">[\s\S]*?<p class="evidence-label">Unit tests<\/p>[\s\S]*?76 tests passed\.[\s\S]*?<p class="evidence-source"><span>Source<\/span>pnpm test<\/p>/);

    const evidenceSection = html.slice(html.indexOf('<section id="s2">'));
    expect(evidenceSection).toMatch(/<a class="section-semantic-chip section-semantic-evidence" href="#lens-evidence-grid-1">Evidence<\/a>/);
    expect(evidenceSection).toMatch(/<a class="section-semantic-chip section-semantic-evidence" href="#lens-evidence-grid-1-item-1">Evidence: Unit tests<\/a>/);
  });

  test("renders takeaway grids with source traces", async () => {
    const md = `---
title: Takeaway Lens
kind: spec
status: ready
---

# Takeaway Lens

## Context

Why this project exists.

## Lessons

What the reader should carry forward.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "takeaway_grid",
          title: "Lessons",
          source_section_id: "s2",
          items: [
            {
              label: "Keep the semantic layer first",
              detail: "Readers need the model before the prose.",
              section_id: "s2",
            },
          ],
        },
      ],
      section_summaries: [
        { section_id: "s1", summary: "Context names the reason for the work." },
        { section_id: "s2", summary: "Lessons explain what to carry forward." },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-takeaway-grid-1">[\s\S]*?Takeaways/);
    expect(html).toMatch(/<div id="lens-takeaway-grid-1" class="semantic-block takeaway-grid" data-annotation="semantic-takeaway-grid">/);
    expect(html).toMatch(/<article id="lens-takeaway-grid-1-item-1" class="takeaway-card">[\s\S]*?<p class="takeaway-label">Takeaways<\/p>[\s\S]*?<h3>Keep the semantic layer first<\/h3>[\s\S]*?Readers need the model before the prose\./);

    const takeawaySection = html.slice(html.indexOf('<section id="s2">'));
    expect(takeawaySection).toMatch(/<a class="section-semantic-chip section-semantic-takeaway" href="#lens-takeaway-grid-1">Takeaways<\/a>/);
    expect(takeawaySection).toMatch(/<a class="section-semantic-chip section-semantic-takeaway" href="#lens-takeaway-grid-1-item-1">Takeaway: Keep the semantic layer first<\/a>/);
  });

  test("renders risk registers with source traces", async () => {
    const md = `---
title: Risk Lens
kind: spec
status: ready
---

# Risk Lens

## Context

Why this project exists.

## Risks

What could break.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "risk_register",
          title: "Risks",
          source_section_id: "s2",
          items: [
            {
              label: "Reader sees only decorated markdown",
              trigger: "No semantic lens is present.",
              impact: "The output is harder to inspect.",
              mitigation: "Render a risk register before source prose.",
              section_id: "s2",
            },
          ],
        },
      ],
      section_summaries: [
        { section_id: "s1", summary: "Context names the reason for the work." },
        { section_id: "s2", summary: "Risks explain what could break." },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<a href="#lens-risk-register-1">[\s\S]*?Risks/);
    expect(html).toMatch(/<div id="lens-risk-register-1" class="semantic-block risk-register" data-annotation="semantic-risk-register">/);
    expect(html).toMatch(/<article id="lens-risk-register-1-item-1" class="risk-card">[\s\S]*?<p class="risk-label">Reader sees only decorated markdown<\/p>[\s\S]*?No semantic lens is present\.[\s\S]*?The output is harder to inspect\.[\s\S]*?Render a risk register before source prose\./);

    const riskSection = html.slice(html.indexOf('<section id="s2">'));
    expect(riskSection).toMatch(/<a class="section-semantic-chip section-semantic-risk" href="#lens-risk-register-1">Risks<\/a>/);
    expect(riskSection).toMatch(/<a class="section-semantic-chip section-semantic-risk" href="#lens-risk-register-1-item-1">Risk: Reader sees only decorated markdown<\/a>/);
  });

  test("renders concept glossary blocks with source traces", async () => {
    const md = `# Concept Demo

## Core Concepts

The source prose explains the project vocabulary.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "concept_glossary",
          title: "Core concepts",
          source_section_id: "s1",
          items: [
            {
              term: "Artifact",
              plain_language: "A source document or output a reader needs to understand.",
              example: "A vision spec or review note.",
              model_field: "Artifact.kind",
              section_id: "s1",
            },
          ],
        },
      ],
      section_summaries: [
        {
          section_id: "s1",
          summary: "Core Concepts defines the project vocabulary.",
        },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-concept-glossary-1" class="semantic-block concept-glossary-lens" data-annotation="semantic-concept-glossary">/);
    expect(html).toMatch(/<p class="semantic-label">Concept Glossary<\/p>[\s\S]*?<h2>Core concepts<\/h2>/);
    expect(html).toMatch(/<article id="lens-concept-glossary-1-item-1" class="concept-card">[\s\S]*?<h3>Artifact<\/h3>[\s\S]*?A source document or output a reader needs to understand\.[\s\S]*?A vision spec or review note\.[\s\S]*?Artifact\.kind/);
    expect(html).toMatch(/<div class="toc-lens-group" aria-label="Dossier lens navigation">[\s\S]*?<a href="#lens-concept-glossary-1">[\s\S]*?Glossary/);

    const conceptSection = html.slice(html.indexOf('<section id="s1">'));
    expect(conceptSection).toMatch(/<a class="section-semantic-chip section-semantic-glossary" href="#lens-concept-glossary-1">Glossary<\/a>/);
    expect(conceptSection).toMatch(/<a class="section-semantic-chip section-semantic-glossary" href="#lens-concept-glossary-1-item-1">Glossary: Artifact<\/a>/);
  });

  test("renders relationship map blocks with edge evidence and source traces", async () => {
    const md = `# Relationship Demo

## Architecture

The source prose explains how artifacts relate.
`;

    const { parseAnnotationsJson } = await import("../src/annotations.js");
    const annotations = parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "relationship_map",
          title: "Artifact relationships",
          source_section_id: "s1",
          summary: "Shows how the source artifacts feed the implementation path.",
          items: [
            {
              from: "Vision spec",
              relation: "frames",
              to: "MVP spec",
              evidence: "The MVP spec implements the vision contract.",
              section_id: "s1",
            },
          ],
        },
      ],
      section_summaries: [
        {
          section_id: "s1",
          summary: "Architecture explains how artifacts relate.",
        },
      ],
    }));

    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations,
    });

    expect(html).toMatch(/<div id="lens-relationship-map-1" class="semantic-block relationship-map-lens" data-annotation="semantic-relationship-map">/);
    expect(html).toMatch(/<p class="semantic-label">Relationship Map<\/p>[\s\S]*?<h2>Artifact relationships<\/h2>/);
    expect(html).toMatch(/<li id="lens-relationship-map-1-item-1" class="relationship-edge">[\s\S]*?<span class="relationship-node relationship-from">Vision spec<\/span>[\s\S]*?<span class="relationship-relation">frames<\/span>[\s\S]*?<span class="relationship-node relationship-to">MVP spec<\/span>[\s\S]*?The MVP spec implements the vision contract\./);
    expect(html).toMatch(/<div class="toc-lens-group" aria-label="Dossier lens navigation">[\s\S]*?<a href="#lens-relationship-map-1">[\s\S]*?Relations/);

    const architectureSection = html.slice(html.indexOf('<section id="s1">'));
    expect(architectureSection).toMatch(/<a class="section-semantic-chip section-semantic-relationship" href="#lens-relationship-map-1-item-1">Relation: Vision spec to MVP spec<\/a>/);
  });

  test("rejects structure map edges that reference unknown nodes", async () => {
    const { parseAnnotationsJson } = await import("../src/annotations.js");

    expect(() => parseAnnotationsJson(JSON.stringify({
      schema_version: 1,
      semantic_blocks: [
        {
          type: "structure_map",
          title: "Broken map",
          nodes: [
            {
              id: "known",
              label: "Known node",
              kind: "context",
              summary: "Only one node exists.",
            },
          ],
          edges: [
            { from: "known", to: "missing", label: "points to" },
          ],
        },
      ],
      section_summaries: [],
    }))).toThrow(/semantic_blocks\[0\]\.edges\[0\] must reference existing node ids/);
  });
});

describe("annotation experiment: section summaries", () => {
  test("renders optional section summaries under matching H2 headings", async () => {
    const md = `---
title: Annotated
---

# Annotated

## First Section

Body text.

## Second Section

More body text.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        section_summaries: [
          { section_id: "s1", summary: "This section explains why the experiment matters." },
          { section_id: "s2", summary: "Escapes <unsafe> summary text." },
          { section_id: "s99", summary: "This should not render." },
        ],
      },
    } as Parameters<typeof render>[0] & {
      annotations: {
        schema_version: 1;
        section_summaries: { section_id: string; summary: string }[];
      };
    });

    expect(html).toMatch(
      /<h2 id="s1-title" class="section-cover-title">First Section<\/h2>[\s\S]*?<p class="section-summary" data-annotation="section-summary">This section explains why the experiment matters\.<\/p>/,
    );
    expect(html).toMatch(/Escapes &lt;unsafe&gt; summary text\./);
    expect(html).not.toMatch(/This should not render/);
  });

  test("render CLI accepts an explicit annotations file path", () => {
    expect(parseArgv(["render", "doc.md", "--annotations", "ann.json"])).toMatchObject({
      command: "render",
      input: "doc.md",
      annotations: "ann.json",
    });
  });

  test("render CLI accepts reader and content mode flags", () => {
    expect(parseArgv(["render", "doc.md", "--reader", "expert", "--content-mode", "tutorial"])).toMatchObject({
      command: "render",
      input: "doc.md",
      reader: "expert",
      contentMode: "tutorial",
    });
    expect(parseArgv(["render", "doc.md", "--reader", "manager"])).toMatchObject({
      command: "error",
      message: "unknown reader profile: manager",
    });
    expect(parseArgv(["render", "doc.md", "--content-mode", "quickref"])).toMatchObject({
      command: "error",
      message: "unknown content mode: quickref",
    });
  });

  test("renders section briefs in compact density with capped key points, overflow details, and reader chip", async () => {
    const md = `---\ntitle: Brief\n---\n\n# Brief\n\n## Section\n\nThis section has enough body text to keep its annotated key points visible beside the summary. It exists to test the normal density path rather than the short-section fallback.\n`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        section_summaries: [
          {
            section_id: "s1",
            summary: "Readable TLDR.",
            key_points: ["Why this matters", "What changes <next>", "Too much detail"],
            reader_hint: "Skim this before implementation.",
          },
        ],
      },
    } as Parameters<typeof render>[0] & {
      annotations: {
        schema_version: 1;
        section_summaries: {
          section_id: string;
          summary: string;
          key_points: string[];
          reader_hint: string;
        }[];
      };
    });

    expect(html).toMatch(/<p class="section-summary" data-annotation="section-summary">Readable TLDR\.<\/p>/);
    expect(html).toMatch(/<ul class="section-key-points" data-annotation="section-key-points" data-density="compact">/);
    const visibleKeyPoints = html.match(/<ul class="section-key-points"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
    expect((visibleKeyPoints.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).toMatch(/<li>What changes &lt;next&gt;<\/li>/);
    expect(html).toMatch(
      /<details class="section-key-points-extra" data-annotation="section-key-points-extra"[^>]*>\s*<summary>还有 1 条要点<\/summary>[\s\S]*?<li>Too much detail<\/li>[\s\S]*?<\/details>/,
    );
    expect(html).toMatch(
      /<p class="section-reader-hint section-reader-chip" data-annotation="section-reader-hint" aria-label="Read: Skim this before implementation\."><span class="section-reader-hint-label" aria-hidden="true">READ<\/span><span>Skim this before implementation\.<\/span><\/p>/,
    );
    expect(html).toMatch(/@media \(max-width: 720px\) \{[\s\S]*?\.section-key-points \{ display: none; \}/);
  });

  test("section reader hints use Chinese chip labels for Chinese documents", async () => {
    const md = `---\ntitle: 中文提示\n---\n\n# 中文提示\n\n## 关键决策\n\n这一节有足够正文，因此应该显示 reader hint chip。它继续解释读者为什么要先理解关键决策，再进入后面的实施细节和验证证据。这里再补充一段上下文，确保本节不是短章节，渲染器会展示完整的 section brief 而不是只保留摘要。\n`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        section_summaries: [
          {
            section_id: "s1",
            summary: "这一节解释关键决策。",
            reader_hint: "用本节理解关键决策及其理由。",
          },
        ],
      },
    });

    expect(html).toMatch(
      /<p class="section-reader-hint section-reader-chip" data-annotation="section-reader-hint" aria-label="阅读提示: 用本节理解关键决策及其理由。"><span class="section-reader-hint-label" aria-hidden="true">阅读<\/span><span>用本节理解关键决策及其理由。<\/span><\/p>/,
    );
    expect(html).not.toMatch(/aria-label="Read: 用本节理解关键决策及其理由。"|>READ<\/span><span>用本节理解/);
  });

  test("short sections render only the summary from section briefs", async () => {
    const md = `---\ntitle: Short Brief\n---\n\n# Short Brief\n\n## Tiny Section\n\nShort body.\n`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        section_summaries: [
          {
            section_id: "s1",
            summary: "Keep this tiny section skimmable.",
            key_points: ["Point one", "Point two"],
            reader_hint: "Skip details.",
          },
        ],
      },
    } as Parameters<typeof render>[0] & {
      annotations: {
        schema_version: 1;
        section_summaries: {
          section_id: string;
          summary: string;
          key_points: string[];
          reader_hint: string;
        }[];
      };
    });

    expect(html).toMatch(/<p class="section-summary" data-annotation="section-summary">Keep this tiny section skimmable\.<\/p>/);
    expect(html).not.toMatch(/<ul class="section-key-points"/);
    expect(html).not.toMatch(/<p class="section-reader-hint/);
  });

  test("reference-like sections collapse their section brief by default", async () => {
    const md = `---\ntitle: Reference Brief\n---\n\n# Reference Brief\n\n## Appendix A. Field Reference\n\nThis section is a reference surface with enough explanatory text to avoid the short-section fallback and prove the collapsible reference path.\n`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 1,
        section_summaries: [
          {
            section_id: "s1",
            summary: "Reference readers can expand this when needed.",
            key_points: ["Fields are stable", "Examples are nearby"],
            reader_hint: "Use as lookup.",
          },
        ],
      },
    } as Parameters<typeof render>[0] & {
      annotations: {
        schema_version: 1;
        section_summaries: {
          section_id: string;
          summary: string;
          key_points: string[];
          reader_hint: string;
        }[];
      };
    });

    expect(html).toMatch(
      /<details class="section-brief section-brief-collapsible" data-annotation="section-brief"[^>]*>\s*<summary>本节摘要<\/summary>[\s\S]*?Reference readers can expand this when needed\.[\s\S]*?<\/details>/,
    );
  });
});

describe("H3 sub-num parent-prefix fallback (F10)", () => {
  test("bare numeric H3 prefix inside §8 renders as 8.1, 8.2 in body and TOC", async () => {
    const md = `---
title: Numbering
---

# Numbering

## 8. Parent Section

### 1. First child
### 2. Second child
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    // H3 body: §8.1 / §8.2 (not bare 1 / 2)
    expect(html).toMatch(/<span class="sub-num">8\.1<\/span>First child<\/h3>/);
    expect(html).toMatch(/<span class="sub-num">8\.2<\/span>Second child<\/h3>/);

    // TOC sub-num: 8.1 / 8.2
    expect(html).toMatch(/<span class="toc-num">8\.1<\/span><span>First child<\/span>/);
    expect(html).toMatch(/<span class="toc-num">8\.2<\/span><span>Second child<\/span>/);

    // Regression: must NOT show bare "1" / "2" in any sub-num span
    expect(html).not.toMatch(/<span class="sub-num">1<\/span>/);
    expect(html).not.toMatch(/<span class="sub-num">2<\/span>/);
  });

  test("compound H3 number (7.1) is preserved as-is", async () => {
    const md = `---
title: Compound
---

# Compound

## 7. Parent

### 7.1 Already compound
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });
    expect(html).toMatch(/<span class="sub-num">7\.1<\/span>Already compound<\/h3>/);
    expect(html).not.toMatch(/<span class="sub-num">7\.7\.1<\/span>/);
  });
});

describe("page-level HTML interactions", () => {
  test("template ships reading-progress, mobile toc-toggle button, and backdrop", async () => {
    const md = `---\ntitle: Hello\n---\n\n# Hello\n\n## A\n`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<div class="reading-progress" aria-hidden="true"><div class="reading-progress-fill"><\/div><\/div>/);
    expect(html).toMatch(/<button class="toc-toggle" type="button" aria-label="Toggle table of contents"/);
    expect(html).toMatch(/<div class="toc-backdrop" aria-hidden="true"><\/div>/);
  });

  test("TOC renders as progressive navigation with collapsible H3 children", async () => {
    const md = `---\ntitle: Progressive TOC\n---\n\n# Progressive TOC\n\n## 1. Alpha\n\n### 1.1 First\n\n## 2. Beta\n\n### 2.1 Second\n`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<aside class="toc" data-progressive-toc>/);
    expect(html).toMatch(/<li class="toc-section"><a href="#s1"/);
    expect(html).toMatch(/<ol class="toc-children">/);
    expect(html).toMatch(/toc-section\.is-current/);
    expect(html).toMatch(/scrollTocLinkIntoView/);
    expect(html).toMatch(/syncHashTarget/);
    expect(html).not.toMatch(/activeLink\?\.scrollIntoView/);
    expect(html).toMatch(/requestAnimationFrame\(\(\) => \{/);
  });

  test("toc-script wires H3 scroll-spy, drawer open/close, and per-pre copy buttons", async () => {
    const md = `---\ntitle: Hello\n---\n\n# Hello\n\n## A\n\n\`\`\`\nsome code\n\`\`\`\n`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    // H3 scroll-spy
    expect(html).toMatch(/main h3\[id\]/);
    expect(html).toMatch(/semantic-overview\[id\], \.semantic-block\[id\], \.source-prose-boundary\[id\], \.source-section-map\[id\]/);
    expect(html).toMatch(/parentH2Id/);
    // Reading progress
    expect(html).toMatch(/reading-progress-fill/);
    // Drawer toggle
    expect(html).toMatch(/data-toc-open/);
    expect(html).toMatch(/tocAside\.setAttribute\("inert", ""\)/);
    expect(html).toMatch(/tocAside\.removeAttribute\("inert"\)/);
    expect(html).toMatch(/tocAside\.setAttribute\("aria-hidden", "true"\)/);
    expect(html).toMatch(/tocAside\.setAttribute\("aria-hidden", "false"\)/);
    expect(html).toMatch(/Escape/);
    // Code copy injection
    expect(html).toMatch(/code-copy/);
    expect(html).toMatch(/navigator\.clipboard/);
  });

  test("single-document output includes local search and opens folded hash targets", async () => {
    const md = `---
title: Findability
---

# Findability

## Appendix

Details can be folded.
`;
    const html = await render({
      markdown: md,
      skillId: "render-spec",
      withToc: true,
      annotations: {
        schema_version: 2,
        section_summaries: [
          {
            section_id: "s1",
            summary: "Appendix details.",
            key_points: ["first", "second", "hidden searchable point"],
          },
        ],
      },
    });

    expect(html).toMatch(/<search class="doc-search" role="search"/);
    expect(html).toMatch(/<input type="search" class="doc-search-input"/);
    expect(html).toMatch(/data-doc-search-results/);
    expect(html).toMatch(/data-searchable-collapse/);
    expect(html).toMatch(/beforematch/);
    expect(html).toMatch(/openAncestorDetails/);
    expect(html).toMatch(/closest\("details"\)/);
  });

  test("single-document output keeps a lightweight accessibility and performance snapshot", async () => {
    const md = `---
title: Snapshot
---

# Snapshot

## Trust

[safe](https://example.com) and [unsafe](javascript:alert(1)).

<iframe src="https://example.com"></iframe>
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html.length).toBeLessThan(90_000);
    expect(duplicateIds(html)).toEqual([]);
    expect(html).toMatch(/<search class="doc-search" role="search" aria-label="Search this document">/);
    expect(html).toMatch(/<div class="reading-progress" aria-hidden="true">/);
    expect(html).toMatch(/<button class="toc-toggle" type="button" aria-label="Toggle table of contents"/);
    expect(html).not.toMatch(/<script src=|<link[^>]+href="http|@import|url\(http/);
    expect(html).not.toMatch(/href="javascript:|<iframe\b/);
    expect(html).toMatch(/href="#blocked-url"/);
    expect(html).toMatch(/&lt;iframe src=&quot;https:\/\/example\.com&quot;&gt;&lt;\/iframe&gt;/);
  });

  test("keeps artifact header metadata below the title so long titles are not squeezed", async () => {
    const md = `---
title: Dossier OSS Launch Research
subtitle: 命名、竞品、传播路径
status: ready
kind: research
updated: 2026-05-21
owner: claude
---

# Dossier OSS Launch Research

## npm 名字可用性矩阵

Body.
`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/\.artifact-title-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(html).not.toMatch(/\.artifact-title-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax/);
  });

  test("estimated reading time appears in stat row", async () => {
    const longText = "中文段落示例。".repeat(200);
    const md = `---\ntitle: Long\n---\n\n# Long\n\n## A\n\n${longText}\n`;
    const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

    expect(html).toMatch(/<span class="stat-label">阅读<\/span><span class="stat-value">约 \d+ 分钟<\/span>/);
  });
});

describe("smoke: imports load", () => {
  test("module graph is well-formed", async () => {
    // Just import the entry — if this fails, something is wrong with module wiring.
    const m = await import("../src/cli.js");
    expect(typeof m.main).toBe("function");
    expect(typeof m.parseArgv).toBe("function");
  });
});
