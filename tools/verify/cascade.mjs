#!/usr/bin/env node
/**
 * verify:cascade
 *
 * Find bare element selectors that sit outside every @layer block.
 *
 * app/src/base.css declares the layer order: reset, tokens, components. A rule
 * written outside any layer beats every layered rule, whatever its specificity.
 * One stray `a { color: ... }` can override a button style across the app.
 *
 * Allowed: rules inside @layer, @media, @supports, @container, @keyframes or
 * @font-face. Also allowed: any selector scoped by a class, an id or an
 * attribute, such as `.prose a` or `[data-theme] h2`.
 */
import { walkFiles, readText, ansi, Reporter, REPO_ROOT, rel } from './_common.mjs';
import { join } from 'node:path';

const TARGET = join(REPO_ROOT, 'app', 'src');

const ELEMENTS = new Set([
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i',
  'small', 'ul', 'ol', 'li', 'table', 'th', 'td', 'button', 'input', 'select',
  'textarea', 'label', 'fieldset', 'dialog', 'body', 'html', 'main', 'header',
  'footer', 'nav', 'section', 'article', 'svg', 'img',
]);

const AT_RULE = /^@(layer|media|supports|container|keyframes|font-face|scope)\b/;

const r = new Reporter('cascade');

for (const file of walkFiles(TARGET, (p) => p.endsWith('.css'))) {
  const lines = readText(file).split('\n');
  let depth = 0;
  let allowedAt = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trim = line.trim();
    const opens = (line.match(/{/g) ?? []).length;
    const closes = (line.match(/}/g) ?? []).length;
    const entersAllowed = AT_RULE.test(trim);
    const depthBefore = depth;
    depth += opens - closes;

    if (entersAllowed && opens > 0 && allowedAt < 0) allowedAt = depthBefore;
    if (allowedAt >= 0 && depth <= allowedAt) allowedAt = -1;
    if (allowedAt >= 0) continue;

    // Only a rule opened at the top level of the file can escape every layer.
    if (depthBefore !== 0 || opens === 0) continue;
    if (trim.startsWith('@')) continue;

    const selector = line.split('{')[0].trim();
    if (!selector) continue;
    for (const part of selector.split(',').map((s) => s.trim())) {
      if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(part) && ELEMENTS.has(part.toLowerCase())) {
        r.add({
          file: rel(file),
          line: i + 1,
          message: `${ansi.bold(`${part} { ... }`)} — element selector outside every @layer, so it beats all layered rules`,
        });
      }
    }
  }
}

r.finalize();
