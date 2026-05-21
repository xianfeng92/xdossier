---
title: Dossier 教学化层 — content_mode × reader_profile 双轴扩展
status: ready
kind: spec
owner: claude
created: 2026-05-20
updated: 2026-05-20
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
reviews: []
---

> 📝 本 spec 是对 dossier vision spec §8 渲染层的**正交扩展**，不是替代。
> 现有的 `kind` / `render_skill` 体系**不动**；本层加在它之上。
> 🎯 设计目标：让 dossier 输出的 HTML 从"可扫读的档案"升级为"可学习的教材"，对零基础读者尤其友好。

## 0. 一句话

> **给 dossier 的 HTML 输出加两个正交维度——`content_mode`（文档的教学形态，自动识别）和 `reader_profile`（读者熟练度，运行时切换）——让同一份 HTML 同时服务零基础、系统化、速查三类读者。**

## 1. 为什么需要这一层

### 1.1 现状

dossier 现有 skill dispatch 按**产出物视角**分类：`spec` / `adr` / `change` / `review`。这回答的是"这是什么类型的文件"。

但读者关心的是另一件事：**"我该怎么读它？"** 一份 vision spec 对零基础读者要慢慢讲（前置概念、类比、自测），对资深读者只要给决策摘要。今天 dossier 一份 HTML 服务所有人，零基础读者会被信息量压垮，资深读者会被冗余拖累。

### 1.2 两个被忽视的轴

| 现有轴（产出物） | 缺失轴 A（教学形态） | 缺失轴 B（读者熟练度） |
|---|---|---|
| spec / adr / change / review | tutorial / concept / reference / course | beginner / intermediate / expert |
| 决定**用哪个 skill 渲染** | 决定**默认强化哪些教学元素** | 决定**默认显示多少信息** |
| 已有，frontmatter `kind:` | 本 spec 新增 | 本 spec 新增 |

这两个新轴**互不相干**：一份 vision spec 可以是 `concept × beginner`，也可以是 `concept × expert`。

### 1.3 为什么不做成新 skill

新 skill 会让组合数爆炸（4 kind × 4 mode × 3 profile = 48 个 skill）。而且 mode 和 profile 都是**装饰性**的——它们改变的是"哪些块显示/折叠/强化"，不改变核心版式。所以这一层应该是**渲染管线里的修饰器（decorator）**，挂在现有 skill 之后。

## 2. 范围

### 2.1 包含

- `content_mode` 自动分类器（启发式，0 token），frontmatter override
- `reader_profile` 运行时切换（HTML 内嵌按钮 + CSS data-attribute）
- 4 个新展示元素：`prerequisite-card` / `learning-checkpoint` / `glossary-popover` / `analogy-callout`
- enrich 阶段产出教学注解（codex / claude provider 升级；scaffold 提供 0-AI 退化版）
- 默认 reader = `beginner`；URL `?reader=expert` 可覆盖

### 2.2 不包含

| ❌ 不做 | 因为 |
|---|---|
| AI 自动分类 content_mode | 启发式 + frontmatter 显式声明已够用 |
| 视频 / 动画 / 可编辑代码沙箱 | 违背单文件 HTML 离线分享约束 |
| 分支学习路径 / 自适应教学 | 超出 dossier 定位 |
| 多版本 HTML 输出（每个 profile 一份） | 单文件 + 运行时切换更省 |
| 跨文档 `course` 模式 P0 | 推迟到 P1（依赖 cover 模块）|

## 3. 设计原则

1. **正交性**：mode 和 profile 不互相决定；任意组合都应可工作。
2. **退化优先**：所有新元素必须有 markdown / blockquote / 列表的 fallback；老 HTML 一定渲染得出。
3. **零 token 默认**：默认 enrich provider = `scaffold`，纯启发式；AI 增强是 opt-in。
4. **单文件不动摇**：reader 切换、术语 popover、checkpoint 折叠——全部 inline CSS/JS，无外链。
5. **不写 raw HTML 给 AI**：教学注解走 enrich 管线的 JSON schema，不让 AI 在 markdown 里手写复杂 HTML。

## 4. content_mode 自动分类器

### 4.1 四种模式

| mode | 含义 | 第一屏强化什么 |
|---|---|---|
| `tutorial` | 线性操作、跟着做就能跑通 | 步骤序号、命令可复制、"应看到 X" 验证、进度感 |
| `concept` | 解释一个抽象概念、建立心智模型 | 前置知识卡、类比 callout、概念图先于细节 |
| `reference` | 速查、密集信息表 | TOC 始终可见、不折叠、紧凑卡片、Ctrl+F 友好 |
| `course` | 分课时 / 分章节系统学习 | 跨节进度条、前置/后续、章末自测 |

