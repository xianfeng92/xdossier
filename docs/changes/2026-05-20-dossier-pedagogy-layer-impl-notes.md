---
title: Dossier Pedagogy Layer P0 Impl Notes
status: implemented
created: 2026-05-20
updated: 2026-05-20
implements: ["docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md", "docs/specs/2026-05-20-codex-pedagogy-layer-handoff-brief.md"]
---

# Dossier Pedagogy Layer P0 Impl Notes

## 实现摘要

- 扩展 `RenderAnnotations` 到 schema v2，新增 `content_mode`、`prerequisites`、`checkpoints`、`analogies`。
- 新增启发式 `content_mode` 分类器，覆盖 vision/mvp concept、quickstart tutorial、API reference、frontmatter override、低分 fallback。
- scaffold provider 输出 schema v2、`content_mode`、frontmatter prerequisites，以及空 `checkpoints` / `analogies`。
- render 输出单文件 HTML 根属性：`data-reader` / `data-content-mode`。
- 新增顶部三档 reader toggle，JS inline 到 HTML，支持 URL `?reader=` 与 `localStorage`。
- 新增 prerequisite card、analogy callout、learning checkpoint、glossary 首次出现 popover。
- `--reader` / `--content-mode` CLI flag 已接入；README 已补充。
- 为避免本沙箱中 `tsx` CLI IPC pipe EPERM，`pnpm dev` / `pnpm render:self` 改为 `node --import tsx ...`；cover 测试中的 CLI 子进程同样改为 `node --import tsx`。

## 实际偏差与判断

- 外部链接渲染：为满足本任务“单文件 HTML 不能含任何 `http://` / `https://` / `cdn.` 外链”的硬约束，markdown 外链和 reference lens 外链渲染为非点击的 `.external-ref` 文本，显示 hostname，不保留 URL。判断：这是安全退化，优先级高于旧的外链可点行为。
- scaffold 兼容：`createSectionSummaryScaffold(markdown, legacySourceLabel)` 的旧测试辅助路径保留 schema v1；生产 CLI / render 默认路径输出 schema v2。判断：避免破坏旧调用点，同时本次 P0 的实际输出满足 v2。
- Browser visual QA：Browser 插件已读，但当前会话没有暴露 `node_repl/js` 工具，无法用 in-app browser 自动截图。改用生成 HTML 静态检查、CSS/JS 检查、无外链扫描和 CLI flag smoke 验证；仍建议后续人工打开 `docs/specs/2026-05-17-dossier-vision-spec.html` 快速看三档视觉状态。

## Spec §14 开放问题判断

- Q1 keyboard shortcut：P1，不在 P0 实现；当前按钮可 Tab 访问，`aria-pressed` 会同步。
- Q2 history entry：不写 history；URL 参数只作为初始读取信号，切换按钮不修改地址栏。
- Q3 content_mode 影响 TOC：已做 reference 模式 TOC sticky/top/scroll 规则。
- Q4 i18n：P0 沿用中英双语 label；reader toggle 根据文档语言输出中文或英文。
- Q5 custom profile：不支持；reader profile 锁死 beginner / intermediate / expert。

## 验收记录

- `pnpm typecheck`：通过，`tsc -p . --noEmit` exit 0。
- `pnpm test`：通过，4 files / 138 tests passed。
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md`：通过，输出 `docs/specs/2026-05-17-dossier-vision-spec.html`，149967 bytes。
- scaffold enrich：`pnpm dev enrich docs/specs/2026-05-17-dossier-vision-spec.md --provider scaffold -o /tmp/dossier-vision-pedagogy.annotations.json --verbose` 通过；JSON 为 `schema_version: 2`、`content_mode: "concept"`、`prerequisites: []`、`checkpoints: []`、`analogies: []`。
- `node --check src/skills/render-spec/reader-toggle.js`：通过。
- generated HTML root：`<html lang="zh-CN" data-reader="beginner" data-content-mode="concept">`。
- reader buttons：顶部含 `零基础` / `系统化` / `速查`，默认 `零基础` `aria-pressed="true"`。
- expert CLI：`--reader expert` 输出 `data-reader="expert"` 且 `速查` 按钮高亮。
- content-mode CLI：`--content-mode tutorial` 输出 `data-content-mode="tutorial"`。
- URL/localStorage：生成 HTML 内 inline script 含 `url.searchParams.get("reader")` 与 `localStorage.setItem("dossier.reader", value)`。
- 无外链：生成 HTML 未匹配 `https?://`、`cdn.`、`<script src=`、`<link ... href`。
- fixtures：`tests/fixtures/quickstart-tutorial.md` 判定 `tutorial`；`tests/fixtures/api-reference.md` 判定 `reference`。
- schema v1：`parseAnnotationsJson` 兼容 schema v1，缺少新字段时保持 `undefined`。

