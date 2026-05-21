---
title: Dossier vision spec multi-role review — 面向高效理解 AI 产出的共识方案
status: implemented
owner: codex
created: 2026-05-18
updated: 2026-05-18
reviews_target: ["docs/specs/2026-05-17-dossier-vision-spec.html", "docs/specs/2026-05-17-dossier-vision-spec.md"]
reviewer_roles: ["product", "frontend-ui", "education-communication", "structured-learning", "html-design"]
verdict: STRONG_DIRECTION_NEEDS_INFORMATION_ARCHITECTURE_REWORK
sources:
  - "https://www.gov.uk/guidance/content-design/what-is-content-design"
  - "https://www.gov.uk/guidance/content-design/user-needs"
  - "https://www.w3.org/WAI/tips/writing/"
  - "https://www.w3.org/WAI/tutorials/page-structure/headings/"
  - "https://nix.dev/contributing/documentation/diataxis.html"
  - "https://media.nngroup.com/media/articles/attachments/Visual-Design-Principles-Poster.pdf"
  - "https://media.nngroup.com/media/articles/attachments/InformationForaging_SizeA4.pdf"
  - "https://en.wikipedia.org/wiki/Worked-example_effect"
---

## 0. Verdict

当前 spec 的产品方向是强的：它已经把 Dossier 从“过程日志 viewer”拉回到“artifact-first 档案工具”，这是正确的战略选择。

但如果目标是“真正让人高效理解 AI 产出的设计方案”，当前文档仍然偏“项目宪法 + 技术蓝图”，还没有形成一套稳定的信息架构。读者需要一路滚到后半段才真正明白杀手能力、工作流、数据模型和 MVP 之间如何互相支撑。

**共识结论**：不要重写产品方向。要重构 spec 的呈现方式：从“解释 Dossier 是什么”升级为“让读者在 3 分钟内完成判断、10 分钟内建立心智模型、30 分钟内能复述/执行”。

## 1. 外部资料抽取出的设计原则

本轮只采用可落地原则，不照搬外部模板。

| 来源 | 可用于 Dossier 的原则 |
|---|---|
| GOV.UK content design | 内容设计不是写 copy，而是从用户需要出发，让人快速找到需要知道或要做的事。当前 spec 要从“我们想说明什么”转向“读者要完成什么判断”。 |
| GOV.UK user needs | user need 要基于动作或任务。当前“理解 AI 输出”要拆成可行动任务：判断是否值得用、定位某个决策、复述方案、交接给别人、继续实现。 |
| W3C writing accessibility / headings | 长文档必须依靠语义 heading 帮助读者掌握大纲并导航。当前 HTML 已有 heading/TOC，但 section 的认知角色还不够清楚。 |
| Diataxis | 不同文档类型服务不同阅读任务：tutorial、guide、reference、concept 不应混写。当前 vision spec 混合了 concept、implementation guide、reference 和 roadmap。 |
| NN/g visual design principles | 视觉层级、尺度、对比要服务重要性排序。当前页面视觉已清爽，但“重要的东西”还不够大，“可跳过的东西”还不够小。 |
| NN/g information foraging | 读者会根据信息气味判断某条路径是否值得继续。Dossier 首页必须给出强 scent：这是什么、有什么产出、我下一步看哪份、为什么可信。 |
| Worked example / cognitive load | 复杂系统要通过 worked example 降低初学者负担。当前 §7.8 已有真实例子，但它来得太晚，应该前置为“黄金路径 demo”。 |

## 2. 五个角色的主要争论

### 2.1 产品专家

产品视角支持当前差异化：Dossier 的核心不是单文档渲染，而是多份 AI 产出之间的关系。这个判断成立。

产品视角反对把 MVP 叙述放得太均匀。US-0、US-1、US-2 都是 P0，但用户第一次理解产品时，只需要一个主路径：**“我刚和 AI 产出了一组设计文档，现在我要快速知道它们是什么、关系是什么、能否继续做。”**

产品侧要求新增一个北极星验收：

> 一个没参与对话的人打开 dossier 首页后，3 分钟内能回答：AI 产出了什么、最重要的结论是什么、有哪些未决问题、下一步该读/做什么。

### 2.2 前端 UI 设计专家

UI 视角认为当前 HTML 的基础排版已经过关：左 TOC、正文宽度、frontmatter、状态 badge、tagline、表格和代码块都能支撑长文阅读。

但 UI 视角认为页面仍偏“漂亮的文档”，不是“认知工具”。缺少四个可视化模块：

