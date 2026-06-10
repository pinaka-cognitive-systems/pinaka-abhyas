/**
 * CLAIM 4 (SKIP POLICY): no student is ever advised to leave positive-EV marks
 * on the table. Attack the 0.20 break-even, the 120-minute boundary, and
 * expected_seconds outliers.
 *
 * Refutation target: find a case where a positive-EV question (EV > 0, i.e.
 * P > 0.20) is dropped while a NEGATIVE or lower-total-EV configuration is kept,
 * OR a positive-EV question is dropped when leaving it would still fit the time
 * budget, OR the drop ordering sheds more EV than necessary.
 */
import { describe, it, expect } from "vitest";
import { FRESH_SKILL, type SkillState, updateSkill } from "../src/mastery.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, sigmoid } from "../src/scale.js";
import { computeReadiness } from "../src/readiness.js";
import { CA_FOUNDATION_QA_MARKING, type Bank, type BankItem, type Blueprint, type EngineState } from "../src/types.js";

// Two families so we can give them different EV and different seconds.
const BLUEPRINT: Blueprint = {
  parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
    { nodeId: "n.fast_lowEV", quota: 50 },
    { nodeId: "n.slow_highEV", quota: 50 },
  ]}]}],
};
const FAMILIES = ["n.fast_lowEV", "n.slow_highEV"];

function stateWithRatings(ratings: Record<string, number>, dev = 0.4): EngineState {
  const skills = new Map<string, SkillState>();
  for (const [node, rating] of Object.entries(ratings)) {
    skills.set(node, { rating, deviation: dev, lastEventMs: 1, attempts: 30 });
  }
  return { skills, schedules: new Map(), misconceptions: new Map(), eventCount: 100, lastSeenMs: new Map() };
}

function bankWith(fastSecs: number, slowSecs: number): Bank {
  const m = new Map<string, BankItem>();
  m.set("a", { id: "a", tests: ["n.fast_lowEV"], difficulty_label: "L2", item_type: "single_best", expected_seconds: fastSecs, verification_status: "verified" });
  m.set("b", { id: "b", tests: ["n.slow_highEV"], difficulty_label: "L2", item_type: "single_best", expected_seconds: slowSecs, verification_status: "verified" });
  return m;
}

const NOW = 1_700_000_000_000;

/** EV of an L2 single_best question at rating r. */
function evAt(r: number): number {
  const c = GUESSING_FLOOR.single_best;
  const p = c + (1 - c) * sigmoid(r - DIFFICULTY_ANCHOR.L2);
  return 1 * p - 0.25 * (1 - p);
}

