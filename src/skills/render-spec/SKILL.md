---
name: render-spec
label: "Spec / ADR document"
description: 渲染一份 vision spec / 实施 spec / ADR 类设计文档为可扫读、可分享的单文件 HTML
mode: document
scenario: engineering
aspect_hint: "可滚动竖版，最大宽度 760px 正文 + 260px 左 TOC"
recommended: 1
applies_to:
  frontmatter_kind: ["spec", "mvp-spec", "vision-spec", "adr", "decision"]
  filename_patterns: ["*-spec.md", "*-vision-spec.md", "*-mvp-*-spec.md", "*-adr-*.md"]
  directory_patterns: ["docs/specs/**", "docs/adr/**"]
  priority: 10
mvp_ai_required: false
example_id: dossier-vision-spec
---

【模板用途】渲染本仓库 `docs/specs/` 下的设计文档为可扫读、可分享的单文件 HTML。

【视觉语言铁律】
- 配色: 暖白底 `#faf9f6`, 墨黑文字 `#1a1a1a`, 深靛蓝 accent `#1e3a8a`, 警告 `#991b1b`, 提问 `#92400e`
- 字体: system-ui / PingFang SC 正文, JetBrains Mono 代码
- 1px hairline 边框, 不用阴影 / 模糊
- callout 用左侧 3px 色条区分 (warn / note / goal)
- 代码块用 `#f4f2eb` 浅米底
- 表格 th 用浅灰底, td hairline 分割
- 左侧 sticky TOC, 滚动联动高亮
- 文档最大宽度 760px 正文
- 整体单文件, CSS / JS 全部 inline

【结构编排原则】
- 如果文档包含明确阶段、路线图、里程碑或学习路径，`roadmap` / 主流程必须紧跟总览之后出现。
- 多阶段路线必须先给全路径速览，再给详细卡片；即使详细卡片为了密度折叠，读者也应一眼看到所有阶段名称。
- 结构图、关系图、frontmatter 历史和证据链是支撑层；它们不应挡在学习路线或执行路线之前。
- 面向小白读者的第一屏目标是先形成“我该按什么阶段理解这件事”的心智模型，再进入结构、关系和原文细节。

【未来 AI 钩子】(MVP-0 不调用; MVP-2 可启用)
当 `mvp_ai_required: true` 时, AI 应:
- 抽取每个 section 的 1 句话摘要写入侧栏
- 生成一段 ≤ 100 字的 dossier description
