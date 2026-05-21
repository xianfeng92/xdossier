---
title: Dossier HTML design review — 当前 render-spec 与 AI enrich 版深度审查
status: ready
owner: codex
created: 2026-05-19
updated: 2026-05-19
reviews_target:
  - "docs/specs/2026-05-17-dossier-vision-spec.md"
  - "/tmp/dossier-vision-current.html"
  - "/tmp/dossier-vision-codex.html"
reviewer_role: html-design
verdict: STRONG_BASE_NEEDS_FIRST_SCREEN_IA_REWORK
---

## 0. 一句话

当前 HTML 已经不是普通 markdown dump，而是一套完整的本地阅读器：有 sticky TOC、阅读进度、frontmatter、callout、section brief、code copy 和单文件离线能力。

但作为 Dossier 的默认视觉产物，它的首屏还没有足够快地交付“我为什么要继续读”。现在首屏主要被 frontmatter 卡片、metadata 和早期 warning callout 占据，真正的 TLDR、章节价值、阅读路径和判断信息进入得偏晚。

## 1. Review 输入

本轮实际查看了两份产物：

- 基础版：`pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-vision-current.html --verbose`
- AI enrich 版：`pnpm dev enrich ... --provider codex` 后，再用 `--annotations /tmp/dossier-vision-codex.annotations.json` 渲染为 `/tmp/dossier-vision-codex.html`

关键页面信号：

- 文档：18 个 H2 section、23 个 H3、41 个 TOC links。
- enrich 版：18 个 `section-summary`、18 组 `section-key-points`、18 个 `section-reader-hint`。
- 桌面布局：左侧 TOC 260px，正文约 760px，整体 max-width 1240px。
- 首个 H2 在 enrich 版首屏中约落在 780px 之后，720px 高度视口中正文主要仍是 frontmatter 与 top callouts。

## 2. 做对的地方

### 2.1 阅读器骨架成立

`render-spec` 的基础设计是稳的：正文宽度、米白纸面、serif 标题、mono 元信息、浅色代码块和 callout 都比 markdown 直出更接近“可读档案”。

这意味着后续不需要推翻视觉系统，只需要重排信息层级。

### 2.2 AI enrich 的方向是对的

section summary 确实能提高扫读效率。每个 H2 后一句摘要，让读者不用进正文就能知道本节是否值得读，这是纯代码做不到的层级。

但当前 enrich 输出一次性渲染了 summary、key points、reader hint 三层。它把信息变结构化了，也把每节开头变重了。下一步应该控制密度，而不是继续往每节塞更多 AI 内容。

### 2.3 HTML-native 小交互已经有产品感

阅读进度条、移动端 TOC drawer、代码复制按钮、scroll-spy 都已经让页面区别于静态 markdown。它们不炫，但对长文阅读有实际帮助。

## 3. P0 问题

### P0-1 · 首屏没有把 Dossier 的价值判断前置

现象：首屏视觉中心是 frontmatter 卡片。它美观，但它回答的是“这份文档的元信息”，不是“我打开后 30 秒内该知道什么”。

当前顺序更像：

1. 文档类型
2. 标题和副标题
3. ready / reading time / owner / dates / reviews
4. relation details
5. warnings / changelog note
6. 然后才进入一句话和章节

建议改成：

1. 标题 + subtitle 保留，但压缩高度。
2. 在首屏直接放 `Verdict / TLDR / Next action` 三件套。
3. metadata 变成一行小 chip 或右侧/底部辅助信息。
4. warnings 合并成一条可折叠 `Document notes`，不要抢首屏叙事权。

这不是单纯“缩小 card”，而是把首屏从 metadata header 改成 executive brief。

### P0-2 · TOC 现在是完整目录，不是阅读导航

41 个 TOC links 对长文有用，但它在视觉上太平均。H2 和 H3 都平铺，读者第一眼看到的是一个很长的工程目录，而不是“我该怎么读”。

具体问题：

- 左侧区域从首屏开始就非常密，H3 把注意力切碎。
- 滚到长文中段时，当前 active item 可能已经跑出 TOC 可视区域，方向感下降。
- active 状态只改变 class，不会把侧栏滚动到当前项附近。

建议：