- **Executive map**：顶部 5-7 行摘要，回答 what/why/status/next。
- **Artifact board**：文档卡片按 kind/status/关系排列，先看产出物，不先看过程。
- **Decision rail**：关键决策/开放问题/风险作为侧栏或横向 rail，而不是散落在正文。
- **Reading modes**：`Overview`、`Evidence`、`Implementation` 三种视角过滤，而不是所有内容同权出现。

UI 侧的尖锐意见：如果 Dossier 仍只是“把 markdown 变好看”，它会被 html-anything 吃掉心智；必须在首屏就表现“关系和判断”。

### 2.3 教育知识传播专家

传播视角认为当前 spec 太像写给共同作者看的设计备忘，不像写给新读者的知识产品。读者会看到很多术语：Artifact、Dossier、TraceIR、provenance、Skill、Profile、Memory，但没有一个稳定的“先验模型”承接它们。

传播侧建议把解释顺序改成：

1. 痛点故事：AI 产出散落，读者无法快速重建意图。
2. 一个具体档案：vision spec、MVP spec、ADR、review、change note 如何组成一组。
3. 三个核心对象：Artifact 是文件，Edge 是关系，Dossier 是可阅读档案。
4. 系统如何工作：Discover -> Index -> Render。
5. 读者如何判断可信：frontmatter、git、session、引用证据。

传播侧特别要求：每个核心概念都要有“非技术解释 + 真实例子 + 数据模型对应字段”，三件套缺一不可。

### 2.4 结构化学习专家

学习视角认为当前文档有大量正确内容，但学习路径不够分层。它同时让读者理解愿景、架构、数据模型、实现计划、prior art、命名历史和风险，这会增加外在认知负荷。

学习侧建议按照“渐进披露”重排：

| 层级 | 读者任务 | 页面形态 |
|---|---|---|
| L0 Orient | 我在看什么？值不值得继续？ | 1 屏摘要 + 杀手 demo |
| L1 Build model | Dossier 的对象和关系是什么？ | 概念图 + 三对象卡 |
| L2 Inspect evidence | 这个判断从哪里来？ | edge evidence、frontmatter、git/session 来源 |
| L3 Act | 我下一步怎么用/实现？ | MVP 路线、CLI、验收清单 |
| L4 Reference | 字段/风险/prior art/命名记录 | 可折叠 reference |

学习侧和产品侧有一个分歧：产品侧想把路线图前置，学习侧认为路线图应在读者建立模型之后。最后共识是：首屏只放“当前阶段 + 下一步”，完整路线图放后面。

### 2.5 HTML 设计专家

HTML 视角强调：Dossier 的优势不只是“比 Markdown 美”，而是 HTML 可以承载可交互的空间结构。这一点当前 spec 说到了，但生成 HTML 形态还没完全体现。

HTML 侧建议增加这些设计契约：

- 所有重要关系都必须同时有**视觉表达**和**语义表达**，例如 SVG DAG + HTML list/table fallback。
- 关系图不是装饰，节点点击必须能跳到对应 artifact。
- provenance 默认折叠，只在用户要追问“为什么”时展开。
- 单文件模式要保留可复制、可打印、可离线阅读的文档品质。
- 移动端不强求完整 DAG，可降级成分组时间线/edge list。

HTML 侧反对过早引入复杂交互。共识是：MVP-1 的交互只做“跳转、折叠、模式过滤”，不要做 canvas、拖拽、实时编辑。

## 3. 共识后的目标信息架构

建议把 Dossier 的“最终可理解设计方案”定义为一个 7 区块结构：

| 区块 | 目的 | 必须回答的问题 |
|---|---|---|
| 1. Verdict / TL;DR | 让人 30 秒决定是否继续读 | 这组 AI 产出的结论是什么？当前状态是什么？ |
| 2. Artifact Map | 建立空间模型 | 有哪些产出物？谁实现谁？谁 review 谁？ |
| 3. Key Decisions | 抽出真正影响后续行动的判断 | 技术/产品/范围上定了什么？为什么？ |
| 4. Open Questions | 保留不确定性 | 哪些事还没定？谁来定？何时影响实现？ |
| 5. Evidence / Provenance | 建立可信度 | 这些关系来自 frontmatter、文件名、git，还是推断？ |
| 6. Reading Path | 降低选择成本 | 新读者、实现者、reviewer 分别先读什么？ |
| 7. Reference Appendix | 收纳细节 | 数据模型、prior art、风险、命名历史等低频信息。 |

这 7 区块应该成为 `render-dossier-cover` 的默认模板，也应该反向影响 vision spec 的章节顺序。

## 4. 对当前 vision spec 的具体修改建议

### P0-1 · 前置“黄金路径 demo”

把现在 §7.8 的真实例子前移到 §1 之后，成为首个大模块。当前读者要读到后半段才看到 Dossier 的杀手形态，这太晚。

建议新增：

