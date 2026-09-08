#!/usr/bin/env node
/**
 * verify:voice
 *
 * Scan student-facing copy in app/src for brand-voice violations.
 * The rules come from docs/brand/brand-core.md and docs/brand/positioning-ca.md.
 *
 * Hard rules, from the Non-negotiables section:
 *   - No em-dash.
 *   - No exclamation mark.
 *   - No emoji, anywhere.
 *   - No rhetorical question used as a transition.
 *
 * Banned terms come from the Banned terms section of brand-core.md and the
 * Vocabulary section of positioning-ca.md. Both files are written for people,
 * not parsed by this script, so the list below must be updated with them.
 *
 * Only string literals are scanned in TypeScript files, so identifiers and
 * class names do not produce noise. A line can be exempted with the comment
 * "verify-voice-allow" plus a reason.
 */
import { walkFiles, readText, ansi, Reporter, REPO_ROOT, rel } from './_common.mjs';
import { join } from 'node:path';

const TARGET = join(REPO_ROOT, 'app', 'src');

// From brand-core.md, Banned terms.
const BANNED = [
  'unlock your potential', 'empower', 'revolutionize', 'game-changer',
  'cutting-edge', 'leverage', 'synergy', 'take it to the next level',
  "in today's world", "it's worth noting", 'interestingly', 'dive into',
  'deep dive', "let's explore", "let's crush it", "you've got this",
  'you can do this',
  // Vendor-neutral verbs. The product diagnoses and tests. It does not coach.
  'coach', 'tutor',
  // India-specific additions, banned everywhere.
  'rank guarantee', 'pass guarantee', 'guaranteed selection', '100% pass',
  'guarantee', 'topper', 'crack the', 'crack your', "india's #1",
  'best test series', 'limited seats', 'batch full', 'success mantra',
  'magic formula', 'tricks', 'score booster', 'rank booster', 'crash course',
  'fast-track', 'dream college', 'dream rank', 'beat lakhs',
  'stay ahead of the competition',
  // From positioning-ca.md. Readiness is an estimate, never a prediction.
  'predicted score',
];

// "shortcut" is banned as an exam shortcut, but a keyboard shortcut is a real
// feature. Only flag it when "keyboard" is not on the same line.
const CONDITIONAL = [
  { term: 'shortcut', unless: 'keyboard', why: 'banned unless it means a keyboard shortcut' },
];

const BANNED_OPENERS = ['imagine', 'picture this'];

// A question used to move the reader on, rather than to ask something real.
const RHETORICAL_OPENERS = ['ready to', 'want to see', 'shall we', 'why not', 'guess what'];

const STRING_RE = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

const r = new Reporter('voice');
let commentDashes = 0;

/** True when the string looks like a class list, a path or a hex value. */
function looksLikeCode(content) {
  if (content.trim() === '') return true;
  if (/^[#./?:_\-0-9a-fA-F\s,()\\{}[\]*=&|%]+$/.test(content)) return true;
  const tokens = content.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => /^[!@a-z0-9:/\-_[\]().]+$/i.test(t));
}

for (const file of walkFiles(TARGET, (p) => /\.tsx?$/.test(p))) {
  if (file.includes('/__tests__/') || /\.test\.tsx?$/.test(file)) continue;
  const lines = readText(file).split('\n');

  lines.forEach((rawLine, i) => {
    if (rawLine.includes('verify-voice-allow')) return;
    const at = { file: rel(file), line: i + 1 };

    // Strip comments before the em-dash check. A comment is not student
    // copy. Comment em-dashes are counted at the end instead.
    const codeOnly = rawLine.replace(/\/\/.*$/, '').replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');
    const isCommentLine = /^\s*(\*|\/\/|\/\*|\{\/\*)/.test(rawLine);
    if (isCommentLine || !codeOnly.includes('—')) {
      if (rawLine.includes('—')) commentDashes += 1;
    } else if (codeOnly.trim() === '"—"' || codeOnly.includes('"—"') || codeOnly.includes("'—'")) {
      r.add({ ...at, message: `${ansi.bold('em-dash as an empty-state glyph')} — allowed only if the brand doc says so` });
    } else {
      r.add({ ...at, message: `${ansi.bold('em-dash in copy')} — write two sentences, or use a comma` });
    }

    for (const m of rawLine.matchAll(STRING_RE)) {
      const content = m[2];
      if (looksLikeCode(content)) continue;
      const lower = content.toLowerCase();
      const excerpt = content.slice(0, 60);

      if (content.includes('!')) {
        r.add({ ...at, message: `${ansi.bold('exclamation mark')} in "${excerpt}"` });
      }
      if (EMOJI_RE.test(content)) {
        r.add({ ...at, message: `${ansi.bold('emoji')} in "${excerpt}"` });
      }
      for (const term of BANNED) {
        if (lower.includes(term)) {
          r.add({ ...at, message: `${ansi.bold(`banned term "${term}"`)} in "${excerpt}"` });
        }
      }
      for (const { term, unless, why } of CONDITIONAL) {
        // The exempting word can sit outside the string, as in a comment that
        // says "the keyboard shortcut sheet". Check the whole line for it.
        if (lower.includes(term) && !rawLine.toLowerCase().includes(unless)) {
          r.add({ ...at, message: `${ansi.bold(`"${term}"`)} ${why}, in "${excerpt}"` });
        }
      }
      for (const opener of BANNED_OPENERS) {
        if (lower.startsWith(opener)) {
          r.add({ ...at, message: `${ansi.bold(`opener "${opener}"`)} in "${excerpt}"` });
        }
      }
      if (content.trim().endsWith('?')) {
        for (const opener of RHETORICAL_OPENERS) {
          if (lower.startsWith(opener)) {
            r.add({ ...at, message: `${ansi.bold('rhetorical question')} in "${excerpt}"` });
          }
        }
      }
    }
  });
}

if (commentDashes > 0) {
  console.log(
    ansi.dim(
      `note: ${commentDashes} em-dash${commentDashes === 1 ? '' : 'es'} sit in code comments. ` +
        'Those break the writing rule in CLAUDE.md, not the brand voice. They are not counted above.',
    ),
  );
}

r.finalize();
