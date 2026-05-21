---
title: Dossier MVP-0 实施 spec — 单文档 markdown → 设计级 HTML 自动渲染
status: implemented
owner: claude
created: 2026-05-18
updated: 2026-05-18
implements: ["docs/specs/2026-05-17-dossier-vision-spec.md"]
reviews: ["docs/reviews/2026-05-18-dossier-mvp-0-review.md", "docs/reviews/2026-05-18-dossier-mvp-0-visual-review.md", "docs/reviews/2026-05-18-dossier-mvp-0-r1-review.md"]
---

> ⚠️ 本文档是 MVP-0 的**实施 spec**，落地 vision spec §10.1。
> ⚠️ 范围严格收窄：**单 markdown → 单 HTML，零 AI，零 dossier**。
> 🎯 验收目标：`dossier render docs/specs/2026-05-17-dossier-vision-spec.md` 产出一份**结构正确、可导航、视觉清爽**的 HTML，能替代手工版（视觉精度允许略低，但绝不能更难读）。

## 0. 一句话

> **把 markdown 当作语义源，把 SKILL.md 当作版式源，把 frontmatter 当作元数据源 —— 三者拼合输出一份 inline-CSS 的单文件 HTML。零 AI、零 dossier、零外部依赖（运行时）。**

## 1. 目标 vs 非目标

### 1.1 In scope

- ✅ CLI 命令：`dossier render <file.md> [-o <out.html>]`
- ✅ Markdown 解析（CommonMark + GFM tables + 围栏代码块 + frontmatter）
- ✅ 自动生成左侧 TOC（h2 + h3）+ 滚动联动高亮
- ✅ Frontmatter 渲染为档案头卡（badge / title / meta grid）
- ✅ 一个内置 SKILL：`render-spec`（继承手工版 HTML 的视觉语言）
- ✅ 单文件 HTML 输出（CSS 内联，JS 内联，无外部 assets）
- ✅ 基本的语义识别：blockquote 中带 ⚠/📝/🎯 emoji → callout 样式；ASCII 图块（连续 `┌─` `│` `└─` 字符）→ `ascii-diagram` 样式

### 1.2 Out of scope（明确推迟）

| 推迟项 | 推迟到 |
|---|---|
| Dossier 识别 / 关系图 / cross-ref | MVP-1 |
| 多 SKILL（adr / change / review / resume / dossier-cover） | MVP-1 |
| Profile 切换、profile.md 解析 | MVP-1 |
| AI 调用（决策抽取、叙事摘要） | MVP-2 |
| Session JSONL 适配器 | MVP-2 |
| Watch 模式 | MVP-2 |
| Hook 集成 | MVP-2 |
| MCP / wrapper / 其他 agent | v1.0+ |
| 自定义 admonition / directive 语法 | MVP-1（如果需要）|
| 真正的代码语法高亮（highlight.js） | MVP-1 |

### 1.3 验收标准（强制）

跑 `dossier render /Users/xforg/AI_SPACE/dossier/docs/specs/2026-05-17-dossier-vision-spec.md`，输出 `2026-05-17-dossier-vision-spec.html`，浏览器打开后**必须**：

1. 17 个 section 全部正确渲染，h2 / h3 层级清晰
2. 左侧 TOC 可点击跳转，滚动时高亮当前节
3. Frontmatter 渲染为顶部 card（title / status / owner / date）
4. 文档顶部三条 ⚠/📝 callout 用 callout 样式
5. §4 / §7.5 的 ASCII 图块以等宽字体保留缩进，加边框背景
6. 所有表格清晰可读（边框、行高、表头加重）
7. 所有 `<pre><code>` 代码块有等宽字体 + 浅背景
8. 行内 `code` 有浅背景 + 微红
9. 整份 HTML 是**单文件**，移到任意机器 / 邮件附件 / iMessage 发送，对方双击仍能完美打开
10. 文件大小 < 100KB（裸体积，无外部资源）

**软标准**（不强制但希望接近）：
- 视觉精度达到手工版的 ~80%（缺失的 20% 是 user story 卡片、ladder、naming grid 等需要 admonition 语法的高度定制块，自动 fallback 为标准表格 / 列表也可接受）

## 2. 技术决策（ADR 风格，锁定不再讨论）