### 4.2 分类信号（按优先级）

1. **frontmatter 显式**：`content_mode: tutorial`（最高优先级）
2. **frontmatter 间接**：`lesson:` / `module:` / `week:` 字段 → 强信号 `course`
3. **启发式打分**（见 §4.3）

### 4.3 启发式打分（实现 `src/enrich/content-mode.ts`）

输入：marked 解析后的 token 流 + frontmatter。

对每个 mode 计算分数（0-100），输出最高分。**全部低于 30** → fallback 到 `concept`（最通用）。

```typescript
// 伪代码，详细常数在实现中调
function scoreTutorial(tokens, fm): number {
  const shellRatio = codeBlockRatioByLang(tokens, ["bash", "sh", "shell", "zsh"]);
  const verbHeadingRatio = headingsStartWithVerb(tokens);  // "安装" "配置" "运行" "Install" "Configure"
  const sequentialNumbers = hasSequentialH2Numbers(tokens); // h2 标题以 "1." "2." 开头连续
  return clip(shellRatio * 50 + verbHeadingRatio * 30 + sequentialNumbers * 20);
}

function scoreReference(tokens, fm): number {
  const tableRatio = tableBlockRatio(tokens);
  const flatStructure = h2CountWithMinimalH3(tokens);  // 多 h2 但每个 h2 下内容短
  const alphabeticOrdering = isH2Alphabetical(tokens);
  return clip(tableRatio * 50 + flatStructure * 30 + alphabeticOrdering * 20);
}

function scoreCourse(tokens, fm): number {
  if (fm.lesson || fm.module || fm.week) return 90;
  // course 在单文件场景下信号弱；P0 主要靠 frontmatter
  return 0;
}

function scoreConcept(tokens, fm): number {
  // concept 是 fallback bucket；只要不像 tutorial/reference/course 就算
  const defBlockquoteRatio = defBlockquoteCount(tokens);  // 以 "> X 是…" 开头的 blockquote
  const longProseRatio = paragraphWordCount(tokens);
  return clip(defBlockquoteRatio * 50 + longProseRatio * 50);
}
```

**输出位置**：`RenderAnnotations.content_mode: "tutorial" | "concept" | "reference" | "course"`。

**测试输入与预期**：
- `2026-05-17-dossier-vision-spec.md` → `concept`（无 shell、抽象名词、长 prose）
- `2026-05-18-dossier-mvp-0-spec.md` → `concept`（同上；不是 tutorial 因为不是 step-by-step 命令）
- 一份 README "Quickstart" 段为主的 → `tutorial`
- 一份 API 参考表为主的 → `reference`

## 5. reader_profile 运行时切换

### 5.1 三档定义

| profile | 默认行为 | 折叠/隐藏 |
|---|---|---|
| `beginner`（默认） | 所有 `<details>` open；prerequisite-card 顶部置顶；glossary 标记为 underline；analogy callout 高亮；section_summary 总是展开 | 无 |
| `intermediate` | 主线展开；例子 `<details>` 折叠；glossary 仅 hover；analogy 弱化为常规 callout | 折叠"详细例子""底层原理"块 |
| `expert` | 仅显示决策 / 接口 / 关键差异；TOC 改为浮动锚点；行宽收窄、行高变密 | 隐藏 prerequisite-card / analogy / learning-checkpoint / section_summary |

### 5.2 实现方式（关键决策）

**方案**：HTML 一次性渲染全部内容，用 `data-detail-level` 属性 + CSS 控制可见性，顶部按钮切换 `<html data-reader>`。

```html
<html data-reader="beginner" data-content-mode="concept">
<head>
  <!-- inline style -->
  <style>
    /* 默认（beginner）：全部显示 */
    [data-detail-level="prereq"]      { display: block; }
    [data-detail-level="analogy"]     { display: block; }
    [data-detail-level="checkpoint"]  { display: block; }
    [data-detail-level="deep"]        { display: none; }  /* "想深入？" 默认折叠 */

    html[data-reader="intermediate"] [data-detail-level="prereq"]    { display: none; }
    html[data-reader="intermediate"] [data-detail-level="analogy"]   { opacity: 0.7; }

    html[data-reader="expert"] [data-detail-level="prereq"],
    html[data-reader="expert"] [data-detail-level="analogy"],
    html[data-reader="expert"] [data-detail-level="checkpoint"],
    html[data-reader="expert"] [data-detail-level="section-summary"] { display: none; }
    html[data-reader="expert"] .content { max-width: 640px; line-height: 1.5; }
  </style>
</head>
<body>
  <nav class="reader-toggle" role="radiogroup" aria-label="Reading mode">
    <button data-reader-set="beginner" aria-pressed="true">零基础</button>
    <button data-reader-set="intermediate" aria-pressed="false">系统化</button>
    <button data-reader-set="expert" aria-pressed="false">速查</button>
  </nav>
  <!-- content -->
  <script>
    /* inline: 监听点击，更新 html[data-reader] + 写 localStorage + 更新 aria-pressed */
  </script>
</body>
</html>
```

