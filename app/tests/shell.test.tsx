/**
 * W5-1 smoke test: engine import graph proof.
 *
 * Tests that masteryProbability from @pinaka/engine is importable and
 * computes the expected prior values for a fresh skill. This is the
 * lightest proof that the Vite import graph works end-to-end.
 *
 * We do not test DOM rendering here to avoid @testing-library/react and
 * @types/testing-library deps; the task spec allows testing the
 * engine-consuming function directly when that keeps deps minimal.
 * DOM rendering is tested visually via `npm run dev` and `npm run build`.
 */

import { describe, expect, it } from "vitest";
import { FRESH_SKILL, masteryProbability } from "@pinaka/engine";

describe("masteryProbability on a fresh skill", () => {
  it("returns a point estimate between 0 and 1", () => {
    const { p } = masteryProbability(FRESH_SKILL);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("returns a 90% band where low < p < high", () => {
    const { p, low, high } = masteryProbability(FRESH_SKILL);
    expect(low).toBeLessThan(p);
    expect(p).toBeLessThan(high);
  });

  it("band values are in [0, 1]", () => {
    const { low, high } = masteryProbability(FRESH_SKILL);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("matches the prior: p exactly 0.5 against an L2 item (rating=0, anchor=0)", () => {
    // PRIOR_RATING is 0.0 and L2 anchor is 0.0, so sigmoid(0 - 0) = 0.5.
    // masteryProbability reports raw sigmoid without guessing floor
    // (the floor applies only during Bayesian updates, not the display estimate).
    const { p } = masteryProbability(FRESH_SKILL);
    expect(p).toBeCloseTo(0.5, 5);
  });
});
