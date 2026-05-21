#!/usr/bin/env node
// Production entry. After `pnpm build`, dist/cli.js exists and this routes to it.
// For local development without build, use `pnpm dev render <file>` (tsx).
import("../dist/cli.js")
  .then((m) => m.main())
  .catch((e) => {
    if (e && typeof e === "object" && "code" in e && e.code === "ERR_MODULE_NOT_FOUND") {
      console.error(
        "xdossier: dist/cli.js not found.\n" +
          "  In this repo, run `pnpm dev render <file>` for development.\n" +
          "  Or `pnpm build` first, then re-run this command.",
      );
      process.exit(64);
    }
    console.error(e);
    process.exit(64);
  });
