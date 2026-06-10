/**
 * CLAIM 1 sub-attack: does idle drift interact with update order to BIAS the
 * estimate? The spec says variance growth and rating fade are "deliberately
 * separate" to avoid per-event bias. Test: a converged student who then has
 * large gaps between events.
 *
 * Also: tiny vs huge gaps with identical outcome sequences.
 */
import { describe, it, expect } from "vitest";
import { updateSkill, applyIdleDrift, type SkillState } from "../src/mastery.js";
import { simulate, type SimItem } from "./sim.js";
import { sigmoid, DIFFICULTY_ANCHOR } from "../src/scale.js";

const MS_PER_DAY = 86_400_000;

describe("IDLE DRIFT bias attacks", () => {
  it("ATTACK J: converged high student, then 200 events spaced 7 days apart", () => {
    // theta = +2. With weekly spacing across 200 events the student spans ~3.8
    // years; each step the rating fades toward 0 by exp(-7/120)=0.943 BEFORE the
    // update. Does the steady-state estimate get dragged below the truth?
    const theta = 2.0;
    const mix: SimItem[] = Array.from({ length: 200 }, () => ({ label: "L2" as const, itype: "single_best" as const }));
    const times = Array.from({ length: 200 }, (_, i) => (i + 1) * 7 * MS_PER_DAY);
    let sumRating = 0;
    const TRIALS = 300;
    for (let t = 0; t < TRIALS; t++) {
      const traj = simulate({ theta, items: mix, times, seed: 5000 + t });
      sumRating += traj[traj.length - 1]!.rating;
    }
    const meanRating = sumRating / TRIALS;
    const truthP = sigmoid(theta - DIFFICULTY_ANCHOR.L2);
    const estP = sigmoid(meanRating - DIFFICULTY_ANCHOR.L2);
    console.log(`[J] theta=2.0 weekly | meanRating=${meanRating.toFixed(4)} truthP=${truthP.toFixed(4)} estP=${estP.toFixed(4)} probErr=${Math.abs(estP - truthP).toFixed(4)}`);
    expect(Math.abs(estP - truthP)).toBeLessThanOrEqual(0.1);
  });

  it("ATTACK K: identical outcome sequence, dense vs sparse spacing", () => {
    // Fix a deterministic outcome pattern (not random). Compare rating under
    // 1-day spacing vs 30-day spacing. Drift should widen uncertainty but the
    // spec claims it should NOT bias the rating systematically.
    const pattern: boolean[] = [];
    for (let i = 0; i < 60; i++) pattern.push(i % 2 === 0); // alternating 30/30, ~theta 0
    const obs = (c: boolean, t: number) => ({ correct: c, difficultyLabel: "L2" as const, itemType: "single_best" as const, occurredAtMs: t });
    for (const days of [1, 30]) {
      let s: SkillState = { rating: 0, deviation: 1.5, lastEventMs: 0, attempts: 0 };
      let t = 0;
      for (const c of pattern) { t += days * MS_PER_DAY; s = updateSkill(s, obs(c, t)); }
      console.log(`[K] spacing=${days}d | rating=${s.rating.toFixed(4)} rd=${s.deviation.toFixed(4)}`);
    }
  });

  it("ATTACK L: high student with one huge gap mid-history (return-to-study)", () => {
    // theta=+2.5, 100 dense events (converges high), then a 365-day gap, then
    // ONE event. Reading the state after the gap: how far has the claim faded?
    const theta = 2.5;
    const mix: SimItem[] = Array.from({ length: 100 }, () => ({ label: "L2" as const, itype: "single_best" as const }));
    const times = Array.from({ length: 100 }, (_, i) => (i + 1) * MS_PER_DAY);
    const traj = simulate({ theta, items: mix, times, seed: 42 });
    const converged = traj[traj.length - 1]!;
    const afterGap = applyIdleDrift(converged, converged.lastEventMs + 365 * MS_PER_DAY);
    console.log(`[L] converged r=${converged.rating.toFixed(4)} rd=${converged.deviation.toFixed(4)} | after 365d gap r=${afterGap.rating.toFixed(4)} rd=${afterGap.deviation.toFixed(4)}`);
    // Not an assertion of a defect — characterizing the fade. exp(-365/120)=0.048.
  });
});
