---
title: Dossier 教学化层 — Codex 实施交接 brief
status: ready
kind: handoff
owner: claude
created: 2026-05-20
updated: 2026-05-20
implements: ["docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md"]
reviews: []
---

> 👋 这份文档是写给 **Codex** 看的实施手册。
> Claude 已完成设计 spec（`docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md`），并整理出所有需要你实现的工作。
> **你的目标**：实现 P0（spec §10.1），通过 §11 验收清单。
> **严格遵循 spec §12 "决不要做"**。不要自由发挥。

## 1. 30 秒入门

```bash
cd /Users/xforg/AI_SPACE/dossier
pnpm install                                       # 已装好
pnpm typecheck                                     # 应 clean
pnpm test                                          # 应全绿（当前基线）
pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md
# → 当前能跑通；你的任务是让输出 HTML 顶部多出 3 档 reader 切换 + 自动分类标记
```

## 2. 项目是什么（一句话）

dossier 是把 AI 给的 markdown 设计文档自动渲染成单文件 HTML 的工具。**本次任务**：给现有渲染加两个正交维度——`content_mode`（教学形态自动分类）和 `reader_profile`（读者熟练度运行时切换），让同一份 HTML 同时服务零基础/系统化/速查三类读者。

## 3. 必读 spec（按顺序，约 20 分钟）

| 文件 | 你最少要看的章节 |
|---|---|
| `docs/specs/2026-05-20-dossier-pedagogy-layer-spec.md` | **全读**。这是本次任务的宪法 |
| `docs/specs/2026-05-18-dossier-mvp-0-spec.md` | §6.5 skill dispatch · §13 测试结构（不要破坏现有 skill 体系） |
| `src/types.ts` | 全读，特别是 `RenderAnnotations` 及周边 |
| `src/enrich/section-summaries.ts` | scaffold provider 当前长什么样 |
| `src/skills/render-spec/template.html` + `style.css` | 你要扩展它们 |
| `src/emit.ts` | 占位符替换 + skill 模板加载在这里 |

## 4. 工作分解（按依赖顺序）

### 4.1 类型扩展（`src/types.ts`）

- `RenderAnnotations.schema_version` 升到 `2`
- 新增 4 个字段：`content_mode?` / `prerequisites?` / `checkpoints?` / `analogies?`
- 新增 3 个类型定义：`PrerequisiteItemAnnotation` / `CheckpointAnnotation` / `AnalogyAnnotation`
- 类型签名严格按 spec §7.1，不要改字段名

**验收**：`pnpm typecheck` clean。

### 4.2 启发式分类器（`src/enrich/content-mode.ts`，新建）

- 实现 `classifyContentMode(tokens, frontmatter): { mode, scores, reason }`
- 4 个 scorer 见 spec §4.3 伪代码
- 输出额外带分数 + 原因，便于 verbose 调试
- 单元测试 `tests/content-mode.test.ts`：≥6 case
  - vision-spec → `concept`
  - mvp-0-spec → `concept`
  - 一份伪 Quickstart fixture → `tutorial`
  - 一份伪 API 表 fixture → `reference`
  - frontmatter `content_mode: reference` 覆盖
  - 全部分数 < 30 → fallback `concept`

**fixtures**：`tests/fixtures/quickstart-tutorial.md` 和 `tests/fixtures/api-reference.md`（你自己写，每个 30-50 行）。

### 4.3 annotations 解析向后兼容（`src/annotations.ts`）

- `parseAnnotationsJson` 接受 `schema_version: 1` 和 `2`
- v1 文档缺新字段时不报错，留 undefined
- 单元测试：`tests/enrich.test.ts` 加 2 个 case（v1 兼容 / v2 完整）

### 4.4 scaffold provider 升级（`src/enrich/section-summaries.ts`）

- 调用 `classifyContentMode` 写入 `content_mode`
- 读 frontmatter `prerequisites:` → `prerequisites[]`，缺则空数组
- `checkpoints` / `analogies` 在 scaffold 中固定为空数组（codex/claude provider P1 才填充）

**验收**：`pnpm dev enrich docs/specs/2026-05-17-dossier-vision-spec.md --provider scaffold`，输出 JSON 含 `content_mode: "concept"`、`prerequisites: []`、`checkpoints: []`、`analogies: []`。

### 4.5 emit 渲染新元素（`src/emit.ts`）

- 新增 5 个占位符替换：`{{READER_TOGGLE}}` / `{{PREREQUISITE_CARD}}` / `{{ANALOGY_CALLOUTS}}` / `{{LEARNING_CHECKPOINTS}}` / `{{READER_TOGGLE_SCRIPT}}`
- `<html>` 根标签写入 `data-reader="<from cli>"` 和 `data-content-mode="<from annotations>"`
- 每个新元素都要带 `data-detail-level` 属性（spec §6 各小节给了精确值）
- analogies/checkpoints 按 `section_id` 注入到对应 `<section id="sN">` 内
- glossary-popover：从 `semantic_blocks` 里找 `concept_glossary` 类型，**首次出现**才包成 `<span class="term">`（用 markdown HTML 后字符串处理；正则 `\b<term>\b` 替换首次匹配）

