---
title: Dossier MVP-0 — Codex 反工 brief r1（视觉修复）
status: archived
owner: claude
created: 2026-05-18
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
reviews: []
follows: ["docs/specs/2026-05-18-codex-handoff-brief.md"]
---

> 👋 这是 r1 反工指令。上一轮提交自动化层面 PASS，但视觉 review 降级为 NEEDS_REWORK。
> 📄 **必读**：`docs/reviews/2026-05-18-dossier-mvp-0-visual-review.md` —— 这份文档已经把每个 P 缺陷的现象、根因、修法、文件 / 行号写清楚。本 brief 是它的"任务卡片"封装。
> ⏱ **预估**：40-60 行 TS + 10-20 行 CSS，半天工作量。

## 1. 反工范围（**仅做这 7 件事**）

| 编号 | 项目 | 主要涉及文件 | 详情见 review |
|---|---|---|---|
| P0-1 | H2 双重编号：沿用源里 `N.` 数字作为 sec-num，不另加 `§ N` 自动编号 | `src/parse/semantic.ts` + `src/parse/markdown.ts` | §1 P0-1（采用方案 B）|
| P0-2 | H3 同样双重编号；修了 P0-1 后 H3 也跟着用源里 `M.N` | 同上 | §1 P0-2 |
| P0-3 | `_dossierSectionNum === 0` 的章节：整节用 `.tagline` hero 大色块样式 | `src/parse/markdown.ts` + `style.css`（确保 `.tagline` class 存在）| §1 P0-3 |
| P0-4 | TOC entry 去掉 inline HTML 标签后再 escape，避免 `&lt;em&gt;` 字面显示 | `src/parse/toc.ts` | §1 P0-4 |
| P0-5 | H1 按 ` — ` 拆分为 `<h1>` + `<p class="subtitle">` 两段 | `src/emit.ts` | §1 P0-5 |
| P0-6 | Frontmatter 空字段（空数组 / 空字符串 / undefined）从 meta-grid 隐藏 | `src/emit.ts` | §1 P0-6 |
| P1-1 | `badge` 加 `.ready` / `.implemented` modifier class + CSS 配色 | `src/emit.ts` + `style.css` | §2 P1-1 |

## 2. 严禁的事

| ❌ Do not | 因为 |
|---|---|
| 引入 admonition / directive 语法（`:::tagline` 等）| MVP-0 不引；推迟到 MVP-1 |
| 加新 runtime / dev dep | ADR D4-D7 锁定 |
| 改 ADR / spec 核心决策 | 等用户批准 |
| 删 v1 baseline `2026-05-17-agentstory-vision-spec.html` | 视觉对比基线 |
| 大范围重构 markdown.ts renderer | 仅做最小必要改动 |
| 扩范围去补 `.us-card` / `.scope-grid` / `.q-list` / `.ladder` / `.name-grid` | 这些 §6.3 显式推迟到 MVP-1 |

## 3. 验收（必须全部命中）

跑完所有命令并确认结果：

```bash
pnpm typecheck                           # 仍 clean
pnpm test                                 # 仍全绿（不要 skip 任何已 unskip 的测试）
pnpm render:self                          # 跑通
```

然后在浏览器打开 `docs/specs/2026-05-17-dossier-vision-spec.html`，**视觉对照** `docs/specs/2026-05-17-agentstory-vision-spec.html`（v1 手工版），逐项确认：

- [ ] H2 显示**只**一套编号：`§ 0  一句话` / `§ 1  为什么这个项目存在` / ... / `§ 17  下一步`（数字与源 markdown 一致）
- [ ] H3 显示如：`1.1  一个被忽视的现实` / `7.4  Dossier 数据模型实现要点` （**不要**再有"2.1 1.1"重复）
- [ ] §0 一句话章节：深靛蓝大色块 hero 样式（不是普通 blockquote）
- [ ] TOC 文本干净：**没有** `&lt;em&gt;` / `&lt;strong&gt;` 字面
- [ ] H1 简短："Dossier"（或类似短词），副标题 `<p class="subtitle">` 独立一行
- [ ] Frontmatter meta-grid 没有空白 row
- [ ] `<span class="badge ready">ready</span>` 视觉上和 `<span class="badge draft">draft</span>` **颜色不同**
- [ ] 文件 ≤ 60KB（轻微增长可接受，但不能超 100KB）

## 4. 提交时附带

1. 更新 `docs/changes/2026-05-18-dossier-mvp-0-impl-notes.md`（追加 "r1 视觉修复" 段，列出实际改动 + 任何偏离）
2. 你**不需要**写新的 review 文档 —— claude 会再 review 一遍
3. 如果发现修 P0-1 影响了 H1 渲染（因为现在 H1 也可能有 `1.` 前缀逻辑），处理后简短说明

## 5. 一处需要小心的边界

P0-1 推荐方案 B 是"沿用源里的 `N.` 数字作为 sec-num"。问题：

- `## 0. 一句话` → sec-num = "0"  ✓
- `## 6.5 Skill 调度接口（...）` 在 MVP-0 spec → sec-num = "6.5"  ✓ 也能处理
- `## 一句话`（无前缀）→ fallback 到自动编号 `§ N`  ✓

所以**正则匹配应足够宽松**：`^\s*(\d+(?:\.\d+)*)\.\s+(.+)$`。第一捕获组是 sec-num（"6.5"），第二捕获组是干净文本。

H3 同理：`### 1.1 一个被忽视的现实` → sub-num = "1.1"。
`### 一个被忽视的现实`（无前缀）→ fallback 到 `(secNum).(autoSubNum)`。

## 6. 时间线

| 时段 | 任务 |
|---|---|
| Day 1 上午 | P0-1 + P0-2（H2/H3 编号）+ 跑 render:self 看效果 |
| Day 1 下午 | P0-3（§0 hero）+ P0-4（TOC HTML 实体）+ P0-5（H1/subtitle 拆分）|
| Day 1 末 | P0-6（空字段）+ P1-1（badge ready 色）+ 视觉对比验收 |

预期：1 天内完成。

—

完成后 ping claude 做下一轮 review。
