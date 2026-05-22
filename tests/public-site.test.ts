import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

describe("public xdossier site", () => {
  test("advertises npm install commands now that the package is published", async () => {
    const html = await readFile(resolve(repoRoot, "docs/index.html"), "utf8");
    const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");
    const packageJson = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));

    expect(html).toMatch(/npm\s+(?:install|i)\s+-g\s+xdossier/);
    expect(readme).toMatch(/npm\s+install\s+-g\s+xdossier/);
    expect(html).not.toMatch(/github:xianfeng92\/xdossier/);
    expect(readme).not.toMatch(/npx\s+github:xianfeng92\/xdossier/);
    expect(packageJson.scripts.prepare).toBe("npm run build");
  });

  test("pnpm build-script approval config is concrete for non-interactive verification", async () => {
    const workspace = await readFile(resolve(repoRoot, "pnpm-workspace.yaml"), "utf8");

    expect(workspace).toContain("allowBuilds:");
    expect(workspace).toContain("esbuild: true");
    expect(workspace).not.toContain("set this to true or false");
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
    expect(html).toContain('aria-label="MVP-0 dossier 与关系图预览"');
    expect(html).toContain('aria-label="教学层 Spec 预览"');
    expect(html).toContain('aria-label="愿景 Spec 预览"');
    expect(html).toContain('aria-label="开源发布调研预览"');
  });
});
