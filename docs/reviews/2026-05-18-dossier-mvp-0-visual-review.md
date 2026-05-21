---
title: Dossier MVP-0 视觉 review — UI / 排版深度审查
status: implemented
owner: claude
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-17-dossier-vision-spec.html"]
follows: ["docs/reviews/2026-05-18-dossier-mvp-0-review.md"]
reviewer: claude
implementer: codex
verdict: NEEDS_REWORK
---

## 0. 一句话

> 上一份 review 自动化层面 PASS，但**视觉层面 NEEDS_REWORK**。发现 **6 个 P0 级缺陷** + 3 个 P1。最严重的是 H2 / H3 标题**双重编号显示**（"§ 1 0. 一句话"），扫读体验明显劣于 v1 手工版。

**修正前后建议变化**：
- 上一份 review 的 verdict：~~PASS with minor nits~~ → **NEEDS_REWORK (visual)**
- 功能层面（解析、调度、零外链）仍然合格，但**MVP-0 §1.3 验收强制标准 1**（"17 个 section 全部正确渲染，h2 / h3 层级清晰"）未达成 —— "正确"含视觉。

---

## 1. P0 缺陷（必修，破坏阅读体验）

### P0-1 · H2 标题双重编号

**现象**：所有 H2 标题都同时显示自动 `§ N` 和源 markdown 里手写的 `N.` 前缀。

```html
<h2 id="s1"><span class="sec-num">§ 1</span><span>0. 一句话</span></h2>
                          ↑ 自动            ↑ 源里写的, 没去掉
```

实际渲染：

```
§ 1   0. 一句话
§ 2   1. 为什么这个项目存在
§ 18  17. 下一步
```

读者看到**两套不同的编号同时存在**，且数值还**对不上**（§ 1 ↔ 0.；§ 18 ↔ 17.）。这是整份文档最严重的视觉噪声。

**根因**：spec markdown 源里手写了 `## 0. 一句话` / `## 1. 为什么...`（人类写文档的自然习惯），渲染器又叠加了从 1 开始的自动 `§ N`。

**修法（推荐 B）**：
- **(A)** 渲染器检测 H2 文本前缀 `^\s*\d+\.\s+`，剥离后再加 `§ N`
- **(B)** 渲染器检测到 H2 已有 `^\s*(\d+)\.\s+` 编号 → **沿用源里的数字作为 sec-num，不另加** ✓ 推荐：尊重作者意图，且能正确处理 §0
- **(C)** 把 spec markdown 里所有手写数字删掉

选 (B) 最稳：可处理 §0、§6.5 这种非线性编号；作者随便写，渲染自适应。

**Codex 落地位置**：`src/parse/semantic.ts` 第 25-30 行（h2 处理），和 `src/parse/markdown.ts` 第 56-63 行（heading renderer）。

### P0-2 · H3 子节同样双重编号

**现象**：TOC 里 H3 entries 显示如：

```
2.1   1.1 一个被忽视的现实        ← 自动 "2.1" + 源里 "1.1"
2.2   1.2 一个更被忽视的现实
8.4   7.4 Dossier 数据模型实现要点
```

同 P0-1 一起修。修 H2 后 H3 也跟着用源里的 `M.N` 而非 `(secNum).(subNum)`。

### P0-3 · §0 一句话失去 hero 处理

**现象**：源 markdown：
```markdown
## 0. 一句话

> AI 给你的每一份设计 / 方案 / 文档...
```

v1 手工版：深靛蓝大色块（`.tagline`）独占视觉中心 —— 这是"项目灵魂"展示位。
auto 渲染：变成 `<section id="s1">` 里普通 `<h2>` + 普通 `<blockquote>`。**hero 角色被降级为正文**。

**修法**：
- 渲染器识别 H2 文本是"一句话"/"Tagline"/"TL;DR"等关键词时，把后续第一个 `<blockquote>` 渲染为 `.tagline` 大色块
- 或：识别 `## 0.` (节号为 0 的章节)自动 hero 化
- 或更通用：源 markdown 用 `:::tagline` 标记（但 MVP-0 不引入 admonition 语法，所以推后到 MVP-1）

