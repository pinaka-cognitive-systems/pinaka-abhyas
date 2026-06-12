/**
 * Read-time hierarchical pooling (ADR 0021; SPEC section 5.0).
 *
 * Real pack items tag leaf nodes ("qa.bmath.finance.compound_interest") while
 * the blueprint weighs family nodes ("qa.bmath.finance"). An exact-match skill
 * read therefore sees a fresh prior for every family the student has only
 * touched through leaves — readiness went prior-flat and the learnable tier
 * never fired on production-shaped data. Pooling fixes that, and at the same
 * time regularizes thin per-leaf estimates toward their neighborhood.
 *
 * Mechanism (empirical Bayes, read-time only — stored mastery state is never
 * touched, so the certified section-3 update math is unchanged):
 *   - Every attempted node contributes its drifted (rating, deviation) to each
 *     of its proper ancestor prefixes, precision-weighted (1/deviation^2).
 *   - A node's prior is the nearest pool with evidence: its own descendants
 *     first, then siblings via the parent, and so on up to part level
 *     (MIN_POOL_SEGMENTS); the node's own contribution is subtracted so it is
 *     never its own prior.
 *   - The effective rating blends own evidence with the prior at
 *     w = n / (n + K), n = own attempts, K = SHRINKAGE_PRIOR_STRENGTH; the
 *     variance blends the same way, with SIBLING_VARIANCE added to the pool's
 *     mean variance because siblings are similar, not identical.
 *
 * All constants are provisional until telemetry-era calibration (ADR 0020's
 * out-of-scope list); behavior is pinned by the golden vectors.
 */

import { applyIdleDrift, FRESH_SKILL, type SkillState } from "./mastery.js";
import { MAX_DEVIATION, MIN_DEVIATION } from "./scale.js";
import type { EngineState } from "./types.js";

/** K: how many own attempts it takes to weigh the node's own evidence equally
 * against its neighborhood prior. */
export const SHRINKAGE_PRIOR_STRENGTH = 4;
/** Between-sibling ability spread, as variance on the logit scale (0.5 logits
 * std): a pool speaks for its members only this precisely. */
export const SIBLING_VARIANCE = 0.25;
/** Pools form at prefixes with at least this many dot segments: part level
 * ("qa.bmath") and below. The whole exam ("qa") is not a pool — abilities
 * across parts differ too much for one prior. */
export const MIN_POOL_SEGMENTS = 2;

interface PoolAccum {
  sumPrecision: number;
  sumPrecisionRating: number;
  sumPrecisionSlow: number;
  count: number;
}

/** Pooled ancestor evidence, built once per read pass for a fixed nowMs. */
export interface SkillPools {
  readonly nowMs: number;
  /** prefix -> precision-weighted accumulation over its proper descendants. */
  readonly byPrefix: ReadonlyMap<string, PoolAccum>;
}

/** Proper ancestor prefixes of a node id, longest first, down to
 * MIN_POOL_SEGMENTS ("a.b.c.d" -> ["a.b.c", "a.b"]). */
function ancestorPrefixes(nodeId: string): string[] {
  const parts = nodeId.split(".");
  const out: string[] = [];
  for (let len = parts.length - 1; len >= MIN_POOL_SEGMENTS; len--) {
    out.push(parts.slice(0, len).join("."));
  }
  return out;
}

/** One node's drifted contribution to its ancestors' pools. */
function contribution(skill: SkillState, nowMs: number): {
  precision: number;
  rating: number;
  slow: number;
} {
  const drifted = applyIdleDrift(skill, nowMs);
  return {
    precision: 1 / drifted.deviation ** 2,
    rating: drifted.rating,
    slow: Number.isFinite(drifted.slowRating) ? drifted.slowRating : drifted.rating,
  };
}

