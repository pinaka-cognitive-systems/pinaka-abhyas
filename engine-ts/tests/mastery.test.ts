/**
 * Certification suite for Glicko-lite mastery (plan W1-1).
 *
 * These tests exist because the Python prototype's estimator diverged to its
 * clamps and 82 direction-only tests never noticed (audit ENG-01). Everything
 * here pins values, convergence, and calibration, never just direction.
 */
import { describe, expect, it } from "vitest";
import {
  applyIdleDrift,
  expectedOutcome,
  FRESH_SKILL,
  masteryProbability,
  type Observation,
  type SkillState,
  updateSkill,
} from "../src/mastery.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, PRIOR_DEVIATION, sigmoid } from "../src/scale.js";

/** Deterministic RNG: golden vectors and CI depend on reproducibility. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3_600_000;
const LABELS = ["L1", "L2", "L3"] as const;

function simulateStudent(
  theta: number,
  nEvents: number,
  seed: number,
  itemType: "single_best" | "numeric_entry" = "single_best",
): SkillState {
  const rng = mulberry32(seed);
  let state: SkillState = { ...FRESH_SKILL };
  let t = 1_700_000_000_000;
  for (let i = 0; i < nEvents; i++) {
    const label = LABELS[Math.floor(rng() * 3)]!;
    const b = DIFFICULTY_ANCHOR[label];
    const c = GUESSING_FLOOR[itemType];
    const pTrue = c + (1 - c) * sigmoid(theta - b);
    const obs: Observation = {
      correct: rng() < pTrue,
      difficultyLabel: label,
      itemType,
      occurredAtMs: t,
    };
    state = updateSkill(state, obs);
    t += HOUR;
  }
  return state;
}

describe("convergence (the ENG-01 regression class)", () => {
  // The audited failure: a true-55% student sank to p=0.03 and a true-80%
  // student saturated at 0.98. Neither may happen again.
  const cases: Array<{ name: string; theta: number }> = [
    { name: "strong student (~80% on L2)", theta: Math.log(0.8 / 0.2) },
    { name: "borderline-pass student (~55% on L2)", theta: Math.log(0.55 / 0.45) },
    { name: "struggling student (~45% on L2)", theta: Math.log(0.45 / 0.55) },
    { name: "weak student (~30% on L2)", theta: Math.log(0.3 / 0.7) },
  ];
  for (const { name, theta } of cases) {
    it(`${name}: estimate within 0.1 probability of truth at 200 events`, () => {
      const errs: number[] = [];
      for (const seed of [11, 22, 33, 44, 55]) {
        const s = simulateStudent(theta, 200, seed);
        errs.push(Math.abs(sigmoid(s.rating) - sigmoid(theta)));
      }
      const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
      expect(meanErr).toBeLessThan(0.1);
      // No saturation: every run stays strictly inside the rating clamps.
      expect(Math.max(...errs)).toBeLessThan(0.2);
    });
  }

  it("does not saturate with long use (600 events, mid-ability)", () => {
    const theta = Math.log(0.6 / 0.4);
    const s = simulateStudent(theta, 600, 7);
    expect(Math.abs(s.rating)).toBeLessThan(2.5);
    expect(Math.abs(sigmoid(s.rating) - sigmoid(theta))).toBeLessThan(0.08);
  });

  it("a pure guesser converges to low mastery, not the middle", () => {
    // Answers 25% correct on single_best regardless of difficulty.
    const rng = mulberry32(99);
    let state: SkillState = { ...FRESH_SKILL };
    let t = 1_700_000_000_000;
    for (let i = 0; i < 300; i++) {
      const label = LABELS[Math.floor(rng() * 3)]!;
      state = updateSkill(state, {
        correct: rng() < 0.25,
        difficultyLabel: label,
        itemType: "single_best",
        occurredAtMs: t,
      });
      t += HOUR;
    }
    expect(masteryProbability(state).p).toBeLessThan(0.15);
  });
});

describe("calibration: the deviation must mean what it claims", () => {
  it("90% interval covers the true ability at least 85% of the time", () => {
    const rng = mulberry32(2026);
    let covered = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const theta = -2 + 4 * rng();
      const s = simulateStudent(theta, 60, 1000 + i);
      const { low, high } = masteryProbability(s);
      const truth = sigmoid(theta);
      if (truth >= low && truth <= high) covered++;
    }
    expect(covered / n).toBeGreaterThan(0.85);
  });

  it("deviation shrinks with evidence and never reaches false certainty", () => {
    const s0 = { ...FRESH_SKILL };
    const s60 = simulateStudent(0.5, 60, 5);
    const s300 = simulateStudent(0.5, 300, 5);
    expect(s60.deviation).toBeLessThan(s0.deviation);
    expect(s300.deviation).toBeLessThanOrEqual(s60.deviation);
    expect(s300.deviation).toBeGreaterThanOrEqual(0.25); // MIN_DEVIATION floor
  });
});

describe("forgetting: inactivity widens uncertainty and fades the claim", () => {
  it("90 idle days return a converged skill toward the prior", () => {
    const converged = simulateStudent(1.5, 200, 3);
    const after = applyIdleDrift(converged, converged.lastEventMs + 90 * 24 * HOUR);
    expect(after.deviation).toBeGreaterThan(PRIOR_DEVIATION * 0.9);
    // exp(-90/120) = 0.472: a season of absence roughly halves the claim.
    expect(Math.abs(after.rating)).toBeLessThan(Math.abs(converged.rating) * 0.5);
    expect(Math.abs(after.rating)).toBeGreaterThan(Math.abs(converged.rating) * 0.4);
  });

  it("no drift for a skill never practised, or backwards in time", () => {
    const fresh = { ...FRESH_SKILL };
    expect(applyIdleDrift(fresh, 9e12)).toEqual(fresh);
    const s = simulateStudent(1, 50, 4);
    expect(applyIdleDrift(s, s.lastEventMs - HOUR)).toEqual(s);
  });
});

describe("model shape", () => {
  it("guessing floor: blind guessing yields E=0.25 on single_best, 0 on numeric", () => {
    const base = {
      difficultyLabel: "L2" as const,
      occurredAtMs: 0,
      correct: true,
    };
    expect(
      expectedOutcome(-100, { ...base, itemType: "single_best" }),
    ).toBeCloseTo(0.25, 5);
    expect(
      expectedOutcome(-100, { ...base, itemType: "numeric_entry" }),
    ).toBeCloseTo(0.0, 5);
  });

  it("empirical difficulty overrides the label anchor", () => {
    const e1 = expectedOutcome(0, {
      correct: true,
      difficultyLabel: "L1",
      itemType: "numeric_entry",
      empiricalDifficulty: 2.0,
      occurredAtMs: 0,
    });
    expect(e1).toBeCloseTo(sigmoid(-2), 9);
  });

  it("update is deterministic: same inputs, bit-identical state", () => {
    const a = simulateStudent(0.7, 150, 42);
    const b = simulateStudent(0.7, 150, 42);
    expect(a).toEqual(b);
  });

  it("pinned value: one correct L2 answer from fresh state", () => {
    // A frozen scalar so any change to the math is loud, not silent.
    const s = updateSkill(
      { ...FRESH_SKILL },
      { correct: true, difficultyLabel: "L2", itemType: "single_best", occurredAtMs: 1 },
    );
    expect(s.rating).toBeCloseTo(0.504672897196, 9);
    expect(s.deviation).toBeCloseTo(1.2970131035, 9);
  });
});