MVP-0 速修：检测 `_dossierSectionNum === 0` 时，整节用 hero 样式。

### P0-4 · TOC 里 H3 文本含未解析 HTML 实体

**现象**：

```html
<span>2. 这个项目&lt;em&gt;不&lt;/em&gt;做什么</span>
<span>3.3 反用户故事（明确&lt;strong&gt;不&lt;/strong&gt;服务）</span>
```

源 markdown 里有 inline HTML（`<em>不</em>` / `<strong>不</strong>`），TOC 抓取时**整段 escape 成实体**，读者看到字面的 `&lt;em&gt;` 字符串。

**根因**：`src/parse/toc.ts` 第 32 行用了 `token.text`（含原 HTML 字符），传给 `escapeHtml` 后被 over-escape。

**修法**：TOC 抓取时去掉 inline HTML 标签后再 escape：
```typescript
const plainText = token.text.replace(/<[^>]+>/g, "");
// 或更稳: 用 marked 提供的 token.tokens 走 inline parse + strip
```

### P0-5 · H1 过长 + 无 subtitle 拆分

**现象**：H1 是 frontmatter `title` 字段的整段：
```html
<h1>Dossier — 把 AI 给你的每一份设计 / 方案 / 文档自动渲染成可读、可分享、可关联的 HTML 档案</h1>
```

整段单行渲染（前端容器最大 760px，会自动 wrap，但 H1 不应承担副标题任务）。

v1 手工版：H1 = "Dossier"（一个词），下面单独 `<p class="subtitle">` 放副标题。视觉层级清晰。

**修法**：`src/emit.ts:41` 在 frontmatter 渲染时按 ` — ` / ` -- ` 分割 `title` 字段：
```typescript
const [head, ...rest] = title.split(/\s+[—-]\s+/);
// head → <h1>, rest.join(" — ") → <p class="subtitle">
```

或更稳：约定 frontmatter 单独有 `subtitle:` 字段，title 只放短名。

### P0-6 · Frontmatter 空字段仍渲染（"reviews: " 空行）

**现象**：

```html
<div class="meta-item">
  <span class="meta-label">reviews</span>
  <span class="meta-value"></span>
</div>
```

空数组 / 空字符串字段被渲染为空白行，浪费 grid 槽位 + 视觉脏。

**修法**：`src/emit.ts:77` filter 时再加一道：
```typescript
.filter((key) => {
  const v = frontmatter[key];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
})
```

---

## 2. P1 缺陷（功能 OK，视觉不达手工版水平）

### P1-1 · badge "ready" / "implemented" 没有颜色 modifier

**现象**：`<span class="badge ">ready</span>` —— 尾随空格 + 无 `.badge.ready` modifier，命中默认 `.badge` 样式（蓝底）。视觉上 ready / draft / implemented / archived **没有色差暗示状态**。

**修法**：`src/emit.ts:74`：
```typescript
const badgeClass = ({
  draft: "draft",
  ready: "ready",
  implemented: "ok",
  archived: "warn",
} as const)[status] ?? "";
```

CSS 同步加 `.badge.ready { background: var(--ok-soft); color: var(--ok); }` 和 `.badge.ok` 等。

### P1-2 · TOC 顶部 "Spec · 18 节" 在双重编号下意义混淆

读者看到 "Spec · 18 节" + TOC 里 `§1` ~ `§18`，但源 markdown 是 `0~17`。修了 P0-1 后这一条自动消失（TOC 数字会跟随源编号）。

### P1-3 · CSS 只有 7.4KB（v1 ~10KB），可能漏了细节 class

CSS 占整文件 13.4%。v1 手工版 CSS 占约 20%。差额可能是被 §6.3 推迟的 `.us-card` / `.scope-grid` / `.q-list` / `.ladder` / `.name-grid` —— 这部分是有意省略，不算缺陷。

但其他细节（如 `.spec-footer` flex、`hr` 样式、`blockquote` 默认样式 vs `.callout` 区分）是否完整需要在浏览器里逐项比对。**建议**：你（用户）肉眼对比时如发现某类元素视觉粗糙，告诉我具体是哪类，我让 Codex 补 CSS。

