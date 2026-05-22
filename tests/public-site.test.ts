import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

describe("public xdossier site", () => {
  test("does not advertise npm install commands before the package is published", async () => {
    const html = await readFile(resolve(repoRoot, "docs/index.html"), "utf8");
    const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");
    const packageJson = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));

    expect(html).not.toMatch(/\bnpx\s+xdossier\b|\bnpm\s+i\s+-g\s+xdossier\b/);
    expect(readme).not.toMatch(/\bnpx\s+xdossier(?:@latest)?\b|\bnpm\s+i\s+-g\s+xdossier\b/);
    expect(html).toContain("npx github:xianfeng92/xdossier");
    expect(readme).toContain("npx github:xianfeng92/xdossier render docs/specs/my-spec.md");
    expect(packageJson.scripts.prepare).toBe("npm run build");
  });

  test("mobile landing content can wrap instead of forcing horizontal scroll", async () => {
    const html = await readFile(resolve(repoRoot, "docs/index.html"), "utf8");

    expect(html).toMatch(/code\.install\s*\{[\s\S]*?max-width:\s*100%[\s\S]*?white-space:\s*normal[\s\S]*?overflow-wrap:\s*anywhere/);
    expect(html).toMatch(/pre\s*\{[\s\S]*?max-width:\s*100%[\s\S]*?overflow-x:\s*auto/);
  });

  test("demo cards include visual previews of the linked rendered pages", async () => {
    const html = await readFile(resolve(repoRoot, "docs/index.html"), "utf8");

    expect(html).toMatch(/\.demo-card-preview\s*\{/);
    expect(html.match(/class="demo-card-preview\b[^"]*"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Preview of MVP-0 dossier with relation graph"');
    expect(html).toContain('aria-label="Preview of Pedagogy Layer Spec"');
    expect(html).toContain('aria-label="Preview of Vision Spec"');
    expect(html).toContain('aria-label="Preview of OSS Launch Research"');
  });
});
