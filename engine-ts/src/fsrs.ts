/**
 * FSRS-4.5 memory model (ADR 0020; SPEC section 4).
 *
 * Per item we track difficulty D in [1, 10] and stability S in days: S is the
 * interval at which recall probability decays to 0.9. Retrievability after t
 * days follows the FSRS-4.5 power forgetting curve
 *
 *   R(t, S) = (1 + FACTOR * t / S)^DECAY
 *
 * with DECAY = -0.5 and FACTOR = 19/81, chosen so R(S, S) = 0.9 exactly. The
 * interval for a target retention r inverts the curve:
 *
 *   I(r, S) = (S / FACTOR) * (r^(1/DECAY) - 1)
 *
 * which at r = 0.9 is exactly S.
 *
 * The product grades binary outcomes only (ADR 0020): wrong maps to grade 1
 * (again) and correct to grade 3 (good). The hard/easy multipliers w15/w16 are
 * therefore structurally inert and never applied.
 *
 * Weights are the published FSRS-4.5 population defaults, pinned here as named
 * constants. The engine's behavior is pinned by OUR golden vectors
 * (vectors/golden.json), not by claimed bit-parity with any other
 * implementation (ADR 0020). Per-user weight fitting is telemetry-era work and
 * out of scope.
 */

/** FSRS-4.5 default weights w0..w16. w0..w3 are initial stability per grade
 * (again/hard/good/easy); w4..w7 drive difficulty; w8..w14 drive stability
 * updates; w15/w16 are the hard/easy multipliers (inert here, kept so the
 * array matches the published parameter vector index-for-index). */
export const FSRS_W: readonly number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

export const FSRS_DECAY = -0.5;
/** Forgetting-curve factor: 19/81 makes R(S, S) = 0.9 exactly. */
export const FSRS_FACTOR = 19 / 81;
/** The scheduler always targets 90% recall at review time. */
export const TARGET_RETENTION = 0.9;
/** Floors that keep the power curve and the pow() calls well-defined. */
export const MIN_STABILITY = 0.01;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;

/** Binary product: wrong -> again (1), correct -> good (3). Hard (2) and
 * easy (4) are unreachable by construction. */
export type FsrsGrade = 1 | 3;

export const GRADE_AGAIN: FsrsGrade = 1;
export const GRADE_GOOD: FsrsGrade = 3;

function clampDifficulty(d: number): number {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));
}

/** R(t, S): probability of recall after `elapsedDays` at stability S. */
export function retrievability(elapsedDays: number, stability: number): number {
  const s = Math.max(MIN_STABILITY, stability);
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FSRS_FACTOR * t) / s, FSRS_DECAY);
}

/** I(r, S): the interval in days at which R decays to `retention`.
 * At the constant TARGET_RETENTION = 0.9 this is exactly S. */
export function intervalForRetention(
  stability: number,
  retention: number = TARGET_RETENTION,
): number {
  const s = Math.max(MIN_STABILITY, stability);
  return Math.max(
    MIN_STABILITY,
    (s / FSRS_FACTOR) * (Math.pow(retention, 1 / FSRS_DECAY) - 1),
  );
}

/** S0(G) = w[G-1]: first-encounter stability. again -> w0 (~0.49 d, reviewed
 * by next morning), good -> w2 (~3.7 d). */
export function initialStability(grade: FsrsGrade): number {
  return Math.max(MIN_STABILITY, FSRS_W[grade - 1]!);
}

/** D0(G) = w4 - (G - 3) * w5, clamped to [1, 10]. good lands at w4 (~5.16),
 * again at w4 + 2*w5 (~7.62): an item missed on first sight reads harder. */
export function initialDifficulty(grade: FsrsGrade): number {
  return clampDifficulty(FSRS_W[4]! - (grade - 3) * FSRS_W[5]!);
}

/** Difficulty update with mean reversion (FSRS-4.5):
 *   D' = D - w6 * (G - 3);  D'' = w7 * D0(good) + (1 - w7) * D'
 * The reversion keeps difficulty from saturating at the clamp over long
 * histories. */
export function nextDifficulty(difficulty: number, grade: FsrsGrade): number {
  const updated = difficulty - FSRS_W[6]! * (grade - 3);
  return clampDifficulty(FSRS_W[7]! * initialDifficulty(GRADE_GOOD) + (1 - FSRS_W[7]!) * updated);
}

/** Stability after a successful recall at retrievability r:
 *   S' = S * (e^w8 * (11 - D) * S^-w9 * (e^(w10*(1-r)) - 1) + 1)
 * The gain grows as r falls (a hard-won recall consolidates more) and shrinks
 * as S grows (stabilization saturates). A same-day re-answer has r ~ 1, so
 * expm1(0) = 0 and the stability is unchanged: repeating an item within the
 * day earns nothing, by construction. w15/w16 omitted: binary grades. */
export function stabilityAfterRecall(
  difficulty: number,
  stability: number,
  r: number,
): number {
  const s = Math.max(MIN_STABILITY, stability);
  const gain =
    Math.exp(FSRS_W[8]!) *
    (11 - difficulty) *
    Math.pow(s, -FSRS_W[9]!) *
    Math.expm1(FSRS_W[10]! * (1 - r));
  return Math.max(MIN_STABILITY, s * (1 + gain));
}

/** Post-lapse stability:
 *   S'_f = w11 * D^-w12 * ((S+1)^w13 - 1) * e^(w14*(1-r))
 * capped at the pre-lapse S: forgetting never increases stability. */
export function stabilityAfterLapse(
  difficulty: number,
  stability: number,
  r: number,
): number {
  const s = Math.max(MIN_STABILITY, stability);
  const sf =
    FSRS_W[11]! *
    Math.pow(difficulty, -FSRS_W[12]!) *
    (Math.pow(s + 1, FSRS_W[13]!) - 1) *
    Math.exp(FSRS_W[14]! * (1 - r));
  return Math.max(MIN_STABILITY, Math.min(sf, s));
}