---

## 3. 视觉层面**做对**的地方（公允评价）

| 项目 | 评价 |
|---|---|
| 整体 layout grid（260px TOC + max-width 760px 正文）| ✅ 完整复现 |
| ASCII 图块 `class="ascii-diagram"` 等宽 + 边框 | ✅ |
| Callout `.warn` / `.note` / `.goal` 三色区分 | ✅ |
| 代码块 `<pre><code class="lang-xxx">` 浅米底 | ✅ |
| 行内 `<code>` 浅红 | ✅ |
| 表格 hairline 边框 + th 浅灰 | ✅ |
| 字体栈（system-ui / PingFang SC / JetBrains Mono）| ✅ |
| Color tokens（暖白 / 墨黑 / 靛蓝 accent）| ✅ |
| TOC sticky + scroll-spy 联动 | ✅（前端 JS 仍工作，但视觉因 P0-4 受影响）|
| 单文件零外链 | ✅ |

---

## 4. 修复建议的优先级与代价

| 缺陷 | P 级 | 改动量 | 涉及文件 | MVP-0 阶段必修? |
|---|---|---|---|---|
| P0-1 双重编号 H2 | P0 | ~10 行 | `parse/semantic.ts` + `parse/markdown.ts` | ✅ 必修 |
| P0-2 双重编号 H3 | P0 | 含 P0-1 中 | 同上 | ✅ 必修 |
| P0-3 §0 hero 化 | P0 | ~15 行 + 1 个 CSS class（已在 CSS 里有 `.tagline`）| `parse/markdown.ts` + CSS | ✅ 必修 |
| P0-4 TOC HTML 实体 | P0 | ~3 行 | `parse/toc.ts` | ✅ 必修 |
| P0-5 H1 拆 subtitle | P0 | ~5 行 | `emit.ts` | ✅ 必修 |
| P0-6 空字段隐藏 | P0 | ~5 行 | `emit.ts` | ✅ 必修 |
| P1-1 badge ready 色 | P1 | ~3 行 TS + ~6 行 CSS | `emit.ts` + style.css | 可推 MVP-1 |
| P1-2 TOC 描述 | P1 | 跟 P0-1 一起修 | — | ✅ 跟随 |
| P1-3 CSS 完整性 | P1 | TBD | style.css | 视觉验证后定 |

**总改动量预估**：6 个 P0 修完约 40-60 行 TS + 10-20 行 CSS。半天工作量。

---

## 5. 给 Codex 的反工建议

把这份 review 整段贴给 Codex，并明确：

> 重做范围：P0-1 ~ P0-6 全部修复 + P1-1 可一起。修完跑 `pnpm render:self`，确认 `2026-05-17-dossier-vision-spec.html` 视觉与 v1 手工版 (`2026-05-17-agentstory-vision-spec.html`) 接近 80% 以上。提交时附 visual diff 截图（5-10 处对比）+ 更新 impl notes。
>
> 严禁：改 ADR、加新 dep、引入 admonition 语法（推迟到 MVP-1）、删 v1 baseline HTML。

---

## 6. 我作为 reviewer 的反思

我在写 spec 时**自己在 markdown 里手写了节号**（`## 0. 一句话`/`## 1. ...`），同时 v1 手工版 HTML 又用了 `<span class="sec-num">§ N</span>` —— 两套编号在**手工版本里恰好通过手动协调没出问题**，但自动渲染时这个隐患第一时间暴露。

**Spec 层面的修补**（如果不通过渲染器修）：把 spec markdown 里 H2 / H3 手写的 `N.` / `M.M` 前缀全部删掉，让渲染器自动编号 —— 但这要求所有 spec 都遵循此约定，未必通用。

**推荐**：渲染器侧修（P0-1 的方案 B），同时在 `AI_SPACE/CLAUDE.md` 的 spec 协议里加一行说明："H2 标题可写 `## N. 标题` 或 `## 标题`，渲染器都能正确编号"。这是更稳健的两方约定。

签：claude · 2026-05-18