**为什么不是渲染三份 HTML**：
- 单文件分享是 dossier 的硬约束；多文件破坏可分享性
- 切换瞬时（不重新加载）才是 progressive disclosure 的本意
- HTML gzip 后冗余很小（重复内容压缩率高）

**URL / localStorage 持久化**：
- `?reader=expert` 在 URL 中覆盖默认
- localStorage `dossier.reader` 记忆用户偏好（同一域名跨档案保留）
- 优先级：URL > localStorage > frontmatter `reader_default` > `beginner`

### 5.3 默认值来源

```yaml
# profile.md（未实现，本 spec 不阻塞 P0；codex 不必实现 profile.md 读取）
reader_default: beginner
```

P0 实现：硬编码默认 `beginner`，URL/localStorage 可覆盖。profile.md 读取留 P1。

## 6. 4 个新展示元素

### 6.1 `prerequisite-card`

**用途**：文档开头列前置知识，零基础读者一眼判断"我能读懂吗"。

**触发**：frontmatter `prerequisites: ["term-1", "term-2"]` 或 enrich 注解 `prerequisites[]`。

**HTML 形态**：

```html
<aside class="prerequisite-card" data-detail-level="prereq">
  <h4>📚 阅读前你最好知道</h4>
  <ul>
    <li><strong>marked</strong>：JS 的 markdown 解析库</li>
    <li><strong>frontmatter</strong>：markdown 文件顶部的 YAML 元数据</li>
  </ul>
  <details><summary>都不知道？这份文档可能不适合你</summary>
    <p>建议先读 <a href="...">入门文档</a></p>
  </details>
</aside>
```

**fallback**：`<blockquote>` 列表。

### 6.2 `learning-checkpoint`

**用途**：每节末尾"你现在应当能…"自测，帮读者确认是否消化。

**触发**：enrich 注解 `checkpoints[]`（每节 0-3 条）。

**HTML 形态**：

```html
<aside class="learning-checkpoint" data-detail-level="checkpoint" data-section="s4">
  <h5>✅ 走完这节你应当能</h5>
  <ul>
    <li>说出 content_mode 的 4 种值</li>
    <li>解释 reader_profile 为什么用运行时切换而不是渲染多份</li>
  </ul>
</aside>
```

复用 `takeaway_grid` 的视觉风格（已有 CSS），无需新设计语言。

**fallback**：普通有序列表。

### 6.3 `glossary-popover`

**用途**：术语 hover 显示定义，零基础不用跳走查词。

**触发**：复用现有 `concept_glossary` annotation；renderer 把术语在正文中的出现包成 `<span class="term">`，附 hover popover。

**HTML 形态**：

```html
<span class="term" data-detail-level="glossary"
      data-term="frontmatter"
      data-definition="markdown 文件顶部的 YAML 元数据"
      aria-describedby="g-frontmatter">
  frontmatter
  <span id="g-frontmatter" role="tooltip">markdown 文件顶部的 YAML 元数据</span>
</span>
```

**实现关键**：
- 只对**每个术语首次出现**加 popover（避免满屏波浪线）
- CSS `:hover` + `:focus` 触发；移动端 tap 也能触发
- expert 模式下 `display: contents`（去除 hover 装饰）

**fallback**：普通 `<a href="#glossary">` 链接到文末术语表。

### 6.4 `analogy-callout`

**用途**："想象 X 就像 Y" 类比，把抽象概念绑定到熟悉对象。

**触发**：markdown blockquote 前缀 `🎯` 或 enrich 注解 `analogies[]`。

**HTML 形态**：

```html
<aside class="callout analogy" data-detail-level="analogy">
  <span class="callout-icon">🎯</span>
  <p><strong>类比：</strong>content_mode 就像菜单分类（饮料/主食/甜点），reader_profile 就像分量选择（小份/中份/大份）。两者独立选。</p>
</aside>
```

**fallback**：普通 callout。

## 7. enrich 管线扩展

### 7.1 新增 annotation 字段

扩展 `RenderAnnotations`（`src/types.ts`）：

