/**
 * Scheduler tests (SPEC 4; ADR 0020). Values are pinned: exact stabilities,
 * difficulties, and due times for scripted sequences, exam-week compression,
 * mock ingestion, workload balancing, and pack transitions.
 *
 * Pinned literals were computed once from the FSRS-4.5 equations and weights
 * in src/fsrs.ts, independently in Python, so a silent formula change here
 * fails loudly.
 */
import { describe, expect, it } from "vitest";
import {
  applyEventToSchedules,
  balanceSchedules,
  capDueDate,
  MAX_DUE_PER_DAY,
  reconcileSchedules,
  updateSchedule,
} from "../src/scheduler.js";
import { MS_PER_DAY } from "../src/time.js";
import type { Bank, BankItem, Event, ItemSchedule } from "../src/types.js";

const T0 = Date.UTC(2024, 0, 1, 9, 0, 0);

function item(id: string, extra: Partial<BankItem> = {}): BankItem {
  return {
    id,
    tests: ["qa.bmath.finance"],
    difficulty_label: "L2",
    item_type: "single_best",
    expected_seconds: 75,
    verification_status: "verified",
    ...extra,
  };
}

function evt(itemId: string, occurredAtMs: number, correct: boolean, mode: Event["mode"] = "practice"): Event {
  return {
    event_id: `e@${occurredAtMs}`,
    occurredAtMs,
    item_id: itemId,
    item_content_hash: "h",
    taxonomy_version: 2,
    tests: ["qa.bmath.finance"],
    difficulty_label: "L2",
    item_type: "single_best",
    mode,
    correct,
    selected_misconception: null,
    time_ms: 1000,
    resurfaced: false,
  };
}

function sched(itemId: string, extra: Partial<ItemSchedule> = {}): ItemSchedule {
  return {
    itemId,
    intervalDays: 6,
    stability: 6,
    difficulty: 5.1618,
    lastSeenMs: T0,
    dueAtMs: T0 + 6 * MS_PER_DAY,
    consecutiveCorrect: 2,
    lapsed: false,
    ...extra,
  };
}

describe("FSRS-4.5 schedule updates (pinned values)", () => {
  it("first correct: stability w2 = 3.7145 d, difficulty D0(good) = 5.1618, due in S days", () => {
    const s = updateSchedule(undefined, "i1", T0, true);
    expect(s.stability).toBeCloseTo(3.7145, 12);
    expect(s.difficulty).toBeCloseTo(5.1618, 12);
    // At target retention 0.9 the interval equals the stability exactly.
    expect(s.intervalDays).toBeCloseTo(s.stability, 9);
    expect(s.dueAtMs).toBeCloseTo(T0 + 3.7145 * MS_PER_DAY, 6);
    expect(s.consecutiveCorrect).toBe(1);
    expect(s.lapsed).toBe(false);
  });

  it("first wrong: stability w0 = 0.4872 d (next-morning review), difficulty 7.6214, lapsed", () => {
    const s = updateSchedule(undefined, "i1", T0, false);
    expect(s.stability).toBeCloseTo(0.4872, 12);
    expect(s.difficulty).toBeCloseTo(7.6214, 12);
    expect(s.dueAtMs).toBeCloseTo(T0 + 0.4872 * MS_PER_DAY, 6);
    expect(s.consecutiveCorrect).toBe(0);
    expect(s.lapsed).toBe(true);
  });

  it("second correct exactly at due (R = 0.9): stability grows to 14.094985…", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true);
    expect(s2.stability).toBeCloseTo(14.094985421450282, 9);
    // Mean reversion holds D0(good) fixed under repeated goods.
    expect(s2.difficulty).toBeCloseTo(5.1618, 12);
    expect(s2.consecutiveCorrect).toBe(2);
  });

  it("third correct at due: stability 46.920396…, intervals stretch without an ease cap", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true);
    const s3 = updateSchedule(s2, "i1", s2.dueAtMs, true);
    expect(s3.stability).toBeCloseTo(46.920396662890255, 9);
    expect(s3.intervalDays).toBeCloseTo(s3.stability, 9);
  });

  it("a lapse at due: stability collapses to 3.064799… (capped below prior S), difficulty rises", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true); // S = 14.09…, D = 5.1618
    const s3 = updateSchedule(s2, "i1", s2.dueAtMs, false);
    expect(s3.stability).toBeCloseTo(3.064799224226683, 9);
    expect(s3.stability).toBeLessThan(s2.stability);
    expect(s3.difficulty).toBeCloseTo(6.901155, 9);
    expect(s3.consecutiveCorrect).toBe(0);
    expect(s3.lapsed).toBe(true);
  });

  it("recovery after the lapse re-earns stability gradually (9.238080…)", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true);
    const s3 = updateSchedule(s2, "i1", s2.dueAtMs, false);
    const s4 = updateSchedule(s3, "i1", s3.dueAtMs, true);
    expect(s4.stability).toBeCloseTo(9.238080685089054, 9);
    expect(s4.lapsed).toBe(false);
    expect(s4.consecutiveCorrect).toBe(1);
  });

  it("a same-day re-answer earns nothing: R ~ 1 makes the stability gain zero", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", T0, true); // zero elapsed
    expect(s2.stability).toBeCloseTo(s1.stability, 12);
  });

  it("difficulty stays clamped to [1, 10] under long wrong streaks", () => {
    let s = updateSchedule(undefined, "i1", T0, false);
    let t = s.dueAtMs;
    for (let i = 0; i < 20; i++) {
      s = updateSchedule(s, "i1", t, false);
      t = s.dueAtMs;
    }
    expect(s.difficulty).toBeLessThanOrEqual(10);
    expect(s.difficulty).toBeGreaterThanOrEqual(1);
    expect(s.stability).toBeGreaterThan(0);
  });
});

