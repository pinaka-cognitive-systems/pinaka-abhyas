#!/usr/bin/env node
/**
 * verify:tokens
 *
 * Compare the brand palette against the shipped token file. The palette is
 * docs/brand/palette.css. The shipped file is app/src/theme/tokens.css.
 * A colour cannot change in one without changing in the other.
 *
 * The gate reports two failures. MISSING means the handoff defines a token
 * that the shipped file does not. DRIFT means both define the token with
 * different values. EXTRA lists tokens added during the build. Extra tokens
 * are printed for information and do not fail the gate.
 *
 * Set HANDOFF_TOKENS_PATH to compare against a different palette file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ansi, REPO_ROOT } from './_common.mjs';

const DEFAULT_HANDOFF = join(REPO_ROOT, 'docs', 'brand', 'palette.css');
const handoffPath = process.env.HANDOFF_TOKENS_PATH ?? DEFAULT_HANDOFF;
const tokenFiles = [join(REPO_ROOT, 'app', 'src', 'theme', 'tokens.css')];


/** Read every `--name: value;` declaration into a map. Comments are removed first. */
function extractTokens(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const map = new Map();
  const re = /^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/gim;
  for (const m of noComments.matchAll(re)) {
    map.set(m[1], m[2].trim().toLowerCase().replace(/\s+/g, ' '));
  }
  return map;
}

/** Treat 1, 1.0 and 1.00 as the same value. */
function valuesEqual(a, b) {
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  return !Number.isNaN(na) && !Number.isNaN(nb) && na === nb;
}

const REM_TO_PX = [
  [/\b0\.125rem\b/g, '2px'], [/\b0\.25rem\b/g, '4px'], [/\b0\.375rem\b/g, '6px'],
  [/\b0\.5rem\b/g, '8px'], [/\b0\.75rem\b/g, '12px'], [/\b0\.875rem\b/g, '14px'],
  [/\b1rem\b/g, '16px'], [/\b1\.125rem\b/g, '18px'], [/\b1\.25rem\b/g, '20px'],
  [/\b1\.5rem\b/g, '24px'], [/\b1\.875rem\b/g, '30px'], [/\b2rem\b/g, '32px'],
  [/\b2\.25rem\b/g, '36px'], [/\b3rem\b/g, '48px'], [/\b3\.75rem\b/g, '60px'],
  [/\b4rem\b/g, '64px'], [/\b6rem\b/g, '96px'], [/\b8rem\b/g, '128px'],
];

/** Normalise rem to px so the two files compare on the same unit. */
function normalizeValue(v) {
  let out = v;
  for (const [re, px] of REM_TO_PX) out = out.replace(re, px);
  return out;
}

if (!existsSync(handoffPath)) {
  console.log(`${ansi.yellow('SKIP')} verify:tokens (no handoff file at ${handoffPath})`);
  process.exit(0);
}

const handoff = extractTokens(readFileSync(handoffPath, 'utf8'));
const current = new Map();
for (const f of tokenFiles) {
  if (!existsSync(f)) continue;
  for (const [k, v] of extractTokens(readFileSync(f, 'utf8'))) current.set(k, v);
}

const missing = [];
const drift = [];
const extra = [];

for (const [name, value] of handoff) {
  if (!current.has(name)) {
    missing.push(name);
    continue;
  }
  const cur = normalizeValue(current.get(name));
  const han = normalizeValue(value);
  if (cur !== han && !valuesEqual(cur, han)) {
    drift.push({ name, handoff: value, current: current.get(name) });
  }
}
// The palette is colour only. Type, spacing and motion tokens live in
// tokens.css alone, so they are not missing from the palette and are not listed.
for (const name of current.keys()) {
  if (!handoff.has(name) && name.startsWith('color-')) extra.push(name);
}

let failed = false;

if (missing.length) {
  console.log(ansi.red(`MISSING (${missing.length}) — the palette has these, tokens.css does not:`));
  for (const n of missing) console.log(`  --${n}`);
  failed = true;
}
if (drift.length) {
  console.log(ansi.red(`\nDRIFT (${drift.length}) — same name, different value:`));
  for (const d of drift) {
    console.log(`  --${d.name}\n    handoff: ${d.handoff}\n    shipped: ${d.current}`);
  }
  failed = true;
}
if (extra.length) {
  console.log(ansi.dim(`\nEXTRA (${extra.length}) — tokens.css has these, the palette does not:`));
  for (const n of extra) console.log(ansi.dim(`  --${n}`));
}

if (failed) {
  console.log(`\n${ansi.red('FAIL')} verify:tokens`);
  process.exit(1);
}
console.log(`${ansi.green('PASS')} verify:tokens (${handoff.size} palette tokens covered)`);