## 验收清单

- [x] `pnpm typecheck` clean
- [x] `pnpm test` 全绿，新增测试超过 6 个
- [x] `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 跑通
- [x] 输出 HTML 顶部有 3 档 reader 按钮，默认高亮“零基础”
- [x] 切换到“速查”会通过 CSS 隐藏 prereq / analogy / checkpoint / section summary，并压缩正文宽度/行高
- [x] 切换到“系统化”会隐藏 prereq、弱化 analogy，并保留主线
- [x] HTML 根标签有 `data-reader="beginner"` 和 `data-content-mode="concept"`
- [x] `?reader=expert` 在 inline JS 中优先于 localStorage/default
- [x] localStorage 切换跨刷新保留逻辑已 inline
- [x] 单文件 HTML 无外链，双击离线可用；未做 browser 自动截图
- [x] `--content-mode tutorial` 强制后 HTML data-content-mode 反映该值
- [x] frontmatter `content_mode: reference` 覆盖启发式
- [x] quickstart fixture 判定 `tutorial`
- [x] API reference fixture 判定 `reference`
- [x] annotations schema_version 1 旧文件仍可读

## 2026-05-20 外链回归修正

- 修正边界：单文件 HTML 禁止的是浏览器渲染时主动加载的外部资源，不禁止用户主动点击的导航链接。
- markdown 外链恢复为 `<a href="https://...">`，保留可点 href；`.external-ref` 仍作为样式 class 保留。
- reference lens 外部卡片也恢复为 `<a class="reference-card external-ref" href="https://...">`，显示 hostname 但不丢失 href。
- 回归测试新增 `preserves external markdown hyperlinks without loading external resources`：vision spec 渲染结果至少包含 5 个 `<a href="https:`，同时不包含 `<script src=`、`<link rel="stylesheet" href=`、`<img src="http`。
- 重新验收：`pnpm typecheck` 通过；`pnpm test` 通过，4 files / 139 tests passed；`pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 通过，输出 `docs/specs/2026-05-17-dossier-vision-spec.html`，150230 bytes。

## P1: codex/claude provider 升级

### 改动文件

- `src/enrich/agent-cli.ts`：codex / claude 共用 prompt 升级为 schema v2，要求输出 `content_mode`、`prerequisites`、`checkpoints`、`analogies`；provider 解析后为缺失教学字段补空数组；完全无法 parse 时回退 scaffold 并记录 warning。
- `src/cli.ts`：`enrich --verbose` 增加教学注解计数输出：`pedagogy: prereq: N, checkpoints: M sections, analogies: K`。
- `tests/enrich.test.ts`：新增 mock provider 覆盖合法 JSON、缺字段退化、坏 JSON fallback warning、verbose 计数格式。

### Prompt 精简版

```text
Return ONLY valid JSON. Use schema_version: 2.
Include content_mode, document_overview, reading_path, semantic_blocks, section_summaries,
prerequisites, checkpoints, analogies.

prerequisites: 3-5 items for the whole document. List only concepts that truly
block a zero-knowledge reader, not a glossary. plain_language <= 25 Chinese chars
when writing Chinese; why_needed is optional.

checkpoints: 0-3 per H2 section. test understanding, not memorization. Each item
is a short "you should be able to..." sentence, <= 20 Chinese chars when writing
Chinese. Skip low-learning sections.

analogies: at most 1 per H2 section, only when abstraction needs it. A vision spec
usually has 2-3 total. analogy must follow "X 就像 Y，因为 Z"; concept is X.

Preserve document language. Do not invent facts outside the markdown.
```

