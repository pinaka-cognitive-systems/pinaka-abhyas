/**
 * CLAIM 2 (CALIBRATION): the 90% mastery interval and the readiness band cover
 * truth at their stated rates.
 *
 * Attacks:
 *   - non-stationary student (ability rises during history); the model assumes
 *     stationarity. How wrong does band coverage get?
 *   - heterogeneous per-node abilities under one readiness band.
 *
 * Truth = a simulated exam scored under the marking scheme from the student's
 * TRUE per-node ability AT EXAM TIME. The band is the engine's reported [low,high].
 */
import { describe, it, expect } from "vitest";
import { FRESH_SKILL, type SkillState, updateSkill } from "../src/mastery.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, sigmoid } from "../src/scale.js";
import { computeReadiness } from "../src/readiness.js";
import { CA_FOUNDATION_QA_MARKING, type Bank, type BankItem, type Blueprint, type EngineState } from "../src/types.js";
import { rng } from "./sim.js";

const MS_PER_DAY = 86_400_000;

const BLUEPRINT: Blueprint = {
  parts: [
    { id: "qa.bmath", marks: 40, questions: 40, sections: [
      { id: "I", families: [{ nodeId: "qa.bmath.ratio_indices_log", quota: 10 }] },
      { id: "II", families: [{ nodeId: "qa.bmath.finance", quota: 14 }] },
      { id: "III", families: [{ nodeId: "qa.bmath.sequence_series", quota: 16 }] },
    ]},
    { id: "qa.lr", marks: 20, questions: 20, sections: [
      { id: "IV", families: [{ nodeId: "qa.lr.seating", quota: 20 }] },
    ]},
    { id: "qa.stats", marks: 40, questions: 40, sections: [
      { id: "V", families: [{ nodeId: "qa.stats.central_tendency_dispersion", quota: 19 }] },
      { id: "VI", families: [{ nodeId: "qa.stats.probability", quota: 11 }] },
      { id: "VII", families: [{ nodeId: "qa.stats.correlation_regression", quota: 5 }] },
      { id: "VIII", families: [{ nodeId: "qa.stats.index_numbers", quota: 5 }] },
    ]},
  ],
};
const FAMILIES = BLUEPRINT.parts.flatMap((p) => p.sections.flatMap((s) => s.families.map((f) => f.nodeId)));
const QUOTA = new Map<string, number>();
for (const p of BLUEPRINT.parts) for (const s of p.sections) for (const f of s.families) QUOTA.set(f.nodeId, f.quota);

