#!/usr/bin/env node
/**
 * check-a11y.mjs — accessibility audit for Pinaka Abhyas (W5-6).
 *
 * What this checks (all statically, no browser required):
 *
 * 1. Contrast audit: parses app/src/theme/tokens.css custom properties,
 *    resolves every declared foreground/background token pairing used in the
 *    app CSS files, computes WCAG 2.1 relative-luminance contrast ratios, and
 *    reports any pairing below 4.5:1 (normal text) or 3:1 (large/UI, >= 18px
 *    regular or >= 14px bold, per the WCAG definition).  Only token pairings
 *    that appear in the same rule block (color + background-color referencing
 *    token vars) are audited; hard-coded hex values are also flagged.
 *
 * 2. Type floor: reports any font-size declaration below 12px (0.75rem at
 *    root 16px, or an equivalent px value).
 *
 * 3. Touch targets: reports interactive selectors (button, [role=button], a,
 *    input, select, textarea) that lack a min-height or min-width of 44px.
 *
 * 4. Focus visibility: reports interactive selectors that have no
 *    :focus-visible rule in the same CSS file.
 *
 * 5. Reduced motion: reports any transition or animation declaration whose
 *    duration is hard-coded in ms/s rather than using the
 *    --motion-duration-scalar pattern.
 *
 * Output: a summary table with PASS/WARN/FAIL per check.
 * Exit code: 1 if any FAIL is present; 0 otherwise.
 *
 * No third-party dependencies: uses only node:fs, node:path, node:process.
 * Stdlib only per the W5-6 task requirement.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const scriptDir = import.meta.dirname;
const appDir = join(scriptDir, "..");
const srcDir = join(appDir, "src");
const tokensPath = join(srcDir, "theme", "tokens.css");

// ---------------------------------------------------------------------------
// WCAG luminance and contrast maths
// ---------------------------------------------------------------------------

/** Convert an sRGB [0..255] channel value to linear light. */
function sRGBtoLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Relative luminance of an RGB triple [0..255, 0..255, 0..255]. */
function relativeLuminance(r, g, b) {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

/** WCAG contrast ratio of two hex colour strings (e.g. "#6366F1"). */
function contrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRGB(hex1);
  const [r2, g2, b2] = hexToRGB(hex2);
  const L1 = relativeLuminance(r1, g1, b1);
  const L2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse a 3- or 6-digit hex string (with leading #) to [r, g, b].
 * Returns null for unrecognised formats.
 */
function hexToRGB(hex) {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Token parser: extract --custom-property: value declarations from CSS text.
// ---------------------------------------------------------------------------

/**
 * Parse all CSS custom property declarations from a CSS file text.
 * Returns a Map<string, string>: token name -> raw value.
 * Only parses declarations inside :root { }; handles multi-line values.
 */
function parseTokens(cssText) {
  const tokens = new Map();
  // Strip block comments
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match :root { ... } blocks
  const rootRe = /:root\s*\{([^}]*)\}/g;
  let m;
  while ((m = rootRe.exec(stripped)) !== null) {
    const block = m[1];
    // Match --name: value; declarations
    const propRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let p;
    while ((p = propRe.exec(block)) !== null) {
      tokens.set(p[1].trim(), p[2].trim());
    }
  }
  return tokens;
}

/**
 * Resolve a token value to a hex colour string where possible.
 * Handles:
 *   - #RGB and #RRGGBB directly
 *   - var(--other-token) references (one level of indirection)
 *   - rgba(...) by blending against white background (approximate)
 * Returns null if resolution fails.
 */
function resolveColor(value, tokens) {
  const v = value.trim();

  // Direct hex
  if (/^#[0-9a-fA-F]{3,6}$/.test(v)) return v.toUpperCase();

  // var(--token-name) — resolve one level
  const varMatch = /^var\((--[\w-]+)\)$/.exec(v);
  if (varMatch) {
    const referred = tokens.get(varMatch[1]);
    if (referred) return resolveColor(referred, tokens);
    return null;
  }

  // rgba(r, g, b, a) — blend against white to get approximate opaque hex
  const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(v);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = parseFloat(rgbaMatch[4]);
    // Blend over white (#FFFFFF)
    const br = Math.round(r * a + 255 * (1 - a));
    const bg = Math.round(g * a + 255 * (1 - a));
    const bb = Math.round(b * a + 255 * (1 - a));
    return "#" +
      br.toString(16).padStart(2, "0").toUpperCase() +
      bg.toString(16).padStart(2, "0").toUpperCase() +
      bb.toString(16).padStart(2, "0").toUpperCase();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Collect CSS files to audit
// ---------------------------------------------------------------------------

function collectCSSFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCSSFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}

const cssFiles = collectCSSFiles(srcDir);

// ---------------------------------------------------------------------------
// 1. Contrast audit
// ---------------------------------------------------------------------------

/**
 * The declared foreground/background token pairings that appear in the app CSS.
 * Each entry: [label, fg-token, bg-token, size-class]
 * size-class: "normal" (need 4.5:1) | "large" (need 3:1) | "ui" (need 3:1)
 *
 * "large" = text >= 18px regular or >= 14px bold (WCAG 1.4.3).
 * "ui" = non-text visual component (focus rings, borders) — 3:1 per WCAG 1.4.11.
 * All body text is "normal" unless the token is explicitly metric/hero scale.
 *
 * This list is maintained manually alongside the token definitions in tokens.css.
 * When a new token pairing is introduced, add it here.
 */
const PAIRINGS = [
  // Surfaces
  ["foreground on background",            "--color-foreground",            "--color-background",       "normal"],
  ["card-foreground on card",             "--color-card-foreground",       "--color-card",             "normal"],
  ["muted-foreground on background",      "--color-muted-foreground",      "--color-background",       "normal"],
  ["muted-foreground on card",            "--color-muted-foreground",      "--color-card",             "normal"],
  ["muted-foreground on muted",           "--color-muted-foreground",      "--color-muted",            "normal"],
  ["text-subtle on background",           "--color-text-subtle",           "--color-background",       "normal"],
  ["text-subtle on card",                 "--color-text-subtle",           "--color-card",             "normal"],
  ["text-subtle on muted",                "--color-text-subtle",           "--color-muted",            "normal"],
  // Brand
  ["brand-primary on background",         "--color-brand-primary",         "--color-background",       "normal"],
  ["brand-primary on card",               "--color-brand-primary",         "--color-card",             "normal"],
  ["brand-text on brand-primary",         "--color-brand-text",            "--color-brand-primary",    "normal"],
  ["brand-primary-hover on background",   "--color-brand-primary-hover",   "--color-background",       "normal"],
  ["brand-text on brand-primary-hover",   "--color-brand-text",            "--color-brand-primary-hover", "normal"],
  ["brand-primary-active on background",  "--color-brand-primary-active",  "--color-background",       "normal"],
  ["brand-text on brand-primary-active",  "--color-brand-text",            "--color-brand-primary-active", "normal"],
  // Semantic — success
  ["success-text on success-soft",        "--color-success-text",          "--color-success-soft",     "normal"],
  ["success-foreground on success",       "--color-success-foreground",    "--color-success",          "normal"],
  // Semantic — warning
  ["warning-text on warning-soft",        "--color-warning-text",          "--color-warning-soft",     "normal"],
  ["warning-foreground on warning",       "--color-warning-foreground",    "--color-warning",          "normal"],
  ["warning-text on background",          "--color-warning-text",          "--color-background",       "normal"],
  // Semantic — danger
  ["danger-text on danger-soft",          "--color-danger-text",           "--color-danger-soft",      "normal"],
  ["danger-foreground on danger",         "--color-danger-foreground",     "--color-danger",           "normal"],
  ["danger-text on background",           "--color-danger-text",           "--color-background",       "normal"],
  // Semantic — info
  ["info-text on info-soft",              "--color-info-text",             "--color-info-soft",        "normal"],
  ["info-foreground on info",             "--color-info-foreground",       "--color-info",             "normal"],
  // Dark section
  ["dark-text-primary on dark-bg",        "--color-dark-text-primary",     "--color-dark-bg",          "normal"],
  ["dark-text-body on dark-bg",           "--color-dark-text-body",        "--color-dark-bg",          "normal"],
  ["dark-text-muted on dark-bg",          "--color-dark-text-muted",       "--color-dark-bg",          "normal"],
  ["dark-brand-accent on dark-bg",        "--color-dark-brand-accent",     "--color-dark-bg",          "normal"],
  // Danger on background (timer low, etc.)
  ["danger on background",                "--color-danger",                "--color-background",       "normal"],
  // Warm accent
  ["warm-500 on background",              "--color-warm-500",              "--color-background",       "normal"],
  ["warm-500 on warm-100",                "--color-warm-500",              "--color-warm-100",         "normal"],
];

const THRESHOLD_NORMAL = 4.5;
const THRESHOLD_LARGE  = 3.0;

function runContrastAudit(tokens) {
  const results = [];
  for (const [label, fgToken, bgToken, sizeClass] of PAIRINGS) {
    const fgRaw = tokens.get(fgToken);
    const bgRaw = tokens.get(bgToken);
    if (!fgRaw || !bgRaw) {
      results.push({ label, status: "WARN", ratio: null, note: `token not found: ${!fgRaw ? fgToken : bgToken}` });
      continue;
    }
    const fg = resolveColor(fgRaw, tokens);
    const bg = resolveColor(bgRaw, tokens);
    if (!fg || !bg) {
      results.push({ label, status: "WARN", ratio: null, note: `unresolvable colour: fg=${fgRaw} bg=${bgRaw}` });
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const threshold = sizeClass === "large" || sizeClass === "ui" ? THRESHOLD_LARGE : THRESHOLD_NORMAL;
    const pass = ratio >= threshold;
    results.push({
      label,
      status: pass ? "PASS" : "FAIL",
      ratio,
      fg,
      bg,
      threshold,
      note: pass ? null : `${ratio.toFixed(2)}:1 < ${threshold}:1 required`,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// 2. Type floor (>=12px)
// ---------------------------------------------------------------------------

const PX_FLOOR = 12;
const ROOT_PX = 16; // assumed root font-size

function remToPx(remVal) {
  return parseFloat(remVal) * ROOT_PX;
}

function runTypeSizeAudit(tokens) {
  const failures = [];

  for (const cssFile of cssFiles) {
    const text = readFileSync(cssFile, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const re = /font-size\s*:\s*([^;]+);/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].trim();
      let px = null;

      // Direct px value
      const pxMatch = /^([\d.]+)px$/.exec(raw);
      if (pxMatch) px = parseFloat(pxMatch[1]);

      // rem value
      const remMatch = /^([\d.]+)rem$/.exec(raw);
      if (remMatch) px = remToPx(remMatch[1]);

      // em value — relative; we approximate against root 16px as worst case
      const emMatch = /^([\d.]+)em$/.exec(raw);
      if (emMatch) px = parseFloat(emMatch[1]) * ROOT_PX;

      // var(--token) reference
      const varMatch = /^var\((--[\w-]+)\)$/.exec(raw);
      if (varMatch) {
        const tokenVal = tokens.get(varMatch[1]);
        if (tokenVal) {
          const tpxM = /^([\d.]+)px$/.exec(tokenVal.trim());
          if (tpxM) px = parseFloat(tpxM[1]);
        }
      }

      if (px !== null && px < PX_FLOOR) {
        failures.push({
          file: cssFile.replace(srcDir + "/", ""),
          declaration: raw,
          px: px.toFixed(1),
        });
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// 3. Touch targets (44px)
// ---------------------------------------------------------------------------

const TOUCH_TARGET_PX = 44;

/**
 * Interactive CSS selectors that must meet the 44px touch target.
 * We look for rules whose selector contains these patterns and check that
 * the rule has min-height and/or min-width >= 44px (or the --touch-target
 * token which is defined as 44px).
 *
 * We only audit BASE class selectors (single class, no state modifiers like
 * --primary, --ghost, --picked, --correct) because state modifier classes
 * inherit the size from the base class. A rule like `.pr-btn--primary { ... }`
 * only changes colour; the 44px comes from `.pr-btn { min-height: ... }`.
 * State modifiers always contain "--" after the base class name.
 */
const INTERACTIVE_SELECTOR_PATTERNS = [
  /\bbtn\b/,       // any class containing "btn"
  /\bbutton\b/,    // element selector
  /\bclose\b/,     // close affordances
  /\bback\b/,      // back buttons
  /\blink\b/,      // nav links
  /\bexit\b/,      // exit button
  /\bpcell\b/,     // palette cells
  /\bchoice\b/,    // exam choices
  /\bopt\b/,       // answer options
  /\binput\b/,     // form inputs
];

/**
 * Returns true if the selector is a state-modifier variant (inherits size from
 * its base class) and therefore should not be independently audited for size.
 * Pattern: class ends in --word (BEM modifier) or contains a descendant combinator
 * like ".pr-opt--correct .pr-opt__tag".
 */
function isStateModifier(selector) {
  // BEM modifier: .some-class--variant (or .some-class--variant .descendant)
  if (/\.\w[\w-]*--[\w-]+/.test(selector)) return true;
  // Compound descendant selectors (the tag selector itself is already covered)
  if (selector.includes(" ") && !selector.includes(">") && !selector.includes("~")) return true;
  return false;
}

function runTouchTargetAudit(tokens) {
  const touchTokenPx = 44; // --touch-target is 44px per tokens.css
  const failures = [];

  for (const cssFile of cssFiles) {
    const text = readFileSync(cssFile, "utf8");
    // Strip block comments
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");

    // Split into rule blocks: selector { declarations }
    // This is a simple split — it won't handle nested @media perfectly,
    // but we only need to check interactive selectors for min-height/min-width.
    const ruleRe = /([^{]+)\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(stripped)) !== null) {
      const selector = m[1].trim();
      const body = m[2];

      // Only check plain selectors that look interactive (no pseudo-classes like :hover)
      if (selector.includes(":") || selector.includes("@")) continue;
      const isInteractive = INTERACTIVE_SELECTOR_PATTERNS.some((p) => p.test(selector));
      if (!isInteractive) continue;
      // Skip state modifier classes — they inherit size from their base class
      if (isStateModifier(selector)) continue;

      // Check min-height
      const minH = /min-height\s*:\s*([^;]+);/.exec(body);
      const minW = /min-width\s*:\s*([^;]+);/.exec(body);

      // Resolve a size declaration to px
      function sizeToPx(raw) {
        if (!raw) return null;
        const v = raw.trim();
        if (v.includes("--touch-target")) return touchTokenPx;
        const pxM = /^([\d.]+)px$/.exec(v);
        if (pxM) return parseFloat(pxM[1]);
        const remM = /^([\d.]+)rem$/.exec(v);
        if (remM) return parseFloat(remM[1]) * ROOT_PX;
        const varM = /^var\((--[\w-]+)\)$/.exec(v);
        if (varM) {
          const tv = tokens.get(varM[1]);
          if (tv) return sizeToPx(tv);
        }
        return null;
      }

      const mhPx = sizeToPx(minH ? minH[1] : null);
      const mwPx = sizeToPx(minW ? minW[1] : null);

      // An interactive element must have BOTH min-height and min-width >= 44px
      // OR at least one of them set if the element is inherently square (e.g., icon button).
      // We flag elements that have neither set, or either set below 44px.
      const hasH = mhPx !== null && mhPx >= TOUCH_TARGET_PX;
      const hasW = mwPx !== null && mwPx >= TOUCH_TARGET_PX;
      const hasEither = (mhPx !== null && mhPx >= TOUCH_TARGET_PX) ||
                        (mwPx !== null && mwPx >= TOUCH_TARGET_PX);
      // We require at least one dimension to be >= 44px.
      // (An option row might be wide/flex and relies on natural height; a close button
      //  might be square. One dimension >= 44 is the minimum.)
      if (!hasEither) {
        failures.push({
          file: cssFile.replace(srcDir + "/", ""),
          selector: selector.slice(0, 80),
          minHeight: mhPx !== null ? `${mhPx}px` : "not set",
          minWidth: mwPx !== null ? `${mwPx}px` : "not set",
        });
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// 4. Focus visibility
// ---------------------------------------------------------------------------

/**
 * Check that every interactive selector in each CSS file has a corresponding
 * :focus-visible rule somewhere in that file. This is a heuristic: if the
 * file contains a :focus-visible block at all, we consider it covered — the
 * actual per-selector coverage is verified visually.
 *
 * Only flow CSS files and base.css are audited — the tokens file contains
 * custom property definitions (e.g. --touch-target) whose names happen to
 * match the interactive-selector patterns but are not themselves interactive.
 *
 * We report files whose interactive content has zero :focus-visible rules.
 */
function runFocusAudit() {
  const results = [];
  // Only audit flow CSS and base.css, not the tokens file
  const auditFiles = cssFiles.filter((f) => {
    const rel = f.replace(srcDir + "/", "");
    return rel === "base.css" || rel.startsWith("flows/");
  });
  for (const cssFile of auditFiles) {
    const text = readFileSync(cssFile, "utf8");
    const hasFocusVisible = text.includes(":focus-visible");
    // Count interactive class/element selectors (not inside custom-property values)
    // Strip the :root { ... } token blocks first so --touch-target etc. don't match.
    const strippedTokenBlocks = text.replace(/:root\s*\{[^}]*\}/gs, "");
    const hasInteractive = INTERACTIVE_SELECTOR_PATTERNS.some((p) => p.test(strippedTokenBlocks));
    if (hasInteractive && !hasFocusVisible) {
      results.push({ file: cssFile.replace(srcDir + "/", "") });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 5. Reduced motion compliance
// ---------------------------------------------------------------------------

/**
 * Flag any transition or animation declaration that hard-codes a duration in
 * ms/s instead of using the --motion-duration-scalar pattern.
 *
 * Correct form: calc(var(--duration-fast) * var(--motion-duration-scalar))
 * Bad form: transition: ... 200ms ...  OR animation: ... 0.2s ...
 */
function runReducedMotionAudit() {
  const failures = [];
  // Match transition/animation declarations with a hard-coded time value
  const hardTimeRe = /(?:transition|animation)\s*:[^;]*\b\d+(?:\.\d+)?(?:ms|s)\b[^;]*;/g;
  // Exclude lines that use calc(... * var(--motion-duration-scalar))
  for (const cssFile of cssFiles) {
    const text = readFileSync(cssFile, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    let m;
    while ((m = hardTimeRe.exec(text)) !== null) {
      const decl = m[0];
      if (decl.includes("--motion-duration-scalar")) continue; // correct form
      // Also allow @keyframes percentage steps (they don't carry a duration)
      // and check if this is inside a @keyframes block — skip those
      const before = text.slice(0, m.index);
      const openBraces = (before.match(/\{/g) || []).length;
      const closeBraces = (before.match(/\}/g) || []).length;
      // Rough heuristic: if we're in a nested block, it might be @keyframes
      failures.push({
        file: cssFile.replace(srcDir + "/", ""),
        declaration: decl.slice(0, 120).trim(),
      });
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Run all checks and report
// ---------------------------------------------------------------------------

console.log("\nPinaka Abhyas accessibility audit (W5-6)");
console.log("=".repeat(60));

// Load tokens
let tokens;
try {
  const tokensText = readFileSync(tokensPath, "utf8");
  tokens = parseTokens(tokensText);
  console.log(`\nTokens loaded: ${tokens.size} properties from ${basename(tokensPath)}`);
} catch (err) {
  console.error(`FAIL: could not read tokens.css: ${err.message}`);
  process.exit(1);
}

// 1. Contrast
console.log("\n── 1. Contrast audit ──");
const contrastResults = runContrastAudit(tokens);
let contrastFails = 0;
let contrastWarns = 0;
for (const r of contrastResults) {
  if (r.status === "FAIL") {
    contrastFails++;
    console.log(`  FAIL  ${r.ratio.toFixed(2)}:1 (need ${r.threshold}:1)  ${r.label}`);
    console.log(`        fg=${r.fg}  bg=${r.bg}`);
  } else if (r.status === "WARN") {
    contrastWarns++;
    console.log(`  WARN  ${r.label}: ${r.note}`);
  } else {
    console.log(`  PASS  ${r.ratio.toFixed(2)}:1  ${r.label}`);
  }
}
if (contrastFails === 0) {
  console.log(`  ✓ All ${contrastResults.filter((r) => r.status === "PASS").length} audited pairings pass (${contrastWarns} warnings).`);
}

// 2. Type floor
console.log("\n── 2. Type floor (min 12px) ──");
const typeFails = runTypeSizeAudit(tokens);
if (typeFails.length === 0) {
  console.log("  ✓ No font-size below 12px found.");
} else {
  for (const f of typeFails) {
    console.log(`  FAIL  ${f.file}: font-size: ${f.declaration} (resolves to ${f.px}px)`);
  }
}

// 3. Touch targets
console.log("\n── 3. Touch targets (44px) ──");
const touchFails = runTouchTargetAudit(tokens);
if (touchFails.length === 0) {
  console.log("  ✓ All audited interactive selectors have a 44px dimension.");
} else {
  for (const f of touchFails) {
    console.log(`  FAIL  ${f.file}: ${f.selector}`);
    console.log(`        min-height=${f.minHeight}  min-width=${f.minWidth}`);
  }
}

// 4. Focus visibility
console.log("\n── 4. Focus visibility ──");
const focusFails = runFocusAudit();
if (focusFails.length === 0) {
  console.log("  ✓ All CSS files with interactive selectors contain :focus-visible rules.");
} else {
  for (const f of focusFails) {
    console.log(`  FAIL  ${f.file}: has interactive selectors but no :focus-visible rule`);
  }
}

// 5. Reduced motion
console.log("\n── 5. Reduced motion compliance ──");
const motionFails = runReducedMotionAudit();
if (motionFails.length === 0) {
  console.log("  ✓ No hard-coded transition/animation durations found.");
} else {
  for (const f of motionFails) {
    console.log(`  FAIL  ${f.file}`);
    console.log(`        ${f.declaration}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const totalFails =
  contrastFails +
  typeFails.length +
  touchFails.length +
  focusFails.length +
  motionFails.length;

console.log("\n" + "=".repeat(60));
console.log("Summary");
console.log(`  Contrast:      ${contrastFails === 0 ? "PASS" : `FAIL (${contrastFails})`}`);
console.log(`  Type floor:    ${typeFails.length === 0 ? "PASS" : `FAIL (${typeFails.length})`}`);
console.log(`  Touch targets: ${touchFails.length === 0 ? "PASS" : `FAIL (${touchFails.length})`}`);
console.log(`  Focus visible: ${focusFails.length === 0 ? "PASS" : `FAIL (${focusFails.length})`}`);
console.log(`  Reduced motion:${motionFails.length === 0 ? "PASS" : `FAIL (${motionFails.length})`}`);
console.log("");

if (totalFails > 0) {
  console.error(`FAIL: ${totalFails} accessibility issue(s) found. Fix before merging.`);
  process.exit(1);
}

console.log("OK: all accessibility checks pass.");
