/**
 * Selection tests (W1-5, W1-6, W1-7; SPEC 5).
 *
 * The headline test is the starvation regression (W1-5 acceptance): a 50-item/day
 * student over 60 simulated days. Reviews must never exceed the budget share and
 * every blueprint family must receive practice. The prototype starved families
 * because reviews crowded out new work — pinned dead here.
 */
import { describe, expect, it } from "vitest";
import { applyEventToSchedules, reconcileSchedules } from "../src/scheduler.js";
import { updateSkill, FRESH_SKILL, type SkillState } from "../src/mastery.js";
import {
  EMPTY_SESSION,
  recordServed,
  REVIEW_BUDGET_SHARE,
  selectNextAction,
  type SessionProgress,
} from "../src/selector.js";
import { MS_PER_DAY } from "../src/time.js";
import type {
  Bank,
  BankItem,
  Blueprint,
  EngineState,
  Event,
  ItemSchedule,
  MisconceptionHit,
} from "../src/types.js";

// --- A compact but realistic blueprint: 3 families, weighted. ---
const FAMILIES = ["qa.bmath.finance", "qa.lr.seating", "qa.stats.probability"] as const;

const BLUEPRINT: Blueprint = {
  parts: [
    {
      id: "qa.bmath",
      marks: 40,
      questions: 40,
      sections: [{ id: "II", families: [{ nodeId: "qa.bmath.finance", quota: 14 }] }],
    },
    {
      id: "qa.lr",
      marks: 20,
      questions: 20,
      sections: [{ id: "IV", families: [{ nodeId: "qa.lr.seating", quota: 5 }] }],
    },
    {
      id: "qa.stats",
      marks: 40,
      questions: 40,
      sections: [{ id: "VI", families: [{ nodeId: "qa.stats.probability", quota: 11 }] }],
    },
  ],
};

/** Build a bank: N items per family, alternating difficulty. */
function buildBank(perFamily: number): Bank {
  const m = new Map<string, BankItem>();
  for (const fam of FAMILIES) {
    for (let i = 0; i < perFamily; i++) {
      const id = `${fam}#${String(i).padStart(3, "0")}`;
      const label = i % 3 === 0 ? "L1" : i % 3 === 1 ? "L2" : "L3";
      m.set(id, {
        id,
        tests: [fam],
        difficulty_label: label,
        item_type: "single_best",
        expected_seconds: 75,
        verification_status: "verified",
      });
    }
  }
  return m;
}

function emptyState(): EngineState {
  return {
    skills: new Map(),
    schedules: new Map(),
    misconceptions: new Map(),
    eventCount: 0,
    lastSeenMs: new Map(),
  };
}

function evt(item: BankItem, occurredAtMs: number, correct: boolean): Event {
  return {
    event_id: `e@${occurredAtMs}#${item.id}`,
    occurredAtMs,
    item_id: item.id,
    item_content_hash: "h",
    taxonomy_version: 2,
    tests: item.tests,
    difficulty_label: item.difficulty_label,
    item_type: item.item_type,
    mode: "practice",
    correct,
    selected_misconception: null,
    time_ms: 1000,
    resurfaced: false,
  };
}

/** Apply an event to a mutable EngineState (mirrors replay's fold). */
function fold(state: EngineState, e: Event, bank: Bank): EngineState {
  const skills = new Map(state.skills);
  for (const node of e.tests) {
    const prior = skills.get(node) ?? { ...FRESH_SKILL };
    skills.set(node, updateSkill(prior, {
      correct: e.correct,
      difficultyLabel: e.difficulty_label,
      itemType: e.item_type,
      occurredAtMs: e.occurredAtMs,
    }));
  }
  let schedules = applyEventToSchedules(state.schedules, e);
  schedules = reconcileSchedules(schedules, bank);
  const lastSeenMs = new Map(state.lastSeenMs);
  lastSeenMs.set(e.item_id, e.occurredAtMs);
  return {
    skills,
    schedules,
    misconceptions: state.misconceptions,
    eventCount: state.eventCount + 1,
    lastSeenMs,
  };
}

