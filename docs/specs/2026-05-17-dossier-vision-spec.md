---
title: Dossier — 把 AI 给你的每一份设计 / 方案 / 文档自动渲染成可读、可分享、可关联的 HTML 档案
status: ready
kind: vision-spec
owner: claude
created: 2026-05-17
updated: 2026-05-18
implements: []
reviews: ["docs/reviews/2026-05-18-dossier-vision-multi-role-review.md"]
---

> ⚠️ 项目名 `dossier` 是占位。最终名见 §16。
> ⚠️ 本文档是 **vision spec**（项目宪法级），不是实施 spec。
> 📝 **v2 变更（2026-05-18）**：从"过程主角"切换到"产出物主角"。新增 §7 Dossier 设计专章。MVP 拆分成 MVP-0 / MVP-1 / MVP-2 三个里程碑。详见各节内容。
> 📝 **v2.1 补充（2026-05-18）**：新增 §8.5，明确 HTML 展示元素词表与用户扩展协议，避免 Dossier 只停留在"漂亮模板"层。

## 0. 一句话

> **AI 给你的每一份设计 / 方案 / 文档，自动渲染成可读、可分享、可关联的 HTML 档案 —— 让你像翻杂志一样翻 AI 的产出，而不是像翻日志一样翻 AI 的过程。**

辅助一句话（保留作为副线，不是主线）：当你想知道"AI 为什么这样设计"，可以一键展开过程 trace 作为 provenance。

## 1. 为什么这个项目存在

### 1.1 一个被忽视的现实

你和 AI 协作的产物，**绝大多数是文档**：spec、方案、设计、ADR、review、change note、研究笔记、简历草稿。这些文档现在以 markdown 形态躺在 `docs/` 里。你要理解它们，靠的是：

- VS Code 的 markdown preview
- GitHub web 渲染
- 自己脑补层级关系

这三种方式都有同一个问题：**把空间结构拍扁成线性文本**。一份 16 节、含表格 / 代码 / 决策树 / 关系图的 spec，渲染成 markdown 后变成"上下滚动 2000 行"，扫读、定位、对比都很费力 —— 而这正是我们和 AI 协作的高频日常动作。

### 1.2 一个更被忽视的现实

一次有效的 AI 协作**很少只产出一份文档**。一次"启动新项目"的对话可能同时产出：

- 一份 vision spec
- 一份 MVP 实施 spec
- 几份 ADR（架构决策记录）
- 一份 wireframe 描述
- 一份 changelog

它们**共享一个底层意图**，相互引用，互为前提。但今天的工具把它们呈现为 5 个独立文件 —— **没人画那张关系图**。每次你要重新建立心理模型："这份 ADR 是为了回答 spec §11 Q1 吗？" 这种脑负担是隐形的、复利的。

### 1.3 现状三种"理解 AI 输出"方式都不够好

| 方式 | 痛点 |
|---|---|
| VS Code / GitHub 渲染 markdown | 单文件视角；版式呆板；无法跨文档跳转；扫读慢 |
| 让 AI 给一段 summary | 损耗大；无法 drill down；AI 自我描述天然有偏 |
| html-anything 手动转 HTML | 一次一份，且需要你手动喂；多文档关系仍要自己拼 |

### 1.4 设计原点