| ADR | 决策 | 拒绝的选项 + 原因 |
|---|---|---|
| **D1 · 运行时** | **Node.js ≥ 20** | ❌ Bun：增加新工具链依赖，团队 / CI 未必有；❌ Deno：生态远 |
| **D2 · 语言** | **TypeScript 5.x（ESM）** | ❌ 纯 JS：长期不可维护；❌ Rust：MVP 阶段杀鸡用牛刀 |
| **D3 · 包管理器** | **pnpm**（同 html-anything） | ❌ npm / yarn：和 html-anything 不一致 |
| **D4 · markdown 解析器** | **marked@18**（同 html-anything） | ❌ markdown-it：再装一套 plugin 生态；❌ remark：unified 全家桶过重 |
| **D5 · frontmatter 解析** | **gray-matter** | 几乎是唯一标准选择 |
| **D6 · CLI 框架** | **零依赖手写 argv 解析**（仅 1 个命令 + 3 个 flag） | ❌ commander / cac：MVP-0 surface 太小 |
| **D7 · 模板引擎** | **零依赖，字符串模板字面量 + `{{PLACEHOLDER}}` 替换** | ❌ eta / ejs / handlebars：本期可识别的 placeholder 不到 10 个 |
| **D8 · 输出形态** | **单文件 HTML**，CSS / JS 全部 inline 到 `<style>` / `<script>` | ❌ 带 assets 目录：违反"双击即看"承诺 |
| **D9 · 代码高亮** | **MVP-0 不做真正高亮**，只给 `<pre><code>` 加 `.lang-ts` 等 class，靠 CSS 做最低限度配色 | ❌ highlight.js：bundle 增重 ~100KB；MVP-1 再加 |
| **D10 · 测试框架** | **vitest** | ❌ jest：ESM 不友好；vitest 同样可用 |
| **D11 · 输出路径默认** | 与输入同目录同名换 `.html` 后缀；可用 `-o` 覆盖 | — |
| **D12 · 字符编码** | **UTF-8 强制**，输入 / 输出统一 | — |
| **D13 · TOC 抓取层级** | **h2 + h3**，h1 视为文档标题不入 TOC | 文档已有 h1 = title，再放 TOC 是冗余 |
| **D14 · 项目代码位置** | **`/Users/xforg/AI_SPACE/dossier/`** 项目根 = vision spec 所在目录 | 已有 `docs/`，加 `src/` `package.json` 等 |

## 3. 项目结构

```
dossier/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── README.md                       # 安装 + 使用 + 一个例子
├── bin/
│   └── dossier.js                # shebang → require dist/cli.js
├── src/
│   ├── cli.ts                       # 入口: argv → dispatch
│   ├── render.ts                    # 主管线: 编排 parse + select skill + emit
│   ├── parse/
│   │   ├── frontmatter.ts            # gray-matter wrapper + 类型化
│   │   ├── markdown.ts               # marked 配置 + 自定义 renderer
│   │   ├── toc.ts                    # 抓 h2/h3 → 嵌套结构
│   │   └── semantic.ts                # 启发: callout / ascii-diagram / 表格类型
│   ├── skills/
│   │   ├── registry.ts               # selectSkill() — 见 §6.5
│   │   ├── loader.ts                 # 扫 skills/*/SKILL.md 加载到内存
│   │   └── render-spec/
│   │       ├── SKILL.md               # 元数据 + applies_to + 未来留给 AI 的 prompt
│   │       ├── template.html          # HTML 骨架, 含 {{PLACEHOLDER}}
│   │       ├── style.css              # 视觉语言, 移植自手工版
│   │       ├── toc-script.js          # 内联 scroll-spy
│   │       └── example.html           # 样例输出 (同 html-anything 惯例)
│   ├── emit.ts                       # 将 parsed AST + skill 拼接成最终 HTML
│   └── types.ts                      # 内部类型
├── tests/
│   ├── render-spec.test.ts            # 用本仓库的 vision spec 做端到端 fixture
│   └── fixtures/
│       └── minimal.md                 # 最小输入: 一段 h1 + h2 + 一个表格
├── docs/
│   ├── specs/
│   │   ├── 2026-05-17-dossier-vision-spec.md
│   │   ├── 2026-05-17-agentstory-vision-spec.html   # v1 手工版, 验收对比基线 (命名前)
│   │   └── 2026-05-18-dossier-mvp-0-spec.md          # 本文档
│   ├── changes/
│   └── reviews/
└── .gitignore
```

## 4. CLI 表面（最终）

