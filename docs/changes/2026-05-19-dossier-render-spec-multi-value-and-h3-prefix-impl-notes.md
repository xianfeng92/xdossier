---
title: Dossier render-spec multi-value frontmatter + H3 sub-num parent prefix
status: implemented
owner: claude
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-18-dossier-mvp-0-spec.md
reviews:
  - docs/reviews/2026-05-19-dossier-cover-implementation-review.md
---

# Dossier render-spec multi-value frontmatter + H3 sub-num parent prefix

试点把 dossier `render` 应用到 `finetune-lab` 的真 spec
(`2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md`，342 行、7 条
`implements` + 2 条 `reviews`、H3 编号风格不统一) 时浮出的两个问题。dossier 自己的
spec 因为边数极少，从未触发。

## Implemented

### F9 — 数组型 frontmatter 渲染成 list，不再 join 成长字符串

- `src/emit.ts` 新增 `renderMetaItem` + `renderMetaValueHtml`，替换原来 `escapeHtml(formatMetaValue(...))` 路径。
- 数组值现在输出 `<ul class="meta-list"><li><code>path</code></li>…</ul>`；多于 1 项时父 `<div>` 加 `meta-item-wide` 类，CSS 让该行跨整个 meta-grid（`grid-column: 1 / -1`）。
- 单元素数组保持窄格，与简单字符串字段视觉一致。
- `src/skills/render-spec/style.css` 新增 `.meta-item-wide` + `.meta-value .meta-list` + `.meta-value .meta-list code` 样式：浅米底胶囊、flex wrap、不破坏 grid 布局。
- 暂不做超链接：emit 不知道 output 文件相对工作区的位置，链接需要先把 output 路径感知 thread 进 emit。留到下一轮（候选 F11）。

### F10 — H3 单数字编号自动补上 parent secNum

- `src/parse/semantic.ts` 抽出 `composeH3DisplayNum`，规则：
  - 显式 sub-num 含 `.`（如 `### 7.1 xxx`）→ 原样保留
  - 显式 sub-num 单数字（如 `### 1. xxx`）+ 父 §N 已知 → 输出 `${parentSectionNum}.${explicit}`
  - 无显式 sub-num → 原 fallback `${parentSectionNum}.${autoSubNum}`
- 同时修复 body H3 (`<span class="sub-num">8.1</span>`) 和 TOC sub-num，因为两者都消费同一个 `_dossierDisplayNum`。

## Verification

```
pnpm typecheck        → clean
pnpm test             → 2 files / 31 tests / all pass (新增 4 条回归: F9 3 条 + F10 2 条)
pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md
  → 24600 bytes（修复前 23946，+654 主要为 meta-list HTML/CSS）
```

浏览器视察 (Claude in Chrome):

- 第一屏 `implements` 7 条 path 改为 7 行可读 code 胶囊，`reviews` 同；frontmatter card 高度合理，§1 背景标题在屏内可见。
- TOC §8 子项 `8.1 / 8.2 / 8.3`、§9 子项 `9.1 / 9.2 / 9.3`（修复前是 bare `1 / 2 / 3`）。
- §7 子项保持 `7.1`–`7.6` 不变，未出现 `7.7.1` 这类 double-prefix。

## Not Changed

- `implements` / `reviews` 仍是 plain text，**不可点击**。链接化需要 emit 知道 output 路径相对工作区，本轮未做。
- `dossier.confidence` / `next_action` 仍是 MVP 粗启发式（F8）。
- 删除 artifact 报告、provenance/session adapter、watch、MCP server、LLM summary：依旧 out of scope。

## Note on test count

22 → 27 (前一轮 review fix) → 31 (本轮 F9+F10)。