describe("starvation regression (W1-5 acceptance): 50/day for 60 days", () => {
  it("reviews never exceed the budget share, and every family gets practice", () => {
    const bank = buildBank(30); // 90 items, plenty of siblings
    let state = emptyState();
    const sessionLength = 50;
    const reviewCap = Math.floor(REVIEW_BUDGET_SHARE * sessionLength); // 25
    const familyServed: Record<string, number> = {
      "qa.bmath.finance": 0,
      "qa.lr.seating": 0,
      "qa.stats.probability": 0,
    };

    for (let day = 0; day < 60; day++) {
      const dayStart = day * MS_PER_DAY + 9 * 3_600_000;
      let session: SessionProgress = EMPTY_SESSION;
      let reviewsThisDay = 0;
      for (let k = 0; k < sessionLength; k++) {
        const nowMs = dayStart + k * 60_000;
        const action = selectNextAction(state, bank, BLUEPRINT, nowMs, sessionLength, session);
        if (action.itemId === null) break;
        if (action.kind === "review") reviewsThisDay++;
        // The student gets it right 70% deterministically (alternating pattern).
        const correct = (day * 7 + k) % 10 < 7;
        const item = bank.get(action.itemId)!;
        const e = evt(item, nowMs, correct);
        state = fold(state, e, bank);
        if (item.tests[0]) familyServed[item.tests[0]]!++;
        session = recordServed(session, action);
      }
      // Budget invariant, every single day.
      expect(reviewsThisDay).toBeLessThanOrEqual(reviewCap);
    }

    // Every blueprint family received real practice.
    for (const fam of FAMILIES) {
      expect(familyServed[fam]!).toBeGreaterThan(0);
    }
    // And no single family dominated to the exclusion of others (rough fairness):
    const counts = FAMILIES.map((f) => familyServed[f]!);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    expect(min).toBeGreaterThan(0);
    expect(max / min).toBeLessThan(20); // not perfectly even, but no starvation
  });
});

describe("node-level review: sibling, not identical (W1-6)", () => {
  it("a non-lapse due item is reviewed via a fresh sibling on the same node", () => {
    const bank = buildBank(5);
    const original = bank.get("qa.bmath.finance#000")!;
    let state = emptyState();
    const t0 = 1_000_000_000_000;
    // Two consecutive corrects on the original -> a future due date.
    state = fold(state, evt(original, t0, true), bank);
    state = fold(state, evt(original, t0 + MS_PER_DAY, true), bank);
    // Advance to when it's due (interval 6 from the second event).
    const due = state.schedules.get(original.id)!.dueAtMs;
    const action = selectNextAction(state, bank, BLUEPRINT, due + 60_000);
    expect(action.kind).toBe("review");
    expect(action.itemId).not.toBe(original.id); // a sibling, not the same item
    expect(bank.get(action.itemId!)!.tests).toContain("qa.bmath.finance");
  });

  it("a lapse review serves the EXACT original item (seeing the error is the point)", () => {
    const bank = buildBank(5);
    const original = bank.get("qa.bmath.finance#000")!;
    let state = emptyState();
    const t0 = 1_000_000_000_000;
    state = fold(state, evt(original, t0, true), bank);
    // Now a wrong answer -> lapse, due in 0.5 days.
    state = fold(state, evt(original, t0 + MS_PER_DAY, false), bank);
    expect(state.schedules.get(original.id)!.lapsed).toBe(true);
    const due = state.schedules.get(original.id)!.dueAtMs;
    const action = selectNextAction(state, bank, BLUEPRINT, due + 60_000);
    expect(action.kind).toBe("review");
    expect(action.itemId).toBe(original.id); // the exact missed item
  });

  it("with no sibling available, a non-lapse due falls back to the original", () => {
    // One item per family: no sibling exists.
    const bank = buildBank(1);
    const only = bank.get("qa.bmath.finance#000")!;
    let state = emptyState();
    const t0 = 1_000_000_000_000;
    state = fold(state, evt(only, t0, true), bank);
    state = fold(state, evt(only, t0 + MS_PER_DAY, true), bank);
    const due = state.schedules.get(only.id)!.dueAtMs;
    const action = selectNextAction(state, bank, BLUEPRINT, due + 60_000);
    expect(action.kind).toBe("review");
    expect(action.itemId).toBe(only.id);
  });
});

