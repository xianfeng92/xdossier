---
title: xdossier MVP-1 — Multi-document Dossier View
status: ready
kind: spec
owner: claude
created: 2026-05-22
updated: 2026-05-22
implements: []
reviews: []
---

> 🎯 实现 vision spec §7 的 Dossier 视图层。
> 现有 `src/cover/` 已经完成 ~70% 的基础设施（scan / edges / view-model / render）；
> 本 spec 只处理剩下的 5 个真实 gap，**不重做已有功能**。

## 0. 一句话

> **让用户打开一个 cover HTML，就能在 5 分钟内吃透一组相关 AI 产出文档（vision + 实现 + review）的全貌——并且能从 cover 一键跳进任何成员的渲染版 HTML，从成员回跳到 cover，看到 spec 与它的实现/评审之间的真实关系图。**

辅助一句话：从"每篇文档各自一份漂亮 HTML"升级为"一组文档共享一份导航封面"。

## 1. 为什么需要这一层

### 1.1 真实材料勘察（2026-05-22 完成）

| 项目 | specs | changes | reviews | 总文档 | frontmatter 显式链接 |
|---|---|---|---|---|---|
| Cortex | 2 | 4 | 1 | 7 | 2 implements / 2 reviews |
| agent-core | 2 | 18 | 2 | 22 | 5 / 5 |
| nlu_lab | 2 | 4 | 5 | 11 | 2 / 2 |
| DecisionF | 2 | 4 | 2 | 9 | 4 / 2 |
| **finetune-lab** | **6** | **28** | **7** | **41** | **17 / 14** |

`finetune-lab` 的 `2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap` 主题包含 **1 spec + 7 impl-notes + 1 review = 9 篇文档**。这就是真实 dossier 的形状。

**关键发现**：除 `finetune-lab` 外没有一份 `.html` 渲染过。**用户从未在真实场景里用过自己的产品**。

### 1.2 真实痛点（实测得来）

跑 `xdossier render` 单独渲染 spec → 顶部出现 "7 个实现 · 1 个评审" 徽章——**数据存在但不可点击**。
跑 `xdossier build` 项目级 cover → "41 artifacts, 34 edges, graph: list-fallback"——**没有真实图，全是列表**。
点 cover 里的 artifact 链接 → 跳到 `.md` 原文（[src/cover/render.ts:419](src/cover/render.ts:419) 硬编码 `../../${path}`）——**不是漂亮渲染版**。
finetune-lab 41 件物品堆成一个 cover →  **6 个独立主题混作一团，找不到聚焦点**。

## 2. 范围

### 2.1 包含

- **主题聚类（topic clustering）**：在一个 workspace 里检测出 N 个独立 dossier（按 spec → implements/reviews 树聚类，文件名 stem 作为强补充信号）。
- **Cover ↔ Member 双向连接**：cover 链接指向成员的渲染 HTML（fallback 到 `.md`）；成员 HTML 顶部出现"↩ in dossier: X"返链。
- **真实 SVG 关系图**：替换 list-fallback，画 spec/changes/reviews 三层节点 + 真实箭头。
- **PostToolUse hook 增量刷新**：渲染一份 member 后，自动重建它所属 dossier 的 cover。
- **CLI 命名 + 文档化**：`xdossier cover [workspace]` 作为推荐入口（保留 `build` 作 alias），README/Quickstart 把 cover 放在第一行而非 pedagogy。
- **真实 demo**：用 `finetune-lab` roadmap dossier 替换当前 demo 站点的单文档样本。

### 2.2 不包含

| ❌ 不做 | 因为 |
|---|---|
| 跨项目 dossier 聚类（跨 workspace） | MVP-2 范围；当前一个 workspace 内已经够用 |
| 推断信号（标题相似、术语重叠） | vision spec §7.2 Tier 2，需 LLM；MVP-1 只做 Tier 1 + 1.5 |
| 用户显式 `dossier.md` index 文件 | vision spec §7.2 Tier 3；用户当前用 frontmatter + 文件名约定已足够 |
| Dossier 之间的关系（"dossier A 引用 dossier B"） | 一阶问题先解决 |
| 多人协作 / 评论 / 服务端托管 | 保持本地优先 |
| watch mode 守护进程 | 推迟到 MVP-2；hook 已经覆盖大多数场景 |