describe("mock mode advances schedules (ADR 0020: a mock recall is a real review)", () => {
  it("a mock event creates a schedule entry", () => {
    let m = new Map<string, ItemSchedule>();
    m = applyEventToSchedules(m, evt("i1", T0, true, "mock"));
    expect(m.size).toBe(1);
    expect(m.get("i1")!.stability).toBeCloseTo(3.7145, 12);
  });

  it("a wrong mock answer lapses an existing schedule", () => {
    let m = new Map<string, ItemSchedule>();
    m = applyEventToSchedules(m, evt("i1", T0, true, "practice"));
    m = applyEventToSchedules(m, evt("i1", T0 + MS_PER_DAY, false, "mock"));
    const s = m.get("i1")!;
    expect(s.lapsed).toBe(true);
    expect(s.lastSeenMs).toBe(T0 + MS_PER_DAY);
  });
});

describe("exam awareness: capping and compression (the deadline-blindness fix)", () => {
  it("with no exam, due is just occurred + interval", () => {
    expect(capDueDate(T0, 16.2)).toBe(T0 + 16.2 * MS_PER_DAY);
  });

  it("an interval longer than half the days remaining compresses to half", () => {
    const examMs = T0 + 20 * MS_PER_DAY; // 20 days out
    // interval 16.2 > half(10) -> compress to 10 days.
    const due = capDueDate(T0, 16.2, examMs);
    expect(due).toBe(T0 + 10 * MS_PER_DAY);
  });

  it("never schedules past the exam minus the 3-day buffer", () => {
    const examMs = T0 + 5 * MS_PER_DAY; // exam in 5 days
    // half days remaining = 2.5; interval 16.2 compresses to 2.5 days = T0+2.5d.
    // buffer latest = exam - 3d = T0 + 2d. So due caps at T0 + 2d.
    const due = capDueDate(T0, 16.2, examMs);
    expect(due).toBe(examMs - 3 * MS_PER_DAY);
    expect(due).toBe(T0 + 2 * MS_PER_DAY);
  });

  it("compression floors at 1 day", () => {
    const examMs = T0 + 1 * MS_PER_DAY; // exam tomorrow
    // half remaining = 0.5, but compression floors at 1 day; then capped to
    // exam-3d which is in the past, so latest = exam - 3d.
    const due = capDueDate(T0, 16.2, examMs);
    expect(due).toBe(examMs - 3 * MS_PER_DAY); // capped to the buffer edge
  });

  it("a post-exam event creates no schedule entry", () => {
    const examMs = T0 + 5 * MS_PER_DAY;
    let m = new Map<string, ItemSchedule>();
    m = applyEventToSchedules(m, evt("i1", examMs + MS_PER_DAY, true), examMs);
    expect(m.size).toBe(0);
  });
});

