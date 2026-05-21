import { spawn } from "node:child_process";
import type { RenderAnnotations } from "../types.js";
import { parseAnnotationsJson } from "../annotations.js";
import { createSectionSummaryScaffold } from "./section-summaries.js";

export type EnrichProvider = "scaffold" | "codex" | "claude";

export type AgentCliRunOptions = {
  cwd: string;
  input: string;
  timeoutMs?: number;
};

export type AgentCliRunResult = {
  stdout: string;
  stderr: string;
};

export type AgentCliRunner = (
  command: string,
  args: string[],
  options: AgentCliRunOptions,
) => Promise<AgentCliRunResult>;

export type AgentEnrichOptions = {
  provider: Exclude<EnrichProvider, "scaffold">;
  cwd: string;
  model?: string;
  timeoutMs?: number;
  runner?: AgentCliRunner;
  onWarning?: (message: string) => void;
};

export async function createSectionSummariesWithAgent(
  markdown: string,
  options: AgentEnrichOptions,
): Promise<RenderAnnotations> {
  const prompt = buildSectionSummaryPrompt(markdown);
  const command = options.provider === "codex" ? "codex" : "claude";
  const args = commandArgs(options.provider, options.model);
  const runner = options.runner ?? defaultAgentCliRunner;
  const result = await runner(command, args, {
    cwd: options.cwd,
    input: prompt,
    timeoutMs: options.timeoutMs,
  });
  const annotations = parseAgentAnnotationsOutput(result.stdout, options.provider, markdown, options.onWarning);
  return {
    ...annotations,
    source: annotations.source?.endsWith(":fallback")
      ? annotations.source
      : `dossier-enrich:${options.provider}`,
  };
}

