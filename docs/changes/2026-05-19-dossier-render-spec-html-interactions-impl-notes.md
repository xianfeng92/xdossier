---
title: Dossier render-spec polish + HTML-native interactions
status: implemented
owner: claude
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-18-dossier-mvp-0-spec.md
reviews:
  - docs/reviews/2026-05-19-dossier-cover-implementation-review.md
---

# Dossier render-spec polish + HTML-native interactions

承接 finetune-lab roadmap 复盘的反馈："目前看起来感觉就是 md 的 html 版本，
完全没有将 html 的核心元素：如层叠样式表、svg 等放入"。
这一轮把那 5 条 polish 做掉的同时，加 2 个真正"页面而非文档"的 HTML-native 元素。

## Implemented

### D6 — TOC scroll-spy 扩展到 H3

`toc-script.js` 把 observation 从 `section[id]` 扩到 `[...section[id], ...main h3[id]]`。
H3 被激活时，从 `s7-3 → s7` 派生父 H2 id 并同时高亮，让 sticky TOC 在子节滚动时
不再"母节亮、子节失语"。

### D9 — 自定义 list bullets

- ul: terracotta 短横（`width: 8px; height: 1.5px`），通过 `li::before` 实现
- ol: 自维护 counter，前缀 mono terracotta `N.`，与设计语言一致
- 嵌套 ol 单独 counter（`dossier-ol-2`），避免数字 reset 失败
- 作用域 `main section ul/ol`，避免污染 TOC 和 frontmatter relation-list

### D11 — Reading time stat

`emit.ts::estimateReadingMinutes(html)`：
- 剥 `<pre>`/`<code>`/HTML 标签/HTML 实体 → 纯文本
- 中文 CJK 字符按 400 cpm，其他按 5 chars/word × 220 wpm
- `Math.max(1, round(minutes))` → `~N min` 加入 stat-row 第二位
- roadmap (~2700 中文字) → `~8 min`，与人类直觉吻合

### D12 — Mobile drawer TOC

- 桌面（>1024px）：sticky 左栏（不变）
- 移动（≤1024px）：
  - 浮动 `☰` 按钮固定左上（SVG 三横线）
  - 点击 → TOC 从左侧 slide-in，黑色 32% 遮罩盖正文
  - 点遮罩 / `Escape` / 点击 TOC 内任意链接 → close
  - `body[data-toc-open] { overflow: hidden }` 防底层滚动穿透
  - 进入/退出 220ms cubic-bezier 缓动

### T2-6 — H2 双列 grid

H2 从 `display: flex` 改为 `display: grid; grid-template-columns: 52px 1fr`。
sec-num 固定 52px 列、`text-align: center`，所有节编号对齐到同一垂直锚线，
对位 thariqs/html-effectiveness `01 Milestones` 的列布局。

## HTML-native bonus (新增的非 polish 项)

### 顶部阅读进度条

```html
<div class="reading-progress" aria-hidden="true">
  <div class="reading-progress-fill"></div>
</div>
```

```js
const max = h.scrollHeight - h.clientHeight;
progressFill.style.width = (h.scrollTop / max * 100).toFixed(2) + "%";
```

固定顶端 3px terracotta 细条，跟随滚动填充。低饱度米色底，accent 实色 fill。
是"这是网页不是 PDF"的第一信号。

### 代码块 copy 按钮

每个 `main pre` 在 `DOMContentLoaded` 时注入：

- 右上角 30×30 按钮，hover 时 opacity 0 → 1
- SVG clipboard icon（feather 风格 stroke）
- 点击 → `navigator.clipboard.writeText(code.textContent)` → 图标变 checkmark 1.4s → 恢复
- `.copied` 状态用 `--ok` 绿色，clear 视觉反馈

也是 HTML-native 的体现：脱离 markdown 静态文本，进入"可交互界面"。

## Verification

```
pnpm typecheck       → clean
pnpm test            → 34 tests / all pass（新增 3 条覆盖 reading-progress / scroll-spy 扩展 / reading-time）
pnpm dev render <roadmap>.md
  → 33394 bytes（前 26293，+7101 主要为 toc-script.js 扩展 + CSS 新规则）
```

视觉抓拍（Claude in Chrome, 1538×784 desktop）：

| | 前 | 后 |
|---|---|---|
| 第一屏 stat-row | `IMPLEMENTED · UPDATED · OWNER · IMPLEMENTS 7 · REVIEWS 2` | 同上 + 第二位 `READING ~8 min` |
| 顶部 3px 进度条 | 无 | 米色底 + terracotta fill，随滚动增长 |
| H2 sec-num | flex baseline，宽度跟随内容 | grid 52px 固定列，垂直对齐严格 |
| TOC scroll-spy | 只 H2 高亮 | H2 + H3 双高亮（H3 active 时父 H2 也 active） |
| ul bullet | 浏览器默认 `•` 黑点 | 8×1.5px terracotta 短横 |
| ol number | 浏览器默认黑色 `1.` | mono terracotta `1.` |
| 移动端 TOC | static 占据顶部 5-8 屏 | drawer 默认隐藏，`☰` 按钮触发 slide-in + 遮罩 |
| 代码块 | 无交互 | hover 显示 copy 按钮，点击复制 + checkmark 反馈 |

## Not Changed

- T3 系列（自动 stat 卡片 / prompt block / SVG 图表 / mermaid）：需要 frontmatter 扩展或 LLM，下个迭代
- D9 的更激进版本（用 inline SVG 替代 ::before）：当前 CSS 实现已经足够细腻，下次再升
- 链接化 implements/reviews path（前序 F11）：需要 output path plumbing，仍在 backlog
- H2 / H3 hover 显示锚链接按钮：留到下轮

## Test count

22 → 27 → 31 → 34（本轮 +3 回归: reading-progress markup / script extensions / reading-time stat）
