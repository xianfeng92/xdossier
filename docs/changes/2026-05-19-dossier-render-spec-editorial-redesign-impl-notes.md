---
title: Dossier render-spec editorial redesign (T1 + T2-7)
status: implemented
owner: claude
created: 2026-05-19
updated: 2026-05-19
implements:
  - docs/specs/2026-05-18-dossier-mvp-0-spec.md
reviews:
  - docs/reviews/2026-05-19-dossier-cover-implementation-review.md
---

# Dossier render-spec editorial redesign (T1 + T2-7)

承接 finetune-lab roadmap 试点的严苛设计 review，把 render-spec skill 的视觉语言
对齐 dossier README 已经声明的 design philosophy
([thariqs/html-effectiveness](https://thariqs.github.io/html-effectiveness/))
中"editorial / book-like"基调。

## Implemented

### T1 — 视觉 token 升级（CSS-only）

- `--font-display`: Charter / Source Serif Pro / Iowan Old Style / Georgia / Songti SC / Noto Serif SC 系，应用到所有 heading + `<em>` + 副标题
- `--font-mono`: 提到 token，所有 mono 引用统一
- `--accent`: `#1e3a8a` → `#b85c3d` terracotta，配套 `--accent-soft` 暖米色
- inline code `color`: 高饱品红 `#be185d` → `var(--ink)`，保留米底
- `section { margin-bottom: 56px → 88px }`，节间呼吸感跟上参考
- `em` 独立设 italic + serif，emphasis 由 weight 改为 style

### T2-7 — Frontmatter card 重构

旧版：单个 white card，9 行 implements + 2 行 reviews 长 path 撑爆第一屏。

新版（对位 thariqs Implementation Plan demo 的 eyebrow + stat 模式）：

```html
<header class="frontmatter">
  <p class="eyebrow">MVP SPEC</p>              <!-- 仅当 frontmatter.kind 存在 -->
  <h1>{{title}}</h1>
  <p class="subtitle">{{subtitle}}</p>          <!-- 仅当 title 含 " — " -->
  <div class="stat-row">
    <span class="badge ok">implemented</span>
    <span class="stat"><span class="stat-label">Updated</span> 2026-04-22</span>
    <span class="stat"><span class="stat-label">Owner</span> codex</span>
    <span class="stat"><span class="stat-label">Implements</span> 7</span>
    <span class="stat"><span class="stat-label">Reviews</span> 2</span>
  </div>
  <details class="frontmatter-details">           <!-- 默认折叠 -->
    <summary>7 implements · 2 reviews</summary>
    <div class="relation-block">
      <p class="relation-label">Implements</p>
      <ul class="relation-list"><li><code>...</code></li>...</ul>
    </div>
    <div class="relation-block">
      <p class="relation-label">Reviews</p>
      <ul class="relation-list">...</ul>
    </div>
  </details>
</header>
```

关键设计决策：

- **5 秒答案优先**：stat-row 给出 status / updated / owner / counts，path 详情藏在 details
- **eyebrow 来自 frontmatter.kind**：无 kind 字段则不渲染，零硬编码
- **counts 在 stat-row + 完整路径在 details** 是同一信息两种粒度，互补不冲突
- **`<details>` 默认 closed**：用户主动选择是否展开

### 顺带改善

- H2 `.sec-num` 加 accent-soft 暖米底胶囊样式，节编号从"挤在 H2 内"升级到"独立左侧标签"，对位参考站 `01 · Milestones` 模式
- H3 sub-num 字号 + 间距微调
- TOC 改 `grid-template-columns: 36px 1fr`，长 H3 标题换行内部对齐（D7 残余）
- TOC sub-num 字号 11px → 12px，提升可读性（D5）

## Not Changed

- D6（scroll-spy 加 H3 active）：toc-script.js 需重写 IntersectionObserver 范围，下一轮
- D11/D12（阅读时长 / 移动 drawer TOC）：下一轮
- D9（list bullet 自定义）：下一轮
- F8（confidence binary / next_action 硬编码）：cover 而非 render-spec 的问题，独立 backlog

## Verification

```
pnpm typecheck       → clean
pnpm test            → 31 tests / all pass
pnpm dev render /Users/xforg/AI_SPACE/finetune-lab/docs/specs/2026-04-22-finetune-lab-gemma4-e2b-learning-roadmap-spec.md
  → 26293 bytes (修复前 24600, +1693 主要为 stat-row + details + relation-block CSS/HTML)
```

视觉对比（Claude in Chrome + macOS 1538px viewport）：

| | 修前 | 修后 |
|---|---|---|
| 第一屏 frontmatter card 高度 | ~600px | ~290px |
| 第一屏可见正文 | 0（§1 标题刚压 fold） | §1 标题 + 第一段 + 第一个有序列表完整可见 |
| Heading 字体 | system-ui sans | Charter/Georgia serif |
| Accent 色 | 冷蓝 #1e3a8a | 暖陶 #b85c3d |
| 节编号位置 | 挤在 H2 文字内 | accent-soft 米底胶囊独立左侧 |
| inline code 色 | 抢戏品红 | 服从段落的 ink 色 |
| implements 路径展示 | 默认显示 7 行 path | 折叠为 `▸ 7 IMPLEMENTS · 2 REVIEWS`，点开看 |

## 残留 & 后续

T2-6（节编号外置改 grid 双列布局，跟参考站 `01 Milestones` 完全对齐）、T2-8（TOC 行为分级长短文档）、D6/D9/D11/D12 都先压着，下一轮做。

这一轮的核心收益是：dossier 自此**真正兑现 README 里声明的 design philosophy**，
跨项目 spec 渲染产物已经达到"可对外分享的文档"质感。