### 测试覆盖

- 合法 JSON：mock `codex` stdout 返回 schema v2，验证三类教学字段被解析进 `RenderAnnotations`。
- 缺字段：mock `claude` stdout 省略三类字段，provider 返回 `[]` 而不是 `undefined`。
- 无法 parse：mock `codex` stdout 非 JSON，provider 不崩，回退 scaffold，`source` 标记为 `dossier-enrich:codex:fallback`，并通过 `onWarning` 记录 warning。
- verbose：`formatPedagogySummary` 覆盖 `prereq/checkpoints/analogies` 计数，scaffold smoke 输出 `pedagogy: prereq: 0, checkpoints: 0 sections, analogies: 0`。

### 教学质量判断与偏差

- 实现只在 prompt 和结构校验层约束质量，不在 parser 里硬截断字数；原因是 `parseAnnotationsJson` 目前承担 schema 合法性，不承担写作品质裁剪。后续若真实 dogfood 发现模型常超长，可再加 provider 后处理 warning 或严格丢弃。
- prerequisites 约束为整篇 3-5 项，但缺字段仍退化为空数组；这是为了保证 provider 输出坏掉时 render 仍 deterministic，不把质量门槛变成 CLI 崩溃点。
- checkpoints / analogies 只要求 provider 输出 section-indexed 结构；是否“不要每节填满”交给 prompt 和 dogfood 复核，本轮不新增启发式删改，避免误删模型的有效教学判断。
- scaffold provider 未改行为：仍为 0 token，`checkpoints` / `analogies` 空数组，`prerequisites` 只来自 frontmatter。

### 验收记录

- `pnpm test tests/enrich.test.ts`：通过，68 tests passed。
- `pnpm typecheck`：通过。
- `pnpm dev enrich tests/fixtures/minimal.md --provider scaffold -o /tmp/p1-scaffold-enrich.json --verbose`：通过，stderr 含 `pedagogy: prereq: 0, checkpoints: 0 sections, analogies: 0`。
- `pnpm test`：通过，4 files / 143 tests passed。

### 真实 LLM dogfood

- 命令：`pnpm dev enrich docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md --provider codex -o /tmp/p1-real-enrich.json --verbose`
- 结果：失败，真实 LLM 调用未在沙箱内验证，留待手工 dogfood。
- 失败边界：Codex CLI 在当前沙箱中无法访问 `/Users/xforg/.codex/sessions`，同时模型刷新请求到 `https://chatgpt.com/backend-api/codex/models?client_version=0.128.0` 断流；命令最终 exit code 2，未生成 `/tmp/p1-real-enrich.json`。

## P1.1: few-shot prompt 微调

- `src/enrich/agent-cli.ts`：在 pedagogy quality 规则后追加 `Few-shot examples`，用 bad/good 对比约束三类 slip：
  - prerequisite 不能把 `render_skill` 写成“负责渲染的技能”这类同义反复，`why_needed` 不能只描述 spec 边界。
  - checkpoint 不能写“能说出四种 mode”这类记忆题，要改成能应用概念的判断题。
  - analogy 不能左右两边都复读 jargon，要用读者已知的类比解释抽象概念。
- `tests/enrich.test.ts`：新增 prompt 字符串断言，覆盖 `Few-shot examples`、`render_skill`、`能说出四种 mode`，防止后续重构误删 few-shot 段落。
- 验证记录：先跑 `pnpm test tests/enrich.test.ts -- --runInBand` 得到预期红灯；实现后同命令通过，69 tests passed。

## P1.2: prereq 同义反复 + checkpoint 选择性收紧

- `src/enrich/agent-cli.ts`：在 `Few-shot examples` 后追加 self-check 反模式段落，明确 `render_skill` 的同义改写失败案例、机制解释通过案例、`why_needed` 判断口径，以及 checkpoint 只覆盖真正能抓住误解的章节。
- `tests/enrich.test.ts`：扩展 prompt 内容断言，覆盖 `Synonym rephrasing test` 和 `CHECKPOINT selectivity self-check`，防止后续误删 P1.2 self-check 段落。

