/**
 * Voice gate for the baseline flow copy (the gap that let a contraction and
 * two em-dashes ship: found by looking at the running app, not by a suite).
 * Mirrors the firstrun/home copy gates.
 */
import { describe, expect, it } from "vitest";
import { COPY } from "../../src/flows/baseline/copy.js";

function allStrings(obj: unknown, out: string[] = []): string[] {
  if (typeof obj === "string") out.push(obj);
  else if (obj !== null && typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) allStrings(v, out);
  }
  return out;
}

describe("baseline copy voice gate", () => {
  const strings = allStrings(COPY);
  it("has copy to check", () => {
    expect(strings.length).toBeGreaterThan(0);
  });
  for (const [name, pattern] of [
    ["em-dashes", /—|–/],
    ["exclamation marks", /!/],
    ["contractions", /\b(let's|don't|can't|won't|it's|you're|we're|isn't|aren't|didn't|doesn't|wouldn't|couldn't|shouldn't|that's|there's|what's|here's)\b/i],
  ] as const) {
    it(`contains no ${name}`, () => {
      for (const s of strings) expect(s).not.toMatch(pattern);
    });
  }
});