function buildBank(): Bank {
  const m = new Map<string, BankItem>();
  for (const fam of FAMILIES) for (let i = 0; i < 3; i++) {
    const id = `${fam}#${i}`;
    m.set(id, { id, tests: [fam], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
  }
  return m;
}

/** Score a true exam: each family contributes `quota` L2 questions; correctness
 * from the TRUE per-node ability at exam time; net marks under +1/-0.25,
 * attempting everything (matches the engine's plan when time fits). */
function trueExamScore(trueTheta: Map<string, number>, r: () => number): number {
  const c = GUESSING_FLOOR.single_best;
  let net = 0;
  for (const fam of FAMILIES) {
    const theta = trueTheta.get(fam)!;
    const p = c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR.L2);
    for (let q = 0; q < QUOTA.get(fam)!; q++) net += r() < p ? 1 : -0.25;
  }
  return net;
}

describe("CALIBRATION attacks", () => {
  it("ATTACK O: NON-STATIONARY student — ability rises through history, band coverage", () => {
    // Each student learns: per-family ability starts low and rises linearly over
    // the practice history to a final value. The model sees the whole history
    // (early weak answers + late strong answers) and assumes stationarity. We
    // score the exam at the FINAL (true current) ability. Does the band cover it?
    const TRIALS = 400;
    const obsPerFamily = 12; // 8 families * 12 = 96 events, clears the 20-event gate
    let covered = 0;
    const errs: number[] = [];
    for (let trial = 0; trial < TRIALS; trial++) {
      const r = rng(7000 + trial);
      const skills = new Map<string, SkillState>();
      const trueFinal = new Map<string, number>();
      let t = 1_700_000_000_000;
      let count = 0;
      for (const fam of FAMILIES) {
        // start ability and final ability
        const start = -1.5 + r() * 1.0; // weak start
        const final = 1.5 + r() * 1.0;  // strong finish
        trueFinal.set(fam, final);
        let s: SkillState = { ...FRESH_SKILL };
        for (let i = 0; i < obsPerFamily; i++) {
          const frac = i / (obsPerFamily - 1);
          const theta = start + (final - start) * frac;
          const c = GUESSING_FLOOR.single_best;
          const p = c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR.L2);
          s = updateSkill(s, { correct: r() < p, difficultyLabel: "L2", itemType: "single_best", occurredAtMs: t });
          t += 2 * MS_PER_DAY; count++;
        }
        skills.set(fam, s);
      }
      const now = t;
      const state: EngineState = { skills, schedules: new Map(), misconceptions: new Map(), eventCount: count, lastSeenMs: new Map() };
      const readiness = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, now);
      const trueScore = trueExamScore(trueFinal, r);
      if (readiness.low !== null && readiness.high !== null) {
        if (trueScore >= readiness.low && trueScore <= readiness.high) covered++;
        errs.push(readiness.expectedMarks! - trueScore);
      }
    }
    const cov = covered / TRIALS;
    const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
    console.log(`[O] non-stationary (rising) coverage=${(cov * 100).toFixed(1)}% meanBias(est-true)=${meanErr.toFixed(2)} marks`);
    // The band is a 90% band; stated coverage. The existing cert test demands >=85%.
    expect(cov).toBeGreaterThanOrEqual(0.85);
  });

  it("ATTACK P: NON-STATIONARY student — ability FALLS (forgot, no recent practice)", () => {
    // Student was strong, then declined; but recent practice is sparse so the
    // model still believes the old high ability. Exam scored at low final ability.
    const TRIALS = 400;
    const obsPerFamily = 12;
    let covered = 0;
    const errs: number[] = [];
    for (let trial = 0; trial < TRIALS; trial++) {
      const r = rng(8000 + trial);
      const skills = new Map<string, SkillState>();
      const trueFinal = new Map<string, number>();
      let t = 1_700_000_000_000;
      let count = 0;
      for (const fam of FAMILIES) {
        const start = 1.5 + r() * 1.0;
        const final = -1.0 + r() * 1.0;
        trueFinal.set(fam, final);
        let s: SkillState = { ...FRESH_SKILL };
        for (let i = 0; i < obsPerFamily; i++) {
          const frac = i / (obsPerFamily - 1);
          const theta = start + (final - start) * frac;
          const c = GUESSING_FLOOR.single_best;
          const p = c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR.L2);
          s = updateSkill(s, { correct: r() < p, difficultyLabel: "L2", itemType: "single_best", occurredAtMs: t });
          t += 2 * MS_PER_DAY; count++;
        }
        skills.set(fam, s);
      }
      const now = t;
      const state: EngineState = { skills, schedules: new Map(), misconceptions: new Map(), eventCount: count, lastSeenMs: new Map() };
      const readiness = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, now);
      const trueScore = trueExamScore(trueFinal, r);
      if (readiness.low !== null && readiness.high !== null) {
        if (trueScore >= readiness.low && trueScore <= readiness.high) covered++;
        errs.push(readiness.expectedMarks! - trueScore);
      }
    }
    const cov = covered / TRIALS;
    const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
    console.log(`[P] non-stationary (falling) coverage=${(cov * 100).toFixed(1)}% meanBias(est-true)=${meanErr.toFixed(2)} marks`);
    expect(cov).toBeGreaterThanOrEqual(0.85);
  });

  it("ATTACK Q: STATIONARY control — same harness, fixed ability (sanity)", () => {
    const TRIALS = 400;
    const obsPerFamily = 12;
    let covered = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const r = rng(9000 + trial);
      const skills = new Map<string, SkillState>();
      const trueFinal = new Map<string, number>();
      let t = 1_700_000_000_000;
      let count = 0;
      for (const fam of FAMILIES) {
        const theta = -0.5 + r() * 2.0;
        trueFinal.set(fam, theta);
        let s: SkillState = { ...FRESH_SKILL };
        for (let i = 0; i < obsPerFamily; i++) {
          const c = GUESSING_FLOOR.single_best;
          const p = c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR.L2);
          s = updateSkill(s, { correct: r() < p, difficultyLabel: "L2", itemType: "single_best", occurredAtMs: t });
          t += 2 * MS_PER_DAY; count++;
        }
        skills.set(fam, s);
      }
      const now = t;
      const state: EngineState = { skills, schedules: new Map(), misconceptions: new Map(), eventCount: count, lastSeenMs: new Map() };
      const readiness = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, now);
      const trueScore = trueExamScore(trueFinal, r);
      if (readiness.low !== null && readiness.high !== null && trueScore >= readiness.low && trueScore <= readiness.high) covered++;
    }
    const cov = covered / TRIALS;
    console.log(`[Q control] stationary coverage=${(cov * 100).toFixed(1)}%`);
    expect(cov).toBeGreaterThanOrEqual(0.85);
  });
});