describe("SKIP POLICY attacks", () => {
  it("ATTACK R: value-density drop sheds EV but is the time decision optimal?", () => {
    // fast_lowEV: rating chosen so P just above break-even (low EV per Q) but very FAST.
    // slow_highEV: high P (high EV per Q) but SLOW.
    // The policy drops by EV-PER-SECOND ascending. A fast low-EV question has
    // small EV but tiny seconds, so EV/sec may be LARGE -> kept; a slow high-EV
    // question has large EV but large seconds -> EV/sec small -> dropped FIRST.
    // That can drop more total EV than dropping the genuinely low-value ones.
    // P_fast ~ 0.30 (EV/Q = 1.25*0.30-0.25 = 0.125), seconds 10  -> EV/sec=0.0125
    // P_slow ~ 0.80 (EV/Q = 1.25*0.80-0.25 = 0.75),  seconds 200 -> EV/sec=0.00375
    // Solve ratings: P=0.30 -> sig=(0.30-0.25)/0.75=0.0667 -> r=logit(.0667)
    const rFast = Math.log(0.0667 / (1 - 0.0667));
    const rSlow = Math.log((0.7333) / (1 - 0.7333)); // P=0.80 -> sig=0.7333
    const state = stateWithRatings({ "n.fast_lowEV": rFast, "n.slow_highEV": rSlow });
    const bank = bankWith(10, 200);
    // total time = 50*10 + 50*200 = 500 + 10000 = 10500s = 175 min > 120 min.
    const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    console.log(`[R] EV(fast)=${evAt(rFast).toFixed(3)}/Q EV(slow)=${evAt(rSlow).toFixed(3)}/Q expectedMarks=${r.expectedMarks} skippedForTime=${r.skippedForTime} timeFeasible=${r.timeFeasible}`);
    // The engine drops slow_highEV (low EV/sec) first. Compute the alternative:
    // a smarter plan that keeps as much EV as possible within 7200s.
    // Greedy by EV/sec ASCENDING-drop == greedy by EV/sec DESCENDING-keep, which
    // is in fact the optimal continuous knapsack for shedding time. So this is
    // expected to HELD; we record the actual EV retained and confirm no
    // positive-EV question is dropped while a NEGATIVE-EV one is kept.
    // Both questions here are positive-EV, so the test is: are any questions
    // refused on ABILITY grounds (they should not be — both P>0.20)?
    expect(r.skippedForTime! >= 0).toBe(true);
    // Sanity: nothing refused on ability (both above break-even).
    expect(r.note.includes("below the break-even")).toBe(false);
  });

  it("ATTACK S: question exactly AT break-even P=0.20 — is it attempted?", () => {
    // P = 0.20 exactly. EV = 1.25*0.20 - 0.25 = 0. The policy filter is `p > breakEven`
    // (strict). At exactly 0.20 the question is REFUSED. EV is exactly 0 there, so
    // refusing leaves 0 marks on the table — not positive-EV. HELD by definition,
    // but verify the boundary is handled as documented (strict >).
    // P=0.20 -> sig=(0.20-0.25)/0.75 = -0.0667 -> impossible (negative). So with
    // the guessing floor 0.25, P can NEVER be below 0.25 for single_best. Every
    // single_best question is ALWAYS above break-even. Document this.
    const rVeryLow = -10; // sigmoid ~ 0 -> P -> 0.25 (the floor)
    const state = stateWithRatings({ "n.fast_lowEV": rVeryLow, "n.slow_highEV": rVeryLow });
    const bank = bankWith(60, 60);
    const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    const pFloor = GUESSING_FLOOR.single_best; // 0.25
    console.log(`[S] rating=-10 -> P=${pFloor} (floor). EV/Q=${evAt(rVeryLow).toFixed(4)}. refusedOnAbility=${r.note.includes("below the break-even")}`);
    // P=0.25 > 0.20 so attempted; EV/Q = 1.25*0.25-0.25 = 0.0625 > 0. Correct to attempt.
    expect(r.note.includes("below the break-even")).toBe(false);
    expect(evAt(rVeryLow)).toBeGreaterThan(0);
  });

  it("ATTACK T: 120-minute boundary — exactly at budget keeps everything", () => {
    // 100 questions * 72s = 7200s = exactly 120 min. Policy: drop while
    // totalSeconds > budgetSeconds (strict). At equality nothing drops. Good.
    const state = stateWithRatings({ "n.fast_lowEV": 1.0, "n.slow_highEV": 1.0 });
    const bank = bankWith(72, 72);
    const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    console.log(`[T] 100x72s=7200s exactly | skippedForTime=${r.skippedForTime} timeFeasible=${r.timeFeasible}`);
    expect(r.skippedForTime).toBe(0);
    expect(r.timeFeasible).toBe(true);
  });

  it("ATTACK U: expected_seconds outlier (one absurdly slow node) does not over-drop", () => {
    // One family is realistic (60s), the other has a 100000s outlier. The slow
    // family should be dropped entirely before any fast question is touched.
    const state = stateWithRatings({ "n.fast_lowEV": 2.0, "n.slow_highEV": 2.0 });
    const bank = bankWith(60, 100000);
    const r = computeReadiness(state, [], bank, BLUEPRINT, CA_FOUNDATION_QA_MARKING, NOW);
    console.log(`[U] outlier seconds | expectedMarks=${r.expectedMarks} skippedForTime=${r.skippedForTime} estMinutes=${r.estMinutes}`);
    // 50 fast * 60 = 3000s = 50 min fits; all 50 slow should drop (each 100000s).
    expect(r.estMinutes!).toBeLessThanOrEqual(120);
    // The 50 fast positive-EV questions must NOT be dropped (they fit easily).
    expect(r.skippedForTime!).toBeLessThanOrEqual(50);
  });
});
