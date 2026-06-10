/**
 * CLAIM 3 (REVIEW ECONOMICS): reviews never starve coverage or remediation;
 * every blueprint family gets practice under realistic daily use.
 *
 * Attacks: bursty cram, tiny banks (3 items), enormous backlog after a 30-day
 * gap, exam 5 days away (compression flooding the due queue), adversarial
 * blueprint weights.
 *
 * The lever is the review budget: pickReview returns null once reviewsServed >=
 * floor(0.5 * sessionLength). We drive realistic sessions and check that (a)
 * reviews never exceed 50%, (b) every weighted family eventually gets served,
 * (c) remediation/coverage are not starved.
 */
import { describe, it, expect } from "vitest";
import { rng } from "./sim.js";
import { replay } from "../src/replay.js";
import { selectNextAction, recordServed, EMPTY_SESSION, type SessionProgress } from "../src/selector.js";
import { dueItems } from "../src/scheduler.js";
import type { Bank, BankItem, Blueprint, Event, EngineState } from "../src/types.js";

const MS_PER_DAY = 86_400_000;
const T0 = 1_700_000_000_000;

const BLUEPRINT: Blueprint = {
  parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
    { nodeId: "n.a", quota: 25 }, { nodeId: "n.b", quota: 25 },
    { nodeId: "n.c", quota: 25 }, { nodeId: "n.d", quota: 25 },
  ]}]}],
};
const NODES = ["n.a", "n.b", "n.c", "n.d"];

