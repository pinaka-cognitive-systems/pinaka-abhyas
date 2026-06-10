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
 * itself. Exponential fade toward the prior with this time constant, applied
 * only to idle time BEYOND the grace period: normal practice rhythms (daily to
 * fortnightly) must carry no fade at all, or spaced practice biases converged
 * students low (W1-11 refutation, attack M). Provisional until calibrated. */
export const RATING_FADE_DAYS = 120;
export const FADE_GRACE_DAYS = 30;

/** Per-event process noise (W1-11 refutation, attack O): a learner's ability is
 * NON-STATIONARY; certainty must not accumulate without bound or the estimator
 * anchors a student to their past self. Each observation adds this variance
 * before updating, bounding the effective memory to roughly the last
 * rd_ss^2/Q events. With typical MCQ information I ~ 0.12, the steady-state
 * deviation is (Q/I)^(1/4) ~ 0.40 and the effective window ~ 53 events: the
 * estimator TRACKS a changing ability instead of averaging a whole history.
 * Tuned against both the stationary convergence suite and the non-stationary
 * coverage attack; provisional until calibrated. */
export const PROCESS_NOISE_PER_EVENT = 0.003;

/** Time constant (in events) of the slow reference rating used to detect a
 * moving ability. The gap between the current rating and this slow trace is
 * the drift signal: readiness extends its band in the drift direction, because
 * a practice-history estimate necessarily TRAILS a student who is improving
 * (or declining), and the band must admit which way the truth likely sits. */
export const SLOW_RATING_TAU_EVENTS = 80;

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