```
dossier render <input.md> [options]

Arguments:
  <input.md>                Path to a markdown file (absolute or relative)

Options:
  -o, --out <path>          Output HTML path (default: <input>.html same dir)
  -s, --skill <name>        Force a specific skill, overriding auto-detection
                            (default: auto-select via §6.5; falls back to render-spec)
                            MVP-0 only has "render-spec" registered;
                            passing an unknown name exits with code 3.
  --no-toc                  Disable TOC sidebar
  --verbose                 Print skill selection reason
  -h, --help                Show help
  -v, --version             Show version

Exit codes:
  0   success
  1   input file missing or unreadable
  2   parse error (malformed frontmatter / markdown)
  3   unknown skill
  64  internal error
```

**例子**：

```bash
# 基本
dossier render docs/specs/2026-05-17-dossier-vision-spec.md
# → docs/specs/2026-05-17-dossier-vision-spec.html

# 指定输出
dossier render docs/specs/foo.md -o /tmp/foo.html

# 禁 TOC
dossier render docs/changes/short-note.md --no-toc
```

## 5. 渲染管线（步骤详解）

```
input.md
  │
  ▼
┌──────────────────────────────────┐
│ 1. read & utf8 decode             │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 2. gray-matter → { data, content }│   data = frontmatter
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 3. marked parse content → AST     │
│    (与默认 renderer 解耦)         │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 4. semantic pass on AST:          │
│    • blockquote 前缀 → callout     │
│    • <pre> 中 ASCII 字符 → diagram │
│    • h2/h3 加 id (slug)            │
│    • h2 → wrap as <section id>    │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 5. toc extract → 嵌套结构          │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 6. AST → HTML fragment            │
│    (自定义 marked renderer)       │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 7. load skill: template.html      │
│    + style.css + toc-script.js    │
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│ 8. template substitution:          │
│    {{TITLE}} / {{SUBTITLE}}        │
│    {{FRONTMATTER_HTML}}            │
│    {{TOC_HTML}}                    │
│    {{CONTENT_HTML}}                │
│    {{STYLE_CSS}}                   │
│    {{TOC_SCRIPT_JS}}               │
└──────────────────────────────────┘
  │
  ▼
output.html  (single file, all inline)
```

## 6. `render-spec` SKILL 详解

### 6.1 SKILL.md

```markdown
---
name: render-spec
description: 渲染一份 vision spec / 实施 spec / ADR 类的设计文档，强调结构层级、决策可定位、扫读快
mode: document
scenario: engineering
aspect_hint: "可滚动竖版, 最大宽度 760px 正文 + 260px 左 TOC"
recommended: 1
applies_to:
  - frontmatter.kind: ["spec", "mvp-spec", "adr"]
  - filename_pattern: "*-spec.md"
mvp_ai_required: false
---

【模板用途】渲染本仓库 `docs/specs/` 下的设计文档为可扫读、可分享的单文件 HTML。

【视觉语言铁律】
- 配色: 暖白底 #faf9f6, 墨黑文字 #1a1a1a, 深靛蓝 accent #1e3a8a
- 字体: system-ui / PingFang SC 正文, JetBrains Mono 代码
- 1px hairline 边框, 不用阴影 / 模糊
- callout 用左侧 3px 色条区分类型
- 代码块用 #f4f2eb 浅米底
- 表格 th 用浅灰底, td hairline 分割

【未来 AI 钩子】(MVP-0 不调用)
当 mvp_ai_required: true 时, AI 应:
- 抽取每个 section 的 1 句话摘要写入侧栏
- 生成一段 ≤ 100 字的 dossier description
```

### 6.2 template.html（骨架）

```html
<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
<style>{{STYLE_CSS}}</style>
</head>
<body>
<div class="layout">
  {{TOC_BLOCK}}
  <main>
    {{FRONTMATTER_CARD}}
    {{CALLOUTS_BLOCK}}
    {{CONTENT_HTML}}
    <footer class="spec-footer">
      <span>{{TITLE}} · {{STATUS}} · {{UPDATED}}</span>
      <span>rendered by dossier</span>
    </footer>
  </main>
</div>
<script>{{TOC_SCRIPT_JS}}</script>
</body>
</html>
```

### 6.3 style.css

从 [v1 手工版 spec.html](./2026-05-17-agentstory-vision-spec.html) 的 `<style>` 块**整段移植**。MVP-0 不重新设计视觉。

