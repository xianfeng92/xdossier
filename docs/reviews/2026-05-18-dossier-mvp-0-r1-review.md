---
title: Dossier MVP-0 r1 视觉修复 review
status: implemented
owner: claude
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-17-dossier-vision-spec.html"]
follows: ["docs/reviews/2026-05-18-dossier-mvp-0-visual-review.md", "docs/specs/2026-05-18-codex-rework-brief-r1.md"]
reviewer: claude
implementer: codex
verdict: PASS
---

## 0. 结论

> ✅ **PASS**。r1 反工 brief 列的 6 个 P0 + 1 个 P1 缺陷**全部修复**。自动化层面无回归（typecheck / 6 tests / render:self 全绿）。视觉层面达到 r0 review §3 软标准（≥80% v1 手工版精度）。
> **MVP-0 dogfood 闭环正式达成**。

---

## 1. 7 项缺陷修复逐项核验

| # | 缺陷 | r0 现象 | r1 实际渲染 | 状态 |
|---|---|---|---|---|
| **P0-1** | H2 双重编号 | `§ 1   0. 一句话` (§N + 源编号同时出现) | `§ 0  一句话` / `§ 1  为什么...` / ... / `§ 17  下一步`，**单一编号且与源对齐** | ✅ |
| **P0-2** | H3 子节双重编号 | TOC `2.1   1.1 一个被忽视的现实` | `1.1 一个被忽视的现实` / `7.4 Dossier 数据模型...` | ✅ |
| **P0-3** | §0 hero 降级 | §0 渲染为普通 blockquote | `<div class="tagline"><span class="tagline-label">TL;DR</span>...</div>` 大色块 hero | ✅ |
| **P0-4** | TOC 含 `&lt;em&gt;` 字面 | TOC 显示 `2. 这个项目&lt;em&gt;不&lt;/em&gt;做什么` | 0 处实体泄漏 (`grep -c '&lt;em&gt;'` = 0) | ✅ |
| **P0-5** | H1 整段，无 subtitle | `<h1>Dossier — 把 AI 给你...</h1>` 长串单行 | `<h1>Dossier</h1>` + `<p class="subtitle">把 AI 给你的每一份设计...</p>` | ✅ |
| **P0-6** | 空 frontmatter 字段渲染空白 | `<span class="meta-value"></span>` 空 row | 0 处空白 meta-value (`grep -c 'meta-value"></span>'` = 0) | ✅ |
| **P1-1** | badge "ready" 无 modifier class | `class="badge "` 尾随空格 | `class="badge ready">ready</span>` | ✅ |

## 2. 自动化层面无回归

| 指标 | r0 | r1 | 变化 |
|---|---|---|---|
| `pnpm typecheck` | clean | clean | ✅ |
| `pnpm test` | 6/6 passed | 6/6 passed | ✅ |
| 文件大小 | 54,647 B | 54,348 B | 略减 (-0.5%) ✅ |
| 零外链 | ✓ | ✓ (blocking `<script src>` / `<link href=http>` / `@import` = 0) | ✅ |
| Section 数 | 18 | 18 | 一致 ✅ |

## 3. § 7 "决不要做的事" 合规

Codex 在 r1 仍然遵守 rework brief §2 的 6 条铁律：
- ✗ 未引入 admonition 语法
- ✗ 未加新 dep（package.json diff = 0）
- ✗ 未改 ADR
- ✗ 未删 v1 baseline HTML（仍在 48,388 bytes）
- ✗ 未大重构 renderer（修改聚焦在 P0 范围）
- ✗ 未补 `.us-card` / `.scope-grid` / `.q-list` / `.ladder` / `.name-grid`

## 4. Codex r1 的实施亮点

值得记录的实现细节（从 impl notes 抽取）：

1. **P0-1 修法**：正则识别 H2 / H3 前缀 `0.` / `1.1` / `6.5`，把数字部分用作显示节号，正文部分用 cleaned text。**完美兼容非线性编号**（如 §6.5）。
2. **P0-3 启发**：`section_num === 0` 时，将该节内**第一个非 callout blockquote** 提升为 `.tagline`。优雅 —— 不需要 admonition 语法，也不需要内容侧的特殊标记。
3. **P0-4 修法**：TOC 抓取与 heading 渲染**共用清洗后的 plain text**，不再有 escape over-coverage。
4. types.ts 加 `TocEntry.number?: string` 字段承载源编号 —— **数据模型层面**而非渲染层面表达"这是源里来的"。设计判断好。

## 5. 仍存在的 mini nit（不阻塞，记入 MVP-1 backlog）

| # | 描述 | 优先级 |
|---|---|---|
| nit-r1-1 | 锚点 ID 与显示编号不对称：`<section id="s1">` 但 H2 显示 `§ 0`。点击 TOC `#s1` 链接工作正常，但复制 URL 时不直观（`#s1` ≠ "§0"）。 | 低，MVP-1 |
| nit-r1-2 | CLI 输出 `wrote ... (42559 bytes)` 实际磁盘 54,348 字节 —— `html.length` 用 UTF-16 code unit 计数，中文密集场景低估 ~22%。 | 极低，cosmetic |
| nit-r1-3 | 顶部 callout 仍 inline 在内容流（Codex r0 决策延续）。视觉上"在 §0 之前"已满足，可不动。 | 接受，不修 |

这三条都不阻塞 MVP-0 收尾。

## 6. r0 → r1 改动量复盘

- 实际改动符合预估（半天工作量）
- 文件大小 r0 → r1 略减（-299 bytes）—— 因为去掉了空 meta-value rows + cleaned heading 数据更紧凑，新增的 `.tagline` / `.subtitle` 渲染抵消
- 6/6 test 一直绿，说明 Codex 在编辑过程中持续跑测试，没出现"修一边坏一边"

## 7. MVP-0 正式收尾建议

MVP-0 §13 验收清单原有 13 项 + §6.5 追加 3 项 = 16 项，r1 后**全部命中**。

后续动作：

1. **本 review 签字** ✅（见 §0）
2. **MVP-0 spec frontmatter `status: implemented`** ← Codex 已做
3. **vision spec frontmatter `implements`** ← 需要清理（r0 nit-2 仍存在）：清空或改为前向指 MVP-0
4. **MVP-0 dogfood 闭环**：把生成的 `2026-05-17-dossier-vision-spec.html` commit 进 repo（你之前没 git init —— 如果要走完闭环建议 init + 首次 commit）
5. **开始写 MVP-1 实施 spec**：dossier 识别（Tier 1 显式信号）、多文档 index 页、关系图

进入 MVP-1 前要带的 backlog（累积自 r0 + r1）：
- nit-r1-1 锚点 ID 对称（low）
- nit-r1-2 CLI bytes 显示（cosmetic）
- 把 `kind:` 字段写进 `AI_SPACE/CLAUDE.md` spec 协议
- 把"H2/H3 标题可写源编号或省略，渲染器都能处理"也写进 spec 协议
- Skill registry layer 4/5（filename / directory pattern）
- 多 SKILL：`render-adr` / `render-change-note` / `render-review`
- §6.3 推迟的 5 类 admonition 块（us-card / scope-grid / q-list / ladder / name-grid）

## 8. 签字

**Verdict**: **PASS**。Dossier MVP-0 完成。

签：claude · 2026-05-18

---

> 🎉 **里程碑事件**：项目第一次完整地"自己渲染自己"。下一份输入是 MVP-1 spec —— 那将是 Dossier 第一次渲染一份**关于 Dossier 自己的、由 Dossier 处理过的 markdown**。dogfood 飞轮开始转。
