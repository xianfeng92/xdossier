---
title: Dossier MVP-0 — Codex 实施交接 brief
status: archived
owner: claude
created: 2026-05-18
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
reviews: []
---

> 👋 这份文档是写给 **Codex** 看的实施手册。
> Claude 已搭好项目骨架（package.json / tsconfig / CLI / 类型 / skill registry / 测试 framework），并把所有需要 Codex 实现的位置都加了 `TODO (Codex):` 注释 + 反链到 spec 章节。
> **你的目标**：把这些 TODO 实现成可以通过验收的功能。**严格遵循 §6 的 ADR**，不要自由发挥技术选型。

## 1. 30 秒入门

```bash
cd /Users/xforg/AI_SPACE/dossier
pnpm install                                          # 已装好
pnpm dev --help                                        # ✅ 应输出 help
pnpm test                                              # ✅ 应 1 passed, 3 skipped
pnpm render:self                                       # ❌ 当前 throws TODO — 这是你要让它跑通的事
```

## 2. 项目是什么（一句话）

**Dossier 把 AI 给用户的 markdown 设计文档自动渲染成单文件 HTML**。MVP-0 只做单文档渲染，无 dossier 聚合、无 AI 调用。视觉基线 = `docs/specs/2026-05-17-agentstory-vision-spec.html`（v1 手工版）。

## 3. 必读 spec（按顺序，约 30 分钟）

| 文件 | 你最少要看的章节 |
|---|---|
| `docs/specs/2026-05-17-dossier-vision-spec.md` | §0 一句话 · §4 架构（仅理解上下文）|
| `docs/specs/2026-05-18-dossier-mvp-0-spec.md` | **§1 / §2 / §5 / §6 / §6.5 / §7 / §13 全读**，其余跳读 |
| `docs/specs/2026-05-17-agentstory-vision-spec.html` | 在浏览器打开，**这是视觉基线** |

**§2 的 14 个 ADR 是锁死的**。如果你想偏离任何一条，先在 PR 描述里说明并等用户确认；不要自己改 ADR 然后实施。

## 4. 已搭好的（不要改动）

| 文件 | 状态 | 说明 |
|---|---|---|
| `package.json` | ✅ 完整 | 不要改 deps（marked@18 + gray-matter；devDeps: tsx + typescript + vitest）|
| `tsconfig.json` | ✅ 完整 | NodeNext ESM，strict |
| `bin/dossier.js` | ✅ 完整 | 生产入口（路由到 `dist/cli.js`）|
| `src/cli.ts` | ✅ 完整 | argv 解析 / help / 错误码 / 调度 |
| `src/types.ts` | ✅ 完整 | 所有内部类型，**这是你的接口契约** |
| `src/skills/registry.ts` | ✅ 完整 | layer 1/2/3/6 已实现；4/5 已留 TODO 注释，MVP-0 不要做 |
| `src/skills/loader.ts` | ✅ 完整 | 扫 `src/skills/*/SKILL.md` |
| `src/skills/render-spec/SKILL.md` | ✅ 完整 | 元数据 + applies_to |
| `src/skills/render-spec/toc-script.js` | ✅ 完整 | 移植自 v1 |
| `tests/fixtures/minimal.md` | ✅ 完整 | 小 fixture |
| `tests/render-spec.test.ts` | 部分 | 1 smoke + 3 skipped；端到端 test un-skip 是验收一部分 |

## 5. 要你实现的（带文件 / 函数 / 验收）

每个文件都已经有 TODO 注释 + 反链到 spec 章节。实施顺序建议从上到下。

### 5.1 `src/parse/frontmatter.ts`

- 用 `gray-matter` parse YAML frontmatter
- 函数签名 `parseFrontmatter(md): ParsedFrontmatter`
- **没有 frontmatter 时**返回 `{ data: {}, content: <whole input> }`，**不要 throw**
- 损坏的 YAML throw with 清晰 message
- 单元测试：用 `tests/fixtures/minimal.md` + 一个 no-frontmatter 字符串

### 5.2 `src/parse/markdown.ts`

- 配 marked@18：`{ gfm: true, breaks: false, pedantic: false }`
- 两个函数：`parseMarkdownToTokens` / `renderTokensToHtml`
- 自定义 renderer：`<pre><code>` 必须带 `class="lang-<xxx>"`（基础高亮 CSS 在 style.css 里处理）
- 不要引入 highlight.js（ADR D9）

### 5.3 `src/parse/semantic.ts`

- 已有的辅助函数 `classifyCallout` / `looksLikeAsciiDiagram` 保留
- 实现 `applySemantic(tokens)`：
  - blockquote 第一段以 ⚠/📝/🎯 开头 → 给 token 加一个标记字段（如 `_dossierKind: "callout-warn"`），renderer 渲染成 `<div class="callout warn">`
  - `pre` token 内容含 box-drawing 字符 → 标记 `_dossierKind: "ascii-diagram"`，renderer 渲染成 `<pre class="ascii-diagram">`
  - h2 → 给 token 加 `_dossierSectionNum: N`，content renderer 用此把 h2 包成 `<section id="sN">`
  - h2/h3 → 加 `_dossierId: <slug>` 字段
- **不要新建 admonition 语法**，仅做启发

### 5.4 `src/parse/toc.ts`

- 实现 `extractToc(tokens): TocEntry[]`
- 只抓 h2 + h3（spec ADR D13）
- h2 → 根；h3 → 紧接前一个 h2 的 children
- slug: 用 h2 的 `_dossierSectionNum` 作为 id，h3 用 `sN-M`
- 中英混排：slug 用拼音或英文识别符即可；MVP-0 不强求