关键 class 列表（CSS 必须覆盖）：
- `.layout` / `aside.toc` / `main`
- `.frontmatter` / `.status-row` / `.badge` / `.badge.draft` / `.badge.warn`
- `.meta-grid` / `.meta-item` / `.meta-label` / `.meta-value`
- `.top-callouts` / `.callout` / `.callout.warn`
- `.tagline` / `.tagline-label`
- `section` / `section h2 .sec-num` / `section h3 .sub-num`
- `table` / `th` / `td`
- `pre` / `code` / `pre code`
- `.ascii-diagram`
- `blockquote`
- `.spec-footer`

**不实现**（手工版有但 MVP-0 自动 fallback 为标准表格）：
- `.us-grid` / `.us-card` （用户故事卡片）
- `.scope-grid` / `.scope-col`（MVP 范围双列）
- `.q-list` / `.q-item` / `.q-tendency`（开放问题琥珀卡）
- `.ladder` / `.ladder-step`（成功标准阶梯）
- `.name-grid` / `.name-card`（命名候选卡）

这些块在 MVP-0 中保留原始 markdown 表格 / 列表样式即可。MVP-1 引入 admonition 语法时再回头补。

### 6.4 toc-script.js

```js
(function() {
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const tocLinks = new Map();
  document.querySelectorAll('aside.toc a').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    tocLinks.set(id, a);
  });
  const onScroll = () => {
    let active = sections[0]?.id;
    const offset = 120;
    for (const s of sections) {
      if (s.getBoundingClientRect().top - offset <= 0) active = s.id;
    }
    tocLinks.forEach((a, id) => a.classList.toggle('active', id === active));
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
```

直接复用手工版。

## 6.5 Skill 调度接口（MVP-0 单 skill，但接口为 MVP-1 扩展铺好）

> 📝 本节是 v1.1 增补（2026-05-18）。回应"如何针对不同文档类型产出不同样式"的架构问题。
> 🎯 核心承诺：~35 行代码，让 MVP-1 加新 skill 时**零架构改动**，只新增 skill 目录。

### 6.5.1 为什么 MVP-0 就要写

MVP-0 注册的 skill 只有一个（`render-spec`），看上去不需要调度系统。但**架构债越早还越便宜**：如果 MVP-0 把 skill 选择写死成常量，MVP-1 加 `render-adr` / `render-change` / `render-review` 时必须先重构入口。提前 35 行代码，下个里程碑直接增量加 skill 目录就行。

### 6.5.2 函数契约

`src/skills/registry.ts` 导出一个纯函数：

```typescript
export type SkillId = string;

export type SkillSelectionInput = {
  frontmatter: Record<string, unknown>;
  filepath: string;                    // absolute or workspace-relative
  cliOverride?: SkillId;               // from `--skill` flag
};

export type SkillSelection = {
  skillId: SkillId;
  reason:
    | "cli-flag"
    | "frontmatter-render-skill"
    | "frontmatter-kind"
    | "filename-pattern"           // MVP-1
    | "directory-pattern"          // MVP-1
    | "fallback";
  matched_skills?: SkillId[];          // 多个匹配时记录（debug 用）
};

export function selectSkill(input: SkillSelectionInput): SkillSelection;
```

返回时附带 `reason` 是为了 `--verbose` 输出 + 未来 UI 上"为什么选了这个 skill"的解释。

### 6.5.3 选择优先级（6 层，从 CLI 到 fallback）

按下面顺序逐层试，第一个命中就返回：

| 层 | 信号 | MVP-0 实现 |
|---|---|---|
| 1 | CLI `--skill <name>` 显式指定 | ✅ |
| 2 | Frontmatter `render_skill: <name>` 文档自己声明 | ✅ |
| 3 | Frontmatter `kind:` ∈ skill 的 `applies_to.frontmatter_kind` | ✅ |
| 4 | 文件名匹配 skill 的 `applies_to.filename_patterns` | ⏸ MVP-1 |
| 5 | 目录匹配 skill 的 `applies_to.directory_patterns` | ⏸ MVP-1 |
| 6 | Fallback: `render-spec` | ✅ |

MVP-0 实际只跑 1 / 2 / 3 / 6；4-5 在 registry.ts 里**预留空分支**，加 `// TODO MVP-1` 注释。MVP-1 填实现。

### 6.5.4 SKILL.md `applies_to` 字段约定

每个 SKILL.md frontmatter 必须有：

