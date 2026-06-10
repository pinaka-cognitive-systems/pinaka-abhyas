/**
 * CLAIM 2 sub-attack: mock anchoring with adversarial mock results, and
 * heterogeneous per-node abilities feeding one readiness band.
 */
import { describe, it, expect } from "vitest";
import { type SkillState } from "../src/mastery.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, sigmoid } from "../src/scale.js";
import { computeReadiness } from "../src/readiness.js";
import { CA_FOUNDATION_QA_MARKING, type Bank, type BankItem, type Blueprint, type EngineState, type Event } from "../src/types.js";
import { rng } from "./sim.js";

const MS_PER_DAY = 86_400_000;
const T0 = 1_700_000_000_000;
const NOW = T0 + 100 * MS_PER_DAY;

const BLUEPRINT: Blueprint = {
  parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
    { nodeId: "n.a", quota: 25 }, { nodeId: "n.b", quota: 25 },
    { nodeId: "n.c", quota: 25 }, { nodeId: "n.d", quota: 25 },
  ]}]}],
};
const NODES = ["n.a", "n.b", "n.c", "n.d"];

function bank(): Bank {
  const m = new Map<string, BankItem>();
  for (const node of NODES) for (let i = 0; i < 3; i++) {
    const id = `${node}#${i}`;
    m.set(id, { id, tests: [node], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
  }
  return m;
}

function stateAt(ratings: Record<string, number>, dev = 0.4, eventCount = 100): EngineState {
  const skills = new Map<string, SkillState>();
  for (const [n, r] of Object.entries(ratings)) skills.set(n, { rating: r, deviation: dev, lastEventMs: T0, attempts: 25 });
  return { skills, schedules: new Map(), misconceptions: new Map(), eventCount, lastSeenMs: new Map() };
}

function mockDay(net: number, answered: number, dayMs: number): Event[] {
  // Build `answered` events on a single day with `correct` count producing the
  // requested net under +1/-0.25. net = correct - 0.25*wrong, correct+wrong=answered.
  const wrong = Math.round((answered - net) / 1.25);
  const correct = answered - wrong;
  const out: Event[] = [];
  for (let i = 0; i < answered; i++) {
    out.push({
      event_id: `mk${dayMs}_${i}`, occurredAtMs: dayMs + i, item_id: "n.a#0",
      item_content_hash: "h", taxonomy_version: 2, tests: ["n.a"], difficulty_label: "L2",
      item_type: "single_best", mode: "mock", correct: i < correct,
      selected_misconception: null, time_ms: 1000, resurfaced: false,
    });
  }
  return out;
}

describe("MOCK ANCHOR + heterogeneous band attacks", () => {
  it("ATTACK FF: adversarial TINY-sample mock (answered=2, both correct) over-anchors?", () => {
    // A mock where the student answered only 2 questions, both right -> projected
    // 200/100 net rate... per-answer rate = 1.0 -> projected = 100 marks!. Weight
    // = recency * completeness(2/100=0.02) * answered(2). Does a 2-question fluke
    // drag the estimate sharply up?
    const ratings = Object.fromEntries(NODES.map((n) => [n, -0.5])); // weak model
    const state = stateAt(ratings);
    const baseline = computeReadiness(state, [], bank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    const mock = mockDay(2, 2, NOW - 1 * MS_PER_DAY); // net 2 on 2 answered
    const anchored = computeReadiness(state, mock, bank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    console.log(`[FF] tiny mock(2/2): baseline=${baseline.expectedMarks} anchored=${anchored.expectedMarks} (mock projects to 100)`);
    // The band floor is +/-5 and confidence is capped; the question is whether a
    // 2-answer fluke moves the POINT estimate materially. Record the shift.
    const shift = anchored.expectedMarks! - baseline.expectedMarks!;
    console.log(`[FF] shift from a 2-question mock = ${shift} marks`);
    // Not asserting a hard bound (spec permits anchoring); flag if a 2-answer
    // mock moves the estimate by more than the band floor (5 marks) — that would
    // be a fluke dominating the model.
    expect(Math.abs(shift)).toBeLessThanOrEqual(5);
  });

  it("ATTACK GG: contradictory mocks same window — one 0/100, one 80/100", () => {
    // Two mocks, opposite extremes, equal completeness/recency. The blend should
    // land between; check it does not pick one arbitrarily (determinism) and the
    // band still covers a plausible truth.
    const ratings = Object.fromEntries(NODES.map((n) => [n, 0.5]));
    const state = stateAt(ratings);
    const bad = mockDay(0, 100, NOW - 2 * MS_PER_DAY);  // net 0
    const good = mockDay(80, 100, NOW - 1 * MS_PER_DAY); // net 80
    const r = computeReadiness(state, [...bad, ...good], bank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    console.log(`[GG] contradictory mocks: expectedMarks=${r.expectedMarks} band=[${r.low},${r.high}]`);
    // Just require a finite, in-range estimate (0..100) and a sane band.
    expect(r.expectedMarks!).toBeGreaterThanOrEqual(0);
    expect(r.expectedMarks!).toBeLessThanOrEqual(100);
    expect(r.high!).toBeGreaterThan(r.low!);
  });

  it("ATTACK HH: heterogeneous nodes (2 mastered, 2 zero) — does the band cover the true score?", () => {
    // n.a,n.b very strong (r=+3); n.c,n.d very weak (r=-3). One band summarises a
    // bimodal student. Simulate the true exam and check band coverage over trials.
    const ratings = { "n.a": 3, "n.b": 3, "n.c": -3, "n.d": -3 };
    const state = stateAt(ratings, 0.4);
    const r = computeReadiness(state, [], bank(), BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    // True per-node P:
    const c = GUESSING_FLOOR.single_best;
    const trueP = (rt: number) => c + (1 - c) * sigmoid(rt - DIFFICULTY_ANCHOR.L2);
    let covered = 0;
    const TRIALS = 2000;
    for (let t = 0; t < TRIALS; t++) {
      const rr = rng(60000 + t);
      let net = 0;
      for (const node of NODES) { const p = trueP((ratings as any)[node]); for (let q = 0; q < 25; q++) net += rr() < p ? 1 : -0.25; }
      if (net >= r.low! && net <= r.high!) covered++;
    }
    console.log(`[HH] bimodal student: expectedMarks=${r.expectedMarks} band=[${r.low},${r.high}] coverage=${(covered/TRIALS*100).toFixed(1)}%`);
    expect(covered / TRIALS).toBeGreaterThanOrEqual(0.85);
  });
});
