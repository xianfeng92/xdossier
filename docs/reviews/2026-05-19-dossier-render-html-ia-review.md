---
title: Dossier render-spec HTML IA and section brief review
status: ready
owner: claude
created: 2026-05-19
updated: 2026-05-19
reviews_target:
  - "docs/changes/2026-05-19-dossier-first-screen-toc-impl-notes.md"
  - "docs/changes/2026-05-19-dossier-section-brief-density-impl-notes.md"
  - "src/emit.ts"
  - "src/parse/markdown.ts"
  - "src/skills/render-spec/style.css"
  - "src/skills/render-spec/toc-script.js"
  - "tests/render-spec.test.ts"
reviewer_role: claude-code
verdict: SLICES_1_TO_3_LAND_NO_BLOCKERS_WITH_MINOR_FOLLOWUPS
---

## 0. 一句话

Slice 1 / 2 / 3 三块改动都按 design review 的方向落地，typecheck / 43 个测试 / 视觉验证全部通过，没有阻塞性问题。剩下几个边界问题（locale、regex 提取的耦合、Slice 3 未完成的两条子规则、scroll 行为细节）建议作为后续 follow-up，不需要在合入前修复。

## 1. 验证过的命令与产物

我在 `/Users/xforg/AI_SPACE/dossier` 直接独立跑了 handoff 列出的命令：

- `pnpm typecheck` ✅
- `pnpm test` ✅ 43 个测试全部通过（render-spec 21、cover 18、enrich 4）
- `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md -o /tmp/dossier-render-review-base.html --verbose` → 75 291 字节
- `pnpm dev render ... --annotations /tmp/dossier-vision-codex.annotations.json -o /tmp/dossier-render-review-enriched.html --verbose` → 88 085 字节

`/tmp/dossier-vision-codex.annotations.json` 已存在，直接复用。

静态结构核对（在 enriched 产物上）：

- `executive-brief` 标记出现 8 次（容器 + 标签 + body + CSS 选择器共 8 处，HTML 实例 1 处） ✓
- `class="tagline"` 在正文中出现次数 = 0（仅 CSS 中保留旧选择器） ✓
- `document-notes` 折叠块存在，`<summary>4 document notes</summary>`，body 内 4 条 callout ✓
- `data-progressive-toc` 出现 1 次，`toc-section` 出现 18 次，`toc-children` 出现 5 次（5 个 H2 有 H3 子节） ✓
- `section-summary` / `section-key-points` / `section-reader-chip` 各 18 处 ✓
- 18 组 key-points `<ul>` 全部恰好 2 个 `<li>`（用 awk 跑过所有 18 个组逐个数过） ✓

也就是说 Codex 自报的 18 / 18 / 18 / max=2 / 0 个超额的统计独立可复现。

## 2. 按严重度排序的发现

### 2.1 阻塞问题

**无。** 三块切片的核心行为都对：

- Slice 1：第一份 tagline 被提升到 header，原 body tagline 不再出现，前导 callout 折叠进 `<details class="document-notes">`，frontmatter stat row 仍然渲染、reading time 也基于已剔除的 body 计算。
- Slice 2：TOC 加上了 `data-progressive-toc` / `toc-section` / `toc-children`，CSS 默认隐藏 `toc-children`，只有 `.toc-section.is-current` 下的 H3 列表会展开；toc-script 同时 toggle H2 + H3 的 `.active` 并在 active 切换时调用 `scrollIntoView({ block: "nearest" })`。
- Slice 3：summary 永远渲染，key points 渲染层硬 cap = 2，reader hint 用 `section-reader-chip` 改成 inline-flex pill，并把 `READ` 视觉标签设为 `aria-hidden`，整段同时挂 `aria-label="Read: ..."` 给屏幕阅读器。

### 2.2 次要 / 风险（建议下一轮再处理，不需要现在改）

#### F1 · `document-notes` 与 `executive-brief` 的文本仍是英文 (i18n)

- 位置：`src/emit.ts:128`、`src/emit.ts:152`、`tests/render-spec.test.ts:161`
- 现象：模板 `<html lang="{{LANG}}">` 默认是 `zh-CN`（`src/emit.ts:49`），但 header 中的 `TL;DR`、`Document brief` 和 details 上的 `1 document note` / `N document notes` 全是英文。handoff 风险表里也明确列了这一项。
- 影响：可读性 ok（这些是 chrome 文本，不是正文），但和 spec 主体语言不一致，screen reader 在 zh-CN 上下文里也会读出英文短语。
- 建议：要么按 `LANG` 切换文本字典，要么先在 emit 里参数化 label，让后续 i18n 接得上。不阻塞当前合入。