```yaml
---
name: render-spec
applies_to:
  frontmatter_kind: ["spec", "mvp-spec", "vision-spec"]    # 第 3 层
  filename_patterns: ["*-spec.md", "*-vision-spec.md"]      # 第 4 层 (MVP-1)
  directory_patterns: ["docs/specs/**"]                     # 第 5 层 (MVP-1)
  priority: 10                                              # 多个 skill 命中时的优先级 (高优先)
---
```

MVP-0 阶段 render-spec/SKILL.md 必须把这四个字段全部填好 —— **即使 4/5 层在 MVP-0 还没生效**。这是把"未来扩展的合约"刻进 schema，让 MVP-1 加 skill 时只需照抄结构。

### 6.5.5 代码骨架（约 35 行）

```typescript
// src/skills/registry.ts
import { loadAllSkills, type SkillMeta } from "./loader.js";

const FALLBACK: SkillId = "render-spec";

export function selectSkill(input: SkillSelectionInput): SkillSelection {
  const skills = loadAllSkills();
  const has = (id: SkillId) => skills.some(s => s.id === id);

  // Layer 1: CLI override
  if (input.cliOverride) {
    if (!has(input.cliOverride)) {
      throw new Error(`unknown skill: ${input.cliOverride}`);
    }
    return { skillId: input.cliOverride, reason: "cli-flag" };
  }

  // Layer 2: frontmatter render_skill
  const fmSkill = input.frontmatter.render_skill;
  if (typeof fmSkill === "string" && has(fmSkill)) {
    return { skillId: fmSkill, reason: "frontmatter-render-skill" };
  }

  // Layer 3: frontmatter kind
  const fmKind = input.frontmatter.kind;
  if (typeof fmKind === "string") {
    const matches = skills.filter(s =>
      s.applies_to.frontmatter_kind?.includes(fmKind)
    );
    if (matches.length) return pickByPriority(matches, "frontmatter-kind");
  }

  // Layer 4, 5: filename / directory patterns
  // TODO MVP-1: implement here. See §6.5.3 table.

  // Layer 6: fallback
  return { skillId: FALLBACK, reason: "fallback" };
}

function pickByPriority(skills: SkillMeta[], reason: SkillSelection["reason"]): SkillSelection {
  const sorted = [...skills].sort(
    (a, b) => (b.applies_to.priority ?? 0) - (a.applies_to.priority ?? 0)
  );
  return {
    skillId: sorted[0].id,
    reason,
    matched_skills: sorted.length > 1 ? sorted.map(s => s.id) : undefined,
  };
}
```

行数：~38 行。如承诺。

### 6.5.6 MVP-1 加新 skill 的工作量

MVP-1 加 `render-adr` 的全部步骤：

1. `mkdir src/skills/render-adr/`
2. 写 `SKILL.md` 含 `applies_to: { frontmatter_kind: ["adr"], filename_patterns: ["*-adr-*.md"] }`
3. 写 `template.html` / `style.css` / `example.html`
4. **`registry.ts` 不动**（`loadAllSkills()` 自动发现）
5. 在 MVP-1 时实现 layer 4 / 5 的 pattern 匹配（一次性工作，所有 skill 受益）

**核心承诺**：加 skill 不改 registry。这是 §6.5 存在的全部目的。

### 6.5.7 CLI 改动

`src/cli.ts` 的 render 命令调用更新为：

```typescript
const { data: fm } = parseFrontmatter(md);
const selection = selectSkill({
  frontmatter: fm,
  filepath: inputAbs,
  cliOverride: argv.skill,    // undefined when --skill not passed
});
if (argv.verbose) {
  console.log(`selected skill: ${selection.skillId} (${selection.reason})`);
}
const html = await render({
  markdown: md,
  skillId: selection.skillId,
  withToc: argv.toc,
});
```

§4 CLI 中 `--skill` 语义已经在前面同步更新：从"必填，默认 render-spec"改为"覆盖自动选择"。

### 6.5.8 验收追加项

§13 验收检查清单加 3 条（已隐含写入 §13 列表中）：

- [ ] `dossier render <spec.md>` 不传 `--skill`，`--verbose` 输出 `selected skill: render-spec (frontmatter-kind)`
- [ ] `dossier render <spec.md> --skill bogus-name` 报错退出码 3，不 silent fallback
- [ ] Frontmatter 显式写 `render_skill: render-spec` 时，`--verbose` 输出 reason 为 `frontmatter-render-skill`

### 6.5.9 何时需要修改 registry 本身

未来真正需要改 registry.ts 的情形（不是加 skill）：