## 3. 现状评估：已有什么，gap 在哪

### 3.1 ✅ 已有（不动）

- [src/cover/scan.ts](src/cover/scan.ts) — 扫 `docs/specs|changes|reviews`，解析 frontmatter
- [src/cover/edges.ts](src/cover/edges.ts) — 提取 `implements` / `reviews` / `reviews_target` 关系
- [src/cover/view-model.ts](src/cover/view-model.ts) — 构造 `DossierCoverView`，含 reading_paths、open_questions、key_decisions
- [src/cover/render.ts](src/cover/render.ts) — 输出 cover HTML（含 verdict-strip、artifact-map、artifact-list、reading-paths）
- [src/cover/manifest.ts](src/cover/manifest.ts) — build manifest，支持 `--since` 活动 inbox
- [src/cli.ts](src/cli.ts) `build` 子命令 — 完整的 CLI 参数 + 错误处理

### 3.2 ❌ 5 个真实 gap

1. **聚类粒度错位**：scan 把整个 `docs/` 当一个 cover。需要在 view-model 上层加一个 cluster 步骤。
2. **链接指向 .md 而非 .html**：`sourceHref()` 写死 `../../${path}`，应优先指向同名 `.html`。
3. **图为 list fallback**：`graphMode` 始终是空字符串或 "Graph disabled" 标记；缺少真实 `renderRelationGraph(view)` 函数。
4. **Member 不知道自己在 dossier 里**：`src/emit.ts`/`src/render.ts` 渲染单文档时不消费 cover 信息。
5. **Hook 只渲染 member，不刷新 cover**：[.github/](见 root) 没有 cover-refresh 钩子。

## 4. 设计

### 4.1 聚类算法（detection + clustering）

输入：workspace 根目录
输出：`Dossier[]`，每个 Dossier = `{ id, root_spec, members[], edges[] }`

**算法（两阶段，全部 Tier 1 / 1.5 信号）：**

```
phase 1 — root identification:
  candidates = artifacts where kind ∈ {"vision-spec", "mvp-spec", "design", "spec"}
  for each candidate, treat as a potential dossier root.

phase 2 — member assignment (each non-root artifact picks one root):
  for each non-root artifact `a`:
    score(root, a) = 0
    + 100 if root.frontmatter.implements contains a.path
    + 100 if root.frontmatter.reviews    contains a.path
    + 80  if a.frontmatter.implements    contains root.path
    + 80  if a.frontmatter.reviews_target contains root.path
    +  60 if filename_stem(a) == filename_stem(root)   // -spec / -impl-notes / -review trio
    +  30 if filename_prefix_overlap_ratio(a, root) ≥ 0.8 (date + slug)
    +   5 if same directory tree (docs/specs vs docs/changes/<dossier_subdir>/...)
    assign a to argmax_root if max score ≥ 60; else "orphan".

phase 3 — orphan handling:
  orphans collected into a synthetic "Project miscellany" dossier (low priority, shown at bottom of project-wide index page if any).
```

Dossier id 取 root spec 的 `filename_stem`，如 `2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap`。

**接受测试**：用 finetune-lab 41 件物品，算法应当聚出 6 个 dossier（对应 6 个 spec）+ ≤5 件 orphan。

### 4.2 数据模型扩展

```ts
// src/cover/types.ts 新增（不动旧类型）

export type Dossier = {
  id: string;                    // filename stem
  root: CoverArtifact;           // 起点 spec
  members: CoverArtifact[];      // 包含 root 自身
  edges: CoverEdge[];            // edges where from ∈ members && to ∈ members
  view: DossierCoverView;        // 复用现有 view-model
};

export type ClusterResult = {
  dossiers: Dossier[];
  orphans: CoverArtifact[];
  scoring_trace?: Array<{ artifact: string; root: string; score: number }>;
};
```

### 4.3 Cover HTML 改造

每个 dossier 产出一份 cover：

```
<workspace>/.dossier/out/<dossier-id>/index.html      # 主题级 cover
<workspace>/.dossier/out/index.html                   # 项目级总览（列出所有 dossier）
```

**项目级总览**：一张表，每行 `dossier-id, root title, member count, last-updated, status`，点击进入对应 dossier cover。