function makeBank(perNode: number): Bank {
  const m = new Map<string, BankItem>();
  for (const node of NODES) for (let i = 0; i < perNode; i++) {
    const id = `${node}#${String(i).padStart(2, "0")}`;
    m.set(id, { id, tests: [node], difficulty_label: (["L1","L2","L3"] as const)[i % 3]!, item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
  }
  return m;
}

/** Run a study session of `length` picks, applying each served item as a new
 * event (correctness from rng), and return the kinds served plus the updated
 * event log. */
function runSession(events: Event[], b: Bank, bp: Blueprint, now: number, length: number, examMs: number | undefined, r: () => number): { kinds: string[]; events: Event[] } {
  let session: SessionProgress = EMPTY_SESSION;
  const kinds: string[] = [];
  const ev = [...events];
  let evi = 0;
  for (let i = 0; i < length; i++) {
    const state = replay(ev, b, now, examMs);
    const action = selectNextAction(state, b, bp, now, length, session);
    kinds.push(action.kind);
    if (action.itemId === null) { session = recordServed(session, action); continue; }
    const item = b.get(action.itemId)!;
    const correct = r() < 0.55;
    ev.push({
      event_id: `s${now}_${String(i).padStart(3, "0")}_${evi++}`,
      occurredAtMs: now + i * 60_000,
      item_id: action.itemId,
      item_content_hash: "h", taxonomy_version: 2,
      tests: item.tests, difficulty_label: item.difficulty_label, item_type: "single_best",
      mode: action.kind === "review" ? "review" : "practice",
      correct,
      selected_misconception: !correct && r() < 0.5 ? `mc.${item.tests[0]}` : null,
      time_ms: 30000, resurfaced: action.kind === "review",
    });
    session = recordServed(session, action);
  }
  return { kinds, events: ev };
}

function reviewShare(kinds: string[]): number {
  const rev = kinds.filter((k) => k === "review").length;
  return rev / kinds.length;
}

describe("REVIEW ECONOMICS attacks", () => {
  it("ATTACK Z: bursty cram weekends, then check review share never exceeds 50%", () => {
    const b = makeBank(8);
    let events: Event[] = [];
    const r = rng(31);
    let maxShare = 0;
    const allFamiliesSeen = new Set<string>();
    // 8 weekends; each weekend = 2 days of 20-pick sessions.
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 2; d++) {
        const now = T0 + (w * 7 + d) * MS_PER_DAY;
        const res = runSession(events, b, BLUEPRINT, now, 20, undefined, r);
        events = res.events;
        maxShare = Math.max(maxShare, reviewShare(res.kinds));
      }
    }
    const finalState = replay(events, b, T0 + 60 * MS_PER_DAY);
    for (const node of finalState.skills.keys()) allFamiliesSeen.add(node);
    console.log(`[Z] cram: maxReviewShare=${(maxShare * 100).toFixed(0)}% familiesTouched=${[...allFamiliesSeen].filter(n=>NODES.includes(n)).length}/4`);
    expect(maxShare).toBeLessThanOrEqual(0.5);
    expect([...allFamiliesSeen].filter(n => NODES.includes(n)).length).toBe(4);
  });

  it("ATTACK AA: tiny bank (3 items total, one per node only 3 nodes) — coverage not starved", () => {
    // Only 3 items, on 3 of the 4 nodes. The 4th node has NO item: coverage can
    // never serve it. Does the engine loop or correctly report it cannot serve?
    const m = new Map<string, BankItem>();
    m.set("n.a#0", { id: "n.a#0", tests: ["n.a"], difficulty_label: "L1", item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
    m.set("n.b#0", { id: "n.b#0", tests: ["n.b"], difficulty_label: "L1", item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
    m.set("n.c#0", { id: "n.c#0", tests: ["n.c"], difficulty_label: "L1", item_type: "single_best", expected_seconds: 60, verification_status: "verified" });
    const b: Bank = m;
    const r = rng(32);
    let events: Event[] = [];
    const now = T0;
    const res = runSession(events, b, BLUEPRINT, now, 20, undefined, r);
    const served = res.kinds.filter((k) => k !== "none").length;
    console.log(`[AA] tiny bank: kinds=${res.kinds.join(",")} served=${served}`);
    // Only 3 distinct items exist; in one session each item can be served once
    // (servedItems excludes repeats), so at most 3 non-none picks then 'none'.
    expect(res.kinds.filter((k) => k === "none").length).toBeGreaterThan(0);
    // n.d (no item) is never servable: that is a content gap, engine must not crash.
    expect(served).toBeLessThanOrEqual(3);
  });

  it("ATTACK BB: 30-day gap then a huge backlog — does review flood the session?", () => {
    const b = makeBank(8);
    let events: Event[] = [];
    const r = rng(33);
    // Warm up: 10 days of practice to build many scheduled items.
    for (let d = 0; d < 10; d++) {
      const now = T0 + d * MS_PER_DAY;
      events = runSession(events, b, BLUEPRINT, now, 20, undefined, r).events;
    }
    // 30-day silence, then return. Many items are now overdue.
    const returnNow = T0 + 40 * MS_PER_DAY;
    const state = replay(events, b, returnNow);
    const due = dueItems(state.schedules, returnNow);
    const res = runSession(events, b, BLUEPRINT, returnNow, 20, undefined, r);
    const share = reviewShare(res.kinds);
    console.log(`[BB] backlog: dueCount=${due.length} reviewShare=${(share * 100).toFixed(0)}% kinds=${res.kinds.join(",")}`);
    // Claim: reviews never starve coverage/remediation. Budget caps at 50%.
    expect(share).toBeLessThanOrEqual(0.5);
  });

  it("ATTACK CC: exam 5 days away — compression floods due queue, budget holds?", () => {
    const b = makeBank(8);
    let events: Event[] = [];
    const r = rng(34);
    const examMs = T0 + 25 * MS_PER_DAY;
    // 20 days of practice WITH the exam set, so compression applies.
    for (let d = 0; d < 20; d++) {
      const now = T0 + d * MS_PER_DAY;
      events = runSession(events, b, BLUEPRINT, now, 20, examMs, r).events;
    }
    // Now exam is 5 days away. Everything compresses to <=2.5 days.
    const now = T0 + 20 * MS_PER_DAY;
    const state = replay(events, b, now, examMs);
    const due = dueItems(state.schedules, now);
    const res = runSession(events, b, BLUEPRINT, now, 20, examMs, r);
    const share = reviewShare(res.kinds);
    console.log(`[CC] exam-5d: dueCount=${due.length} reviewShare=${(share * 100).toFixed(0)}% nonReviewServed=${res.kinds.filter(k=>k!=="review"&&k!=="none").length}`);
    expect(share).toBeLessThanOrEqual(0.5);
    // Compression must not strand non-review work: at least some non-review picks.
    expect(res.kinds.filter((k) => k !== "review" && k !== "none").length).toBeGreaterThanOrEqual(1);
  });

  it("ATTACK DD: adversarial blueprint weights — one node 97 quota, others 1 each", () => {
    const skewed: Blueprint = {
      parts: [{ id: "p", marks: 100, questions: 100, sections: [{ id: "s", families: [
        { nodeId: "n.a", quota: 97 }, { nodeId: "n.b", quota: 1 },
        { nodeId: "n.c", quota: 1 }, { nodeId: "n.d", quota: 1 },
      ]}]}],
    };
    const b = makeBank(8);
    let events: Event[] = [];
    const r = rng(35);
    const touched = new Set<string>();
    for (let d = 0; d < 30; d++) {
      const now = T0 + d * MS_PER_DAY;
      const res = runSession(events, b, skewed, now, 20, undefined, r);
      events = res.events;
    }
    const fs = replay(events, b, T0 + 30 * MS_PER_DAY);
    for (const n of fs.skills.keys()) if (NODES.includes(n)) touched.add(n);
    console.log(`[DD] skewed weights: familiesTouched=${[...touched].sort().join(",")} (${touched.size}/4)`);
    // Claim: EVERY blueprint family gets practice. Even the quota-1 nodes.
    expect(touched.size).toBe(4);
  });
});
