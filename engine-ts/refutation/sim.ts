/**
 * Refutation harness — shared simulation utilities.
 *
 * W1-11 independent refutation gate. NOT part of the engine. These helpers
 * build synthetic students and drive the engine's own functions to try to
 * break the certified claims.
 */

import { updateSkill, type Observation, type SkillState, FRESH_SKILL } from "../src/mastery.js";
import { sigmoid, GUESSING_FLOOR, DIFFICULTY_ANCHOR, type DifficultyLabel, type ItemType } from "../src/scale.js";

/** Deterministic mulberry32 RNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True probability of a correct answer for a synthetic student of ability
 * theta facing an item of difficulty b, item type itype — uses the SAME model
 * the estimator assumes (so this is a best case for convergence). */
export function trueP(theta: number, b: number, itype: ItemType): number {
  const c = GUESSING_FLOOR[itype];
  return c + (1 - c) * sigmoid(theta - b);
}

export interface SimItem {
  label: DifficultyLabel;
  itype: ItemType;
  empiricalB?: number;
}

/** Difficulty value used by the estimator and the truth model. */
export function bOf(item: SimItem): number {
  return item.empiricalB ?? DIFFICULTY_ANCHOR[item.label];
}

/** Run a single-node simulation. The student has true ability `theta`; each
 * step draws an outcome from the true model for the chosen item and feeds it to
 * updateSkill. Returns the trajectory of SkillState. `times` lets attacks
 * inject arbitrary spacing (idle drift). */
export function simulate(opts: {
  theta: number;
  items: SimItem[]; // one per step (length === steps)
  times?: number[]; // occurredAtMs per step; default dense 1/day
  seed: number;
  start?: SkillState;
}): SkillState[] {
  const r = rng(opts.seed);
  let state: SkillState = opts.start ?? { ...FRESH_SKILL };
  const traj: SkillState[] = [];
  const MS_PER_DAY = 86_400_000;
  for (let i = 0; i < opts.items.length; i++) {
    const item = opts.items[i]!;
    const b = bOf(item);
    const p = trueP(opts.theta, b, item.itype);
    const correct = r() < p;
    const t = opts.times ? opts.times[i]! : (i + 1) * MS_PER_DAY;
    const obs: Observation = {
      correct,
      difficultyLabel: item.label,
      itemType: item.itype,
      empiricalDifficulty: item.empiricalB,
      occurredAtMs: t,
    };
    state = updateSkill(state, obs);
    traj.push(state);
  }
  return traj;
}

/** Mastery probability the estimator reports against an L2 anchor, mapped to
 * the SAME space as the truth, so we can compare convergence in probability. */
export function estProbL2(state: SkillState): number {
  return sigmoid(state.rating - DIFFICULTY_ANCHOR.L2);
}

/** Many-trial convergence test: returns mean estimated rating and mean
 * |sigmoid(rating)-sigmoid(theta)| at the final step across trials. */
export function convergenceStats(opts: {
  theta: number;
  items: SimItem[];
  trials: number;
  seedBase: number;
}): { meanRating: number; meanRd: number; meanProbErr: number; ratings: number[] } {
  const truthProb = sigmoid(opts.theta - DIFFICULTY_ANCHOR.L2);
  let sumRating = 0;
  let sumRd = 0;
  let sumProbErr = 0;
  const ratings: number[] = [];
  for (let t = 0; t < opts.trials; t++) {
    const traj = simulate({ theta: opts.theta, items: opts.items, seed: opts.seedBase + t * 7919 });
    const final = traj[traj.length - 1]!;
    sumRating += final.rating;
    sumRd += final.deviation;
    sumProbErr += Math.abs(estProbL2(final) - truthProb);
    ratings.push(final.rating);
  }
  return {
    meanRating: sumRating / opts.trials,
    meanRd: sumRd / opts.trials,
    meanProbErr: sumProbErr / opts.trials,
    ratings,
  };
}