export function buildSectionSummaryPrompt(markdown: string): string {
  const scaffold = createSectionSummaryScaffold(markdown);
  return `You are enriching a Dossier markdown document for human reading.

Return ONLY valid JSON. No markdown fences, no prose.

Use this exact schema:
{
  "schema_version": 2,
  "source": "dossier-enrich:agent",
  "content_mode": "concept",
  "document_overview": {
    "summary": "One sentence describing the document's core decision or purpose.",
    "reader_goal": "What the reader can understand or do after reading.",
    "status_note": "Current state, boundary, or decision status.",
    "next_step": "Recommended next action."
  },
  "reading_path": [
    {
      "label": "Short step label",
      "section_id": "s1",
      "description": "Why this section matters."
    }
  ],
  "semantic_blocks": [
    {
      "type": "structure_map",
      "title": "Document model",
      "source_section_id": "s1",
      "summary": "How the main concepts in this document connect.",
      "nodes": [
        {
          "id": "context",
          "label": "Context",
          "kind": "context",
          "summary": "What this concept contributes to understanding the document.",
          "section_id": "s1"
        },
        {
          "id": "next_step",
          "label": "Next step",
          "kind": "action",
          "summary": "What the context leads the reader to do.",
          "section_id": "s2"
        }
      ],
      "edges": [
        {
          "from": "context",
          "to": "next_step",
          "label": "frames"
        }
      ]
    },
    {
      "type": "relationship_map",
      "title": "Artifact relationships",
      "source_section_id": "s1",
      "summary": "How source artifacts, decisions, or components depend on each other.",
      "items": [
        {
          "from": "Vision spec",
          "relation": "frames",
          "to": "MVP spec",
          "evidence": "The MVP spec implements the vision contract.",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "concept_glossary",
      "title": "Core concepts",
      "source_section_id": "s1",
      "items": [
        {
          "term": "Artifact",
          "plain_language": "A source document or output the reader needs to understand.",
          "example": "A vision spec, review note, or change note.",
          "model_field": "Artifact.kind",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "roadmap",
      "title": "Roadmap title",
      "source_section_id": "s1",
      "summary": "What this staged path explains.",
      "items": [
        {
          "label": "Level 1",
          "title": "Stage title",
          "summary": "What the stage means.",
          "outputs": ["concrete output"],
          "section_id": "s1-1"
        }
      ]
    },
    {
      "type": "decision_grid",
      "title": "Key decisions",
      "source_section_id": "s1",
      "items": [
        {
          "label": "Decision label",
          "value": "Chosen value",
          "rationale": "Why it was chosen.",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "principle_grid",
      "title": "Design principles",
      "source_section_id": "s1",
      "items": [
        {
          "label": "Principle label",
          "guidance": "What the principle asks the reader or implementer to preserve.",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "evidence_grid",
      "title": "Evidence",
      "source_section_id": "s1",
      "items": [
        {
          "label": "Evidence label",
          "evidence": "What proves the claim.",
          "source": "Command, artifact, file, or method.",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "risk_register",
      "title": "Risks",
      "source_section_id": "s1",
      "items": [
        {
          "label": "Risk label",
          "trigger": "What causes or exposes the risk.",
          "impact": "What breaks or becomes harder.",
          "mitigation": "How the document proposes to reduce the risk.",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "scope_boundary",
      "title": "Scope boundaries",
      "source_section_id": "s1",
      "in_scope": ["What this document explicitly includes"],
      "out_of_scope": ["What this document explicitly excludes"]
    },
    {
      "type": "checklist",
      "title": "Acceptance checks",
      "source_section_id": "s1",
      "items": [
        {
          "label": "Check label",
          "detail": "How a reader can verify it.",
          "status": "required",
          "section_id": "s1"
        }
      ]
    },
    {
      "type": "open_questions",
      "title": "Open questions",
      "source_section_id": "s1",
      "items": [
        {
          "question": "What remains undecided?",
          "context": "Why this question exists.",
          "impact": "What it blocks or changes.",
          "status": "open",
          "section_id": "s1"
        }
      ]
    }
  ],
  "section_summaries": [
    {
      "section_id": "s1",
      "summary": "One clear TLDR sentence.",
      "key_points": ["0-2 concrete points a reader should retain"],
      "reader_hint": "Optional short reading guidance."
    }
  ],
  "prerequisites": [
    {
      "term": "frontmatter",
      "plain_language": "markdown file's YAML metadata",
      "why_needed": "Dossier uses it to identify document type and status."
    }
  ],
  "checkpoints": [
    {
      "section_id": "s1",
      "items": ["Explain why the runtime mode is switched at read time"]
    }
  ],
  "analogies": [
    {
      "section_id": "s1",
      "concept": "content_mode",
      "analogy": "content_mode 就像菜单分类，因为它决定读者先看到哪类信息"
    }
  ]
}

Rules:
- document_overview is required and should make the HTML useful before reading the prose.
- content_mode should start from the scaffold value; override it only when the markdown clearly fits tutorial, concept, reference, or course better.
- reading_path should contain 3-5 jump links for the most useful sections. Use section ids from the scaffold.
- semantic_blocks should contain one structure_map when the document has several concepts a reader must relate. Use 3-6 nodes and 1-6 edges. Node id must start with a lowercase letter and use only lowercase letters, digits, underscores, or hyphens. Node kind must be one of context, path, decision, risk, evidence, output, question, or action.
- semantic_blocks should contain a relationship_map when the markdown explicitly describes artifact, component, decision, dependency, or upstream/downstream relationships. Each item requires from, relation, and to; include evidence only when the markdown provides it.
- semantic_blocks should contain a concept_glossary when the markdown defines key terms, vocabulary, domain concepts, or a table of concepts. Each item should include term and plain_language; add example and model_field when the markdown explicitly provides them.
- semantic_blocks should contain a roadmap when the markdown has levels, phases, milestones, or a staged workflow.
- semantic_blocks should contain a requirement_grid when the markdown has explicit requirement sections with grouped capabilities, UI requirements, implementation requirements, or H3 requirement cards. Each item requires label and requirements; detail is optional.
- semantic_blocks should contain a reference_list when the markdown has an explicit references, sources, bibliography, or further-reading section with links. Each item requires label and href; description is optional.
- semantic_blocks should contain a takeaway_grid when the markdown has explicit takeaways, lessons learned, inspiration, or "what this project should learn/adopt/absorb" lists. Each item requires label; detail is optional.
- semantic_blocks should contain a principle_grid when the markdown has explicit design principles, guidelines, tenets, or principle-labelled lists. Each item requires label and guidance.
- semantic_blocks should contain a decision_grid when the markdown has choices, defaults, or architectural decisions.
- semantic_blocks should contain an evidence_grid when the markdown has explicit evidence, proof, validation, verification results, benchmark results, review results, commands, artifacts, or source references.
- semantic_blocks should contain a risk_register when the markdown has explicit risks, mitigations, pitfalls, blockers, failure modes, or risk/mitigation tables.
- semantic_blocks should contain a scope_boundary when the markdown has goals, non-goals, exclusions, constraints, or explicit boundaries.
- semantic_blocks should contain a checklist when the markdown has acceptance criteria, completion gates, requirements, or launch/readiness checks.
- semantic_blocks should contain open_questions when the markdown has unresolved questions, risks waiting on decisions, explicit TODO decisions, or blocked next steps.
- For roadmap item section_id, use H3 ids when the scaffold/source makes them obvious; otherwise omit section_id.
- checklist item status must be one of required, open, or done.
- risk_register items require label and mitigation; trigger and impact are optional.
- open question status must be one of open, blocked, or answered.
- Use blocked when an open question blocks a next action, dependency, launch, or implementation decision.
- Use answered only when the markdown explicitly records the answer; otherwise keep unresolved questions open.
- Keep every section_id from the scaffold unless the section has no useful content.
- summary must be one concise sentence.
- key_points should contain at most 2 short, concrete bullets. Only include a third if skipping it would hide an essential point.
- reader_hint is optional; include it only when it helps the reader decide how to use the section.
- prerequisites: write 3-5 items for the whole document. List only concepts that truly block a zero-knowledge reader, not a glossary or terminology inventory. plain_language must be readable by a beginner and 25 Chinese characters or fewer when writing Chinese; why_needed is optional and should say why the concept is needed.
- checkpoints: write 0-3 items per H2 section. test understanding, not memorization. Each item should be a short "you should be able to..." sentence, 20 Chinese characters or fewer when writing Chinese. Do not fill every section; skip obvious license, acknowledgements, appendix, or low-learning sections.
- analogies: write at most 1 item per H2 section, and only when the concept is abstract enough to need an analogy. A vision spec should usually have only 2-3 analogies total. The analogy field must follow "X 就像 Y，因为 Z"; concept must be X.

Few-shot examples:
- Bad prerequisite: {"term":"render_skill","plain_language":"负责渲染的技能","why_needed":"本 spec 明确不替代现有 render_skill"}.
  Why bad: it repeats the term and explains document scope, not what a beginner must understand.
- Good prerequisite: {"term":"render_skill","plain_language":"把文档变成 HTML 的模块","why_needed":"读者要知道注解只是补结构，不接管渲染"}.
- Bad checkpoint: "能说出四种 mode".
  Why bad: it tests whether the reader memorized a list.
- Good checkpoint: "能判断何时切模式".
  Why good: it tests whether the reader can apply the concept.
- Bad analogy: {"concept":"content_mode","analogy":"content_mode 就像 content_mode，因为它决定 content_mode"}.
  Why bad: it uses the same jargon on both sides.
- Good analogy: {"concept":"content_mode","analogy":"content_mode 就像阅读档位，因为它决定同一份文档先给读者看什么"}.

Self-check before submitting:

PREREQUISITE self-check — for each prerequisite, ask:
  "If a reader who never heard of this term reads my plain_language, do they learn what the thing actually IS or DOES — or just a synonym rephrasing of the term itself?"
  - Synonym rephrasing test: "render_skill" → "负责渲染的技能" / "把文件渲染成页面的技能" — these FAIL because they only restate the words in the term. They contain no new information.
  - Mechanism test (passes): "render_skill" → "dossier 用来挑选 HTML 模板的标识，每个 kind 对应一个". This tells the reader what role render_skill plays (an identifier) and how it maps (one per kind).
  - Hard rule: if you delete plain_language and only show the term, would the reader miss any information? If the answer is no, rewrite plain_language to explain mechanism, role, scope, or concrete behavior.
  - why_needed must answer "why this prereq matters for understanding THIS document", not describe what the document does to the concept. "This spec does not replace render_skill" FAILS — it describes the spec. "Readers must know it exists because new pedagogy layer sits on top of it without changing it" PASSES.

CHECKPOINT selectivity self-check:
  - Aim for 4-6 sections with checkpoints in a 15-section document, not 8+. Most sections (overview, scope, license, name choice, open questions, next steps, risks already covered by callouts) do not need checkpoints.
  - Before adding a checkpoint to a section, ask: "is there a misunderstanding a beginner could form here that the checkpoint would catch?" If no clear misunderstanding to test, skip the section.

- Preserve the document language.
- Do not invent facts outside the markdown.
- Do not include HTML or markdown in any field.

Section id scaffold:
${JSON.stringify(scaffold, null, 2)}

Markdown document:
${markdown}
`;
}

