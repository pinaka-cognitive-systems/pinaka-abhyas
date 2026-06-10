/**
 * Glicko-lite mastery (ADR 0012).
 *
 * Per skill node we track a rating r and a deviation rd on the shared logit
 * scale (scale.ts). The expected outcome against an item of difficulty b with
 * guessing floor c is
 *
 *   E = c + (1 - c) * sigmoid(r - b)
 *
 * Each observed outcome performs a one-step Bayesian (Laplace) update:
 * the Fisher information of the observation is added to the precision, and the
 * rating moves by the scaled score. This makes the update self-correcting:
 * the rating converges to the ability that explains the outcomes, and the step
 * size adapts automatically (large while uncertain, small once converged).
 * ADR 0010's independent cross-check (W1-12) reimplements exactly this file's
 * math from this comment block and the spec, not from the code.
 */

import {
  DIFFICULTY_ANCHOR,
  type DifficultyLabel,
  FADE_GRACE_DAYS,
  GUESSING_FLOOR,
  IDLE_VARIANCE_PER_DAY,
  type ItemType,
  MAX_ABS_RATING,
  MAX_DEVIATION,
  MIN_DEVIATION,
  PRIOR_DEVIATION,
  PRIOR_RATING,
  PROCESS_NOISE_PER_EVENT,
  RATING_FADE_DAYS,
  SLOW_RATING_TAU_EVENTS,
  sigmoid,
} from "./scale.js";

export interface SkillState {
  /** Rating on the logit scale. */
  readonly rating: number;
  /** Deviation (uncertainty) on the logit scale. */
  readonly deviation: number;
  /** Slow reference rating (EMA, tau SLOW_RATING_TAU_EVENTS): rating minus this
   * is the drift signal for a non-stationary student. */
  readonly slowRating: number;
  /** Epoch milliseconds of the last observed event on this skill. */
  readonly lastEventMs: number;
  /** Observed events on this skill. */
  readonly attempts: number;
}

export const FRESH_SKILL: Omit<SkillState, "lastEventMs"> & { lastEventMs: number } = {
  rating: PRIOR_RATING,
  deviation: PRIOR_DEVIATION,
  slowRating: PRIOR_RATING,
  lastEventMs: 0,
  attempts: 0,
};

export interface Observation {
  readonly correct: boolean;
  readonly difficultyLabel: DifficultyLabel;
  readonly itemType: ItemType;
  /** Recalibrated difficulty from telemetry, when present (empirical.difficulty_b).
   * Overrides the label anchor per ADR 0012. */
  readonly empiricalDifficulty?: number;
  readonly occurredAtMs: number;
}

const MS_PER_DAY = 86_400_000;

/** Inactivity: variance grows toward the prior (we know less), and the rating
 * fades toward the prior on its own, much slower clock (the claim weakens).
 * These are deliberately separate: coupling the fade to the variance ratio
 * compounds into a per-event bias against converged students. */
export function applyIdleDrift(state: SkillState, nowMs: number): SkillState {
  if (state.attempts === 0 || nowMs <= state.lastEventMs) return state;
  const idleDays = (nowMs - state.lastEventMs) / MS_PER_DAY;
  const grown = Math.min(
    state.deviation ** 2 + IDLE_VARIANCE_PER_DAY * idleDays,
    MAX_DEVIATION ** 2,
  );
  const fadeDays = Math.max(0, idleDays - FADE_GRACE_DAYS);
  const fade = Math.exp(-fadeDays / RATING_FADE_DAYS);
  // A state imported from before the slowRating field reads as "no drift",
  // never as NaN.
  const slow = Number.isFinite(state.slowRating) ? state.slowRating : state.rating;
  return {
    ...state,
    rating: PRIOR_RATING + (state.rating - PRIOR_RATING) * fade,
    slowRating: PRIOR_RATING + (slow - PRIOR_RATING) * fade,
    deviation: Math.sqrt(grown),
  };
}

export function expectedOutcome(rating: number, obs: Observation): number {
  const b = obs.empiricalDifficulty ?? DIFFICULTY_ANCHOR[obs.difficultyLabel];
  const c = GUESSING_FLOOR[obs.itemType];
  return c + (1 - c) * sigmoid(rating - b);
}

export function updateSkill(state: SkillState, obs: Observation): SkillState {
  const drifted = applyIdleDrift(state, obs.occurredAtMs);
  const b = obs.empiricalDifficulty ?? DIFFICULTY_ANCHOR[obs.difficultyLabel];
  const c = GUESSING_FLOOR[obs.itemType];
  const p = sigmoid(drifted.rating - b);
  const e = c + (1 - c) * p;
  const dEdr = (1 - c) * p * (1 - p);
  // Bernoulli score and Fisher information w.r.t. the rating.
  const variance = Math.max(e * (1 - e), 1e-9);
  const score = ((obs.correct ? 1 : 0) - e) * (dEdr / variance);
  const information = (dEdr * dEdr) / variance;
  // Non-stationary learner: every observation first widens the prior by the
  // process noise, so certainty saturates at a floor and the estimator tracks.
  const priorVariance = Math.min(
    drifted.deviation ** 2 + PROCESS_NOISE_PER_EVENT,
    MAX_DEVIATION ** 2,
  );
  const priorPrecision = 1 / priorVariance;
  const posteriorPrecision = priorPrecision + information;
  const rating = clamp(
    drifted.rating + score / posteriorPrecision,
    -MAX_ABS_RATING,
    MAX_ABS_RATING,
  );
  const deviation = clamp(Math.sqrt(1 / posteriorPrecision), MIN_DEVIATION, MAX_DEVIATION);
  // The slow trace rides along for the first three observations (the rating is
  // still mostly prior there, and a prior-contaminated seed dilutes the drift
  // signal), then lags with time constant TAU. Drift = rating - slowRating then
  // honestly reads "current ability versus early ability".
  const slowRating =
    drifted.attempts < 3
      ? rating
      : drifted.slowRating + (rating - drifted.slowRating) / SLOW_RATING_TAU_EVENTS;
  return {
    rating,
    deviation,
    slowRating,
    lastEventMs: obs.occurredAtMs,
    attempts: drifted.attempts + 1,
  };
}

/** Mastery as a probability of beating an anchor item of the given label,
 * before guessing. The deviation is reported alongside; consumers must not
 * present the point estimate without it (honesty constraint). */
export function masteryProbability(
  state: SkillState,
  label: DifficultyLabel = "L2",
): { p: number; low: number; high: number } {
  const b = DIFFICULTY_ANCHOR[label];
  // 90% interval on the rating, mapped through the sigmoid (monotone).
  const z = 1.645;
  return {
    p: sigmoid(state.rating - b),
    low: sigmoid(state.rating - z * state.deviation - b),
    high: sigmoid(state.rating + z * state.deviation - b),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