### 5.5 `src/render.ts`

- 主管线，编排 §5 step 2-8
- 调用 `parseFrontmatter` → `parseMarkdownToTokens` → `applySemantic` → `extractToc` → `renderTokensToHtml` → `emit`
- 返回 final HTML string

### 5.6 `src/emit.ts`

- 读 skill 目录的 `template.html` / `style.css` / `toc-script.js`
- 用字符串 replace 填充 placeholder（**不要引入 eta / ejs，ADR D7**）
- 占位 set 见 `src/emit.ts` 顶部注释和 spec §6.2
- 生成的 HTML 必须**无外部资源**：no `<link href="http`、no `<script src=`

### 5.7 `src/skills/render-spec/template.html` + `style.css`

- 从 `docs/specs/2026-05-17-agentstory-vision-spec.html` 移植
- **要覆盖的 class 列表**见 `style.css` 顶部注释
- **不要实现** us-grid / scope-grid / q-list / ladder / name-grid（spec §6.3 显式 fallback 给标准表格）

### 5.8 `tests/render-spec.test.ts`

- 把 3 个 `.skip` 去掉，让它们通过
- 端到端测试一旦绿，MVP-0 大体就完成了

## 6. 验收清单（你的"完成"定义）

按顺序勾，最后一项打勾 = MVP-0 完成：

- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` 全绿（4/4 passed，0 skipped）
- [ ] `pnpm render:self` 单次跑通，无 warning
- [ ] 输出 `docs/specs/2026-05-17-dossier-vision-spec.html` 文件存在
- [ ] 文件大小 < 100KB
- [ ] 浏览器打开后 17 个 section 全部渲染，左侧 TOC 可点击 + 滚动联动高亮
- [ ] Frontmatter 渲染为顶部 card；status badge 显示 `ready`
- [ ] 顶部 3 条 ⚠/📝 callout 用 callout 样式
- [ ] §4 / §7.5 的 ASCII 图块以 monospace 渲染，加边框
- [ ] 表格、代码块、行内 code 视觉清晰
- [ ] **关网络 + 双击 HTML** 能完美打开
- [ ] `pnpm render:self --verbose` 输出 `selected skill: render-spec (frontmatter-kind)`
- [ ] `pnpm dev render <file> --skill bogus-name` 退出码 3，不 fallback
- [ ] 写一份 `docs/changes/2026-MM-DD-dossier-mvp-0-impl-notes.md`，列你**实际遇到的偏差和决策**

## 7. 决不要做的事

| ❌ Do not | 因为 |
|---|---|
| 改 `package.json` 添加新 deps | ADR D4/D5/D6/D7 都锁定零额外 dep；不批准新依赖 |
| 用 commander / cac / yargs | ADR D6: 零依赖手写 argv |
| 用 eta / ejs / handlebars | ADR D7: 字符串 `{{PLACEHOLDER}}` 替换 |
| 引入 highlight.js | ADR D9: MVP-0 不做语法高亮 |
| 设计自定义 admonition (`:::callout`) 语法 | §1.2: MVP-0 推迟，MVP-1 才考虑 |
| 实现 dossier / 关系图 / 多文档 | 全部 MVP-1 |
| 引入任何 AI / LLM 调用 | MVP-2 才允许 |
| 改 ADR 没说一声 | 先在 PR 描述里说明 |
| 删掉 v1 手工版 `2026-05-17-agentstory-vision-spec.html` | 它是视觉基线，留作历史 |
| 修改本 brief / vision spec / mvp-0 spec 的核心决策 | 改 spec 必须经过 Claude / 用户确认 |

## 8. 你完成后的下一步

1. 把 `docs/changes/2026-MM-DD-dossier-mvp-0-impl-notes.md` 写好
2. 在 PR 描述里：
   - 列对 spec 的偏离（每条带理由）
   - 截图 vs v1 手工版 HTML 的对比（眼睛能看出差距的 5-10 处标注）
3. 把 MVP-0 spec frontmatter `status: ready` → `implemented`
4. 在 vision spec frontmatter `implements: []` 加入本文档路径

## 9. 风险点（按可能性排序）

| 风险 | Codex 容易掉的坑 | 提前规避 |
|---|---|---|
| 改 ADR | 觉得"用 commander 更优雅"就引了 | 不允许。spec §2 ADR 锁死 |
| 视觉精度不够 | 没有逐字段对照 v1 HTML | 浏览器开两个 tab 对比 |
| 单文件 HTML 含外链 | marked 默认配置某些情况产 `<a target=_blank>` 引外资源 | grep 检查 `http` / `cdn` / `<link.*href` |
| 决策抽取 | 想自己加 LLM 增强（MVP-2 才该做）| 不要做 |
| Section 包装 | marked tokens 中 h2 不天然包含后续 content；需要自己实现 grouping 逻辑 | 注意此点；可在 `applySemantic` 里完成 |
| TOC scroll-spy 失效 | template.html 没正确 inline toc-script.js | emit.ts 必须 inline 这个 js |
| 中文 slug | h2 标题是 "1. 为什么这个项目存在"，slug 含中文 | 用 `s1`, `s2` 数字 id，不要做拼音转换 |

## 10. 沟通约定

- 卡 > 30 分钟：在 PR 上留 comment 描述卡点，标注 `@claude-review`
- 想偏离 ADR：先在 PR 描述里说明，等批准
- 完成阶段：勾验收清单对应项

—

**完成第一个 dogfood 时刻的标志**：

`pnpm render:self` 输出的 HTML 视觉上能和 `docs/specs/2026-05-17-agentstory-vision-spec.html` 平起平坐，你能眼不眨地把生成版 commit 进 repo 替换手工版。
