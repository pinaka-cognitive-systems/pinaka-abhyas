#!/usr/bin/env node
/**
 * verify:hex
 *
 * Find hardcoded colour literals outside the token file. Hex values and
 * rgb() or rgba() calls belong in app/src/theme/tokens.css only. Every other
 * file must read a colour through var(--color-*).
 *
 * A hardcoded colour is invisible to the dark theme and to the token gate.
 * It also breaks the single source of truth that verify:tokens checks.
 *
 * Exempt files are listed in EXEMPT. A single line can be exempted by putting
 * the comment "verify-hex-allow" on it or on the line above it, with a reason.
 */
import { walkFiles, readText, ansi, Reporter, REPO_ROOT, rel } from './_common.mjs';
import { join } from 'node:path';

const TARGET = join(REPO_ROOT, 'app', 'src');

const EXEMPT = [
  'app/src/theme/tokens.css',
];

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
const RGB_PATTERN = /\brgba?\s*\(/;

const r = new Reporter('hex');

function isExempt(path) {
  const p = rel(path);
  return EXEMPT.some((e) => p === e || p.startsWith(`${e}/`));
}

function hasAllowComment(lines, i) {
  const here = lines[i] ?? '';
  const above = lines[i - 1] ?? '';
  return `${above}\n${here}`.includes('verify-hex-allow');
}

for (const file of walkFiles(TARGET, (p) => /\.(tsx?|jsx?|css)$/.test(p))) {
  if (isExempt(file)) continue;
  const lines = readText(file).split('\n');
  lines.forEach((line, i) => {
    const hexMatch = line.match(HEX_PATTERN);
    const rgbMatch = line.match(RGB_PATTERN);
    if (!hexMatch && !rgbMatch) return;
    if (hasAllowComment(lines, i)) return;
    const literal = hexMatch?.[0] ?? rgbMatch?.[0];
    r.add({
      file: rel(file),
      line: i + 1,
      message: `${ansi.bold(literal)} — use var(--color-*) instead`,
    });
  });
}

r.finalize();
