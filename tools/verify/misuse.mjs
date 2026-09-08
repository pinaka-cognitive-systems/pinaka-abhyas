#!/usr/bin/env node
/**
 * verify:misuse
 *
 * Find a token used for the wrong purpose. The token name is the contract.
 *
 * A border token or a surface token often renders close to the shade a
 * designer wanted for text. It still fails, because the two change
 * independently. When the border colour is retuned, the text changes with it
 * and nobody knows why. Text colour must come from a foreground token.
 *
 * The check reads any `color:` declaration, in CSS or in an inline style
 * object, and fails when the value is a border, surface or input token.
 * `background-color` and `border-color` are not matched.
 */
import { walkFiles, readText, ansi, Reporter, REPO_ROOT, rel } from './_common.mjs';
import { join } from 'node:path';

const TARGET = join(REPO_ROOT, 'app', 'src');

// Each entry names a token that must never appear in a text colour slot,
// and the token to use instead.
const WRONG_FOR_TEXT = [
  ['--color-border', 'use --color-text-subtle or --color-foreground'],
  ['--color-border-hairline', 'use --color-text-subtle'],
  ['--color-border-strong', 'use --color-text-subtle'],
  ['--color-input', 'use --color-foreground'],
  ['--color-muted', 'use --color-muted-foreground'],
  ['--color-subtle', 'use --color-text-subtle'],
  ['--color-card', 'use --color-card-foreground'],
  ['--color-popover', 'use --color-popover-foreground'],
  ['--color-accent', 'use --color-accent-foreground'],
  ['--color-background', 'use --color-foreground, unless the same rule sets a dark background'],
];

// `color:` not preceded by a hyphen or word character, so background-color
// and border-color do not match. camelCase backgroundColor does not match
// either, because the C is uppercase.
// A rule that paints a dark surface, so light text on it is correct.
const INVERSE_SURFACE = /background(-color)?\s*:\s*['"]?var\(\s*--color-(foreground|dark-bg)/i;

const COLOR_SLOT = /(?<![-\w])color\s*:\s*['"]?var\(\s*(--[a-z0-9-]+)/gi;

const r = new Reporter('misuse');

for (const file of walkFiles(TARGET, (p) => /\.(css|tsx?)$/.test(p))) {
  const lines = readText(file).split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(COLOR_SLOT)) {
      const token = m[1].toLowerCase();
      const hit = WRONG_FOR_TEXT.find(([name]) => name === token);
      if (!hit) continue;
      // The app has no inverse text token. A dark surface is written by
      // swapping the pair: background foreground, color background. That is
      // the documented idiom, not a defect, so skip it.
      if (token === '--color-background' && INVERSE_SURFACE.test(line)) continue;
      r.add({
        file: rel(file),
        line: i + 1,
        message: `${ansi.bold(`var(${token}) in a color: slot`)} — ${hit[1]}`,
      });
    }
  });
}

r.finalize();