describe("workload balancing (ADR 0020): no day holds more than MAX_DUE_PER_DAY", () => {
  /** n entries all due the same instant, with stability = index (so the sort
   * order is fully determined). */
  function flood(n: number, dueAtMs: number): Map<string, ItemSchedule> {
    const m = new Map<string, ItemSchedule>();
    for (let i = 0; i < n; i++) {
      const id = `i${String(i).padStart(3, "0")}`;
      m.set(id, sched(id, { stability: i + 1, intervalDays: i + 1, dueAtMs }));
    }
    return m;
  }

  function byDay(m: ReadonlyMap<string, ItemSchedule>): Map<number, string[]> {
    const out = new Map<number, string[]>();
    for (const s of m.values()) {
      const d = Math.floor(s.dueAtMs / MS_PER_DAY);
      out.set(d, [...(out.get(d) ?? []), s.itemId].sort());
    }
    return out;
  }

  it("a 30-item flood spreads 12/12/6 across consecutive days, fragile first", () => {
    const due = T0 + 2 * MS_PER_DAY;
    const balanced = balanceSchedules(flood(30, due));
    const days = byDay(balanced);
    const d0 = Math.floor(due / MS_PER_DAY);
    expect(days.get(d0)!.length).toBe(MAX_DUE_PER_DAY);
    expect(days.get(d0 + 1)!.length).toBe(MAX_DUE_PER_DAY);
    expect(days.get(d0 + 2)!.length).toBe(6);
    // Lowest stability stays earliest: i000 (stability 1) on day 0,
    // i029 (stability 30) rolled to day 2.
    expect(days.get(d0)).toContain("i000");
    expect(days.get(d0 + 2)).toContain("i029");
  });

  it("rolled entries keep their time of day; settled entries are untouched", () => {
    const due = T0 + 2 * MS_PER_DAY;
    const balanced = balanceSchedules(flood(14, due));
    const rolled = balanced.get("i013")!;
    expect(rolled.dueAtMs).toBe(due + MS_PER_DAY);
    const kept = balanced.get("i000")!;
    expect(kept.dueAtMs).toBe(due);
    expect(kept).toEqual(flood(14, due).get("i000"));
  });

  it("is clock-free and idempotent: balancing a balanced map changes nothing", () => {
    const once = balanceSchedules(flood(30, T0 + 2 * MS_PER_DAY));
    const twice = balanceSchedules(once);
    expect(twice).toEqual(once);
  });

  it("under-cap days pass through unchanged", () => {
    const input = flood(5, T0 + 2 * MS_PER_DAY);
    expect(balanceSchedules(input)).toEqual(input);
  });

  it("with an exam set, nothing rolls past the buffer edge; the last day absorbs the rest", () => {
    const due = T0 + 2 * MS_PER_DAY;
    const examMs = T0 + 6 * MS_PER_DAY; // buffer edge = T0 + 3d
    const balanced = balanceSchedules(flood(30, due), examMs);
    const days = byDay(balanced);
    const d0 = Math.floor(due / MS_PER_DAY);
    const edgeDay = Math.floor((examMs - 3 * MS_PER_DAY) / MS_PER_DAY);
    expect(days.get(d0)!.length).toBe(MAX_DUE_PER_DAY);
    expect(days.get(edgeDay)!.length).toBe(30 - MAX_DUE_PER_DAY); // absorbs overflow
    expect(Math.max(...[...days.keys()])).toBe(edgeDay);
  });
});

describe("pack transitions (ADR 0009): tombstone drop and supersession transfer", () => {
  function bankOf(...items: BankItem[]): Bank {
    return new Map(items.map((i) => [i.id, i]));
  }

  it("a scheduled item absent from the bank is dropped", () => {
    const m = new Map<string, ItemSchedule>([["gone", sched("gone")]]);
    const reconciled = reconcileSchedules(m, bankOf());
    expect(reconciled.size).toBe(0);
  });

  it("a tombstoned item with no successor is dropped", () => {
    const m = new Map<string, ItemSchedule>([["t1", sched("t1")]]);
    const bank = bankOf(item("t1", { verification_status: "retired" }));
    expect(reconcileSchedules(m, bank).size).toBe(0);
  });

  it("a superseded item transfers its schedule (same due, same memory state) to the successor", () => {
    const entry = sched("old");
    const m = new Map<string, ItemSchedule>([["old", entry]]);
    const bank = bankOf(
      item("old", { verification_status: "retired", superseded_by: "new" }),
      item("new", { verification_status: "verified" }),
    );
    const reconciled = reconcileSchedules(m, bank);
    expect(reconciled.has("old")).toBe(false);
    const transferred = reconciled.get("new")!;
    expect(transferred.dueAtMs).toBe(entry.dueAtMs);
    expect(transferred.stability).toBe(entry.stability);
    expect(transferred.difficulty).toBe(entry.difficulty);
    expect(transferred.consecutiveCorrect).toBe(entry.consecutiveCorrect);
    expect(transferred.itemId).toBe("new");
  });

  it("supersession to a tombstoned successor drops instead of transferring", () => {
    const m = new Map<string, ItemSchedule>([["old", sched("old")]]);
    const bank = bankOf(
      item("old", { verification_status: "retired", superseded_by: "new" }),
      item("new", { verification_status: "retired" }),
    );
    expect(reconcileSchedules(m, bank).size).toBe(0);
  });
});
