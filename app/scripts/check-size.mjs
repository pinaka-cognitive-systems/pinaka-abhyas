#!/usr/bin/env node
/**
 * check-size.mjs
 *
 * Byte-budget enforcement for the production build (ADR 0008).
 *
 * ADR 0008 states:
 *   First-load byte budget: 2.0 MB transferred, hard ceiling.
 *   Working target: 1.5 MB.
 *
 * This script walks dist/, gzip-compresses each file in memory (matching what
 * a CDN would send as Content-Encoding: gzip), and sums the compressed sizes.
 * It exits non-zero if the hard ceiling is exceeded, and warns (but exits 0)
 * if the working target is exceeded.
 *
 * No new dependencies: uses only node:fs, node:path, and node:zlib.
 *
 * Usage (after `npm run build`):
 *   node scripts/check-size.mjs
 * or via npm:
 *   npm run check-size
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Budget constants (bytes). Keep in sync with ADR 0008.
const TARGET_BYTES = 1_500_000; // 1.5 MB — working target; warn above this
const CEILING_BYTES = 2_000_000; // 2.0 MB — hard ceiling; fail above this

// Resolve dist/ relative to this script's directory (app/scripts/ -> app/dist/).
const distDir = join(import.meta.dirname, "..", "dist");

/** Recursively collect all file paths under a directory. */
function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Extensions that benefit from gzip compression. Binary formats (png, ico,
 * woff2) are already compressed; gzipping them again would be larger, but in
 * practice servers skip them. We mirror that: only compress text-based assets.
 */
const COMPRESSIBLE = new Set([
  ".html",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".svg",
  ".json",
  ".txt",
  ".webmanifest",
  ".xml",
  ".map",
]);

let files;
try {
  files = collectFiles(distDir);
} catch {
  // dist/ does not exist; the build step must have been skipped.
  console.error("ERROR: dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

let totalGzipped = 0;

/** @type {Array<{path: string, raw: number, gz: number}>} */
const rows = [];

for (const file of files) {
  const buf = readFileSync(file);
  const raw = statSync(file).size;
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  const gz = COMPRESSIBLE.has(ext) ? gzipSync(buf).byteLength : raw;
  totalGzipped += gz;
  rows.push({ path: file.replace(distDir + "/", ""), raw, gz });
}

// Sort largest-gzipped first for easy reading.
rows.sort((a, b) => b.gz - a.gz);

const MB = 1_000_000; // SI megabytes (matches ADR 0008's "2.0 MB transferred" framing)

console.log("\nBuild size report (gzipped):");
console.log("─".repeat(60));
for (const { path, raw, gz } of rows) {
  const rawKB = (raw / 1000).toFixed(1).padStart(8);
  const gzKB = (gz / 1000).toFixed(1).padStart(8);
  console.log(`  ${rawKB} KB raw  ${gzKB} KB gz  ${path}`);
}
console.log("─".repeat(60));

const totalMB = (totalGzipped / MB).toFixed(3);
console.log(`  Total gzipped: ${totalMB} MB (${totalGzipped.toLocaleString()} bytes)`);
console.log(`  Target:        ${(TARGET_BYTES / MB).toFixed(1)} MB`);
console.log(`  Ceiling:       ${(CEILING_BYTES / MB).toFixed(1)} MB`);
console.log("");

if (totalGzipped > CEILING_BYTES) {
  console.error(
    `FAIL: ${totalMB} MB exceeds the hard ceiling of ${CEILING_BYTES / MB} MB (ADR 0008).`,
  );
  process.exit(1);
}

if (totalGzipped > TARGET_BYTES) {
  console.warn(
    `WARN: ${totalMB} MB exceeds the working target of ${TARGET_BYTES / MB} MB (ADR 0008).`,
  );
  console.warn("      The build is valid but review bundle composition before merging.");
  process.exit(0);
}

console.log(`OK: ${totalMB} MB is within the ${TARGET_BYTES / MB} MB working target.`);
