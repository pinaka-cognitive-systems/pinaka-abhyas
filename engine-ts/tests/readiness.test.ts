/**
 * Readiness tests (W1-8, W1-7; SPEC 6).
 *
 * Pinned dead: the time-unconditional skip advice (a P~0.45-everywhere student
 * must be told to attempt everything when time permits), the band must never be
 * narrower than +/- 5 marks, and the stated band must cover the true simulated
 * exam score at least 85% of the time across 200 seeded students.
 */
import { describe, expect, it } from "vitest";
import { FRESH_SKILL, type SkillState, updateSkill } from "../src/mastery.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, sigmoid } from "../src/scale.js";
import { computeReadiness } from "../src/readiness.js";
import {
  CA_FOUNDATION_QA_MARKING,
  type Bank,
  type BankItem,
  type Blueprint,
  type EngineState,
  type Event,
} from "../src/types.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Real CA Foundation blueprint families with their derived quotas (sum 100).
const BLUEPRINT: Blueprint = {
  parts: [
    {
      id: "qa.bmath",
      marks: 40,
      questions: 40,
      sections: [
        { id: "I", families: [{ nodeId: "qa.bmath.ratio_indices_log", quota: 10 }] },
        { id: "II", families: [{ nodeId: "qa.bmath.finance", quota: 14 }] },
        { id: "III", families: [{ nodeId: "qa.bmath.sequence_series", quota: 16 }] },
      ],
    },
    {
      id: "qa.lr",
      marks: 20,
      questions: 20,
      sections: [{ id: "IV", families: [{ nodeId: "qa.lr.seating", quota: 20 }] }],
    },
    {
      id: "qa.stats",
      marks: 40,
      questions: 40,
      sections: [
        { id: "V", families: [{ nodeId: "qa.stats.central_tendency_dispersion", quota: 19 }] },
        { id: "VI", families: [{ nodeId: "qa.stats.probability", quota: 11 }] },
        { id: "VII", families: [{ nodeId: "qa.stats.correlation_regression", quota: 5 }] },
        { id: "VIII", families: [{ nodeId: "qa.stats.index_numbers", quota: 5 }] },
      ],
    },
  ],
};

const FAMILIES = BLUEPRINT.parts.flatMap((p) => p.sections.flatMap((s) => s.families.map((f) => f.nodeId)));

/** A bank with a couple of L2 items per family so expected_seconds resolves. */
function buildBank(): Bank {
  const m = new Map<string, BankItem>();
  for (const fam of FAMILIES) {
    for (let i = 0; i < 3; i++) {
      const id = `${fam}#${i}`;
      m.set(id, {
        id,
        tests: [fam],
        difficulty_label: "L2",
        item_type: "single_best",
        expected_seconds: 60, // 100 * 60s = 100 min < 120 min budget
        verification_status: "verified",
      });
    }
  }
  return m;
}

/** Build an EngineState by giving every family a converged-ish skill at a given
 * true ability theta (logit), with a moderate number of observations. */
function stateAtAbility(theta: number, obsPerFamily: number, seed: number): EngineState {
  const rng = mulberry32(seed);
  const skills = new Map<string, SkillState>();
  let t = 1_700_000_000_000;
  let count = 0;
  for (const fam of FAMILIES) {
    let s: SkillState = { ...FRESH_SKILL };
    for (let i = 0; i < obsPerFamily; i++) {
      const label = ["L1", "L2", "L3"][Math.floor(rng() * 3)] as "L1" | "L2" | "L3";
      const b = DIFFICULTY_ANCHOR[label];
      const c = GUESSING_FLOOR.single_best;
      const pTrue = c + (1 - c) * sigmoid(theta - b);
      s = updateSkill(s, {
        correct: rng() < pTrue,
        difficultyLabel: label,
        itemType: "single_best",
        occurredAtMs: t,
      });
      t += 3_600_000;
      count++;
    }
    skills.set(fam, s);
  }
  return {
    skills,
    schedules: new Map(),
    misconceptions: new Map(),
    eventCount: count,
    lastSeenMs: new Map(),
  };
}

const NOW = 1_700_000_000_000 + 10 * 86_400_000;

describe("insufficient-data gate", () => {
  it("below 20 events returns insufficient_data with no number", () => {
    const state = stateAtAbility(0, 1, 1); // ~9 events
    const r = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(r.confidence).toBe("insufficient_data");
    expect(r.expectedMarks).toBeNull();
    expect(r.isEstimate).toBe(true);
  });
});