#### F2 · `extractFirstTagline` / `extractTopDocumentNotes` 用正则切 HTML，隐式依赖 emit 不变量

- 位置：`src/emit.ts:118-162`
- 现象：两段提取都用非贪婪正则匹配 `<div class="tagline">([\s\S]*?)</div>` 和 `/<div class="callout [^"]+">[\s\S]*?<\/div>/g`。当前 `src/parse/markdown.ts` 里 tagline 和 callout 的 HTML 实际上不含嵌套 `<div>` 或字面 `</div>`，所以 OK。
- 风险：marked 没有禁用 raw HTML（`markedOptions` 没有 `sanitize`），如果用户在 spec 里手写 raw `<div>` 或 `</div>` 在 tagline / 前导 callout 内，提取会提前截断，executive brief 或 document notes 就会丢内容、并把残留 HTML 留在 body。
- 建议：
  1. 写一个回归测试覆盖「tagline 内含 raw `</div>`」「callout 内含 raw `<div>`」这两种边界，确认行为可预期；
  2. 或在 emitter 把 tagline / callout 包出一层独有标记（例如 `data-promotable="brief"`），让正则可以 anchor 在属性上而不是 `class`。这两条都不紧急。

#### F3 · Slice 3 落地了 design review 中 4 条子规则里的 2 条

- 位置：`docs/reviews/2026-05-19-dossier-html-design-review.md:107-110`
- 已完成：
  - summary 永远显示 ✓
  - key points 限制 2 条 ✓
  - reader hint chip 化 ✓
- 未完成（design review 里写了，但 impl-notes 没有承诺要做）：
  - 「对很短章节不显示 key points，只显示 summary」
  - 「对 reference / appendix 型章节允许 brief 折叠」
- 影响：当前实现仍然在每节都贴 summary + 2 条 key points + chip。在 18 节长文中视觉上比改造前轻很多，但还没做到「短章节降级到只显示 summary」。
- 建议：要么把这两条标记成 Slice 3.5 留作 follow-up，要么在 review 文档里更新「Slice 3 实际完成范围」让交接物对账更清楚。

#### F4 · 渲染层硬 `slice(0, 2)` 会静默丢弃 enrich 数据

- 位置：`src/parse/markdown.ts:52`
- 现象：annotation 文件里给了 3 条 key points，渲染时只输出前两条，第三条没有任何痕迹（HTML 里既没注释也没 collapsed details）。
- 影响：渲染是 deterministic 没问题，但 enrich 输出的信息被静默 swallow，下游 reviewer 看 HTML 时不知道 enrich 还有更多 key points 存在。
- 建议（任选其一）：
  1. 把 cap 上移到 enrich 阶段，让 generator 决定挑哪 2 条（design review 的本意更接近这一种）；
  2. 渲染层保留 cap，但把丢弃项作为 HTML 注释或 `<details>` 输出，便于 dogfood 时审视 enrich 质量。

#### F5 · `scrollIntoView` 受全局 `html { scroll-behavior: smooth }` 影响

- 位置：`src/skills/render-spec/toc-script.js:44`、`src/skills/render-spec/style.css:23`
- 现象：toc-script 调用 `activeLink?.scrollIntoView({ block: "nearest", inline: "nearest" })`，没有覆写 `behavior`。global CSS 把 `html` 设成 `scroll-behavior: smooth`，所以 TOC 侧栏会平滑滚动。
- 影响：`block: "nearest"` 已经保证只在 active link 出框时才滚，所以 jitter 风险很低。但平滑动画在「H2 之间快速切换」时会有视觉位移。验证下来不刺眼，可以保留。
- 建议（可选）：传 `behavior: "instant"` 或在 aside 上局部覆写 `scroll-behavior: auto`，让 TOC 滚动是瞬时的、把 smooth 留给主文档。

#### F6 · 首次加载带 hash 时 active 状态短暂不准