- 默认 TOC 只展开 H2，当前 H2 的 H3 才展开。
- active item 更新时，让 `aside.toc` 自动 `scrollIntoView({ block: "nearest" })` 到高亮项。
- 在顶部增加 2-3 个 reading mode 或 reading path，而不是把全部 section 当同权入口。

落点：`src/skills/render-spec/toc-script.js` 当前只在 `onScroll` 里 toggle `.active`，没有同步 TOC scroll。

### P0-3 · AI section brief 需要“降噪版”样式

enrich 版每个 H2 后现在依次出现：

- 一句 italic summary
- key points 列表
- `READ ...` reader hint

这在短文中很有帮助，但在 18 节长文中，每节都三层会形成新的扫读负担。它会把“AI 帮我理解”变成“AI 又加了一层摘要文档”。

建议：

- 默认展示 summary + 最多 2 条 key points。
- reader hint 改成更轻的 inline chip，例如 `Start here` / `Skip if familiar` / `Deep read`，不要每节都显示一整句。
- 对很短章节不显示 key points，只显示 summary。
- 对 reference/appendix 型章节允许 brief 折叠。

落点：`src/skills/render-spec/style.css` 的 `.section-summary`、`.section-key-points`、`.section-reader-hint` 已经有样式基础，下一步要做的是密度策略。

## 4. P1 问题

### P1-1 · Frontmatter 视觉好，但语义文本粘连

DOM 文本中 stat row 会读成：

`readyReading~24 minUpdated2026-05-18OwnerclaudeCreated2026-05-17Reviews1`

视觉上有间距，但复制、可访问性、搜索摘要都不够友好。

建议给 `.stat` 增加可读分隔，或给 label/value 使用更明确的 aria-label / visually hidden 分隔文本。

### P1-2 · 早期 callout 抢了正文开场

当前 top callouts 把“项目名占位”“vision spec 不是实施 spec”“v2 变更”等元说明放在正文之前。对维护者有用，对首次读者太早。

建议将它们合并为一个轻量 note strip，默认只露出最高优先级 warning，其余折叠。

### P1-3 · 缺少面向“理解”的 HTML 模块

当前 HTML 强在排版和导航，还缺少 Dossier 独有的理解模块：

- `Key decisions`
- `Open questions`
- `Reading path`
- `Glossary / tooltip`
- `Mini flow / relation diagram`

这些不必全部进入 MVP，但至少 `Key decisions` 和 `Reading path` 应该在 cover 或首屏 brief 中出现，否则 Dossier 和“漂亮 markdown renderer”的差异还不够直观。

## 5. 建议的下一步实现顺序

### Slice 1 · First-screen IA rework

目标：让读者打开 HTML 后 30 秒内知道结论、状态、下一步。

改动：

- 压缩 `.frontmatter` 高度和 margin。
- 新增 `.executive-brief` 或 `.doc-brief`，承载 TLDR、status、next action。
- top callouts 合并成 `.document-notes`，默认更小、更靠后。

### Slice 2 · TOC progressive disclosure

目标：让目录从“全量索引”变成“当前位置导航”。

改动：

- H3 默认折叠，只展开 active H2 下的 H3。
- active link 自动滚入侧栏可视区域。
- 侧栏顶部保留当前 section / progress 的轻量提示。

### Slice 3 · Section brief density rules

目标：保留 AI enrich 的理解价值，但降低长文噪声。

改动：

- summary 永远显示。
- key points 最多 2 条，短章节可省略。
- reader hint 变 chip 或只在重点章节显示。

### Slice 4 · Dossier-specific modules

目标：开始体现 Dossier 不是普通 renderer。

优先级：

1. reading path
2. key decisions
3. open questions
4. glossary tooltip
5. relation mini diagram

## 6. 总体判断

当前 HTML 的视觉底座是值得保留的，问题不是“丑”，而是“太像一份被认真排版的 spec”。Dossier 的产品承诺更高：它应该让 AI 产出的文档更可理解、更可判断、更可交接。

所以我建议下一步不先做更多装饰，也不先铺 diagram/glossary，而是先改首屏信息架构和 TOC。等首屏能完成 30 秒判断，AI enrich 的价值才会真正显出来。
