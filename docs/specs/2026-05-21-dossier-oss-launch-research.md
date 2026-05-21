---
title: Dossier OSS Launch Research — 命名、竞品、传播路径
status: ready
kind: research
owner: claude
created: 2026-05-21
updated: 2026-05-21
implements: []
reviews: []
---

> 📝 这份是为"把 dossier 推成热门 AI 开源项目"做的调研合集 + 资产草稿索引。子草稿见末尾"产出清单"。
> 🎯 三句话结论：
> 1. 推荐名字 **`specfold`**（npm 可用、连接到差异化、未来 SEO 友好），替代 `@xforg/dossier`
> 2. 你的 README 第一段必须卖**教学层 + 档案视角**，而不是"auto-render markdown to HTML"
> 3. Launch 日期定 Tue/Thu 8-10am ET，48h 内同步打 HN + Reddit + Twitter，否则 spike 消散

## 1. npm 名字可用性矩阵

跑了 18 个候选，可用 11 个：

| 名字 | 状态 | 备注 |
|---|---|---|
| `dossier` | ❌ 占用 | "manage application statistics using redis" |
| `dossierjs` | ❌ 占用 | 空 description |
| `speclens` | ❌ 占用 | **危险**：另一个 LLM dev tool，定位极近 |
| `primer` | ❌ 占用 | GitHub Primer design system，无法竞争 |
| `folio` | ❌ 占用 | 测试框架 |
| `tome` | ❌ 占用 | wiki 工具 |
| **`specfold`** | ✅ **可用** | spec + 折叠 = progressive disclosure 隐喻 |
| `specview` | ✅ 可用 | 直白，brand 力弱 |
| `specdeck` | ✅ 可用 | 偏演讲 metaphor，misleading |
| `tomeflow` | ✅ 可用 | book + flow，太抽象 |
| `paperlens` | ✅ 可用 | reader 三档 = 三种 lens 隐喻 |
| `inkfold` | ✅ 可用 | 优美但抽象，不解释功能 |
| `aidocs` | ✅ 可用 | 描述性、SEO 友好、不像产品名 |
| `agentdocs` | ✅ 可用 | 描述性、平庸 |
| `aispec` | ✅ 可用 | 短但平庸 |
| `archivedoc` | ✅ 可用 | 单复数歧义 |
| `dossiery` | ✅ 可用 | 加 y 改造，不优雅 |
| `ai-archive` | ✅ 可用 | 带连字符，输入不便 |

## 2. 竞品 deep-dive

调研 4 个直接相关项目（按 stars 从大到小）：

### `nexu-io/open-design` — 48.6k stars
- **Hook**: "Local-first, open-source alternative to Claude Design"
- **定位**：本地 Claude Design 替代品，**设计向**（71 brand-grade systems）
- **核心差异**：和 dossier 不在同赛道（他们做 UI/UX 设计输出，dossier 做技术档案）
- **dossier 不该硬碰**：他们 48.6k stars 是结构性领先，体量不在一个量级
- **dossier 可学**：desktop app + Docker + source + Nix flake **多种安装方式**

### `nexu-io/html-anything` — 4.4k stars
- **Hook**: "The agentic HTML editor — your local AI agent writes the HTML, you ship it."
- **定位**：75 skills × 9 surfaces（杂志/演讲/海报/XHS/tweet/prototype/data report）
- **缺口（dossier 可独占）**：
  - 无"档案视角"（多文档关系图）
  - 无 reader-tiered HTML
  - skill 视觉浮华但**spec/ADR 类**结构语义不强
- **安装**：`git clone + pnpm install + pnpm -F @html-anything/next dev` —— 笨重，dossier 用 `npx` 可击败
- **live demo**: open-design.ai/html-anything/ —— **dossier 必须也搞一个**