- 引入第 7 层 AI 分类（MVP-2）→ 在 layer 5 之后插一个 LLM 调用层
- 引入"多个 skill 同时命中且 priority 相同" → 需要 disambiguation UI / 提示
- 引入 block-level skill（同一文档不同节用不同样式）→ 这是大重构，远期再说

MVP-0 内只关心：写好 skeleton，把 TODO 注释留对位置。

## 7. Markdown 约定 / 语义启发（MVP-0 支持的全集）

| markdown 形态 | 渲染为 | 注 |
|---|---|---|
| frontmatter (`--- ... ---`) | 顶部 `.frontmatter` card | `title` 必需；`status` 渲染为 badge；`owner` / `created` / `updated` / `implements` / `reviews` 渲染为 meta-grid |
| h1 (单数) | 不直接渲染（作为 `<title>` 和 frontmatter card 标题） | 一份文档应该只有一个 h1 |
| h2 | 包裹 `<section id="s{N}">`，h2 自动加 `<span class="sec-num">§ N</span>` | N 是文档中第 N 个 h2 |
| h3 | 普通 `<h3>`，前缀 `<span class="sub-num">{N}.{M}</span>` 取自 markdown 内文（如果以 `数字.数字` 开头）| |
| `> ⚠️ ...` | `.callout.warn` | 仅文档顶部的 callout 区识别 |
| `> 📝 ...` / `> 🎯 ...` | `.callout` 不同变体 | |
| 普通 blockquote | `<blockquote>` 默认样式 | |
| ```` ```lang ```` | `<pre><code class="lang-xxx">` | 不做真正高亮 |
| 行内 `code` | `<code>` 默认浅红 | |
| GFM 表格 | 自动应用 `.table` 样式 | |
| `<pre>` 中含 `┌─` `│` `└─` 之一 | 加 `.ascii-diagram` class | semantic pass 检测 |
| 链接 | 普通 `<a>` 蓝色下划线 | |
| 行内 `**` `*` | 标准 | |
| `---` 分隔 | `<hr>` | |

**不识别**（MVP-0）：
- 自定义 `:::admonition` 块
- mermaid / 图表
- footnotes
- 任务列表（`- [ ]`）

## 8. 关键代码骨架

### 8.1 `src/cli.ts`

```typescript
#!/usr/bin/env node
import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { render } from "./render.js";
import { fileURLToPath } from "node:url";

type Argv = {
  command: string;
  input?: string;
  out?: string;
  skill: string;
  toc: boolean;
};

function parseArgv(argv: string[]): Argv | { error: string } {
  const a: Argv = { command: "", skill: "render-spec", toc: true };
  // ... 手写解析: render <input> [-o ...] [-s ...] [--no-toc]
  return a;
}