**关键**：所有元素都要有 fallback —— 如果对应 annotation 不存在，对应占位符替换为空字符串，HTML 仍合法。

### 4.6 template + style 扩展

**`src/skills/render-spec/template.html`**：
- `<html data-reader="{{READER_DEFAULT}}" data-content-mode="{{CONTENT_MODE}}">`
- 在 `<body>` 第一个子元素位置加 `{{READER_TOGGLE}}`
- 在 frontmatter card 之后加 `{{PREREQUISITE_CARD}}`
- 在 `{{CONTENT_HTML}}` 内已被 section 包装好，analogies/checkpoints 由 emit 端 inline 注入；占位符 `{{ANALOGY_CALLOUTS}}` 和 `{{LEARNING_CHECKPOINTS}}` 在 P0 可以是 placeholder（实际注入在 §4.5）
- `</body>` 前加 `<script>{{READER_TOGGLE_SCRIPT}}</script>`

**`src/skills/render-spec/style.css`**：
- 顶部加 `.reader-toggle` 样式（三档按钮组，sticky top，与现有色板一致）
- `.prerequisite-card` / `.callout.analogy` / `.learning-checkpoint` / `.term` 样式
- 完整的 `html[data-reader="..."]` 选择器组（spec §5.2 给了样例）
- `html[data-content-mode="reference"] aside.toc { position: sticky; top: 0; max-height: 100vh; overflow: auto; }`

**保持视觉一致**：沿用现有色板（`#faf9f6` 暖白，`#1a1a1a` 墨黑，`#1e3a8a` 深靛蓝，`#991b1b` 警告色，`#92400e` 提问色），不要引入新色。

### 4.7 reader-toggle 内嵌 JS（`src/skills/render-spec/reader-toggle.js`，新建）

```javascript
// 大致逻辑（你自己实现，避免可选链以兼容老浏览器）
(function () {
  var html = document.documentElement;
  function setReader(value) {
    if (value !== "beginner" && value !== "intermediate" && value !== "expert") return;
    html.setAttribute("data-reader", value);
    try { localStorage.setItem("dossier.reader", value); } catch (e) {}
    var btns = document.querySelectorAll("[data-reader-set]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-reader-set") === value ? "true" : "false");
    }
  }
  // 优先级：URL > localStorage > 默认（html 已经有的属性）
  var url = new URL(location.href);
  var fromUrl = url.searchParams.get("reader");
  var fromStorage = null;
  try { fromStorage = localStorage.getItem("dossier.reader"); } catch (e) {}
  var initial = fromUrl || fromStorage;
  if (initial) setReader(initial);

  document.addEventListener("click", function (e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.getAttribute && target.getAttribute("data-reader-set")) {
        setReader(target.getAttribute("data-reader-set"));
        return;
      }
      target = target.parentNode;
    }
  });
})();
```

由 `emit.ts` inline 到 `{{READER_TOGGLE_SCRIPT}}`。

### 4.8 CLI flag（`src/cli.ts`）

- `--reader <beginner|intermediate|expert>`：默认 `beginner`，传给 render 作为 `{{READER_DEFAULT}}`
- `--content-mode <auto|tutorial|concept|reference|course>`：默认 `auto`，非 auto 时覆盖 annotation 的 content_mode
- 沿用现有手写 argv 风格（**不要引 commander**）
- 同步更新 help 文本和 README

### 4.9 render 管线串起来（`src/render.ts`）

- render 函数签名增加 `reader: "beginner" | "intermediate" | "expert"` 和 `contentModeOverride?: string`
- 当 annotations 缺失时，端到端自己调一次 `classifyContentMode`（render 是 entry，不要强依赖 enrich 先跑）

### 4.10 测试

`tests/render-spec.test.ts` 加：
- reader toggle DOM 存在
- `<html data-reader="beginner">` 正确
- `<html data-content-mode="concept">` 正确（vision-spec fixture）
- `--reader expert` 切换生效
- `--content-mode reference` 覆盖生效
- annotations v1 兼容（没有 content_mode 字段时不崩）

## 5. 验收清单（从 spec §11 抄过来）

按顺序勾，最后一项打勾 = P0 完成：

- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` 全绿，新增 ≥6 个测试
- [ ] `pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 跑通
- [ ] 输出 HTML 顶部有 3 档 reader 按钮，默认高亮"零基础"
- [ ] 切换到"速查" → prereq/analogy/checkpoint 全部消失（视觉验证），正文压缩
- [ ] 切换到"系统化" → 介于二者之间
- [ ] HTML `<html>` 根标签有 `data-reader="beginner"` 和 `data-content-mode="concept"`
- [ ] `?reader=expert` 在浏览器地址栏覆盖默认
- [ ] localStorage 切换跨刷新保留
- [ ] **关网络 + 双击 HTML** 三档切换完全可用
- [ ] `--content-mode tutorial` 强制 → HTML data-content-mode 反映
- [ ] frontmatter `content_mode: reference` 覆盖启发式
- [ ] 临时 fixture quickstart-tutorial.md → `tutorial`
- [ ] 临时 fixture api-reference.md → `reference`
- [ ] annotations.json schema_version: 1 旧文件仍可读
- [ ] 写一份 `docs/changes/2026-05-XX-dossier-pedagogy-layer-impl-notes.md`，列**实际偏差**和**对 spec §14 开放问题的判断**

## 6. 决不要做的事

| ❌ Do not | 因为 |
|---|---|
| 引入新 npm 依赖 | 沿用 ADR 零依赖原则 |
| 渲染三份 HTML 每个 profile 一份 | 违反单文件分享约束 |
| 在 markdown 里手写 `<div class="prerequisite-card">` | 走 frontmatter / annotation 管线 |
| 让 reader-toggle 依赖外部 JS 文件 | JS 必须 inline 到单文件 |
| 实现 content_mode 的 AI 自动分类 | 启发式 + frontmatter 已够；省 token |
| 改 SemanticBlock 已有 14 种字段 | 只**新增**字段；保持向后兼容 |
| 给 expert 模式做"折叠"动画 | data-attribute + display 即可 |
| 让 glossary popover 每次出现都标记 | 满屏波浪线；只标首次 |
| 实现 profile.md 读取 | P1 任务，不要提前做 |
| 改任何现有测试用例的预期 | 现有行为是契约 |
| 改 vision spec / mvp-0 spec | 它们与本任务无关 |
| 自由发挥新增 mode（如 `quickref`） | spec §4.1 锁死 4 种 |
| 自由发挥新增 profile（如 `manager`） | spec §5.1 锁死 3 档 |

## 7. 你完成后的下一步

1. 写好 `docs/changes/2026-05-XX-dossier-pedagogy-layer-impl-notes.md`：
   - 列对 spec 的实际偏离（每条带理由）
   - 列你对 §14 开放问题的判断
   - 截图三档切换（beginner / intermediate / expert）放进 impl-notes 或 commit message
2. 把本 brief frontmatter `status: ready` → `archived`
3. 把 pedagogy spec frontmatter `status: ready` → `implemented`
4. 在 pedagogy spec frontmatter `implements: []` 加入 impl-notes 路径

## 8. 风险点（按可能性排序）

| 风险 | Codex 容易掉的坑 | 提前规避 |
|---|---|---|
| 偷偷引入 npm 依赖 | "用 dompurify 处理 popover 更安全"——不允许 | spec §12 显式列禁止 |
| reader-toggle JS 用了可选链或 nullish coalescing | 老 Safari / IE 跑挂 | 用 ES2018 子集；写完 `node --check` 验证 |
| 单文件 HTML 含外链 | template 中 import / `<link>` 误引 | grep `http` `cdn` `<link.*href` 验证 |
| 启发式分类全部低分 → 默认 concept 时报错 | scoring 逻辑没 fallback | 显式实现 fallback，写测试 case |
| schema_version 升级破坏旧 annotations | parseAnnotationsJson 没兼容 v1 | 写 v1 兼容测试 |
| 视觉精度不够 | 没逐字段对照现有视觉基线 | 浏览器开两 tab 对比；色号写死 |
| section_id 不匹配 | analogies/checkpoints 找不到对应 section | render 阶段先 dump 所有 section_id，再做 join |
| glossary popover 误触发 | 在代码块 / 已链接处也加 popover | 实现时用 marked 后处理 HTML，跳过 `<code>` 和 `<a>` 内部 |
| `--content-mode auto` 时被传入字面字符串 "auto" 写进 HTML | 应当转成实际分类值 | CLI 解析 auto → undefined，让 annotation/heuristic 决定 |
| 测试不写 fixture | 直接读外部 spec 作为测试输入 | 强制写两份 fixture（tutorial / reference） |

## 9. 沟通约定

- 卡 > 30 分钟：在 impl-notes 留 `## 阻塞` 段，描述卡点
- 想偏离 spec：先在 impl-notes 头部说明并标注 `需 Claude 确认`，不要默默改
- 完成阶段：勾本 brief §5 的验收清单

—

**完成 P0 的标志**：

`pnpm dev render docs/specs/2026-05-17-dossier-vision-spec.md` 输出的 HTML，在浏览器里能流畅切换 3 档 reader profile；零基础读者打开默认能看到术语解释和前置知识；资深读者切到速查档能只看决策骨架；整个文件双击离线打开完全可用。
