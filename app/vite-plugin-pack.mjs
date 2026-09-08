/**
 * vite-plugin-pack: serve and ship the question pack as a static file (ADR 0027).
 *
 * The question pack (packs/ca-foundation-qa/pack.json and pack.manifest.json)
 * is a build artifact of packs/ca-foundation-qa/build_and_validate.py. It is
 * data, not code, so it is no longer bundled as a JS module. This plugin makes
 * it reachable at the same two URLs in both places the app runs.
 *
 *   - Dev (configureServer): a middleware answers GET /pack.json and
 *     GET /pack.manifest.json straight from the packs directory, with no
 *     cache, so a rebuilt pack is always seen on reload. When a file is
 *     missing, it answers 404 with a one-line fix.
 *   - Build (closeBundle): both files are copied into dist/ after Vite writes
 *     it, so the deployed app can fetch them. A missing file fails the build
 *     with the same fix, because a production build without a pack ships an
 *     app that cannot work.
 */

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKS_DIR = fileURLToPath(new URL("../packs/ca-foundation-qa/", import.meta.url));
const PACK_FILES = ["pack.json", "pack.manifest.json"];
const FIX = "bash tools/dev.sh from the repository root.";

export function packPlugin() {
  return {
    name: "vite-plugin-pack",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0].replace(/^\//, "");
        if (req.method !== "GET" || !PACK_FILES.includes(pathname)) {
          next();
          return;
        }
        const filePath = join(PACKS_DIR, pathname);
        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain");
          res.end(`No pack is built. Run: ${FIX}`);
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(readFileSync(filePath));
      });
    },
    closeBundle() {
      const distDir = join(process.cwd(), "dist");
      for (const name of PACK_FILES) {
        const src = join(PACKS_DIR, name);
        if (!existsSync(src)) {
          throw new Error(
            `A production build needs the pack file ${name}, which is missing. Run: ${FIX}`,
          );
        }
        copyFileSync(src, join(distDir, name));
      }
    },
  };
}
