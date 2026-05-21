# Security Policy

`<NAME>` is a local-first CLI that reads markdown files from your workspace and produces single-file HTML. It does **not** make network requests at runtime (except optional LLM enrich calls you explicitly trigger), does not collect telemetry, and does not handle credentials.

That said, if you discover a vulnerability, we want to know.

## What counts as a security issue

- Path traversal: input markdown causing reads/writes outside the working directory
- HTML injection: markdown input producing unsafe HTML output that breaks the single-file invariant or could XSS a viewer
- Skill loader: a malicious `SKILL.md` causing arbitrary code execution
- Dependency vulnerability we've shipped with no upstream fix

## What does NOT count

- "It crashes on malformed input" → file a normal bug report
- "It overwrites my output file" → expected behavior; use `-o <path>` to redirect

## How to report

**Do not open a public GitHub issue.** Instead:

1. Email `<MAINTAINER_EMAIL>` with subject `[SECURITY] <short description>`
2. Include: reproduction steps, affected version, and impact assessment
3. We'll acknowledge within 72 hours and aim to ship a fix within 14 days for high-severity issues

If you prefer, you can use [GitHub's private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repo.

## Disclosure timeline

We follow a standard coordinated-disclosure model:

- Day 0: report received, ack within 72h
- Day 0–14: triage + patch development
- Day 14: patch released, advisory published, reporter credited (unless they prefer anonymity)
- Day 14+: only after release do we discuss the issue publicly

## Supported versions

Only the latest minor version receives security fixes. If you're on an older version, please upgrade.