**主题级 cover**（基于现有 render.ts，新增图块）：
1. verdict-strip（已有）
2. **NEW** relation-graph：inline SVG，分 3 层（spec / change / review），节点点击跳成员 HTML
3. artifact-map（保留为 fallback；图与列表互补）
4. key-decisions / open-questions / reading-paths（已有）

### 4.4 SVG 关系图布局算法

简单分层（无依赖）：

```
layer 0 (top):    root spec node (居中)
layer 1 (middle): impl-notes nodes (水平等间距)
layer 2 (bottom): review nodes (水平等间距)
edges:            spec → impl-note 实线箭头；spec → review 虚线箭头
node size:        固定 180×60，title 截断到 24 字
spacing:          horizontal 24px，vertical 80px
viewport:         viewBox `0 0 ${cols*204} ${3*140}` (overflow auto)
interactivity:    <a xlink:href="..."> 包装节点；hover 时 highlight 相邻边
```

实现位置：`src/cover/relation-graph.ts` 新文件，导出 `renderRelationGraph(view: DossierCoverView): string`。

如果 dossier members > 12 件，节点过密时降级为 vertical scroll grid（不做强制布局求解）。

### 4.5 Cover ↔ Member 双向链接

**Cover → Member**：
- [src/cover/render.ts:419](src/cover/render.ts:419) `sourceHref(path)` 改造：
  ```ts
  function memberHref(path: string, workspaceRoot: string): string {
    const htmlPath = path.replace(/\.md$/, ".html");
    return existsSync(join(workspaceRoot, htmlPath)) ? `../../${htmlPath}` : `../../${path}`;
  }
  ```

**Member → Cover**：
- 渲染单文档时（`src/emit.ts`），检测同目录是否存在 `../../.dossier/out/<dossier-id>/index.html`：
  - 存在则在 spec-card 上方插入一个 `.dossier-banner`：
    ```
    ↩ Part of dossier: <root spec title> · <member-count> docs · last build <ts>
    ```
- Banner 加 data-attribute `data-dossier-id`，方便 hook 找回对应 cover。

**实现方式**：CLI flag `--dossier-id <id>` + `--dossier-root <path>` 由 cover build 阶段调用 member render 时传入；或者 member render 自动向上找 `.dossier/out/manifest.json` 查表。后者更优（解耦）。

### 4.6 Hook 增量刷新

文件：`hooks/post-tool-use.sh`（新建，提供给用户 opt-in）

```bash
#!/usr/bin/env bash
set -e
file="$1"
[[ "$file" == *.md ]] || exit 0
[[ "$file" == */docs/specs/*.md || "$file" == */docs/changes/*.md || "$file" == */docs/reviews/*.md ]] || exit 0

# render the single doc
xdossier render "$file"

# find workspace root (climb until we see .dossier/ or docs/specs/)
workspace=$(climb_until_dir "$file" ".dossier" "docs/specs")

# incremental cover refresh — only the dossier that this file belongs to
xdossier cover "$workspace" --only-dossier-containing "$file"
```

CLI 增量入口：`xdossier cover <workspace> --only-dossier-containing <file.md>` —— 复用聚类结果，只重渲染受影响的那一份 cover，不重新扫整个 workspace（用上 build manifest 的 content_hash 判断哪些 dossier 命中）。

### 4.7 CLI 表面

```
xdossier cover <workspace>           # 推荐入口：build all dossier covers + project index
xdossier cover <workspace> --only-dossier-containing <member>
xdossier cover <workspace> --since <git-ref>
xdossier cover <workspace> --no-graph           # 关闭 SVG 用 list fallback

xdossier build <workspace>           # alias for backward compat（一行 wrapper）
xdossier render <file.md>            # 现状不变，自动尝试找 dossier 写 banner
```

### 4.8 与 vision spec 对齐

- vision spec §7.2 Tier 1 frontmatter 信号 → 本 spec §4.1 phase 2 中 score +100/+80
- vision spec §7.2 Tier 1.5 filename prefix → 本 spec §4.1 phase 2 中 score +60/+30
- vision spec §7.2 Tier 2 推断信号 → 本 spec §2.2 显式排除
- vision spec §7.2 Tier 3 用户显式 dossier.md → 本 spec §2.2 显式排除

## 5. 实施切片（供 codex 顺序执行）

每个切片应 ≤500 行 delta，独立可测、可 commit。

### Phase A — Clustering（最关键）