describe("attempt policy is time-conditional, never an ability verdict (W1-7)", () => {
  it("a P~0.45-everywhere student is told to ATTEMPT everything when time permits", () => {
    // Pick theta so that the blended P (with guessing) on an L2 item is ~0.45.
    // P = 0.25 + 0.75*sigmoid(theta). Solve sigmoid(theta) = (0.45-0.25)/0.75 = 0.2667.
    const theta = Math.log(0.2667 / (1 - 0.2667)); // ~ -1.01
    const state = stateAtAbility(theta, 8, 7);
    const r = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    // 100 questions * 60s = 6000s = 100 min < 120 min: time fits.
    expect(r.timeFeasible).toBe(true);
    // The audited failure was skipping everything. P~0.45 > break-even 0.20, so
    // nothing is dropped for time and nothing is refused on ability.
    expect(r.skippedForTime).toBe(0);
    // And a positive expected mark (1.25*0.45 - 0.25 = 0.3125 per Q ~ 31 marks).
    expect(r.expectedMarks!).toBeGreaterThan(20);
  });

  it("when the full paper overruns 120 min, the lowest value-per-second questions drop", () => {
    // Make items slow so 100 questions overrun the budget.
    const bank = new Map<string, BankItem>();
    for (const fam of FAMILIES) {
      bank.set(`${fam}#0`, {
        id: `${fam}#0`,
        tests: [fam],
        difficulty_label: "L2",
        item_type: "single_best",
        expected_seconds: 120, // 100 * 120s = 200 min >> 120 min
        verification_status: "verified",
      });
    }
    const state = stateAtAbility(0.2, 8, 3);
    const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(r.timeFeasible).toBe(false);
    expect(r.skippedForTime!).toBeGreaterThan(0);
    expect(r.estMinutes!).toBeLessThanOrEqual(120);
  });
});

describe("band floor and honesty constraints", () => {
  it("the band is never narrower than +/- 5 marks, even with much data", () => {
    const state = stateAtAbility(0.5, 50, 9); // lots of data, tight deviations
    const r = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(r.expectedMarks).not.toBeNull();
    expect(r.high! - r.expectedMarks!).toBeGreaterThanOrEqual(5);
    expect(r.expectedMarks! - r.low!).toBeGreaterThanOrEqual(5);
  });

  it("confidence is never above medium", () => {
    const state = stateAtAbility(0.5, 80, 4);
    const r = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(["insufficient_data", "low", "medium"]).toContain(r.confidence);
    expect(r.confidence).not.toBe("high" as never);
  });

  it("distance to pass is expectedMarks minus 40", () => {
    const state = stateAtAbility(0.8, 30, 5);
    const r = computeReadiness(state, [], buildBank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(r.distanceToPass).toBe(r.expectedMarks! - 40);
  });
});

describe("mock anchoring (SPEC 6)", () => {
  it("a recent strong mock pulls the estimate up toward the mock score", () => {
    const state = stateAtAbility(-0.2, 12, 6); // modest model ability
    const bank = buildBank();
    const baseline = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);

    // A recent, near-complete mock the student aced (90/100 correct, 10 wrong).
    const mockEvents: Event[] = [];
    const mockDay = NOW - 2 * 86_400_000;
    for (let i = 0; i < 100; i++) {
      mockEvents.push({
        event_id: `mock#${i}`,
        occurredAtMs: mockDay + i,
        item_id: "m",
        item_content_hash: "h",
        taxonomy_version: 2,
        tests: ["qa.bmath.finance"],
        difficulty_label: "L2",
        item_type: "single_best",
        mode: "mock",
        correct: i < 90,
        selected_misconception: null,
        time_ms: 1000,
        resurfaced: false,
      });
    }
    const anchored = computeReadiness(state, mockEvents, bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(anchored.expectedMarks!).toBeGreaterThan(baseline.expectedMarks!);
  });

  it("a mock older than 21 days does not anchor", () => {
    const state = stateAtAbility(-0.2, 12, 6);
    const bank = buildBank();
    const baseline = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    const oldMock: Event[] = [{
      event_id: "old", occurredAtMs: NOW - 30 * 86_400_000, item_id: "m",
      item_content_hash: "h", taxonomy_version: 2, tests: ["qa.bmath.finance"],
      difficulty_label: "L2", item_type: "single_best", mode: "mock",
      correct: true, selected_misconception: null, time_ms: 1000, resurfaced: false,
    }];
    const r = computeReadiness(state, oldMock, bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    expect(r.expectedMarks).toBe(baseline.expectedMarks);
  });
});

describe("calibration: the band covers the true exam score >= 85% of the time", () => {
  it("across 200 seeded students, the stated band covers the simulated exam score", () => {
    const bank = buildBank();
    const N = 200;
    let covered = 0;
    const rng = mulberry32(424242);

    for (let s = 0; s < N; s++) {
      const theta = -1.5 + 3 * rng(); // true ability spread
      const state = stateAtAbility(theta, 10, 5000 + s);
      const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
      if (r.expectedMarks === null) continue;

      // Simulate one real exam: draw 100 questions per the blueprint quota mix,
      // score with negative marking. The student's TRUE P per question uses the
      // true theta and the question's difficulty (here L2, matching the model).
      let net = 0;
      const examRng = mulberry32(900000 + s);
      for (const fam of FAMILIES) {
        const quota = BLUEPRINT.parts
          .flatMap((p) => p.sections)
          .flatMap((sec) => sec.families)
          .find((f) => f.nodeId === fam)!.quota;
        for (let q = 0; q < quota; q++) {
          const c = GUESSING_FLOOR.single_best;
          const pTrue = c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR.L2);
          // The student attempts (P > break-even 0.2 holds across this theta range
          // and the time budget fits at 60s/question), scoring +1 or -0.25.
          if (examRng() < pTrue) net += 1;
          else net -= 0.25;
        }
      }
      if (net >= r.low! && net <= r.high!) covered++;
    }
    expect(covered / N).toBeGreaterThanOrEqual(0.85);
  });
});