export function parseAgentAnnotationsOutput(
  output: string,
  provider: Exclude<EnrichProvider, "scaffold">,
  markdown?: string,
  onWarning?: (message: string) => void,
): RenderAnnotations {
  const trimmed = output.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? extractFirstJsonObject(trimmed);
  try {
    return withAgentPedagogyDefaults(parseAnnotationsJson(candidate, `dossier-enrich:${provider}`));
  } catch (e) {
    if (markdown === undefined) throw e;
    const message = `failed to parse ${provider} output; using scaffold fallback: ${(e as Error).message}`;
    onWarning?.(message);
    return {
      ...createSectionSummaryScaffold(markdown),
      source: `dossier-enrich:${provider}:fallback`,
    };
  }
}

function withAgentPedagogyDefaults(annotations: RenderAnnotations): RenderAnnotations {
  return {
    ...annotations,
    schema_version: 2,
    prerequisites: annotations.prerequisites ?? [],
    checkpoints: annotations.checkpoints ?? [],
    analogies: annotations.analogies ?? [],
  };
}

export async function defaultAgentCliRunner(
  command: string,
  args: string[],
  options: AgentCliRunOptions,
): Promise<AgentCliRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${options.timeoutMs ?? 180_000}ms`));
    }, options.timeoutMs ?? 180_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const detail = stderr || stdout;
        reject(new Error(`${command} exited with code ${code}${detail ? `: ${detail.trim()}` : ""}`));
      }
    });
    child.stdin.end(options.input);
  });
}

function commandArgs(provider: Exclude<EnrichProvider, "scaffold">, model?: string): string[] {
  if (provider === "codex") {
    return [
      "exec",
      "--sandbox",
      "read-only",
      ...(model ? ["--model", model] : []),
      "-",
    ];
  }
  return [
    "-p",
    "--output-format",
    "text",
    "--permission-mode",
    "dontAsk",
    "--tools",
    "",
    "--no-session-persistence",
    ...(model ? ["--model", model] : []),
  ];
}

function extractFirstJsonObject(output: string): string {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return output;
  return output.slice(start, end + 1);
}