```markdown
## 1. 黄金路径：一次 AI 设计会话如何变成 Dossier

输入：
- vision spec
- MVP spec
- ADR
- change note
- review

输出：
- dossier 首页
- artifact map
- key decisions
- open questions
- reading path
```

### P0-2 · 把“理解”改写成可验证任务

当前成功标准里有“3 分钟内能讲清楚 AI 给了我什么”，这是好标准，但应变成全篇的设计约束。

建议把用户故事补成任务型：

- 我需要判断这组 AI 产出是否可继续实现。
- 我需要找到某个设计决策的依据。
- 我需要把 AI 产出的方案交接给另一个工程师。
- 我需要向非 AI 原生同事解释这组文档。
- 我需要知道哪些问题仍未关闭。

### P0-3 · 分离 concept / guide / reference

当前 vision spec 同时承担概念解释、产品定位、实现路线、字段参考。建议不删内容，但重分层：

- 主体保留：痛点、黄金路径、核心概念、产品边界、MVP 路线。
- 附录下沉：完整 TypeScript type、prior art、命名历史、开放问题详表。
- 单独 spec 承担：MVP-1 dossier cover 的具体渲染契约。

### P0-4 · 将 Dossier 首页从“文档列表 + 关系图”升级为“判断面板”

现在 §7.5 的首页结构还像目录页。建议变成：

```text
Dossier Cover
├─ Verdict strip: status / confidence / next action
├─ Artifact map: graph + list fallback
├─ Key decisions: 3-5 条
├─ Open questions: unresolved only
├─ Reading paths: PM / engineer / reviewer
└─ Evidence drawer: relation source + confidence
```

这会更贴近“高效理解 AI 产出”，也更像一个独立产品。

### P1-1 · 给每个 edge 加 confidence 和 reader-facing label

当前 `DossierEdge.source` 已经有 evidence，但缺少读者能直接理解的标签。

建议：

```typescript
type DossierEdge = {
  relation: "implements" | "reviews" | "follows" | "supersedes" | "references" | "answers";
  source: "frontmatter" | "filename" | "inline" | "session" | "inferred";
  confidence: "high" | "medium" | "low";
  label: string;      // e.g. "MVP spec implements vision spec"
  evidence?: string;
};
```

### P1-2 · 为不同读者提供 reading path

不要只提供一个 TOC。Dossier 首页应给三条路径：

| 读者 | 推荐路径 |
|---|---|
| 决策者 / PM | Verdict -> Key Decisions -> Open Questions -> Risks |
| 实现者 / Engineer | Artifact Map -> MVP spec -> ADR -> Change notes |
| Reviewer / Handoff receiver | Verdict -> Reviews -> Evidence -> Open Questions |

### P1-3 · 把 provenance 的默认角色写死

当前 spec 已经说 provenance 是辅助层，但还可再硬一点：

> Dossier 默认不展示过程。过程只回答一个问题：当读者质疑某个 artifact 或 edge 时，它从哪里来？

这能避免产品滑回 chat history viewer。

## 5. 争论后的最终共识

五个角色最终达成以下共识：

1. Dossier 的主对象是“可行动的产出档案”，不是日志、不是知识库、不是 dashboard。
2. 单文档 render 是入口，真正差异化是 dossier cover 的 artifact map 和 decision/evidence 层。
3. 首屏必须回答判断问题，而不是先展开架构解释。
4. 关系图必须服务阅读路径，不能只是漂亮 SVG。
5. 教学路径要靠 worked example，不靠抽象定义开场。
6. Provenance 必须折叠，且只为信任和追问服务。
7. 生成 HTML 的评价标准不是“像网页”，而是“让读者更快形成正确心智模型”。

## 6. 建议的下一步产物

建议不要直接改代码，先补一份 MVP-1 级 spec：

`docs/specs/2026-05-18-dossier-cover-information-architecture-spec.md`

这份 spec 只定义 dossier cover 的信息架构和渲染契约，范围包括：

- 7 区块 cover 模板
- artifact map 的节点/边语义
- decision/open-question/evidence 的抽取规则
- reading path 的默认生成规则
- 移动端和单文件离线降级
- 验收标准：3 分钟理解测试

验收建议：

1. 用当前 dossier 项目自己的 6 份文档生成 cover。
2. 让没参与本轮会话的人只看 cover。
3. 3 分钟后要求其回答：产出了什么、主线是什么、下一步是什么、还卡在哪里。
4. 答不出来则不是 UI 问题，而是信息架构问题。

## 7. Reviewer sign-off

**Verdict**: 方向强，HTML 渲染基础可用，但 vision spec 还需要一次以“理解效率”为中心的信息架构重排。

签：Codex · 2026-05-18
