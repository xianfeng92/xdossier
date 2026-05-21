# `xdossier`

<p align="right">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

> **把 AI 生成的 spec / ADR / 设计文档渲染成一份新人、同行、资深 reviewer 都能读的 HTML。**
>
> 三档阅读模式 · 术语弹窗 · 学习检查点 · 多文档档案 · 零依赖 · 单文件 HTML。

<p align="center">
  <a href="https://xianfeng92.github.io/xdossier/demo/pedagogy.html">
    <img src="https://img.shields.io/badge/在线 Demo-点击体验阅读档位切换-1e3a8a?style=for-the-badge" alt="在线 Demo">
  </a>
</p>

<p align="center">
  <a href="https://github.com/xianfeng92/xdossier/actions/workflows/ci.yml">
    <img src="https://github.com/xianfeng92/xdossier/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://github.com/xianfeng92/xdossier">
    <img src="https://img.shields.io/badge/npm-pending-92400e" alt="npm 待发布">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-1e3a8a" alt="Apache 2.0">
  </a>
</p>

🌐 **不用安装就能体验**：[xianfeng92.github.io/xdossier](https://xianfeng92.github.io/xdossier/) —— 在 HTML 顶部切换「零基础 / 系统化 / 速查」三档阅读模式。

<p align="center">
  <a href="https://xianfeng92.github.io/xdossier/demo/pedagogy.html">
    <img src="docs/assets/reader-toggle-hero.png" alt="xdossier 阅读档位切换示例" width="720">
  </a>
  <br>
  <em>同一份 HTML，三种读者档位。点击查看在线 demo。</em>
</p>

## 这玩意儿为什么存在

你和 AI agent 一起会生产几十份 markdown：spec、ADR、设计稿、变更说明。每一份都是 **800+ 行的密文**：

- 新人看不懂上下文
- 老兵不耐烦读完决策摘要前的铺垫
- 任何人想在文档之间跳转、对照都很痛

`xdossier` 把它们渲染成**带教学层的 HTML 档案**。读者自己挑档位，同一份单文件 HTML 自适应。

> 💡 **想直观感受差别？** 打开 [pedagogy demo](https://xianfeng92.github.io/xdossier/demo/pedagogy.html) 两个标签页，一个切到「零基础」，一个切到「速查」。同一份 HTML，空间结构会变。

## 你拿到的能力

- **三档阅读模式**（零基础 / 系统化 / 速查）—— 在 HTML 里切换，不重渲染、不重构建。术语弹窗、前置知识卡、学习检查点、类比等，会按档位自动出现/隐藏。
- **内容类型自动识别** —— tutorial / concept / reference / course，启发式判断，零 token 成本。
- **单文件 HTML** —— 双击即开、可离线、不依赖 CDN。
- **Spec 语义块** —— 风险登记、决策矩阵、原则栅格、scope 边界、术语表、结构图，从 markdown 自动渲染，不用手写 HTML。
- **内联 SVG 图** —— ASCII 层级框图 → 带箭头的真 SVG。
- **抽栏、章节封面、对照卡** —— 让 1000 行 spec 不像砖墙。

🛠 **MVP-1 在路上**：多文档 **dossier 视图** —— 通过 frontmatter 的 `implements:` / `reviews:` 自动链路相关 spec，渲染出一张可导航的关系图作为档案封面。

## 快速开始

```bash
# npm 还没发，先从 GitHub 直跑：
npx github:xianfeng92/xdossier render docs/specs/my-spec.md

# 或本地 clone：
git clone https://github.com/xianfeng92/xdossier.git
cd xdossier
pnpm install
pnpm dev render docs/specs/my-spec.md
```

打开生成的 `.html`，点顶部档位按钮就能切。

## 站在谁的肩膀上

- [thariqs/html-effectiveness](https://thariqs.github.io/html-effectiveness/) —— 「AI 输出应该用 HTML 而非 Markdown」的原始论点。
- [nexu-io/html-anything](https://github.com/nexu-io/html-anything) —— SKILL.md 协议的先驱实现。

`xdossier` 在它们的基础上往前走一步：**artifact-first**（不是 on-demand），**pedagogy-first**（不只是视觉），**multi-document**（不只是单文件）。

## 横向对比

| | `xdossier` | html-anything | markdown-viewer/skills | Marky / MacMD |
|---|---|---|---|---|
| 三档阅读模式 | ✅ | ❌ | ❌ | ❌ |
| 术语弹窗 / 术语表 | ✅ | ❌ | ❌ | ❌ |
| 多文档关系图 | ⏳ MVP-1 | ❌ | ❌ | ❌ |
| 单文件离线 HTML | ✅ | ✅ | partial | partial |
| Spec/ADR 语义块 | ✅ | ❌ | partial | ❌ |
| 视觉产物（slides/海报/社媒） | ❌ | ✅ | partial | ❌ |
| Markdown 实时预览 | ❌ | ❌ | ❌ | ✅ |

我们不做通用「AI 转 HTML」工具。**只把一件事做好**：让非高阶工程师也能读懂的技术文档档案。

## 工作流

```
markdown.md  →  enrich（启发式 + 可选 LLM）  →  render-spec skill  →  单文件 HTML
       （你的 AI 写）           （annotations.json）        （模板 + CSS）          （分享 / 提交）
```

三层：
1. **Discover** —— 读 frontmatter、识别内容类型、抽 section 结构。
2. **Enrich** —— 生成教学注释（前置 / checkpoint / 类比），用 scaffold（零 token）或 codex / claude provider。
3. **Render** —— 输出单文件 HTML，CSS / JS 全内联，零外部资源。

## 使用场景

- AI 写的 spec → 设计感够好的 HTML 给团队。
- 设计文档档案：实习生周一能读懂，principal 周二能 5 分钟扫完。
- 多版本简历档案：5 版简历 + 改动注释，按读者档位呈现给不同 HR。
- 开源项目文档，不需要 markdown 预览插件就能体面阅读。

## 进度

| 组件 | 状态 |
|---|---|
| 单文档渲染（MVP-0） | ✅ 已实现 |
| Pedagogy 层（P0/P1/P2） | ✅ 已实现 |
| 多文档 dossier 视图（MVP-1） | ⏳ 设计中 |
| MCP server（MVP-2） | 📝 已 spec |
| Claude Code session adapter | 📝 已 spec |

## 贡献

欢迎新 skill、新 pedagogy 元素、新渲染目标。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

想找个入手任务？看一眼 [`good first issue`](https://github.com/xianfeng92/xdossier/issues?q=is%3Aopen+label%3A%22good+first+issue%22) 标签。

## License

Apache-2.0 —— 见 [LICENSE](./LICENSE)。

## 灵感来源

[Thariq Shihipar](https://thariqs.github.io/html-effectiveness/) 在 2026 年 5 月指出：Claude Code 团队已经不再用 Markdown 写内部文档，而是直接写 HTML。Anthropic 给的理由是 —— HTML 自带 Markdown 没有的空间结构（侧栏、折叠、锚点导航）。`xdossier` 在这个基础上再往前一步：**让 HTML 自带教学结构**，让同一份文档既能教一个新人，又能简报给一个 senior。
