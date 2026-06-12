/**
 * FSRS-4.5 primitive tests (ADR 0020). The scheduler tests pin full sequences;
 * these pin the curve identities and monotonicity properties the equations
 * must satisfy regardless of weights.
 */
import { describe, expect, it } from "vitest";
import {
  FSRS_W,
  GRADE_AGAIN,
  GRADE_GOOD,
  initialDifficulty,
  initialStability,
  intervalForRetention,
  nextDifficulty,
  retrievability,
  stabilityAfterLapse,
  stabilityAfterRecall,
  TARGET_RETENTION,
} from "../src/fsrs.js";

describe("forgetting curve identities", () => {
  it("R(0, S) = 1 and R(S, S) = 0.9 exactly (the 19/81 factor)", () => {
    for (const s of [0.5, 1, 6, 30, 365]) {
      expect(retrievability(0, s)).toBe(1);
      expect(retrievability(s, s)).toBeCloseTo(0.9, 12);
    }
  });

  it("interval inverts the curve: R(I(r, S), S) = r", () => {
    for (const s of [0.5, 3.7145, 50]) {
      for (const r of [0.8, 0.9, 0.95]) {
        const i = intervalForRetention(s, r);
        expect(retrievability(i, s)).toBeCloseTo(r, 12);
      }
    }
  });

  it("at the constant 0.9 target the interval equals the stability", () => {
    for (const s of [0.4872, 3.7145, 120]) {
      expect(intervalForRetention(s, TARGET_RETENTION)).toBeCloseTo(s, 9);
    }
  });

  it("R is decreasing in elapsed time and increasing in stability", () => {
    expect(retrievability(2, 6)).toBeGreaterThan(retrievability(5, 6));
    expect(retrievability(5, 10)).toBeGreaterThan(retrievability(5, 6));
  });
});

describe("initial memory state", () => {
  it("S0 comes from w0/w2; an item missed on first sight reads harder than one recalled", () => {
    expect(initialStability(GRADE_GOOD)).toBeCloseTo(FSRS_W[2]!, 12);
    expect(initialStability(GRADE_AGAIN)).toBeCloseTo(FSRS_W[0]!, 12);
    expect(initialDifficulty(GRADE_AGAIN)).toBeGreaterThan(initialDifficulty(GRADE_GOOD));
  });
});

describe("difficulty dynamics", () => {
  it("good leaves D0(good) fixed (mean-reversion fixed point); again raises it", () => {
    const d0 = initialDifficulty(GRADE_GOOD);
    expect(nextDifficulty(d0, GRADE_GOOD)).toBeCloseTo(d0, 12);
    expect(nextDifficulty(d0, GRADE_AGAIN)).toBeGreaterThan(d0);
  });

  it("a hard item drifts back toward D0(good) under repeated goods, never below 1", () => {
    let d = 9.5;
    const d0 = initialDifficulty(GRADE_GOOD);
    // Reversion rate is w7 = 0.031 per review: ~100 reviews to shed ~96% of
    // the gap.
    for (let i = 0; i < 100; i++) d = nextDifficulty(d, GRADE_GOOD);
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThan(9.5);
    expect(Math.abs(d - d0)).toBeLessThan(0.5); // converged near the fixed point
  });
});

describe("stability dynamics", () => {
  it("recall always grows stability; a harder-won recall (lower R) grows it more", () => {
    const s = 10;
    const d = 5;
    const atDue = stabilityAfterRecall(d, s, 0.9);
    const overdue = stabilityAfterRecall(d, s, 0.7);
    expect(atDue).toBeGreaterThan(s);
    expect(overdue).toBeGreaterThan(atDue);
  });

  it("an easier item (lower D) consolidates faster than a harder one", () => {
    expect(stabilityAfterRecall(3, 10, 0.9)).toBeGreaterThan(stabilityAfterRecall(8, 10, 0.9));
  });

  it("a lapse never increases stability, whatever the inputs", () => {
    for (const s of [0.5, 5, 50, 365]) {
      for (const r of [0.5, 0.9, 1]) {
        expect(stabilityAfterLapse(5, s, r)).toBeLessThanOrEqual(s);
      }
    }
  });

  it("a same-day recall (R = 1) leaves stability unchanged", () => {
    expect(stabilityAfterRecall(5, 10, 1)).toBeCloseTo(10, 12);
  });
});
