---
title: Dossier Day 1 — 项目骨架搭建实施记录
status: implemented
owner: claude
created: 2026-05-18
updated: 2026-05-19
implements: ["docs/specs/2026-05-18-dossier-mvp-0-spec.md"]
covers_timeline: "Day 1"
reviews: []
---

## 上下文

vision spec + MVP-0 spec 通过，命名定为 `dossier`（npm: `@xforg/dossier`）。本次落实 MVP-0 §10 时间线的 Day 1 三项 + 项目重命名 + spec 引用更新 + Codex 交接 brief。

## 完成项（按时间线 Day 1）

- [x] `mv AI_SPACE/agentstory AI_SPACE/dossier`
- [x] Rename 两份 spec md 文件（不动 v1 handcrafted html）
- [x] 全文 replace `AgentStory` → `Dossier` / `agentstory` → `dossier`，并修正 3 处 v1 HTML 路径引用、§16 命名表清理
- [x] 两份 spec `status: draft → ready`
- [x] `pnpm init` 等价（手写 package.json，scope `@xforg/dossier`）
- [x] `tsconfig.json`（NodeNext + ESM + strict）
- [x] `.gitignore` / `README.md` / `LICENSE`（Apache-2.0）
- [x] `bin/dossier.js`
- [x] `src/cli.ts` 完整实现：argv 解析、help、错误码、调度
- [x] `src/types.ts` 完整类型定义
- [x] `src/skills/registry.ts` 完整实现（Day 1 覆盖 layer 1/2/3/6；layer 4/5 已在 `docs/changes/2026-05-19-dossier-p0-p1-backlog-impl-notes.md` 接续实现）
- [x] `src/skills/loader.ts` 完整实现
- [x] `src/skills/render-spec/SKILL.md` 完整元数据
- [x] `src/skills/render-spec/toc-script.js` 移植自 spec
- [x] `src/render.ts` / `src/emit.ts` / `src/parse/*` 4 个 stub（含 TODO + spec 反链）
- [x] `src/skills/render-spec/template.html` 骨架
- [x] `src/skills/render-spec/style.css` 占位（含必须覆盖的 class 清单）
- [x] `src/skills/render-spec/example.html` 占位
- [x] `tests/fixtures/minimal.md`
- [x] `tests/render-spec.test.ts`（1 smoke + 3 skipped 端到端）
- [x] `pnpm install` + `pnpm approve-builds esbuild`
- [x] **验收 1**: `pnpm typecheck` clean
- [x] **验收 2**: `pnpm dev --help` 输出预期 help
- [x] **验收 3**: `pnpm test` 1 passed / 3 skipped（智能 skip 是预期）
- [x] Codex handoff brief 写在 `docs/specs/2026-05-18-codex-handoff-brief.md`

## 与 spec 的偏差（none material）

- 无 ADR 改动
- 无 API 表面改动
- 一处小 fix: spec §6.5.5 代码示例用了 `Tokens.Token`，marked@18 实际导出是 `Token`（顶层），已在 `src/parse/markdown.ts` 用正确类型

## 没做的（明确推迟到 Codex）

- `parseFrontmatter` / marked 解析 / semantic pass / toc 抽取的实际逻辑
- template.html / style.css 从 v1 手工版 HTML 移植
- 端到端测试 un-skip
- `pnpm render:self` 跑通

## 文件清单（写入 24 个新文件）

```
dossier/
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── pnpm-lock.yaml                          (pnpm 自动生成)
├── bin/dossier.js
├── src/
│   ├── cli.ts
│   ├── render.ts                            (stub)
│   ├── emit.ts                              (stub)
│   ├── types.ts
│   ├── parse/
│   │   ├── frontmatter.ts                   (stub)
│   │   ├── markdown.ts                      (stub)
│   │   ├── toc.ts                            (stub)
│   │   └── semantic.ts                      (stub w/ helper fns)
│   └── skills/
│       ├── registry.ts
│       ├── loader.ts
│       └── render-spec/
│           ├── SKILL.md
│           ├── template.html                 (skeleton)
│           ├── style.css                     (placeholder)
│           ├── toc-script.js
│           └── example.html                  (placeholder)
├── tests/
│   ├── fixtures/minimal.md
│   └── render-spec.test.ts
└── docs/
    ├── changes/2026-05-18-dossier-day-1-scaffolding-impl-notes.md   ← 本文档
    └── specs/
        ├── 2026-05-17-agentstory-vision-spec.html                    (v1 baseline, kept)
        ├── 2026-05-17-dossier-vision-spec.md                         (status: ready)
        ├── 2026-05-18-dossier-mvp-0-spec.md                          (status: ready)
        └── 2026-05-18-codex-handoff-brief.md                         (status: ready)
```

## 下一步（Codex）

见 `docs/specs/2026-05-18-codex-handoff-brief.md`。

## 下一步（Claude）

等 Codex 提交，review + 验收。

## Note

- 没 `git init`。用户可按需自行 init。
- 没发 npm。MVP-0 spec §9.2 明确发布推迟到 Day 10 验收后。
