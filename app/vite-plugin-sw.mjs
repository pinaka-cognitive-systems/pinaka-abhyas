/**
 * vite-plugin-sw: build the hand-rolled service worker with a precache manifest.
 *
 * Why a tiny plugin instead of workbox (ADR 0008 byte budget): workbox would add
 * a build dependency and ~10–15 KB gzipped of runtime to solve precaching, which
 * src/sw/sw.ts solves in ~1 KB. This plugin does the one thing the hand-rolled
 * worker cannot do alone — discover the build's hashed filenames — and injects
 * them. It uses esbuild, which Vite already ships, so it adds no dependency.
 *
 * What it does, in `closeBundle` (after Vite has written dist/):
 *   1. Walk dist/ for the app-shell assets to precache: index.html, the entry JS
 *      and CSS (and the css they import), the web manifest, and icons. These are
 *      the offline floor. Lazy chunks (sqlite-wasm, pack) and pack data are NOT
 *      precached — they are runtime-cached on first use by the worker itself.
 *   2. Compute a CACHE_VERSION from the precached filenames (content-addressed,
 *      so it changes exactly when the shell changes).
 *   3. Bundle src/sw/sw.ts with esbuild, replacing __PRECACHE_ASSETS__ and
 *      __CACHE_VERSION__ with the computed values, and write dist/sw.js.
 *
 * It also emits dist/precache-manifest.json: the precache list, for the scripted
 * offline check (scripts/check-offline.mjs) to verify every listed asset exists.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { build as esbuild } from "esbuild";

/** Recursively list files under a directory, returned as paths relative to it. */
function listFiles(root, dir = root) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(root, full));
    else if (entry.isFile()) out.push("/" + relative(root, full).split("\\").join("/"));
  }
  return out;
}

/**
 * Decide which dist files form the offline app shell to precache.
 *
 * Shell = index.html, the web manifest, all top-level CSS, icons, and the entry
 * JS chunk(s). We deliberately EXCLUDE the large lazy chunks (the sqlite-wasm
 * chunk and the pack-data chunk) so install stays fast and within budget; the
 * worker runtime-caches those on first use. Heuristic by filename: the entry is
 * the JS asset referenced directly by index.html.
 */
function selectShell(distDir, allFiles) {
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const shell = new Set(["/index.html"]);

  // Anything index.html references directly (entry JS, entry CSS, manifest).
  const refRe = /(?:src|href)="(\/[^"]+)"/g;
  let m;
  while ((m = refRe.exec(html)) !== null) shell.add(m[1]);

  // Always include the web manifest and any icons (PWA install needs them).
  for (const f of allFiles) {
    if (f.endsWith(".webmanifest")) shell.add(f);
    if (f.startsWith("/icons/")) shell.add(f);
    // Top-level CSS emitted by Vite (the entry stylesheet) — referenced above,
    // but include any css the entry imports to be safe; css files are small.
    if (f.startsWith("/assets/") && f.endsWith(".css")) shell.add(f);
  }
  return [...shell].sort();
}

export function swPlugin() {
  return {
    name: "vite-plugin-sw",
    apply: "build",
    async closeBundle() {
      const distDir = join(process.cwd(), "dist");
      let allFiles;
      try {
        allFiles = listFiles(distDir);
      } catch {
        // No dist (e.g. a build that produced nothing) — nothing to do.
        return;
      }

      const precache = selectShell(distDir, allFiles);

      // Content-addressed cache version: hash of the precached files' bytes, so
      // it changes iff the shell changes. Keeps activate() cleanup correct.
      const hash = createHash("sha256");
      for (const rel of precache) hash.update(readFileSync(join(distDir, rel)));
      const cacheVersion = hash.digest("hex").slice(0, 12);

      // Bundle the worker, injecting the precache list and version.
      const result = await esbuild({
        entryPoints: [join(process.cwd(), "src", "sw", "sw.ts")],
        bundle: true,
        format: "esm",
        target: "es2022",
        minify: true,
        write: false,
        define: {
          __PRECACHE_ASSETS__: JSON.stringify(precache),
          __CACHE_VERSION__: JSON.stringify(cacheVersion),
        },
      });
      const code = result.outputFiles[0].text;
      writeFileSync(join(distDir, "sw.js"), code);

      // Emit the precache manifest for the offline self-check script.
      writeFileSync(
        join(distDir, "precache-manifest.json"),
        JSON.stringify({ cacheVersion, assets: precache }, null, 2) + "\n",
      );

      this.info?.(`vite-plugin-sw: precached ${precache.length} shell asset(s), version ${cacheVersion}`);
    },
  };
}
