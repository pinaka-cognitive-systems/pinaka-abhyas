/**
 * First-run copy voice gate (W5-5 flow d, task report requirement).
 *
 * Every user-facing string the first run shows must pass the Fellow voice rules
 * (brand-core.md, positioning-ca.md): no contractions ("do not", never "don't"),
 * no exclamation marks, no em-dashes (neither the long dash nor the double
 * hyphen). This test walks every leaf string in COPY and asserts all three.
 * DOM-free.
 */

import { describe, expect, it } from "vitest";

import { COPY } from "../../src/flows/firstrun/copy.js";

/** Flatten the COPY tree into [path, string] pairs for per-string assertions. */
function leaves(node: unknown, path = "COPY"): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) {
    return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  }
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
  }
  return [];
}

const STRINGS = leaves(COPY);

// Contractions banned by the voice rules. The apostrophe forms students would
// otherwise read; "do not" is required over "don't" etc.
const CONTRACTIONS =
  /\b(do|does|did|is|are|was|were|has|have|had|would|will|shall|should|could|can|might|must|need|ought)n['’]t\b|\b(it|that|there|here|what|who|let|you|we|they|i|he|she|who|how)['’](s|re|ve|ll|d|m)\b/i;

describe("first-run copy passes the Fellow voice rules", () => {
  it("there is copy to check", () => {
    // Two surfaces remain in copy.ts (webview escape, second tab); the
    // welcome screen transcribes the design prototype inline.
    expect(STRINGS.length).toBeGreaterThan(8);
  });

  for (const [path, s] of STRINGS) {
    it(`${path}: no exclamation mark`, () => {
      expect(s.includes("!")).toBe(false);
    });
    it(`${path}: no em-dash (long dash or double hyphen)`, () => {
      expect(s.includes("—")).toBe(false); // em dash
      expect(s.includes("–")).toBe(false); // en dash (also a dash, banned)
      expect(/--/.test(s)).toBe(false); // double hyphen
    });
    it(`${path}: no contraction`, () => {
      expect(CONTRACTIONS.test(s)).toBe(false);
    });
  }
});