### `markdown-viewer/skills` — 2.5k stars
- **Hook**: "Opinionated skills for AI coding agents to create stunning diagrams in Markdown"
- **定位**：给 AI agent 用的 markdown 渲染 skill 集合
- **安装亮点**：`npx skills add markdown-viewer/skills` —— **零工程友好**
- **缺口**：没有 live demo、没有 release，刚起步
- **dossier 可学**：`npx <project> add` 这种零安装模式

### `jlevy/markform` — 57 stars
- **Hook**: "Structured Markdown documents for agents and humans"
- **定位**：让 markdown 文档对 agent 有 semantic API
- **安装**: `npm install -g markform`
- **dossier 可学**：标准 npm 全局安装就是 OSS 标准入口
- **教训**：57 stars 说明"agent + markdown" 不会自动火，**positioning + demo 才是命门**

## 3. dossier 的位置（差异化矩阵）

```
                 单文档     多文档关系图    教学/读者分档
html-anything    ✅ skills    ❌            ❌
open-design      ✅ design    ❌            ❌
mv/skills        ✅ md        ❌            ❌
markform         ✅ form      ❌            ❌
dossier (you)    ✅           ⏳ MVP-1      ✅ P0-P2 已实现 ← 独占
```

**结论**：dossier 应该把 README 第一屏改成卖"教学层"——这是**唯一独占的能力**，立刻可见可演示。多文档关系图作为 roadmap 提及。

## 4. 2024-2025 Viral Launch 战术总结

