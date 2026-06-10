#!/usr/bin/env node
/**
 * check-offline.mjs (W5-4): prove the offline app shell is self-contained.
 *
 * The service worker precaches an app-shell asset list at install (built by
 * vite-plugin-sw into dist/sw.js and mirrored to dist/precache-manifest.json).
 * If any precached URL does not resolve to a real file in dist/, the worker's
 * `cache.addAll` rejects and the install fails — the app would NOT work offline.
 * This script catches that before deploy: it reads the precache manifest and
 * asserts every listed asset exists on disk in dist/.
 *
 * It also sanity-checks that dist/sw.js was emitted and that it inlined a
 * non-empty precache list (a worker with an empty list precaches nothing).
 *
 * LIMITS (documented honestly, per the task): this is a STATIC approximation of
 * offline behaviour, not a full runtime proof. It does NOT:
 *   - run a real service worker or a headless browser;
 *   - exercise the runtime cache-first path for lazy chunks (those are cached on
 *     first online use by design, not precached);
 *   - verify Cache Storage eviction or quota behaviour.
 * It proves the necessary condition — every precached URL is a real, served
 * asset — which is the failure mode that silently breaks offline boot. A full
 * Playwright offline test is a candidate follow-up but is out of scope here and
 * would add a heavy browser dependency.
 *
 * Usage (after `npm run build`):
 *   node scripts/check-offline.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(import.meta.dirname, "..", "dist");
const manifestPath = join(distDir, "precache-manifest.json");
const swPath = join(distDir, "sw.js");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(swPath)) fail("dist/sw.js not found. Did the build run with the SW plugin?");
if (!existsSync(manifestPath)) fail("dist/precache-manifest.json not found.");

/** @type {{cacheVersion: string, assets: string[]}} */
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  fail("precache manifest lists no assets — the offline shell would be empty.");
}

// The built worker must carry the same non-empty precache list inline.
const swCode = readFileSync(swPath, "utf8");
for (const asset of manifest.assets) {
  if (!swCode.includes(asset)) {
    fail(`dist/sw.js does not reference precached asset ${asset} — the plugin injection is stale.`);
  }
}

console.log("\nOffline shell self-check:");
console.log("─".repeat(60));
let missing = 0;
for (const asset of manifest.assets) {
  // Asset URLs are root-relative ("/index.html"); resolve under dist/.
  const onDisk = join(distDir, asset.replace(/^\//, ""));
  const ok = existsSync(onDisk);
  if (!ok) missing += 1;
  console.log(`  ${ok ? "ok " : "MISS"}  ${asset}`);
}
console.log("─".repeat(60));
console.log(`  cache version: ${manifest.cacheVersion}`);
console.log(`  precached assets: ${manifest.assets.length}`);

if (missing > 0) {
  fail(`${missing} precached asset(s) do not exist in dist/. Offline boot would fail.`);
}

console.log(`\nOK: all ${manifest.assets.length} precached shell assets resolve from dist/.`);
console.log("    (Static approximation — see the header for what this does and does not prove.)");
