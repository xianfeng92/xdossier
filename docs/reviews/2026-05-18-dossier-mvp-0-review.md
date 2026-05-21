---
title: Dossier MVP-0 实施 review — Codex 提交验收
status: implemented
owner: claude
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md", "docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md"]
reviewer: claude
implementer: codex
---

## 0. 一句话结论

> ✅ **验收通过 (PASS with minor nits)**。
> 13 项验收清单全部命中（其中 2 项需用户在浏览器肉眼复核 — 见 §3）。Codex 完整遵守了 §7 "决不要做的事" 10 条铁律，未引新依赖、未改 ADR、未触 dossier / AI 范畴。

---

## 1. 自动化验收（11/11 命中）

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | `pnpm typecheck` clean | ✅ | `tsc -p . --noEmit` exit 0 |
| 2 | `pnpm test` 全绿 | ✅ | **6/6 passed**（Codex 在我 4 个 stub 之上加了 2 个 frontmatter + 回归测试，多余）|
| 3 | `pnpm render:self` 跑通无 warning | ✅ | `wrote .../2026-05-17-dossier-vision-spec.html (42856 bytes)` |
| 4 | 输出 HTML 文件存在 | ✅ | 54,647 bytes |
| 5 | 文件大小 < 100KB | ✅ | 54.6KB / 100KB = 55% |
| 6 | 18 个 `<section id="sN">`（spec ≥17） | ✅ | grep -c = 18（spec 实际 18 节）|
| 7 | 左侧 `<aside class="toc">` | ✅ | 1 个，含 19 个 TOC 链接（h2 + h3）|
| 8 | Status badge `ready` | ✅ | 见 §4 nit-1 |
| 9 | callout 样式（⚠/📝/🎯）| ✅ | 3 处匹配 `callout warn/note/goal` |
| 10 | ASCII 图块 `class="ascii-diagram"` | ✅ | 3 处（§4 + §7.5 + §10.1 时间线？）|
| 11 | 零外链资源 | ✅ | grep `<script src=\|<link.*href="http\|@import\|url(http` = 0 |
| 12 | TOC scroll-spy JS inlined | ✅ | `tocLinks.forEach` 在文档内出现 1 次 |
| 13 | H2 § 编号自动生成 | ✅ | `§ 1` ~ `§ 17` 均含 `<span class="sec-num">` |

CLI 三项追加验收：

| # | 验收项 | 结果 |
|---|---|---|
| 14 | `--verbose` 输出 `selected skill: render-spec (frontmatter-kind)` | ✅ 一字不差 |
| 15 | `--skill bogus` exit 3 + 清晰错误 | ✅ `error: unknown skill: bogus` |
| 16 | Codex 写 impl notes | ✅ `docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md` |
| 17 | MVP-0 spec status → `implemented` | ✅ |

## 2. § 7 "决不要做的事" 合规审查

10 项铁律全部遵守：

| ❌ 不要做 | Codex 是否触碰 |
|---|---|
| 改 `package.json` 加新 deps | ✗ — 仅 marked + gray-matter，未动 |
| 用 commander / cac / yargs | ✗ — 仍是手写 argv |
| 用 eta / ejs / handlebars | ✗ — `template.replace(/\{\{([A-Z_]+)\}\}/g, ...)` |
| 引入 highlight.js | ✗ — 仅 `class="lang-xxx"` |
| 设计 admonition 语法 | ✗ — 仅基于 ⚠/📝/🎯 emoji 前缀启发 |
| 实现 dossier / 关系图 / 多文档 | ✗ |
| 引入 AI / LLM 调用 | ✗ |
| 改 ADR | ✗ |
| 删 v1 手工版 HTML | ✗ — 仍在 repo（48,388 bytes）|
| 改 spec 核心决策 | ✗（小修见 §4）|

## 3. 仍需用户肉眼复核（2 项，文件已 `open` 在浏览器）

这两项自动化无法判断，建议你在浏览器里花 2 分钟看完：

- [ ] **视觉精度 ≥ 80% 对比 v1 手工版**：左右开两个 tab，对比 `2026-05-17-agentstory-vision-spec.html`（v1）vs `2026-05-17-dossier-vision-spec.html`（auto）。重点看：frontmatter card、TOC 排版、§4 ASCII 图、表格、callout 配色。
- [ ] **TOC scroll-spy 联动**：在自动版里滚到 §7，左侧 TOC 是否高亮 §7 entry？