来源：[Cline launch HN](https://news.ycombinator.com/item?id=43105538)、[AFFiNE 60K stars 复盘](https://dev.to/iris1031/how-to-get-more-github-stars-the-definitive-guide-33k-stars-case-study-2kjo)、[arXiv 2511.04453 HN diffusion 数据](https://arxiv.org/abs/2511.04453)、[markepear dev tool HN launch](https://www.markepear.dev/blog/dev-tool-hacker-news-launch)

### 关键数据点
- **HN 头版 Show HN**：24h 内 500-2,000 stars（dev tool 类）
- **平均增长**（来自 138 个项目分析）：24h +121, 48h +189, 1 周 +289
- **timing > tag**：`Show HN:` 前缀控制其他变量后**无显著优势**
- **最优 launch 窗口**：US Eastern Tue-Thu 8-10am
- **48h 渠道同步效应**：HN + Reddit + Twitter + Product Hunt 同窗口推 → 触发 GitHub Trending → 数千开发者从 Trending 来

### 大项目案例
- **Aider**：40K+ stars，每周处理 15B tokens
- **Cline**：30K stars（2025 年 2 月），VS Code 扩展形态
- **AFFiNE**：60K+ stars，2026 复盘强调"content cadence > one-off launch"

### 战术清单（按优先级）
1. **GIF/Video > 截图 > 文字**：README 第一屏必须有 30s 录屏
2. **Live demo URL** 必备（GitHub Pages 托管几份杀手 dossier）
3. **`npx` 一键运行**：3 秒入门 > 30 秒解释
4. **跨平台 48h 同步**：单点 launch spike 一周就散，多渠道叠加才能进 Trending
5. **Post-launch cadence**：blog/tweet/release 每周 1 条，否则 flat-line
6. **借势 Thariq 的 HTML > Markdown 论点**：在 Twitter thread 里 quote 他原文 → 顺风借势

## 5. 命名推荐：`specfold`

**主推**：`specfold`

理由：
1. **npm 可用** ✓
2. **隐喻差异化**：'fold' 字面 = 折叠 = progressive disclosure = reader_profile 三档折叠。教学层是你的护城河，名字应该指向它
3. **域指向**：spec = 你目标的核心文档类型（spec/ADR/design/change-note）
4. **动词化**：'specfold your specs' / 'specfold render foo.md' 读得通
5. **短**：8 字符，npx 友好
6. **SEO**：'specfold' 这个组合在搜索引擎几乎零干扰

**备选 1**：`paperlens` —— 如果偏好诗意命名，paperlens 也连得上 reader-tiered（每档 = 一个 lens），但 brand 不如 specfold 干净

**备选 2**：`aidocs` —— 如果优先 SEO + 易理解，可以选这个；但 brand 力弱、和"ai docs" 通用词难区分

**坚决不推**：
- `speclens`（被占且是 LLM dev tool，定位冲突）
- `primer`（被 GitHub 占了）
- 任何带 `-ai` 后缀（落入"AI 时代每个工具都加 ai" 同质化陷阱）

## 6. GitHub 仓库位置

**推荐**：`github.com/xforg/specfold`（你的个人账号）

理由：
- 不需要新建 org（org 名字若和 npm 不一致，反而碎片化）
- 后续做大可一键 transfer 到新 org
- 你 git config 应该已经是 xforg

**不推荐**：捐给 nexu-io 形成项目家族——会失去主导权，且他们的赛道（设计向）和你（技术档案 + 教学层）不重合

## 7. 关键 push-back

1. **现在 launch 还太早**：没 npx、没 GIF、没 live demo、MVP-1 多文档关系图未实现。强行 launch 浪费 HN 头版机会
2. **改名有成本**：所有 docs/specs 自我引用要扫一遍。但比 `@xforg/dossier` scope 包对外感强 10 倍，值得
3. **不要追求"all-in-one"**：dossier 现在已经够多功能（reader_profile + content_mode + 14 种语义块 + 4 视觉强化）。launch 前**砍掉边缘功能、把 3 个核心讲透**

## 8. 建议下一步

按 W1 完整序列：

| 步 | 任务 | 谁干 |
|---|---|---|
| W1.1 | 拍板命名（默认 specfold）+ 改 package.json name | 你确认 → 我执行 |
| W1.2 | 全局改名（docs/specs/、README、bin、CLI 帮助文字、symlink）| 我或 codex |
| W1.3 | 替换 README.md 为 README v2 草稿（见产出清单）| 我 |
| W1.4 | 推 GitHub（github.com/xforg/specfold）| 你（创 repo）+ 我（push） |
| W1.5 | 准备 npm publish（去 private、prepublishOnly 链 build、`npx specfold` 入口验证）| 我 |
| W1.6 | 落地 OSS scaffold 到 .github/、CONTRIBUTING.md 等正式位置 | 我 |

## 产出清单（子文件）

- README v2 草稿：[`docs/specs/2026-05-21-dossier-readme-v2-draft.md`](./2026-05-21-dossier-readme-v2-draft.md)
- OSS scaffold 目录：[`docs/specs/oss-scaffold/`](./oss-scaffold/)
  - `CONTRIBUTING.md` — 开发流程、PR/commit 风格、test 要求、加 skill 指南
  - `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
  - `SECURITY.md` — 报告流程（dev tool，无 secret 处理）
  - `ci.yml` — push/PR 时跑 typecheck + test，node 20+22 matrix
  - `ISSUE_TEMPLATE_bug.yml` + `ISSUE_TEMPLATE_feature.yml`

## 参考 Sources

竞品：
- [nexu-io/html-anything 4.4k stars](https://github.com/nexu-io/html-anything)
- [nexu-io/open-design 48.6k stars](https://github.com/nexu-io/open-design)
- [markdown-viewer/skills 2.5k stars](https://github.com/markdown-viewer/skills)
- [jlevy/markform 57 stars](https://github.com/jlevy/markform)

战术：
- [Show HN: Cline launch thread](https://news.ycombinator.com/item?id=43105538)
- [Launch-Day Diffusion arXiv 2511.04453](https://arxiv.org/abs/2511.04453)
- [How to launch a dev tool on Hacker News (markepear)](https://www.markepear.dev/blog/dev-tool-hacker-news-launch)
- [AFFiNE 60K stars 复盘](https://dev.to/iris1031/how-to-get-more-github-stars-the-definitive-guide-33k-stars-case-study-2kjo)
- [Thariq HTML vs Markdown 论点](https://pasqualepillitteri.it/en/news/2243/html-vs-markdown-claude-code-thariq-anthropic)
