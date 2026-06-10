/**
 * Settings copy voice gate (W5-5 flow e, task report requirement).
 *
 * Every user-facing string the settings screen shows must pass the Fellow voice
 * rules (brand-core.md, positioning-ca.md): no contractions ("do not", never
 * "don't"), no exclamation marks, no em-dashes (long dash, en dash, or double
 * hyphen). This walks every leaf string in COPY, and also invokes every
 * function-valued leaf (the count/preview/report formatters) with sample plural
 * and singular inputs so their output is checked too. DOM-free.
 */

import { describe, expect, it } from "vitest";

import { COPY } from "../../src/flows/settings/copy.js";

/**
 * Flatten the COPY tree into [path, string] pairs. Functions are invoked with a
 * range of sample counts (0, 1, 2) so the singular/plural branches are covered.
 */
function leaves(node: unknown, path = "COPY"): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") {
    const fn = node as (n: number) => unknown;
    return [0, 1, 2]
      .map((n) => fn(n))
      .filter((v): v is string => typeof v === "string")
      .map((v, i) => [`${path}(${[0, 1, 2][i]})`, v]);
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
  }
  return [];
}

const STRINGS = leaves(COPY);

const CONTRACTIONS =
  /\b(do|does|did|is|are|was|were|has|have|had|would|will|shall|should|could|can|might|must|need|ought)n['’]t\b|\b(it|that|there|here|what|who|let|you|we|they|i|he|she|who|how)['’](s|re|ve|ll|d|m)\b/i;

describe("settings copy passes the Fellow voice rules", () => {
  it("there is copy to check", () => {
    expect(STRINGS.length).toBeGreaterThan(40);
  });

  for (const [path, s] of STRINGS) {
    it(`${path}: no exclamation mark`, () => {
      expect(s.includes("!")).toBe(false);
    });
    it(`${path}: no em-dash, en-dash, or double hyphen`, () => {
      // The status rows render a literal "—" placeholder for an unknown value;
      // that is a UI glyph, not prose, and lives in the component, not COPY.
      expect(s.includes("—")).toBe(false);
      expect(s.includes("–")).toBe(false);
      expect(/--/.test(s)).toBe(false);
    });
    it(`${path}: no contraction`, () => {
      expect(CONTRACTIONS.test(s)).toBe(false);
    });
  }
});

describe("the export line uses the brand progress voice", () => {
  it("states the fact, no urgency", () => {
    expect(COPY.export.body).toBe("Your progress is yours. Export it any time, take it anywhere.");
  });
});

describe("the telemetry section is honest per ADR 0014", () => {
  it("reads OFF and states nothing is collected today", () => {
    expect(COPY.telemetry.stateOff).toBe("Off");
    expect(COPY.telemetry.body).toContain("Nothing is collected today");
    expect(COPY.telemetry.body).toContain("opt-in");
    expect(COPY.telemetry.body).toContain("no personal data");
  });
});

describe("the danger zone requires the word DELETE", () => {
  it("the confirm word is DELETE", () => {
    expect(COPY.danger.confirmWord).toBe("DELETE");
  });
});