如果这两项目测有问题，告诉我，我让 Codex 改。

## 4. 发现的 nit（不阻塞，但建议下一轮修）

### nit-1 · 非 draft / archived status 时 badge 缺 modifier class

`src/emit.ts:74`：
```typescript
const badgeClass = status === "draft" ? "draft" : status === "archived" ? "warn" : "";
```

当 status 是 `ready` / `implemented`，渲染出 `<span class="badge ">ready</span>`（尾随空格）。
- **影响**：CSS 仍命中 `.badge` 基类，渲染正常 —— 但 badge 不会有特异颜色暗示状态。
- **建议修法**：把 ready / implemented 也映射成对应 CSS class（如 `.badge.ready` 用绿色 `var(--ok)`）。1 行改动。
- **谁修**：放进 MVP-1 backlog；MVP-0 不阻塞。

### nit-2 · vision spec frontmatter `implements` 方向

Codex 在 vision spec 加了：
```yaml
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
```

但 MVP-0 spec 也有：
```yaml
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
```

**两边互指**。按 `AI_SPACE/CLAUDE.md` 协议字面理解，`implements:` 应该是"我实施了 X"（向上指 vision），不是"X 实施了我"。当前是双向写法，会让未来的 dossier 关系图推断混淆。

- **建议**：清空 vision spec 的 `implements: []`，仅 MVP-0 spec 单向指向 vision。
- **修哪**：vision spec frontmatter 第 8 行。
- **优先级**：低，但 MVP-1 dossier 识别要用 frontmatter 建图，那时必须先理清。

### nit-3 · Codex 加的 `kind: vision-spec` 字段（**接受**）

Codex 给 vision spec 加了 `kind: vision-spec`，让 §6.5 layer 3 的 frontmatter-kind 调度命中 render-spec。

- **评价**：✅ **defensible**。SKILL.md 的 `applies_to.frontmatter_kind` 已声明接受 `"vision-spec"`，这一改让自动验收命令更精准（不靠 fallback）。
- **不动**。建议把 `kind:` 加入 AI_SPACE/CLAUDE.md 的 frontmatter 标准字段。

### nit-4 · 顶部 callout 不分离成 `.top-callouts` 容器（**接受**）

Codex 把 ⚠/📝/🎯 callout 直接 inline 在内容流而非分离到顶部 `.top-callouts`。

- **评价**：✅ **defensible**。markdown 顺序保留 + 实现更简单。v1 手工版做了分离是因为我当时手动选位置，无 markdown 顺序约束。
- **不动**。

## 5. 输出物大小变化（为什么 55KB 而非 48KB）

| 来源 | bytes | sections | 说明 |
|---|---|---|---|
| v1 手工版 | 48,388 | 17 | 命名前手工写，§0-16 |
| MVP-0 自动版 | 54,647 | 18 | 内容更新后，§0-17（多了 §6.5 Skill 调度 + 一些扩展）|

差额 ~6KB 主要来自 v2 spec 的额外内容（Dossier 专章扩张、§6.5 增补），不是渲染器低效。**可接受**。

## 6. 后续动作

立即可做：
- [ ] 你**肉眼复核**两项（§3）
- [ ] 我修复 nit-2（vision spec implements 清空）—— 待你确认方向再动

下个里程碑（MVP-1）应携带的 backlog（从本次 review 累积）：
- 修复 nit-1（badge.ready / badge.implemented class）
- 把 `kind:` 字段写进 `AI_SPACE/CLAUDE.md` 标准约定
- 实现 Skill registry layer 4/5（filename + directory pattern）
- 多文档 dossier 识别（Tier 1 显式信号）

## 7. 我的 review 签字

- 所有验收项命中（自动化层面）
- 无 ADR 违反、无范围越权
- impl notes 透明，deviation 都有清晰说明
- 项目第一次"自己渲染自己"达成 ✅ —— 这是 spec §12 的 dogfood 闭环里程碑

**Verdict**: **PASS**。

签：claude · 2026-05-18
