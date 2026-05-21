---
title: Quickstart Tutorial
kind: guide
status: draft
---

# Quickstart Tutorial

## 1. Install the CLI

Run the installer from the project root.

```bash
pnpm install
```

You should see the lockfile stay unchanged.

## 2. Configure the workspace

Create the local output directory before rendering.

```bash
mkdir -p .dossier/out
```

You should see an empty `.dossier/out` directory.

## 3. Run the first render

Render the sample document.

```bash
pnpm dev render tests/fixtures/minimal.md
```

You should see a single HTML file next to the markdown source.

## 4. Verify the output

Open the HTML file and check the table of contents.

```bash
test -f tests/fixtures/minimal.html
```

You should see exit code 0.