/** Build the pools for one read pass. O(attempted nodes * depth). */
export function buildSkillPools(state: EngineState, nowMs: number): SkillPools {
  const byPrefix = new Map<string, PoolAccum>();
  for (const [node, skill] of state.skills) {
    if (skill.attempts === 0) continue;
    const c = contribution(skill, nowMs);
    for (const prefix of ancestorPrefixes(node)) {
      const acc = byPrefix.get(prefix) ?? {
        sumPrecision: 0,
        sumPrecisionRating: 0,
        sumPrecisionSlow: 0,
        count: 0,
      };
      acc.sumPrecision += c.precision;
      acc.sumPrecisionRating += c.precision * c.rating;
      acc.sumPrecisionSlow += c.precision * c.slow;
      acc.count += 1;
      byPrefix.set(prefix, acc);
    }
  }
  return { nowMs, byPrefix };
}

interface Prior {
  rating: number;
  slowRating: number;
  variance: number;
}

/** The nearest pooled prior for a node: its own descendant pool first, then
 * ancestors with the node's own contribution removed. Null when no
 * neighborhood evidence exists. */
function priorFor(
  state: EngineState,
  pools: SkillPools,
  nodeId: string,
): Prior | null {
  const own = state.skills.get(nodeId);
  const ownC =
    own !== undefined && own.attempts > 0 ? contribution(own, pools.nowMs) : null;
  const chain = [nodeId, ...ancestorPrefixes(nodeId)];
  for (const prefix of chain) {
    const acc = pools.byPrefix.get(prefix);
    if (acc === undefined) continue;
    // The node's own data sits in every proper-ancestor pool; remove it so a
    // node is never shrunk toward itself. Its own descendant pool (prefix ===
    // nodeId) never contains it.
    let sumP = acc.sumPrecision;
    let sumPR = acc.sumPrecisionRating;
    let sumPS = acc.sumPrecisionSlow;
    let count = acc.count;
    if (prefix !== nodeId && ownC !== null) {
      sumP -= ownC.precision;
      sumPR -= ownC.precision * ownC.rating;
      sumPS -= ownC.precision * ownC.slow;
      count -= 1;
    }
    if (count <= 0 || sumP <= 1e-12) continue;
    return {
      rating: sumPR / sumP,
      slowRating: sumPS / sumP,
      // Precision-weighted mean of member variances (count / sum of
      // precisions) plus the between-sibling spread.
      variance: count / sumP + SIBLING_VARIANCE,
    };
  }
  return null;
}

/** True when the node carries any evidence at all: its own attempts or any
 * attempted descendant. Selection uses this as the seen/unseen boundary. */
export function hasEvidence(
  state: EngineState,
  pools: SkillPools,
  nodeId: string,
): boolean {
  const own = state.skills.get(nodeId);
  if (own !== undefined && own.attempts > 0) return true;
  return pools.byPrefix.has(nodeId);
}

/**
 * The shrunk read-time skill for a node (ADR 0021): own drifted evidence
 * blended toward the nearest neighborhood prior at w = n / (n + K). With no
 * own attempts the prior speaks alone (w = 0); with no neighborhood evidence
 * the own drifted state passes through unchanged.
 */
export function effectiveSkill(
  state: EngineState,
  pools: SkillPools,
  nodeId: string,
): SkillState {
  const own = state.skills.get(nodeId);
  const drifted = own !== undefined ? applyIdleDrift(own, pools.nowMs) : { ...FRESH_SKILL };
  const prior = priorFor(state, pools, nodeId);
  if (prior === null) return drifted;
  const n = drifted.attempts;
  const w = n / (n + SHRINKAGE_PRIOR_STRENGTH);
  const ownSlow = Number.isFinite(drifted.slowRating) ? drifted.slowRating : drifted.rating;
  const variance = w * drifted.deviation ** 2 + (1 - w) * prior.variance;
  return {
    rating: w * drifted.rating + (1 - w) * prior.rating,
    deviation: Math.min(MAX_DEVIATION, Math.max(MIN_DEVIATION, Math.sqrt(variance))),
    slowRating: w * ownSlow + (1 - w) * prior.slowRating,
    lastEventMs: drifted.lastEventMs,
    attempts: drifted.attempts,
  };
}