async function main() {
  const argv = parseArgv(process.argv.slice(2));
  if ("error" in argv) { console.error(argv.error); process.exit(1); }
  if (argv.command !== "render") { /* help */ process.exit(0); }
  const inputAbs = resolve(argv.input!);
  await access(inputAbs).catch(() => { console.error("input missing"); process.exit(1); });
  const md = await readFile(inputAbs, "utf8");
  const html = await render({ markdown: md, skillId: argv.skill, withToc: argv.toc });
  const outAbs = argv.out ? resolve(argv.out) : inputAbs.replace(/\.md$/i, ".html");
  await writeFile(outAbs, html, "utf8");
  console.log(`wrote ${outAbs} (${html.length} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(64); });
```

### 8.2 `src/render.ts`

```typescript
import { parseFrontmatter } from "./parse/frontmatter.js";
import { parseMarkdown } from "./parse/markdown.js";
import { extractToc } from "./parse/toc.js";
import { applySemantic } from "./parse/semantic.js";
import { loadSkill } from "./skills/loader.js";
import { emit } from "./emit.js";

export async function render(opts: {
  markdown: string;
  skillId: string;
  withToc: boolean;
}): Promise<string> {
  const { data: fm, content } = parseFrontmatter(opts.markdown);
  const ast = parseMarkdown(content);
  applySemantic(ast);                          // mutate ast
  const toc = opts.withToc ? extractToc(ast) : null;
  const skill = await loadSkill(opts.skillId);
  return emit({ fm, ast, toc, skill });
}
```

### 8.3 测试用例（最小集）

```typescript
// tests/render-spec.test.ts
import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { render } from "../src/render";

test("MVP-0 端到端: vision spec → HTML", async () => {
  const md = await readFile(
    "docs/specs/2026-05-17-dossier-vision-spec.md", "utf8"
  );
  const html = await render({ markdown: md, skillId: "render-spec", withToc: true });

  // 强制断言
  expect(html).toMatch(/<title>Dossier/);
  expect(html.length).toBeLessThan(100_000);          // < 100KB
  expect(html).toMatch(/aside class="toc"/);
  expect((html.match(/<section id="s\d+"/g) ?? []).length).toBeGreaterThanOrEqual(17);
  expect(html).toMatch(/badge draft/);                 // status badge
  expect(html).toMatch(/callout warn/);                 // 顶部 ⚠ callout
  expect(html).toMatch(/ascii-diagram/);                // §4 架构图
  expect(html).not.toMatch(/<script src=/);             // 无外链 script
  expect(html).not.toMatch(/<link[^>]+href="http/);     // 无外链 css
});

test("minimal: 没有 frontmatter 也要能渲染", async () => {
  const md = "# Hello\n\n## Section A\n\nHi.\n";
  const html = await render({ markdown: md, skillId: "render-spec", withToc: true });
  expect(html).toMatch(/<title>Hello<\/title>/);
});
```

## 9. 构建与发布

### 9.1 `package.json`（关键片段）

```json
{
  "name": "dossier",
  "version": "0.0.1",
  "private": false,
  "type": "module",
  "bin": { "dossier": "./bin/dossier.js" },
  "files": ["bin", "dist", "README.md", "LICENSE"],
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc -p .",
    "test": "vitest run",
    "render:self": "tsx src/cli.ts render docs/specs/2026-05-17-dossier-vision-spec.md"
  },
  "dependencies": {
    "marked": "^18.0.3",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.20.0",
    "vitest": "^3.0.0",
    "@types/node": "^20.0.0"
  },
  "engines": { "node": ">=20" }
}
```

### 9.2 发布策略

- **MVP-0**: 不发 npm。用 `pnpm dev`（tsx）即可，`pnpm render:self` 是日常 dogfood 命令。
- **MVP-0 完成验收后**: 发 npm `0.0.1`，让别人能 `npx dossier@0.0.1 render foo.md` 尝鲜。

## 10. 时间线（1-2 周）

按"先骨架后细节"组织。每天 1-2 项可见进展。

### Day 1 — 项目初始化（半天）
- [ ] `pnpm init`、写 package.json / tsconfig.json
- [ ] 跑通 `pnpm dev render --help` 输出 help 文本
- [ ] 跑通 `pnpm test` 至少有一个 dummy test 通过

### Day 2-3 — markdown 解析层
- [ ] `parse/frontmatter.ts` + gray-matter 包装
- [ ] `parse/markdown.ts` + marked 配置
- [ ] `parse/toc.ts` 抓 h2 + h3 → 嵌套结构
- [ ] 写至少 3 个 fixture markdown + 测试通过

### Day 4-5 — semantic pass + skill 装配 + registry
- [ ] `parse/semantic.ts`：blockquote → callout / pre → ascii-diagram / h2 → section wrap
- [ ] `skills/render-spec/` 完整移植手工版的 CSS / JS
- [ ] `skills/loader.ts`：扫描 `skills/*/SKILL.md` 加载到内存
- [ ] `skills/registry.ts`：实现 §6.5.5 的 selectSkill（layer 1/2/3/6）
- [ ] `emit.ts` 拼接 + placeholder 替换

### Day 6-7 — 端到端 dogfood
- [ ] 跑 `pnpm render:self` 出 HTML
- [ ] 浏览器打开手动 review，对比手工版，列差距
- [ ] 修补差距，直到验收 1-10 全部通过

### Day 8-10 — 打磨与边界（可选缓冲）
- [ ] 错误处理：缺失 frontmatter / 损坏 markdown / 未知 skill
- [ ] README + 一个 GIF demo
- [ ] **发 npm 0.0.1**

### Day 11-14 — 缓冲 / 早期 MVP-1 准备
- [ ] 写 MVP-1 实施 spec 的初稿
- [ ] 如果时间允许：尝试增量功能（admonition 解析、user story 卡片样式）

## 11. 风险与缓解

| 风险 | 触发 | 缓解 |
|---|---|---|
| marked@18 自定义 renderer API 比预想难用 | Day 2-3 卡住 | fallback: 用 marked 默认 renderer + 字符串后处理 |
| 视觉精度不到验收软标准 80% | Day 6-7 review 不过 | 把 acceptance 软标准降到 70%，把视觉精度差距列入 MVP-1 backlog |
| frontmatter 解析 edge case 多（嵌套 / 多行字符串 / 数组） | Day 2 | gray-matter 已成熟，只要 fail-fast 报错即可 |
| ASCII diagram 检测启发误判 | Day 4-5 | 加白名单：只对开头出现 `┌─` `┐` `└─` `┘` 字符的 pre 块加 class，其他保持 |
| 单文件 HTML 太大（> 100KB） | Day 6-7 | CSS 已经够小（~10KB），主要是内容；如果超 100KB，移除一些 fallback class |
| 后续 SKILL 想加但 placeholder 抽象不够灵活 | MVP-1 时 | 接受 placeholder 在 MVP-0 是写死的，MVP-1 重构为真正模板引擎 |

## 12. Dogfood 闭环（项目的第一个里程碑事件）

**M0 完成的标志事件**：

1. 在 `dossier/` 目录跑 `pnpm render:self`
2. 浏览器打开新生成的 `docs/specs/2026-05-17-dossier-vision-spec.html`
3. **它替换掉 2026-05-17 当天我们手写的那一份 HTML，且我们看了之后说"这个比手写的还顺"**
4. 把生成的 HTML commit 进 repo（vision spec 的 frontmatter 加 `implements: [...]` 指回这份 MVP-0 spec）
5. 在 README 里贴一张这份 HTML 的截图

**这是项目第一次"自己渲染自己"的时刻。**

## 13. 验收检查清单

完成 MVP-0 = 下列所有项打勾。

- [ ] §1.3 验收强制标准 1-10 全部通过
- [ ] `pnpm test` 全绿
- [ ] `pnpm render:self` 单次跑通，无 warning
- [ ] 输出 HTML 文件大小 < 100KB
- [ ] 关掉网络后双击输出 HTML 仍能完美显示（验证零外链）
- [ ] 把输出 HTML 通过 iMessage / 微信发给一个朋友，对方打开能阅读
- [ ] vision spec frontmatter 的 `implements: []` 加上本文档路径
- [ ] 本文档 status: draft → ready → implemented
- [ ] 写一段 `docs/changes/2026-MM-DD-dossier-mvp-0-impl-notes.md`，记录实际遇到的偏差和决策变化
- [ ] `dossier render <spec.md> --verbose` 输出 `selected skill: render-spec (frontmatter-kind)` —— 来自 §6.5.8
- [ ] `dossier render <spec.md> --skill bogus-name` 报错退出码 3，不 silent fallback —— 来自 §6.5.8
- [ ] Frontmatter 显式写 `render_skill: render-spec` 时，`--verbose` 输出 reason 为 `frontmatter-render-skill` —— 来自 §6.5.8

## 14. 不在此 spec 范围、但 MVP-1 要立刻接的工作

- 设计 admonition / directive 语法，让 user story 卡片、ladder、命名卡能从 markdown 写出而不是手工 HTML
- 引入更多 SKILL：`render-adr` / `render-change-note` / `render-review`
- Dossier-0：扫描目录、聚合多文档、生成 index.html
- 文件名公共前缀 + frontmatter implements 字段的 dossier 识别

## 15. 开放问题（不阻塞 MVP-0 启动，但要在过程中决断）

| Q | 问题 | 何时决断 |
|---|---|---|
| Q1 | h2 自动加 `§ N` 是不是 hardcoded？如果用户 markdown 里已经写了 "1. " 是不是会重复？ | Day 4 视觉 review 时定 |
| Q2 | frontmatter 里的 `implements: [...]` 当前 MVP-0 不渲染关系，但要不要在 meta-grid 里至少显示为链接？ | Day 5 |
| Q3 | 中文 / 英文混排时 TOC 文字截断怎么处理（短中文 vs 长英文标题）？ | Day 6 dogfood 看实际效果 |
| Q4 | 错误信息走中文还是英文？ | Day 1 选英文（更可移植），但允许后续 i18n |

## 16. 下一步（本 spec 通过后）

1. 切 `status: ready`
2. 在 `dossier/` 跑 `pnpm init`，开始 Day 1
3. 每完成一个 day 的 todo，在本 spec 的"§ 10 时间线"勾掉
4. M0 完成后：
   - 把本 spec 切到 `status: implemented`
   - vision spec 的 frontmatter 补 `implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]`
   - 写 MVP-1 实施 spec