- 位置：`src/skills/render-spec/toc-script.js:57`
- 现象：脚本在末尾立即 `onScroll()` 一次，但带 hash 的浏览器 native 滚动尚未发生，首帧 active 标记是文档开头的 section。等浏览器执行 hash 滚动后，scroll 事件触发，active 才会更新到目标 section。
- 影响：极短暂的视觉抖动，肉眼几乎不可见。
- 建议：可在 `onScroll()` 之外加 `requestAnimationFrame(onScroll)` 或对 `hashchange`/`window.load` 再触发一次，确保 hash 落点后立刻同步 active。

#### F7 · `parentH2Id` 依赖 ID 形如 `s<n>` / `s<n>-<m>`

- 位置：`src/skills/render-spec/toc-script.js:20-23`
- 现象：用 `id.indexOf("-")` 切首段当作 H2 id。当前 `src/parse/semantic.ts:31,41` 的 ID 生成器正好满足这个不变量。
- 风险：如果 ID 生成策略改成 kebab-case（例如直接用 heading 文本生成 slug），`parentH2Id("user-research")` 会错把 `user` 当成 H2 id 然后查不到链接。
- 建议：在 `parentH2Id` 上方加一行注释，写明它绑定在 `semantic.ts` 的 ID 约定（`s<n>` / `s<n>-<m>`）上，便于将来变更时连带改这里。

#### F8 · `reading-time` 排除了 executive brief 和 document notes（行为正确但和 spec 措辞略有 gap）

- 位置：`src/emit.ts:45-46`
- 现象：reading time 用 `preparedContent.contentHtml`，此时 tagline 已被提到 header、前导 callouts 已经折叠到 document-notes。两段都不在 body 字节内，所以阅读时间相当于「body 去掉 TLDR 和说明」。
- 与 handoff 期望一致性：handoff 写的是「reading-time should use the prepared body content without double-counting the promoted tagline」。当前实现等价于「reading-time 完全不计入被提取的部分」，更严格而不是更松。
- 建议：可在 `estimateReadingMinutes` 上加一行注释，明确「故意不计 executive brief 和 collapsed notes，因为它们是导读层，不算作正文阅读量」。不需要改逻辑。

## 3. 风险/边界场景的独立核验

handoff 的 review risks 我逐条核了：

- **多组顶部 callout / 没有 §0 tagline / 顶部出现非 tagline blockquote**：
  - 多组 callout：当前实现把 callouts 收成一个 details，summary 写 `N document notes`，body 用 `\n` 串联，工作正确。
  - 无 §0：`semantic.ts:53` 只在 `currentSectionDisplayNum === "0"` 时打 tagline kind，所以非 §0 spec 不会产生 executive brief，`executiveBriefHtml` 为空字符串，header 优雅退化。
  - 非 tagline blockquote 在 §0 之前：`extractTopDocumentNotes` 只匹配 `<div class="callout ...">`，普通 blockquote 不会被搬走，会作为 `remainingLeadHtml` 留在 sections 之前的正文区。这个分支没测试，但行为是「不破坏」。

- **H3 active 也标记父 H2**：`toc-script.js:33` 的 `id === activeId || (parentId !== null && id === parentId)` 确实同时把 H2 link 和 H3 link 一起标 active，并把 `.toc-section.is-current` 切到正确的父节点。✓

- **mobile CSS 是否会误伤普通 section list**：`@media (max-width: 720px)` 只命中 `.section-key-points` 这个 annotation 专用类（`src/parse/markdown.ts:55` 才会输出），普通 `<ul>` 不会被隐藏。✓

- **chip 在密集章节是否过吵**：chip 用 `display: inline-flex` + 圆角边框 + 单行 mono `READ` 标签 + 11.5px 字号，比之前那一整行 mono 文本明显轻量。在 18 节文档里翻读，视觉负担降到「每节后跟一个药丸」，可以接受。

## 4. 总体判断

合入 OK。Slice 1 / 2 / 3 的实现都和 design review 的方向一致，测试覆盖到了 executive brief 提升、document notes 折叠、progressive TOC markup、scroll-spy 父子高亮、key points cap = 2、reader chip 标签与 aria 属性、mobile CSS 等关键不变量。

建议在下一轮把 F1（i18n 标签）、F3 / F4（Slice 3 余下两条子规则 + key points cap 的归属）、F2（regex 提取边界回归测试）三件事打包做掉，把当前已经成型的「首屏 IA + 渐进 TOC + 降噪 brief」往「Dossier-specific 模块」推进，对应 design review 的 Slice 4。
