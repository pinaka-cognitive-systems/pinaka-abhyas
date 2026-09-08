#!/usr/bin/env node
/**
 * verify:ladder
 *
 * Find spacing values that sit off the brand spacing ladder.
 *
 * The ladder is defined by the --space-* tokens in app/src/theme/tokens.css:
 * 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. A padding of 15px or 18px
 * is off the ladder. It looks fine alone and wrong next to everything else.
 *
 * Two scans run. CSS files are checked for spacing declarations with a raw
 * pixel value. TSX files are checked for spacing keys inside an inline style
 * object. Font size, line height and border width follow their own scales and
 * are not checked here.
 *
 * A single line can be exempted with the comment "verify-ladder-allow".
 */
import { walkFiles, readText, ansi, Reporter, REPO_ROOT, rel } from './_common.mjs';
import { join } from 'node:path';

const TARGET = join(REPO_ROOT, 'app', 'src');

// 1 and 2 are allowed as optical corrections, such as a hairline nudge.
// They are not spacing decisions, so they do not have to sit on the ladder.
const ALLOWED = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]);
const LADDER_TEXT = '0 4 8 12 16 20 24 32 40 48 64 80 96';

const CSS_KEYS = [
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block', 'padding-inline-start', 'padding-inline-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-inline', 'margin-block',
  'gap', 'row-gap', 'column-gap',
];

const JSX_KEYS = [
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingInline', 'paddingBlock',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap',
];

const CSS_RE = new RegExp(`(?<![-\\w])(${CSS_KEYS.join('|')})\\s*:\\s*([^;{}]+)`, 'g');
const JSX_RE = new RegExp(`\\b(${JSX_KEYS.join('|')})\\s*:\\s*(-?\\d+)\\b`, 'g');
const PX_RE = /(-?\d+(?:\.\d+)?)px/g;

const r = new Reporter('ladder');

function allowed(line) {
  return line.includes('verify-ladder-allow');
}

for (const file of walkFiles(TARGET, (p) => /\.(css|tsx?)$/.test(p))) {
  const isCss = file.endsWith('.css');
  const lines = readText(file).split('\n');
  lines.forEach((line, i) => {
    if (allowed(line)) return;
    if (isCss) {
      for (const m of line.matchAll(CSS_RE)) {
        const key = m[1];
        for (const px of m[2].matchAll(PX_RE)) {
          const value = Number(px[1]);
          if (ALLOWED.has(Math.abs(value))) continue;
          r.add({
            file: rel(file),
            line: i + 1,
            message: `${ansi.bold(`${key}: ${px[0]}`)} — off ladder. Use a --space-* token. Ladder: ${LADDER_TEXT}`,
          });
        }
      }
    } else {
      for (const m of line.matchAll(JSX_RE)) {
        const value = Number(m[2]);
        if (ALLOWED.has(Math.abs(value))) continue;
        r.add({
          file: rel(file),
          line: i + 1,
          message: `${ansi.bold(`${m[1]}: ${m[2]}`)} — off ladder. Use a --space-* token. Ladder: ${LADDER_TEXT}`,
        });
      }
    }
  });
}

r.finalize();
