/**
 * Hierarchical pooling tests (ADR 0021). The point under test: read-time
 * empirical-Bayes shrinkage gives family nodes their descendants' pooled
 * evidence (real packs tag leaves, blueprints weigh families) and regularizes
 * thin leaf estimates toward their neighborhood — without ever touching the
 * stored, certified mastery state.
 */
import { describe, expect, it } from "vitest";
import {
  buildSkillPools,
  effectiveSkill,
  hasEvidence,
  SHRINKAGE_PRIOR_STRENGTH,
} from "../src/hierarchy.js";
import type { SkillState } from "../src/mastery.js";
import { PRIOR_RATING } from "../src/scale.js";
import type { EngineState } from "../src/types.js";

const NOW = Date.UTC(2025, 0, 6, 9, 0, 0);

function skill(rating: number, deviation = 0.4, attempts = 10): SkillState {
  return { rating, deviation, slowRating: rating, lastEventMs: NOW, attempts };
}

function stateOf(skills: Record<string, SkillState>): EngineState {
  return {
    skills: new Map(Object.entries(skills)),
    schedules: new Map(),
    misconceptions: new Map(),
    eventCount: 0,
    lastSeenMs: new Map(),
  };
}

describe("family reads from leaf evidence (the prior-flat readiness fix)", () => {
  it("an unattempted family node reads its leaves' pooled rating, not a fresh prior", () => {
    const state = stateOf({
      "qa.bmath.finance.si": skill(1.2),
      "qa.bmath.finance.ci": skill(0.8),
    });
    const pools = buildSkillPools(state, NOW);
    const fam = effectiveSkill(state, pools, "qa.bmath.finance");
    expect(fam.rating).toBeCloseTo(1.0, 6); // equal precision -> plain mean
    expect(fam.rating).not.toBeCloseTo(PRIOR_RATING, 1);
  });

  it("a node with no evidence anywhere passes through as the fresh prior", () => {
    const state = stateOf({});
    const pools = buildSkillPools(state, NOW);
    const fam = effectiveSkill(state, pools, "qa.bmath.finance");
    expect(fam.rating).toBe(PRIOR_RATING);
    expect(fam.attempts).toBe(0);
  });

  it("hasEvidence: own attempts or attempted descendants, nothing else", () => {
    const state = stateOf({ "qa.bmath.finance.si": skill(1.0) });
    const pools = buildSkillPools(state, NOW);
    expect(hasEvidence(state, pools, "qa.bmath.finance")).toBe(true);
    expect(hasEvidence(state, pools, "qa.bmath")).toBe(true);
    expect(hasEvidence(state, pools, "qa.bmath.finance.si")).toBe(true);
    expect(hasEvidence(state, pools, "qa.stats.probability")).toBe(false);
  });
});

describe("shrinkage of thin estimates toward the neighborhood", () => {
  it("blends at w = n/(n+K): a 1-attempt leaf sits mostly at its siblings' mean", () => {
    const state = stateOf({
      "qa.bmath.finance.si": skill(2.0, 0.9, 1), // one lucky attempt, high rating
      "qa.bmath.finance.ci": skill(0.0, 0.3, 40),
      "qa.bmath.finance.ann": skill(0.0, 0.3, 40),
    });
    const pools = buildSkillPools(state, NOW);
    const thin = effectiveSkill(state, pools, "qa.bmath.finance.si");
    const w = 1 / (1 + SHRINKAGE_PRIOR_STRENGTH);
    expect(thin.rating).toBeCloseTo(w * 2.0 + (1 - w) * 0.0, 6);
    expect(thin.rating).toBeLessThan(0.5); // pulled hard toward the siblings
  });

  it("a node is never its own prior: with no siblings the read passes through", () => {
    const state = stateOf({ "qa.bmath.finance.si": skill(1.5, 0.5, 3) });
    const pools = buildSkillPools(state, NOW);
    const own = effectiveSkill(state, pools, "qa.bmath.finance.si");
    expect(own.rating).toBeCloseTo(1.5, 9);
  });

  it("a well-attempted node barely moves", () => {
    const state = stateOf({
      "qa.bmath.finance.si": skill(1.5, 0.3, 100),
      "qa.bmath.finance.ci": skill(-1.0, 0.3, 100),
    });
    const pools = buildSkillPools(state, NOW);
    const strong = effectiveSkill(state, pools, "qa.bmath.finance.si");
    // w = 100/104: the sibling pulls by at most ~4% of the gap.
    expect(strong.rating).toBeGreaterThan(1.35);
    expect(strong.rating).toBeLessThan(1.5);
  });

  it("pooling never reaches across parts: 'qa' is not a pool", () => {
    const state = stateOf({ "qa.stats.probability.bayes": skill(2.0) });
    const pools = buildSkillPools(state, NOW);
    // A bmath node has no stats-flavored prior; it reads fresh.
    const other = effectiveSkill(state, pools, "qa.bmath.finance");
    expect(other.rating).toBe(PRIOR_RATING);
    expect(hasEvidence(state, pools, "qa.bmath.finance")).toBe(false);
  });

  it("nearest pool wins: siblings outrank the part-level pool", () => {
    const state = stateOf({
      "qa.bmath.finance.si": skill(1.0, 0.3, 50),
      "qa.bmath.ratio.basic": skill(-2.0, 0.3, 50),
    });
    const pools = buildSkillPools(state, NOW);
    // finance.ci's nearest evidence is its sibling finance.si (via the
    // qa.bmath.finance pool), not the distant ratio leaf under qa.bmath.
    const ci = effectiveSkill(state, pools, "qa.bmath.finance.ci");
    expect(ci.rating).toBeCloseTo(1.0, 6);
  });

  it("deviation reflects pool spread, never collapses below the floor", () => {
    const state = stateOf({
      "qa.bmath.finance.si": skill(1.0, 0.2, 80),
      "qa.bmath.finance.ci": skill(1.0, 0.2, 80),
    });
    const pools = buildSkillPools(state, NOW);
    const fam = effectiveSkill(state, pools, "qa.bmath.finance");
    // Pool variance = mean member variance + SIBLING_VARIANCE: certainty about
    // the leaves is not certainty about an untouched sibling.
    expect(fam.deviation).toBeGreaterThan(0.5);
  });
});