describe("remediation outranks routine review (the starvation inversion fix)", () => {
  it("an active recurring misconception is served before a due review", () => {
    const bank = buildBank(5);
    const t0 = 1_000_000_000_000;
    // Build a due review on finance#000.
    let state = emptyState();
    const finItem = bank.get("qa.bmath.finance#000")!;
    state = fold(state, evt(finItem, t0, true), bank);
    state = fold(state, evt(finItem, t0 + MS_PER_DAY, true), bank);
    const dueMs = state.schedules.get(finItem.id)!.dueAtMs;

    // Inject a recurring misconception on qa.stats.probability, recent.
    const hits: MisconceptionHit[] = [
      { occurredAtMs: dueMs - 2 * MS_PER_DAY, eventId: "m1", nodes: ["qa.stats.probability"] },
      { occurredAtMs: dueMs - 1 * MS_PER_DAY, eventId: "m2", nodes: ["qa.stats.probability"] },
    ];
    const withMis: EngineState = {
      ...state,
      misconceptions: new Map([["complement_confusion", hits]]),
    };
    const action = selectNextAction(withMis, bank, BLUEPRINT, dueMs + 60_000);
    expect(action.kind).toBe("remediate");
    expect(action.nodeId).toBe("qa.stats.probability");
  });

  it("a stale (>14 day) misconception does NOT trigger remediation", () => {
    const bank = buildBank(5);
    const t0 = 1_000_000_000_000;
    const hits: MisconceptionHit[] = [
      { occurredAtMs: t0, eventId: "m1", nodes: ["qa.stats.probability"] },
      { occurredAtMs: t0 + MS_PER_DAY, eventId: "m2", nodes: ["qa.stats.probability"] },
    ];
    const state: EngineState = {
      ...emptyState(),
      misconceptions: new Map([["complement_confusion", hits]]),
    };
    const now = t0 + 30 * MS_PER_DAY; // 29 days after the last hit
    const action = selectNextAction(state, bank, BLUEPRINT, now);
    expect(action.kind).not.toBe("remediate");
  });
});

describe("determinism: identical candidates always order the same", () => {
  it("two runs from identical state produce the identical action", () => {
    const bank = buildBank(8);
    const state = emptyState();
    const now = 1_000_000_000_000;
    const a = selectNextAction(state, bank, BLUEPRINT, now);
    const b = selectNextAction(state, bank, BLUEPRINT, now);
    expect(a).toEqual(b);
  });

  it("coverage picks the highest-weight unseen family, ties broken by node id", () => {
    const bank = buildBank(8);
    const state = emptyState();
    const action = selectNextAction(state, bank, BLUEPRINT, 1_000_000_000_000);
    // bmath.finance weight = 14, stats.probability = 11, lr.seating = 5.
    // Highest weight unseen -> finance, and L1 entry item served first.
    expect(action.kind).toBe("coverage");
    expect(action.nodeId).toBe("qa.bmath.finance");
    expect(bank.get(action.itemId!)!.difficulty_label).toBe("L1");
  });
});

describe("descendant-node selection (the W5-3 integration regression)", () => {
  // Blueprint families sit at section level (qa.bmath.finance); real pack items
  // tag leaf nodes (qa.bmath.finance.compound_interest). Selection must reach
  // them, exactly as readiness coverage() already does via prefix matching.
  it("serves coverage from items tagged on a DESCENDANT of the blueprint family", () => {
    const bank = new Map<string, BankItem>();
    bank.set("deep#1", {
      id: "deep#1",
      tests: ["qa.bmath.finance.compound_interest"],
      difficulty_label: "L1",
      item_type: "single_best",
      expected_seconds: 60,
      verification_status: "verified",
    });
    const blueprint: Blueprint = {
      parts: [
        {
          id: "qa.bmath",
          marks: 40,
          questions: 40,
          sections: [
            { id: "I", families: [{ nodeId: "qa.bmath.finance", quota: 14 }] },
          ],
        },
      ],
    };
    const state: EngineState = {
      skills: new Map(),
      schedules: new Map(),
      misconceptions: new Map(),
      eventCount: 0,
      lastSeenMs: new Map(),
    };
    const action = selectNextAction(state, bank, blueprint, 1_700_000_000_000, 20);
    expect(action.kind).toBe("coverage");
    expect(action.itemId).toBe("deep#1");
  });
});
