#!/usr/bin/env node
/**
 * audit-gate.mjs — calibrated npm audit gate for the JS packages.
 *
 * Why this exists: almost every npm dependency in this repo (app/, engine-ts/)
 * is a build or test tool that never ships. The exceptions are the three runtime
 * packages bundled into `npm run build` output and served to students: react,
 * react-dom, and @sqlite.org/sqlite-wasm. An advisory in those CAN reach a user
 * and must never be allowlisted here; fix it by upgrading. Everything else is
 * dev-only, so a raw `npm audit` is noisy: it flags advisories that cannot touch
 * the product or, in some cases, this project's usage at all (a Deno-only RCE in
 * a Node project; a Vitest UI server we never start).
 *
 * This gate runs `npm audit --json` in the current working directory and FAILS
 * only on advisories that are NOT in the allowlist below. New, unreviewed
 * advisories break the build so a human triages them; advisories we have read
 * and judged inapplicable stay quiet, each with a written reason and a review
 * trigger. The allowlist is the audit trail, not a mute button: every entry
 * names why it is accepted and when to revisit it.
 *
 * Run: node ../tools/audit-gate.mjs   (from app/ or engine-ts/)
 * Exit 0 = clean or fully allowlisted; exit 1 = a new advisory needs triage.
 */
import { execSync } from "node:child_process";

// Advisories reviewed and accepted. Keyed by GHSA id. Each MUST carry a reason
// (why it cannot harm this project) and a review trigger (what clears it).
const ALLOWLIST = {
  "GHSA-gv7w-rqvm-qjhr": {
    pkg: "esbuild",
    reason:
      "RCE via the esbuild Deno module and NPM_CONFIG_REGISTRY. This is a " +
      "Node and npm project with no Deno runtime, and esbuild is a build-time " +
      "tool that never ships. Not exploitable here.",
    review: "Clears when the toolchain's vite ships esbuild >= 0.28.1.",
  },
  "GHSA-g7r4-m6w7-qqqr": {
    pkg: "esbuild",
    reason:
      "Arbitrary file read via the esbuild dev server on Windows. esbuild here " +
      "is the test runner's bundler, not a dev server we serve, and nothing " +
      "esbuild touches ships to users.",
    review: "Clears when the toolchain's vite ships esbuild >= 0.28.1.",
  },
};

// Severities at or above this fail the gate when not allowlisted.
const FAIL_AT = ["moderate", "high", "critical"];

function runAudit() {
  try {
    // --json exits non-zero when advisories exist; capture stdout regardless.
    return execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (err) {
    if (err.stdout) return err.stdout;
    throw err;
  }
}

const report = JSON.parse(runAudit());
const advisories = new Map(); // GHSA id -> {severity, title, pkg, range}

for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== "object" || !via.url) continue;
    const id = via.url.split("/").pop();
    if (!advisories.has(id)) {
      advisories.set(id, {
        severity: via.severity,
        title: via.title,
        pkg: via.name,
        range: via.range,
      });
    }
  }
}

const unreviewed = [];
const accepted = [];
for (const [id, a] of advisories) {
  if (ALLOWLIST[id]) accepted.push([id, a]);
  else if (FAIL_AT.includes(a.severity)) unreviewed.push([id, a]);
}

if (accepted.length > 0) {
  console.log("Allowlisted advisories (reviewed, accepted):");
  for (const [id, a] of accepted) {
    console.log(`  - ${id} (${a.severity}, ${a.pkg}): ${ALLOWLIST[id].reason}`);
    console.log(`    review: ${ALLOWLIST[id].review}`);
  }
}

if (unreviewed.length === 0) {
  console.log(`\nAudit gate: pass. ${accepted.length} allowlisted, 0 unreviewed at ${FAIL_AT[0]}+.`);
  process.exit(0);
}

console.error("\nAudit gate: FAIL. New advisories need triage:");
for (const [id, a] of unreviewed) {
  console.error(`  - ${id} (${a.severity}, ${a.pkg} ${a.range})`);
  console.error(`    ${a.title}`);
  console.error(`    https://github.com/advisories/${id}`);
}
console.error(
  "\nFix the dependency, or, if the advisory cannot affect this project " +
  "(dev-only tool that does not ship, inapplicable platform), add it to " +
  "ALLOWLIST in tools/audit-gate.mjs with a reason and a review trigger.",
);
process.exit(1);
