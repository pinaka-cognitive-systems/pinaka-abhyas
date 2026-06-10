/**
 * CLAIM 1: convergence "for ANY ability level ... within 0.1 probability at 200
 * events". Find the cleanest breach driven by realistic spacing.
 */
import { describe, it, expect } from "vitest";
import { simulate, type SimItem } from "./sim.js";
import { sigmoid, DIFFICULTY_ANCHOR } from "../src/scale.js";

const MS_PER_DAY = 86_400_000;
const TRIALS = 400;

function meanFinalProb(theta: number, items: SimItem[], times: number[] | undefined, seedBase: number) {
  let sum = 0;
  for (let t = 0; t < TRIALS; t++) {
    const traj = simulate({ theta, items, times, seed: seedBase + t });
    sum += traj[traj.length - 1]!.rating;
  }
  const meanRating = sum / TRIALS;
  const truthP = sigmoid(theta - DIFFICULTY_ANCHOR.L2);
  const estP = sigmoid(meanRating - DIFFICULTY_ANCHOR.L2);
  return { meanRating, truthP, estP, probErr: Math.abs(estP - truthP) };
}

describe("DRIFT-driven convergence breach", () => {
  it("ATTACK M: high student, 200 events at 10-day spacing", () => {
    const theta = 2.5;
    const items: SimItem[] = Array.from({ length: 200 }, () => ({ label: "L2", itype: "single_best" }));
    const times = Array.from({ length: 200 }, (_, i) => (i + 1) * 10 * MS_PER_DAY);
    const r = meanFinalProb(theta, items, times, 11000);
    console.log(`[M] theta=2.5 10d-spacing | truthP=${r.truthP.toFixed(4)} estP=${r.estP.toFixed(4)} meanRating=${r.meanRating.toFixed(4)} probErr=${r.probErr.toFixed(4)}`);
    expect(r.probErr).toBeLessThanOrEqual(0.1);
  });

  it("ATTACK N: same student, DENSE (1-day) spacing — drift removed, control", () => {
    const theta = 2.5;
    const items: SimItem[] = Array.from({ length: 200 }, () => ({ label: "L2", itype: "single_best" }));
    const r = meanFinalProb(theta, items, undefined, 11000);
    console.log(`[N control] theta=2.5 dense | truthP=${r.truthP.toFixed(4)} estP=${r.estP.toFixed(4)} meanRating=${r.meanRating.toFixed(4)} probErr=${r.probErr.toFixed(4)}`);
    expect(r.probErr).toBeLessThanOrEqual(0.1);
  });
});
