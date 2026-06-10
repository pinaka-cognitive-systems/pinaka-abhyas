/**
 * The ability scale. ADR 0012 requires this to be defined once so future IRT fits
 * land on the same scale without breaking student history.
 *
 * Ratings and item difficulty anchors live on a shared natural-logit scale.
 * A student with rating r facing an item of difficulty b answers correctly,
 * before guessing, with probability sigmoid(r - b).
 */

/** Difficulty anchors per authored label. Provisional until IRT recalibration
 * (ADR 0006/0012); recalibrated values arrive per item via empirical.difficulty_b
 * and override the label anchor. */
export const DIFFICULTY_ANCHOR: Record<DifficultyLabel, number> = {
  L1: -1.0,
  L2: 0.0,
  L3: 1.0,
};

export type DifficultyLabel = "L1" | "L2" | "L3";

/** Guessing floor by item type: a blind guess on a 4-option single_best succeeds
 * 1 in 4 times; numeric entry cannot be guessed. */
export const GUESSING_FLOOR: Record<ItemType, number> = {
  single_best: 0.25,
  numeric_entry: 0.0,
};

export type ItemType = "single_best" | "numeric_entry";

/** Prior over a never-seen skill: population mean 0 (a coin flip on an L2 item
 * before guessing), wide deviation. */
export const PRIOR_RATING = 0.0;
export const PRIOR_DEVIATION = 1.5;

/** Deviation bounds. The floor keeps the model honest (we never claim near-zero
 * uncertainty from MCQ evidence alone); the ceiling is the prior. */
export const MIN_DEVIATION = 0.25;
export const MAX_DEVIATION = PRIOR_DEVIATION;

/** Inactivity drift: variance added per idle day on a skill. Takes a fully
 * converged skill (deviation 0.25) back to prior uncertainty in about 90 days.
 * Provisional until calibrated against telemetry. */
export const IDLE_VARIANCE_PER_DAY = (MAX_DEVIATION ** 2 - MIN_DEVIATION ** 2) / 90;

/** Rating fade under inactivity, separate from variance growth by design:
 * process noise widens what we know; only prolonged absence weakens the claim
 * itself. Exponential fade toward the prior with this time constant: hours and
 * days between sessions are negligible, a season of absence roughly halves the
 * claim. Provisional until calibrated. */
export const RATING_FADE_DAYS = 120;

/** Rating clamp: |r| = 4 corresponds to ~98% / ~2% pre-guessing success on an
 * anchor item; beyond that, MCQ data carries no information. */
export const MAX_ABS_RATING = 4.0;

export function sigmoid(x: number): number {
  // Numerically stable on both tails.
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}
