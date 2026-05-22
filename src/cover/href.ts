import { existsSync } from "node:fs";
import { join } from "node:path";

export function memberHref(path: string, workspaceRoot: string | undefined, hrefPrefix: string): string {
  const htmlPath = path.replace(/\.md$/i, ".html");
  const target = workspaceRoot && htmlPath !== path && existsSync(join(workspaceRoot, htmlPath))
    ? htmlPath
    : path;
  return `${hrefPrefix}${target}`;
}