```typescript
export type RenderAnnotations = {
  schema_version: 2;  // 从 1 升到 2
  source?: string;
  document_overview?: DocumentOverviewAnnotation;
  reading_path?: ReadingPathAnnotation[];
  semantic_blocks?: SemanticBlockAnnotation[];
  section_summaries: SectionSummaryAnnotation[];

  // 新增
  content_mode?: "tutorial" | "concept" | "reference" | "course";
  prerequisites?: PrerequisiteItemAnnotation[];
  checkpoints?: CheckpointAnnotation[];  // section_id-indexed
  analogies?: AnalogyAnnotation[];
};

export type PrerequisiteItemAnnotation = {
  term: string;
  plain_language: string;
  why_needed?: string;
  fallback_link?: string;
};

export type CheckpointAnnotation = {
  section_id: string;
  items: string[];  // "你应当能..." 短句，每个 1 行
};

export type AnalogyAnnotation = {
  section_id: string;
  concept: string;
  analogy: string;  // "X 就像 Y，因为 Z"
};
```

**向后兼容**：`schema_version: 1` 的 annotations.json 仍可读，新字段缺省。

### 7.2 三种 provider 行为

| provider | content_mode | prerequisites | checkpoints | analogies |
|---|---|---|---|---|
| `scaffold`（默认，0 token） | 启发式分类（§4.3） | frontmatter only | 空数组 | 空数组 |
| `codex` | 启发式 + 让 codex 在边缘 case 复核 | 让 codex 推断（≤5 项） | 让 codex 生成（每节 0-3 条） | 让 codex 生成（每节 ≤1 条） |
| `claude` | 同上 | 同上 | 同上 | 同上 |

**关键**：启发式分类是 **scaffold 必须做**的事；codex/claude 可以**覆盖** scaffold 的判断但要在 verbose 输出里说明理由。

## 8. render-spec skill 扩展

`src/skills/render-spec/template.html` 增加占位符：

```html
{{READER_TOGGLE}}        <!-- 顶部 3 档按钮 -->
{{PREREQUISITE_CARD}}    <!-- 在 metadata-strip 之后 -->
{{ANALOGY_CALLOUTS}}     <!-- 在对应 section 内 inline 注入 -->
{{LEARNING_CHECKPOINTS}} <!-- 在每个 section 末尾注入 -->
{{READER_TOGGLE_SCRIPT}} <!-- 顶部按钮逻辑 + localStorage -->
```

`style.css` 增加：
- `.reader-toggle` 顶部按钮组样式
- `.prerequisite-card` / `.callout.analogy` / `.learning-checkpoint` / `.term` 样式
- `html[data-reader="..."]` 选择器组（§5.2）
- `html[data-content-mode="..."]` 仅小幅微调（如 `reference` 模式下 TOC 始终可见）

**`<html>` 根标签**：emit 阶段写入 `data-reader="beginner"` 和 `data-content-mode="<auto>"`。

## 9. CLI 扩展

`dossier render` 新增：
- `--reader <beginner|intermediate|expert>`：覆盖默认值（写入 `<html data-reader>`）
- `--content-mode <auto|tutorial|concept|reference|course>`：覆盖自动分类（default `auto`）

`dossier enrich` 不变 —— provider 内部消费 mode/profile 由 annotation 决定。

## 10. 实施里程碑

### 10.1 P0（codex 一次实施完，目标 1 周）

| 任务 | 文件 |
|---|---|
| 启发式分类器 | `src/enrich/content-mode.ts` + 单元测试 |
| 扩展 annotations 类型 | `src/types.ts`（schema_version 2 兼容） |
| scaffold provider 输出 content_mode + 空 prereq/checkpoint/analogy | `src/enrich/section-summaries.ts` |
| 4 个展示元素 HTML 渲染 | `src/emit.ts` 新增渲染函数 |
| render-spec template/style 扩展 | `src/skills/render-spec/template.html` + `style.css` |
| reader-toggle 内嵌 JS | 新增 `src/skills/render-spec/reader-toggle.js`（inline） |
| CLI `--reader` / `--content-mode` flag | `src/cli.ts` |
| 跑通现有 specs | 验收清单 §11 |

### 10.2 P1（后续迭代）

- codex/claude provider 升级（实际生成 prereq/checkpoint/analogy）
- `course` mode 跨文档支持（依赖 cover 模块改动）
- profile.md 读取作为默认值
- glossary-popover 移动端长按支持

## 11. 验收清单

按顺序勾，最后一项打勾 = P0 完成：

- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` 全绿，新增 ≥6 个测试（content-mode 分类、prereq fallback、reader 切换 a11y、annotation schema v1 兼容）
- [ ] `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 跑通
- [ ] 输出 HTML 顶部有 3 档 reader 按钮，默认高亮"零基础"
- [ ] 切换到"速查" → prereq/analogy/checkpoint 全部消失，正文压缩
- [ ] 切换到"系统化" → 居中状态
- [ ] HTML `<html>` 根标签有 `data-reader="beginner"` 和 `data-content-mode="concept"`
- [ ] `?reader=expert` 在浏览器地址栏覆盖默认
- [ ] localStorage 切换跨刷新保留
- [ ] **关网络 + 双击 HTML** 三档切换完全可用
- [ ] `--content-mode tutorial` 强制 → HTML data-content-mode 反映该值
- [ ] frontmatter `content_mode: reference` 覆盖启发式 → 反映
- [ ] 一份临时 fixture（伪 Quickstart README）跑 → 启发式判定 `tutorial`
- [ ] 一份临时 fixture（API 参考表）→ 启发式判定 `reference`
- [ ] annotations.json schema_version: 1 旧文件仍可读，新字段缺省不报错
- [ ] 写一份 `docs/changes/2026-05-XX-dossier-pedagogy-layer-impl-notes.md`，列**实际偏差**

## 12. 决不要做的事

| ❌ Do not | 因为 |
|---|---|
| 渲染三份 HTML，每个 profile 一份 | 违反单文件分享约束 |
| 在 markdown 里手写复杂 HTML（如 `<div class="prerequisite-card">`） | AI 写作可读性下降；走 frontmatter / annotation 管线 |
| 引入新 npm 依赖 | 沿用 ADR 的零额外依赖原则 |
| 让 reader-toggle 依赖外部 JS 文件 | 单文件 HTML 约束；JS 必须 inline |
| 实现 content_mode 的 AI 自动分类 | 启发式 + frontmatter 已经够；省 token |
| 改 SemanticBlock 已有 14 种字段 | 新增字段而非覆盖；保持向后兼容 |
| 给 expert 模式做"折叠"动画 | 视觉噪音；data-attribute + display 即可 |
| 让 glossary popover 每次出现都标记 | 满屏波浪线；只标首次出现 |
| 让 `course` mode 强制要求多文件 | 单文档长文也可以分课时（用 h2 + frontmatter `lesson`） |
| 在 P0 实现 profile.md 读取 | 留 P1；P0 硬编码默认 |

## 13. 风险

| 风险 | 概率 | 缓解 |
|---|---|---|
| 启发式分类对边缘文档判错 | 中 | frontmatter `content_mode:` 显式覆盖；verbose 输出分数让用户能 debug |
| reader-toggle JS 在 IE / 老浏览器跑不起 | 低 | 用 ES2018 子集，避免可选链；feature detect + fallback 显示全部 |
| 术语 popover 满屏 | 中 | 只标首次出现；expert 模式禁用 |
| 单文件 HTML 因为新元素变大 | 低 | 测：vision spec 渲染后 < 150KB |
| schema_version 升级破坏旧 annotations.json | 低 | parseAnnotationsJson 兼容 v1，缺字段视为缺省 |
| codex 实施时偷偷改 ADR | 中 | handoff brief 显式列禁止项 |

## 14. 开放问题

| Q | 问题 | 倾向 |
|---|---|---|
| Q1 | reader 切换是否要带键盘快捷键（如 `1` / `2` / `3`）？ | P1，A11y 优先确保 Tab 可达 |
| Q2 | URL `?reader=expert` 切换是否要在 history 留 entry？ | 否（不污染浏览历史）|
| Q3 | content_mode 是否影响 toc 渲染（reference 模式总是显示）？ | 是，§8 已说明 |
| Q4 | 教学注解的 i18n？ | P0 仅中文 + 英文混排（沿用现有 render-spec 的 PingFang SC + 系统 UI）|
| Q5 | 是否支持自定义 reader profile（如 `manager`）？ | 否，P0 锁死 3 档 |

## 15. 下一步

1. 本 spec 签字 → `status: ready`
2. Codex handoff brief：`docs/specs/2026-05-20-codex-pedagogy-layer-handoff-brief.md`（同步写）
3. Codex 实施 P0；完成后写 `docs/changes/2026-05-XX-dossier-pedagogy-layer-impl-notes.md`
4. 用现有 4 份 spec dogfood：vision-spec / mvp-0-spec / cover-IA-spec / semantic-lens-spec
5. 实施完后本 spec → `implemented`，记录到 vision-spec 的 `implements`