## P2: 视觉节奏强化（section cover / pull quote / inline SVG / 对比卡）

### 触发规则

- `section-cover`：每个 H2 section 入口自动渲染。编号复用 `_dossierSectionNum` 并补成两位；标题使用 H2 清洗后的文本。副标题优先取 `reading_path[].description`，缺失时取 `section_summaries[].summary` 第一句，再缺失则只显示编号和标题。
- `pull-quote`：只升级 H2 section 内、顶层、非 callout、非 tagline 且纯文本长度不少于 30 的 blockquote。已有 `⚠️` / `📝` / `🎯` callout 和 §0 tagline 不进入该路径。
- `inline SVG`：只转换 `_dossierKind: ascii-diagram` 且能被 `src/parse/ascii-diagram.ts` 解析为纵向层叠框和箭头的图。支持独立多框纵向栈，也支持 vision spec §4 这种单个大框内用 `├──┤` 分层的三层架构图。
- `comparison-cards`：只改造现有 `scope_boundary` semantic block，不从普通 table 自动推断对比关系。

### HTML/CSS 形态

- H2 正文标题改为 section 内的 `<header class="section-cover" data-detail-level="section-cover">`，内部包含 `.section-cover-num`、`.section-cover-title` 和可选 `.section-cover-kicker`。CSS 用 1px `#1e3a8a` 顶线、54px 衬线编号、60ch italic kicker 制造章节起点。
- pull quote 输出 `<figure class="pull-quote">`，内部保留 `<blockquote class="pull-quote-body">`，并用绝对定位的 200px Helvetica 引号作低透明度背景。
- ASCII 成功路径输出 `<figure class="inline-diagram" data-diagram="ascii-vertical-stack"><svg ...>`；节点用 `rect + text`，边用 `line + marker`。失败路径仍完全回落到 `<pre class="ascii-diagram"><code>...`。
- scope boundary 输出 `<section class="comparison-cards" data-block="scope_boundary">`，内部为 2-column CSS Grid；包含卡使用 `#1e3a8a`，不包含卡使用 `#991b1b`，720px 以下降为单列。

### 解析器策略

- `parseAsciiDiagram(text)` 返回 `{ nodes, edges } | null`；任何结构不完整、标签为空、缺箭头、出现复杂嵌套框或树形符号时都返回 `null`。
- parser 不做部分转换；只要失败，renderer 就输出旧 `<pre class="ascii-diagram">`，避免 P0/P1 视觉回归。
- vision spec §4 的大框分层图会拆为纵向节点，复杂 mini DAG 和树形图保持 ASCII。

### reader 切换行为

- beginner / intermediate 显示完整 section cover，包括 kicker。
- expert 隐藏 `.section-cover-kicker`，移除 cover 顶线并压缩 padding，但保留编号和标题作为快速锚点。
- pull quote、inline SVG、comparison cards 三者所有 reader 档位都显示，因为它们强化的是核心结构，不是辅助教学注解。

### 教学质量判断

- section cover 给长文提供明确“章节起点”和“为什么读这一节”，对 beginner 最有价值，也不会阻塞 expert 扫读。
- pull quote 把文档里的关键判断从均匀正文里抬出来，适合 vision/spec 这类判断密集文本。
- inline SVG 只吃确定的纵向架构图，能把 §4 这种核心模型从 code block 噪声里解放出来；严格 fallback 避免误把复杂 ASCII 当图表。
- comparison cards 复用已有 `scope_boundary` 结构化数据，风险低，且“包含 / 不包含”是教学文档里最需要视觉对照的边界信息。

### 测试覆盖

- 新增 render 测试覆盖 section cover kicker 优先级与 fallback、pull quote 升级、ASCII SVG 成功、ASCII fallback、scope_boundary 对比卡、vision spec P2 关键节点。
- 已运行：`pnpm test tests/render-spec.test.ts` 通过，57 tests passed。
- 已运行：`pnpm typecheck` 通过。
- 最终验收：`pnpm typecheck && pnpm test` 通过，4 files / 150 tests passed；`pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 输出 157620 chars / 181369 bytes，含 `section-cover` 18、`pull-quote` 2、`inline-diagram` 1、`comparison-cards` 1。