[Thariq Shihipar 的 *Unreasonable Effectiveness of HTML*](https://thariqs.github.io/html-effectiveness/)：HTML 比 Markdown 适合 AI 输出，因为 HTML 能承载**空间结构**。
[nexu-io/html-anything](https://github.com/nexu-io/html-anything)：证明了"Markdown → 设计级 HTML"的产品形态可行，并给出了 SKILL.md 协议作为可复用渲染模板。

**本项目把这两件事推到下一阶段**：从"一次一份手动转"变成"自动盘点你和 AI 协作的全部产出 → 自动渲染 → 自动建立关系图 → 给你一份**档案级**的 HTML"。过程 trace 作为辅助 provenance 层折叠在背后。

## 2. 这个项目<em>不</em>做什么

| ❌ 不做 | 因为 |
|---|---|
| 开发者 observability dashboard（Langfuse / LangSmith / Phoenix 形态） | 那是为 agent 开发者调试用的；本项目为**使用 agent 把工作做完的人**服务 |
| 又一个 chat history viewer | 现存太多，只是把 JSONL 漂亮地铺平没意义 |
| 新的 agent runtime / 新的 CLI agent | 不竞争，只消费 Claude Code / Cursor / Codex 的产出 |
| "如何让 AI 干得更好" | 那是 prompt engineering / agent tuning 领域；本项目只解决"事后如何让人理解 AI 给了什么" |
| 实时监控 / 告警 | 实时性不是核心价值，**事后可读、可分享、可关联**才是 |
| 替代你的 markdown 工作流 | markdown 仍是 AI ↔ AI 通道；本项目只是给 AI ↔ 人通道加一层渲染 |
| 多人协作 / 评论 | 第一版纯个人本地；多人协作放在 v2+ |
| SaaS / cloud-only | 本地优先，所有数据默认不出本机 |

## 3. 目标用户

### 3.1 谁是"使用者"

> 用 agentic CLI（Claude Code、Cursor Agent、Codex 等）把工作做完，**事后需要快速理解 AI 给的设计 / 方案 / 文档，或要把它们分享给非 AI-原生的人**的人。

精确刻画：
- ✅ **会**：用 markdown 写文档，理解 git diff，看 frontmatter
- ✅ **会**：和 AI 来回迭代 spec / 方案
- ❌ **不想**：每次产出一份 spec 就手动打开 html-anything 转一次
- ❌ **不想**：脑补 5 份相关文档之间的关系图

### 3.2 用户故事（按 P0 → P1 排序）

| 优先级 | 编号 | 故事 |
|---|---|---|
| **P0** | **US-0 · spec 自动渲染** | A 和 AI 写了一份 spec.md，**保存的瞬间**，浏览器里出现这份 spec 的 HTML 档案版本，带导航、关系图、设计级版式。**就是我们手工做的事情自动化。** |
| **P0** | **US-1 · 档案视角** | A 启动一个新项目，AI 在两小时内产出了 5 份相关文档（vision spec + MVP spec + 2 份 ADR + wireframe 描述）。A 跑一个命令 → 浏览器打开**项目档案首页** → 看到关系图："这份 ADR 是 vision spec §11 Q1 的答案" → 点任意一份进入设计级 HTML 视图，左右切换。 |
| **P0** | **US-2 · 简历迭代档案** | C 反复迭代 5 版简历（DecisionF 场景），每版是一份 markdown。Dossier 把 5 版渲染成档案：版本切换、关键 diff 高亮、AI 当时为什么改的注释。 |
| P1 | US-3 · 分享 | B 想把档案直接发给老板 / 同事 / 博客，对方双击 HTML 文件即可看（单文件、无外部依赖、可托管）。 |
| P1 | US-4 · 复盘 | 当 A 想知道"AI 当时为什么这样设计" → 展开任意 section 的过程 provenance，看 AI 当时的 reasoning 和 tool calls。 |

### 3.3 反用户故事（明确<strong>不</strong>服务）

- ❌ "我是 agent 开发者，想知道我的 prompt 在哪一步偏离了。" → 用 Langfuse。
- ❌ "我想要 SaaS 协作平台让团队评论 AI 输出。" → v2+ 再说。
- ❌ "我从来不用 CLI agent，只用 ChatGPT 网页版。" → 不是本期目标用户。

## 4. 核心架构（三层 + 一个核心概念）

```
┌──────────────────────────────────────────────────────────┐
│  L1 Discover  (扫描 + 适配器)                            │
│  • 工作目录 artifact diff (主)                           │
│  • Claude Code / Cursor / Codex session JSONL (辅)       │
│  • git log / frontmatter / 文件名启发                    │
│           ↓                                              │
├──────────────────────────────────────────────────────────┤
│  L2 Index    (统一索引模型)                              │
│  • Artifact[]      — 产出物 (主角)                       │
│  • Dossier         — 档案 (核心新概念, 见 §7)            │
│  • Event[]         — 过程 (辅, provenance)               │
│           ↓                                              │
├──────────────────────────────────────────────────────────┤
│  L3 Render   (artifact-first, dossier-aware)             │
│  • Dossier 首页 (关系图 + 文档卡)                        │
│  • 单文档 HTML (用 SKILL 模板渲染)                       │
│  • Provenance 侧栏 (从过程层 lazy-load)                  │
│           ↓                                              │
│  📄 单文件可分享 HTML / 多文件档案目录                   │
└──────────────────────────────────────────────────────────┘
```

**关键设计判断**：
- **L2 Index 是项目的"宪法"** —— 设计好它，capture 和 render 都围绕它演化。
- **Dossier 是这个项目相对所有现存工具的核心差异化** —— 详见 §7。

## 5. 数据源与捕获策略

策略：**artifact 主导，trace 辅助；被动优先，主动可选。**

| 档 | 数据来源 | 用途 | 用户操作 |
|---|---|---|---|
| **L1a Artifact diff (主)** | git diff + 文件 mtime + 未追踪文件；frontmatter；文件名约定 | 知道这次产出了哪些文档、属于哪个 dossier | 0 |
| **L1b Session JSONL (辅)** | `~/.claude/projects/<encoded>/*.jsonl`、Cursor 本地存档、Codex log | provenance 反查（"AI 当时为什么这样设计"） | 0 |
| **L1c 主动埋点（opt-in）** | hooks / MCP / wrapper CLI | 显式决策点 | 一次配置 |

**关键策略**：MVP 阶段只做 L1a + L1b，Claude Code 一个适配器。

**关联机制**：artifact 的修改时间戳 → 反查同时段的 session JSONL → 把每个文件变更链接到具体的 assistant message / tool call。这是 "artifact 主角，trace 作为 provenance" 能跑通的技术基石。

## 6. 数据模型（Trace + Artifact + Dossier）

```typescript
type Index = {
  workspace: { root: string; git_remote?: string };
  artifacts: Artifact[];
  dossiers: Dossier[];
  events: Event[];          // 过程层, 给 provenance 用
};

type Artifact = {
  id: string;
  path: string;                                       // workspace-relative
  title: string;                                      // 从 frontmatter title 或 H1 抽取
  kind: "spec" | "mvp-spec" | "adr" | "change"
      | "review" | "note" | "design" | "wireframe"
      | "code" | "other";
  status?: "draft" | "ready" | "implemented" | "archived";  // frontmatter
  frontmatter?: Record<string, unknown>;
  versions: { ts: ISO8601; content_hash: string; source_event_id?: string }[];
  rendered_html_path?: string;
  // provenance — 哪些 event 产生了这个 artifact
  provenance: EventRef[];
};

type Dossier = {
  id: string;
  title: string;             // 自动生成 或 用户指定
  description: string;       // 1-2 句话
  created_at: ISO8601;
  documents: ArtifactRef[];  // 这个档案包含哪些 artifact
  edges: DossierEdge[];      // 文档间显式关系
  inferred_edges?: DossierEdge[];  // LLM 推断的, 低置信度
  cover_artifact_id?: string;       // 档案首页的主角文档
};

type DossierEdge = {
  from: ArtifactId;
  to: ArtifactId;
  relation:
    | "implements"    // 实施 spec 对应 vision spec
    | "reviews"       // review 对应 spec
    | "follows"       // 后续版本
    | "supersedes"    // 取代
    | "references"   // 提到
    | "answers";      // ADR 回答 spec 中的开放问题
  source:
    | "frontmatter"   // 来自 implements/reviews 数组
    | "filename"      // 文件名公共前缀
    | "inline"        // 文档内引用
    | "session"       // 同一 session 产出
    | "inferred";     // LLM 推断
  evidence?: string;
};

type Event =                                 // 过程层, 折叠为 provenance
  | { type: "user_message"; text: string; ts: ISO8601 }
  | { type: "assistant_message"; text: string; ts: ISO8601 }
  | { type: "tool_call"; tool: string; input: unknown; ts: ISO8601 }
  | { type: "tool_result"; output: unknown; ts: ISO8601 }
  | { type: "error"; message: string; ts: ISO8601 };
```

**注意**：在 v2 框架下，原先 v1 的 `Decision[]` 类型**移除**。决策不再是独立一等公民 —— 它内化为 (a) artifact 的 frontmatter 决策记录，(b) DossierEdge 中的 `answers` 关系，(c) event 流中的 assistant prose。这样数据模型更紧凑。

## 7. Dossier 设计与实现（重点章）

> **Dossier 是这个项目的命门**。如果它能跑通，Dossier 就解决了一个真正没人解决的问题。如果设计错了，本项目就是个"自动化版的 html-anything"。

### 7.1 定义

**Dossier（档案）**：一组共享同一底层意图、相互引用、互为前提的 AI 产出文档。

举几个真实例子：
- **新项目档案**：vision spec + MVP spec + 多份 ADR + wireframe 描述 + 第一版 README
- **bug fix 档案**：bug 报告 + 调研笔记 + 修复方案 spec + change note + review
- **研究档案**：文献综述 + 每篇 paper 的摘要 + 总结报告 + 演讲 slides
- **简历迭代档案（DecisionF 场景）**：5 版简历 + 每版改动注释 + 用人单位匹配分析

**核心论点**：上面每一组的成员之间的**关系**，比成员本身的内容**更难重建**。Dossier 的真正价值在这里。

### 7.2 Dossier 识别（三层信号，由强到弱）

**Tier 1 — 显式信号（高置信，无需 AI）**：

1. **Frontmatter 引用**：
   ```yaml
   implements: [docs/specs/2026-05-17-dossier-vision-spec.md]
   reviews: [docs/specs/...]
   ```
   你 `AI_SPACE/CLAUDE.md` 里已经定义了这个约定 —— **Dossier 可以直接消费**，几乎零额外用户成本。

2. **同 session 修改**：同一次 AI 协作中被修改 / 创建的文件，**默认属于同一 dossier**（用户可拆分）。

3. **文件名公共前缀**：
   ```
   2026-05-17-dossier-vision-spec.md
   2026-05-18-dossier-mvp-spec.md
   2026-05-18-dossier-adr-001-tech-stack.md
   ```
   `dossier-*` 自动识别为一个 dossier。

4. **同目录 + 同主题**：`docs/specs/dossier/` 下所有文件。

**Tier 2 — 推断信号（中置信，需要 LLM）**：

- 标题 / heading 相似度
- 跨文档术语重叠
- 文档内引用其他文档的具体节号（"见 spec §11 Q1"）

**Tier 3 — 用户显式（最高置信）**：

- 目录里放一份 `dossier.md` index 文件，列出成员
- 运行时 `--group <name>` flag

**MVP 策略**：MVP-1 只做 Tier 1。Tier 2 在 MVP-2 加。Tier 3 在 MVP-2 加。

### 7.3 利用你现有 AI_SPACE 约定的具体例子

你 `AI_SPACE/CLAUDE.md` 已经有的协作约定：

```markdown
- 设计文档放 docs/specs/
- 实现完成后在 docs/changes/ 留变更说明
- review 结论单独写入 docs/reviews/
- spec 文件命名：<date>-<topic>-spec.md
- 实现完成后将 spec 更新为 implemented 并补充 implements
- review 完成后将 review 文档路径追加到 reviews
```

这套约定**等同于已经在写 Dossier 的元数据**。Dossier 只需要：
1. 扫描 `docs/specs/`，每个 spec 是一个 dossier 的种子
2. 顺着 `implements: [spec_path]` 找到对应的 spec
3. 顺着 `reviews: [...]` 找到所有 review
4. 把 `docs/changes/` 里同主题的 change note 关联进来
5. **零额外用户操作，自动构建出整个项目档案**

这是 Dossier 在你工作流里"零摩擦嵌入"的关键。

### 7.4 Dossier 数据模型实现要点

- **dossier id** 用最早 spec 的 path 哈希，稳定不变
- **dossier title** 优先从 spec frontmatter `title` 字段，fallback 到文件名 slug
- **edges 写入时机**：每次重新扫描时全量重算，不增量；轻量到不需要增量
- **冲突处理**：一个 artifact 可属于多个 dossier（罕见但要支持），用 `dossier_ids: []` 字段

### 7.5 Dossier 渲染：档案首页

**首页结构**（参考一份杂志的目录页 + 一份产品发布页混合）：

```
┌──────────────────────────────────────────────────┐
│ <Dossier title>                          [状态]  │
│ <1-2 句描述>                                     │
│ <时间范围>  · <文档数> 份                        │
├──────────────────────────────────────────────────┤
│ ┌── 关系图 (mini DAG, SVG 内嵌) ──┐              │
│ │  [vision spec] ←── [MVP spec]    │              │
│ │       ↑                ↓         │              │
│ │   [ADR-001]         [change]     │              │
│ │       ↓                ↓         │              │
│ │                    [review]      │              │
│ └──────────────────────────────────┘              │
├──────────────────────────────────────────────────┤
│ 文档列表 (按时间 / kind / status 排序可切)        │
│                                                  │
│ [spec]   vision spec        draft    5-17        │
│ [spec]   MVP spec           draft    5-18        │
│ [adr]    ADR-001 tech stack draft    5-18        │
│ [change] impl notes         -        -           │
│ [review] -                  -        -           │
└──────────────────────────────────────────────────┘
```

**关系图实现**：内嵌 SVG，手工布局（最多 10-20 节点的场景下，手工布局比力导向更可读）；超过这个量级 fallback 到分组分层。

### 7.6 单文档渲染：cross-ref 增强

每份文档以设计级 HTML 渲染（用 SKILL 模板），额外加：

- **顶部 breadcrumb**：`<dossier title> / <doc title>`
- **左侧 dossier nav**：当前档案的其他文档一览，当前文档高亮
- **右侧 "see also" 侧栏**：与本文档有 edge 的其他文档
- **inline 引用增强**：markdown 里 `[spec §11 Q1](other.md#q1)` 渲染成**带预览卡的链接**，hover 显示对方文档的对应段落

这一条对 §1.2 "我每次脑补关系"的痛点是直接命中。

### 7.7 实现里程碑（三档）

| 档 | 范围 | 需要 AI 吗 | 复杂度 |
|---|---|---|---|
| **Dossier-0** | 只用 Tier 1 显式信号；档案首页只列文档不画关系图 | ❌ | 1 周 |
| **Dossier-1** | + 关系图 SVG 渲染；+ cross-ref 增强；+ inline 引用预览 | ❌ | 2-3 周 |
| **Dossier-2** | + Tier 2 推断信号；+ 自动给 dossier 起标题 / 描述 | ✅ 一次 LLM 调用 | 1-2 周 |

**关键**：Dossier-0 和 Dossier-1 **完全不需要 AI**。这是这个项目能"便宜跑起来 + 默认可用"的护城河。

### 7.8 一个 dossier 渲染的真实例子

输入：本次 spec 写作 session 的产出 —— 仅一份 spec.md。
输出：dossier 首页 + 1 份渲染好的 HTML spec（即 v1 手工版 [2026-05-17-agentstory-vision-spec.html](./2026-05-17-agentstory-vision-spec.html)，命名定为 dossier 之前手工写的版本，留作视觉基线）。

下次扩展：当我们写出 MVP spec、ADR-001（技术栈选型）后，**同一命令再跑一次**，输出自动升级为：
- 一份新的 dossier 首页（3 份文档 + 关系图）
- 3 份独立 HTML
- 每份 HTML 顶部多出 breadcrumb 和侧栏导航
- spec.md 里 "见 §11 Q1" 自动渲染成卡片预览到 ADR-001

**这就是 Dossier 的"杀手 demo"形态**。

## 8. 渲染层：Profile + Skill + Memory

### 8.1 Skill（artifact-first 形态）

借鉴 html-anything 的 SKILL.md 协议。但 Dossier 的 skill 是按**文档类型**而非用户场景组织：

```
dossier/skills/
├── render-spec/              # 通用设计 spec (我们手工做的那种)
├── render-adr/               # ADR 紧凑格式
├── render-change-note/       # 变更说明: 高亮 diff
├── render-review/            # review: 严重度 + jump links
├── render-research-note/     # 研究笔记
├── render-resume/             # 简历 (DecisionF 场景)
├── render-dossier-cover/      # 档案首页
└── render-design-doc/         # 设计文档 (含 wireframe / 图)
```

每个 skill 是 `SKILL.md` + `template.html` + `example.html` 三件套（同 html-anything 惯例）。

### 8.2 Profile

5-6 个开箱即用：

| Profile | 默认 skill 偏好 | 决策抽取重点 |
|---|---|---|
| `engineer` | `render-spec` / `render-adr` 偏技术风格 | 技术选型、回退、bug |
| `designer` | `render-design-doc` 偏视觉 | 风格决策、组件演化 |
| `pm` | `render-spec` 偏精炼版 | 需求变化、范围调整 |
| `researcher` | `render-research-note` 偏学术 | 论点演化 |
| `jobseeker` | `render-resume` | 简历版本对比（DecisionF 场景） |
| `writer` | `render-design-doc` 偏散文 | 结构 / 语气调整 |

### 8.3 Memory

`~/.dossier/profile.md` —— 人类可读 markdown 偏好：

```markdown
# My report preferences

- 默认 profile: engineer
- 我希望档案首页关系图默认: 展开
- 我希望单文档默认: 折叠 provenance 侧栏
- 渲染语言: 中文, 但代码 / 命令 / 路径保持英文
- 字体偏好: 衬线 (Source Han Serif) 用于正文, 等宽 (JetBrains Mono) 用于代码
```

**关键**：profile.md 是 markdown，不是 JSON。这样它**也能进入 AI 工作流**（你可以让 AI 帮你改你的偏好）。

### 8.4 渲染实现：模板 + LLM 混合

- 结构化骨架（关系图 / 文档卡 / TOC / breadcrumb / cross-ref）→ 模板，0 token
- 叙事性段落（dossier description / 文档间关系说明 / 演化摘要）→ LLM 一次调用，cheap model

### 8.5 HTML 展示元素与扩展协议

**核心原则**：用户和 AI 仍然优先写 markdown / frontmatter；Dossier 负责把这些语义渲染成 HTML。也就是说，HTML 是**展示协议**，不是强迫用户手写复杂 HTML 的输入协议。

但这套展示协议必须显式化。否则 Dossier 只会变成"一份好看的模板"，而不是一套可被 AI、用户、skill 作者共同扩展的 report language。

#### 8.5.1 内置展示元素词表

| 元素 | 用途 | 输入来源 | 默认 HTML 形态 | fallback |
|---|---|---|---|---|
| `metadata-strip` | 展示 title / status / owner / created / updated / implements / reviews | frontmatter | `<header class="frontmatter">` + `.meta-grid` | 普通标题 + key-value 列表 |
| `status-badge` | 标记 `draft` / `ready` / `implemented` / `archived` | frontmatter `status` | `<span class="badge ...">` | 纯文本状态 |
| `toc-panel` | 长文档快速定位 | heading tokens | `<aside class="toc">` | 顶部目录列表 |
| `callout` | 风险、备注、目标、结论提示 | blockquote 前缀 `⚠️` / `📝` / `🎯` 或未来 directive | `<div class="callout warn/note/goal">` | `<blockquote>` |
| `section-card` | 将 H2 section 变成可定位信息块 | H2 heading | `<section id="...">` | 原始 heading |
| `artifact-card` | 档案首页里的文档卡 | `Artifact` | `<article class="artifact-card">` | 列表项 |
| `edge-link` | 文档间关系，如 implements / reviews / answers | `DossierEdge` | `<a class="edge-link" data-relation="...">` | 普通链接 |
| `mini-dag` | 档案首页关系图 | `Dossier.edges` | inline `<svg class="mini-dag">` | 分组列表 |
| `preview-popover` | hover 查看被引用段落 | inline markdown link + anchor target | `<span class="preview-popover">` | 普通链接 |
| `see-also-panel` | 当前文档相关文件 | `DossierEdge[]` | `<aside class="see-also">` | 文末相关链接 |
| `diff-block` | 简历 / change note / review 中的关键变更 | git diff 或结构化 diff | `<figure class="diff-block">` | fenced code block |
| `timeline` | provenance 或版本演化 | `Event[]` / git history | `<ol class="timeline">` | 有序列表 |
| `evidence-card` | 证明材料、截图、benchmark、review 引用 | frontmatter / inline reference | `<figure class="evidence-card">` | blockquote + link |
| `decision-card` | 记录一个选择及其理由 | ADR / spec 中的决策段落 | `<article class="decision-card">` | 小标题 + 段落 |
| `provenance-panel` | 展开"AI 当时为什么这样做" | `EventRef[]` | `<aside class="provenance-panel">` | 折叠 `<details>` |

MVP-0 只需要实现 `metadata-strip`、`status-badge`、`toc-panel`、`callout`、`section-card` 和基础 code/table 样式。其余元素属于 MVP-1/MVP-2，但必须现在写进协议，避免后续 skill 各自发明 class 名。

#### 8.5.2 元素触发规则

触发优先级由强到弱：

1. **frontmatter 显式声明**：如 `status`、`kind`、`render_skill`、`implements`、`reviews`、未来的 `dossier` 字段。
2. **Markdown 结构信号**：heading、table、blockquote、fenced code、link、image。
3. **Dossier 索引信号**：`Artifact.kind`、`DossierEdge.relation`、`EventRef`。
4. **Skill 私有约定**：某个 `render-*` skill 可以定义自己的轻量约定，但必须写在该 skill 的 `SKILL.md`。

不要把 raw HTML 当成主要输入协议。raw HTML 可以作为 escape hatch，但默认 renderer 应尽量从 markdown/frontmatter 推导展示元素，保证 AI 写作、代码 review、git diff 都保持可读。

#### 8.5.3 Skill 模板 slot 合约

每个 `render-*` skill 的 `template.html` 至少支持这些稳定 slot：

```html
{{TITLE}}
{{SUBTITLE}}
{{STATUS}}
{{UPDATED}}
{{STYLE_CSS}}
{{TOC_BLOCK}}
{{FRONTMATTER_CARD}}
{{CONTENT_HTML}}
```

从 MVP-1 开始，dossier-aware skill 增加这些 slot：

```html
{{DOSSIER_BREADCRUMB}}
{{DOSSIER_NAV}}
{{SEE_ALSO_PANEL}}
{{RELATION_GRAPH}}
{{PROVENANCE_PANEL}}
```

slot 命名是 Dossier 的跨 skill ABI。用户可以换 template，但不应该被迫改 renderer 代码。

#### 8.5.4 用户扩展阶梯

用户扩展按从轻到重分四档：

1. **Profile 扩展**：改 `~/.dossier/profile.md`，影响语言、密度、是否默认展开关系图、是否折叠 provenance。
2. **Frontmatter 扩展**：在文档里写 `render_skill`、`kind`、`dossier`、`status`、`implements`、`reviews` 等字段。
3. **Skill 扩展**：新增 `src/skills/render-xxx/`，包含 `SKILL.md`、`template.html`、`style.css`、`example.html`。
4. **元素扩展**：在 skill 的 `SKILL.md` 里声明新的展示元素，例如 `resume-score-card` 或 `benchmark-matrix`；必须说明输入来源、HTML class、fallback。

扩展元素必须满足三条规则：

- **语义优先**：新元素要表达一种 AI 工作产物语义，而不只是视觉装饰。
- **可降级**：没有对应 CSS/JS 时，内容仍能作为普通 HTML 被读懂。
- **可复制**：单文件 HTML 分享时不依赖远程资源；必要资源内联或本地相对路径。

#### 8.5.5 给 AI 的写作约束

当 AI 在 Dossier 项目中产出文件时，应遵守：

- 优先写清楚 frontmatter，尤其是 `title`、`status`、`kind`、`implements`、`reviews`。
- 用标准 markdown 表达内容结构；不要为了版式直接堆 raw `<div>`。
- 需要特殊展示时，先选择已有语义：risk 用 callout，证据用 evidence，关系用 link/frontmatter，决策用 ADR/decision 段落。
- 如果需要新增展示元素，必须同时补对应 skill 文档和 fallback 规则。

## 9. 嵌入 AI 工作流的四档

| 档 | 用户操作 | 适合谁 |
|---|---|---|
| **1 · 一次性 build** | `dossier build`（在项目根目录）→ 自动扫描 + 输出 HTML 档案 | 默认入口，80% 用户 |
| **2 · watch 模式** | `dossier watch` → 文件变更时增量渲染 + 浏览器实时刷新 | 边和 AI 写边看 |
| **3 · hook 集成** | 在 Claude Code `settings.json` 加 `Stop` hook → session 结束自动 build | 全自动化 |
| **4 · MCP server** | agent 主动调 `record_dossier_edge` 等 MCP tool 显式标注关系 | 严肃工作 |

**关键原则**：默认是档 1。每多一档解锁能力，**绝不强制升档**。

## 10. MVP 范围：三个里程碑

### 10.1 MVP-0（1-2 周）—— 自动版的"我们今天手工做的事"

**目标**：跑通 US-0。单 spec.md → 单 HTML，无 dossier、无 AI、无适配器。

包含：
- ✅ 读 markdown + frontmatter → 渲染成设计级 HTML（用我们今天手工写的那个版式作为 `render-spec` skill 的 v1）
- ✅ 自动生成左侧 TOC + 滚动联动高亮
- ✅ 自动检测代码块、表格、blockquote 等结构，应用对应样式
- ✅ 单文件 HTML 输出，inlined CSS
- ✅ `dossier render <file.md>` 命令

**不包含**：dossier、关系图、cross-ref、AI 调用、其他 agent 适配器。

**验收标准**：跑 `dossier render docs/specs/2026-05-17-dossier-vision-spec.md`，输出的 HTML 至少和我们手工那一版**等价或更好**。

### 10.2 MVP-1（3-4 周）—— Dossier 上线

**目标**：跑通 US-1（档案视角）+ US-2（简历迭代档案）。

包含：
- ✅ Dossier 识别（Tier 1 显式信号）
- ✅ Dossier 首页（关系图 + 文档卡）
- ✅ 单文档增强：breadcrumb + dossier nav + cross-ref 预览
- ✅ 多文档输出为单一 HTML 文件夹 + 一个 index.html
- ✅ 5 个核心 skill：`render-spec` / `render-adr` / `render-change-note` / `render-review` / `render-dossier-cover`
- ✅ 1 个 profile（`engineer`）+ profile.md 极简版

**不包含**：Tier 2 推断、AI 调用、Cursor / Codex 适配器、watch 模式、export 到 PNG / WeChat。

### 10.3 MVP-2（4-6 周后）—— Provenance + 智能

**目标**：跑通 US-3 + US-4。

包含：
- ✅ Claude Code session JSONL 适配器
- ✅ Artifact ↔ event 关联机制
- ✅ Provenance 侧栏（lazy-load 过程 trace）
- ✅ Tier 2 推断 + 用 LLM 给 dossier 起标题
- ✅ Watch 模式
- ✅ Hook 集成模板（嵌入档 3）

**推迟到 v1.0+**：
- Cursor / Codex / Gemini 适配器
- MCP server（嵌入档 4）
- Export 到 PNG / WeChat / X（复用 html-anything 的 export 管线）
- 反馈条 UI 写回 profile.md 闭环

## 11. 与 html-anything 的关系

**独立项目，共享底层 + 紧密互补。**

| 维度 | html-anything | Dossier |
|---|---|---|
| **输入** | 用户手动粘贴的 markdown / CSV / JSON | 工作目录扫描出的 artifact 集合 |
| **触发** | 用户点 ⌘+Enter | 文件变更 / 显式命令 |
| **单 / 多文档** | 一次一份 | **一次一个档案（多份关联文档）** |
| **关系图** | ❌ | ✅ 核心特性 |
| **AI 调用** | 必须（生成 HTML） | 可选（MVP-0/1 无需，MVP-2 加） |
| **目标产物** | 对外发布的 artifact | 协作过程的档案 |

**可复用**：
- SKILL.md 协议
- Multi-agent 检测层（`src/lib/agents/detect.ts`，用于 MVP-2）
- Export 管线（juice / modern-screenshot），P1 才用到
- 单文件 HTML 渲染策略 + sandboxed iframe 模式

**实施策略**：单独立项；显式声明 "build on top of html-anything"；通用层改进 PR 回去。

## 12. 开放问题

| Q | 问题 | 倾向 |
|---|---|---|
| **Q1** | **技术栈**：pure TS + Node（同 html-anything）/ Rust / Go ？ | **TS + Node**，能复用 html-anything 的 SKILL.md 解析器和 detect 代码 |
| **Q2** | MVP-0 是否要内置 LLM 调用？ | **不要**。纯模板化。AI 在 MVP-2 才进来。 |
| **Q3** | dossier 输出是单文件还是目录？ | **单 dossier = 一个目录（含 index.html + 各 doc.html）**，但提供 `--single-file` 选项打包成一个超大 HTML（适合分享） |
| **Q4** | 关系图怎么布局？ | 节点 ≤ 10：手工布局（dagre 静态计算）；> 10：分组分层 |
| **Q5** | 隐私默认值：私密 spec 里的 secrets 怎么处理？ | **默认显示**（本地工具），`.dossierignore` 可排除文件，`redact-patterns.json` 可打码具体字符串 |
| **Q6** | 文档"版本"如何处理（同一份 spec 多次迭代）？ | git history 即版本源；MVP-1 不渲染版本切换，MVP-2 加 |
| **Q7** | 反馈条 UI 写回 profile.md | MVP-2 之后 |
| **Q8 (NEW)** | 我们要不要给 AI 一个"显式声明 dossier 成员"的协议？比如让 AI 在写文档时主动声明 `dossier: dossier-launch` ？ | **要**。这是 Tier 3 信号的入口。但**不强制** —— 没声明的也要能自动归簇。 |

## 13. 灵感与 Prior art

| 项目 | 借鉴 |
|---|---|
| [thariqs/html-effectiveness](https://thariqs.github.io/html-effectiveness/) | HTML 作为空间信息容器 |
| [nexu-io/html-anything](https://github.com/nexu-io/html-anything) | SKILL.md 协议；单文件 HTML 哲学 |
| [Obsidian](https://obsidian.md) | 文档间关系图；backlinks |
| [Astro](https://astro.build) / [Docusaurus](https://docusaurus.io) | 文档 → 静态 HTML 站的工程模板 |
| [tldraw](https://tldraw.com) | 关系图的轻量 SVG 渲染 |
| OpenTelemetry | "auto-instrument first" 哲学（仅 §5/§9 嵌入策略） |
| Git | 关系作为一等公民（commit graph） |
| Langfuse / LangSmith / Phoenix | **反例**：开发者向 dashboard，我们刻意走反 |

## 14. 成功标准

按可验证程度排序：
1. **最弱**：跑通 §3.2 US-0 + US-1。
2. **中等**：用 Dossier 看自己的项目档案，**真的去用**而不是装好就忘。
3. **较强**：把一份档案发给非 AI-原生的同事 / 老板，3 分钟内能讲清楚"AI 给了我什么"。
4. **强**：第二个用户写了自己的 SKILL 并 PR 回来。
5. **最强**：成为某个 agent CLI 的官方推荐"档案工具"。

## 15. 风险

| 风险 | 缓解 |
|---|---|
| Dossier 识别不准（拆散或合错） | Tier 1 显式信号默认；让用户能 1 键合并 / 拆分 dossier |
| 文档关系图过密变乱 | 默认只显示置信度高的 edge，inferred edge 折叠为虚线 |
| 用户不维护 frontmatter | 提供 `dossier annotate` 命令，AI 帮你补 frontmatter |
| 被当成"自动版 html-anything" | 文档反复强调 Dossier 才是命门；首页 demo 必须是多文档档案而非单文档 |
| 个人化太复杂用户配不动 | 默认 profile 即用；profile.md markdown 能让 AI 改 |
| 隐私顾虑 | 本地优先；`.dossierignore` + `redact-patterns.json` |

## 16. 命名（已敲定）

**✅ Decision: `dossier`** —— 直击 §7 核心概念。npm 包名采用 scope: **`@xforg/dossier`**（裸 `dossier` 名 npm 上已占用，scope 包确保归属清晰）。CLI 二进制名：`dossier`。

历史候选记录（供后人参考为何选了这个）：

| 候选 | 角度 | 评价 | 决议 |
|---|---|---|---|
| **`dossier`** | 档案 = 核心概念 | 直击命门 | ✅ **选定** |
| `agentstory` (v1 占位) | 过程叙事 | v2 框架切换后过程不再主线 | ✗ 弃用 |
| `compendium` | "知识档案集" | 雅，但词长 | ✗ |
| `atlas` | 地图 / 全集 | 关系图意象，重名风险 | ✗ |
| `portfolio` | 作品集 | 偏简历 / 设计场景 | ✗ |
| `brief` | 简报 | 短有力，重名风险 | ✗ |
| `folio` | 对开页 / 档案 | 文学感佳，备选 | ✗ |
| `tome` | 厚书 / 档案 | 偏厚重 | ✗ |

**敲定日期**：2026-05-18。npm 裸名同名验证：`npm view dossier name` 返回 `dossier`（占用），故走 scope 路线。

## 17. 下一步

vision spec v2 通过后：

1. **签字** → `status: ready`，写入 `implements: []` 字段供未来 MVP spec 关联。
2. **起 MVP-0 实施 spec**：`docs/specs/2026-MM-DD-dossier-mvp-0-spec.md`，把 §10.1 展开到具体技术决策。
3. **起一份 ADR-001**：`docs/specs/2026-MM-DD-dossier-adr-001-tech-stack.md`，记录 Q1 + Q2 + Q3 的最终选择。
4. **同时跑 MVP-0**：1-2 周做出第一个能跑的版本。**第一个测试输入就是这份 spec 自己** —— 跑 `dossier render` 看看产出。
5. **如果 MVP-0 跑通**：spec 自己升级到 `status: implemented`，把生成的 HTML 路径写入 `implements`。**这是项目的 first dogfood loop。**