- 新文件 `src/cover/cluster.ts`：实现 §4.1 算法，导出 `clusterArtifacts(artifacts: CoverArtifact[]): ClusterResult`。
- 单元测试 `tests/cluster.test.ts`：用 `tests/fixtures/clustering/` 下的合成 fixture（≥ 3 个 dossier，含 1 个 orphan）验证。
- **不动** scan / edges / view-model / render。

### Phase B — 多 cover 输出 + 项目级 index

- 改造 `src/cover/render.ts` 的 `buildDossierCover()`：内部对每个 dossier 单独调用 view-model，分别 emit `.dossier/out/<id>/index.html`，另外 emit `.dossier/out/index.html`（项目级 list）。
- CLI [src/cli.ts](src/cli.ts) `build` action 跟随；新增 `cover` 子命令作为别名。

### Phase C — Cover ↔ Member 双向链接

- §4.5 改造（cover 侧 href 切换 + member 侧 banner 注入）。
- 单元测试覆盖：（a）member .html 缺失时 cover 链回 .md，（b）member render 检测到 manifest 后插入 banner。

### Phase D — SVG 关系图

- 新文件 `src/cover/relation-graph.ts`：§4.4 分层布局 + escape-safe SVG emit。
- 改 `src/cover/render.ts` `renderArtifactMap()` 在 graph 模式下调用新函数。
- 单元测试：≤12 节点的输入应产出 well-formed SVG（无 unclosed tag、所有 href escape 正确）。

### Phase E — Hook + 增量

- 新文件 `hooks/post-tool-use.sh`，README 引导 opt-in。
- CLI `--only-dossier-containing <file>`，复用 build manifest 的 content_hash 判断是否需要重渲。
- 集成测试：编辑一个 member md → 跑 hook → 验证只重写了对应 dossier 目录，没动其他 dossier。

### Phase F — README + Demo 翻新

- README 把 quickstart 第一行换成 `xdossier cover docs/` + 一张 cover 截图。
- 用 finetune-lab roadmap dossier 替换当前 GitHub Pages demo（事先脱敏；如有不便公开内容则用 nlu_lab）。
- CHANGELOG 写 `[Unreleased]` MVP-1 段。

## 6. 验收清单

实施完成后，下列每条要通过：

- [ ] 跑 `xdossier cover /Users/xforg/AI_SPACE/finetune-lab` 产出 ≥ 6 份 dossier cover + 1 份项目级 index，无 error。
- [ ] 点 finetune-lab roadmap cover 里任一 artifact，浏览器跳到对应渲染 HTML，而非 .md。
- [ ] 打开 roadmap impl-notes 渲染 HTML 顶部出现 "↩ in dossier: …roadmap-spec" 横幅，点击回到 cover。
- [ ] roadmap cover 显示一张 SVG，spec 居中、7 个 impl-notes 一排、1 个 review 一排，每个节点可点击。
- [ ] 编辑 roadmap 任一 .md 文件保存 → `.dossier/out/<roadmap-id>/index.html` mtime 更新；其他 5 个 dossier 的 .dossier/out 目录 mtime **未变**（增量正确）。
- [ ] 本地 `pnpm typecheck && pnpm test` 全绿；测试数 ≥ 现有 155 + 新增的 cluster/graph 用例。
- [ ] README 第一屏内有 cover 截图 + `xdossier cover` 命令。

## 7. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 聚类算法误判（spec 与无关 change 被聚在一起） | scoring_trace 输出到 manifest，用户能看见为什么；threshold 调到 ≥ 60 保守起步 |
| R2 | SVG 节点超过 12 个时布局崩 | 降级 vertical grid；不投入到力学求解 |
| R3 | member render 找 manifest 引入循环依赖 | manifest 是只读 JSON，member render 失败时静默不插 banner，不影响主流程 |
| R4 | hook 增量逻辑复杂、易引入 bug | Phase E 提供 `--rebuild-all` 兜底；如增量出错，用户可一键全量 |
| R5 | finetune-lab 真实内容含敏感数据，不能直接做 demo | 用 nlu_lab（11 篇、对外可开源）兜底 |

## 8. 下一步

- 用户确认本 spec → status 改 `ready` → 锁定
- 用 codex CLI 按 Phase A → F 顺序实施，每个 phase 一次 commit
- 全部完成后整体 review，更新 vision spec §7 status，宣布 MVP-1 ship
