/**
 * Scheduler tests (W1-4, SPEC 4). Values are pinned: exact due times and eases
 * for scripted sequences, exam-week compression, and pack transitions.
 *
 * Audited defects pinned dead: the prototype was deadline-blind (no exam
 * capping) and never compressed intervals near the exam.
 */
import { describe, expect, it } from "vitest";
import {
  applyEventToSchedules,
  capDueDate,
  EASE_CAP,
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

describe("SM-2-lite intervals and ease (pinned values)", () => {
  it("first correct: due in 1 day, ease 2.6, streak 1", () => {
    const s = updateSchedule(undefined, "i1", T0, true);
    expect(s.intervalDays).toBe(1);
    expect(s.ease).toBeCloseTo(2.6, 12);
    expect(s.consecutiveCorrect).toBe(1);
    expect(s.dueAtMs).toBe(T0 + 1 * MS_PER_DAY);
    expect(s.lapsed).toBe(false);
  });

  it("second consecutive correct: due in 6 days, ease 2.7", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true);
    expect(s2.intervalDays).toBe(6);
    expect(s2.ease).toBeCloseTo(2.7, 12);
    expect(s2.dueAtMs).toBe(s1.dueAtMs + 6 * MS_PER_DAY);
  });

  it("third correct: interval = previous(6) * ease(2.7) = 16.2 days", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true); // interval 6, ease 2.7
    const s3 = updateSchedule(s2, "i1", s2.dueAtMs, true);
    expect(s3.intervalDays).toBeCloseTo(6 * 2.7, 12); // 16.2
    expect(s3.ease).toBeCloseTo(2.8, 12);
    expect(s3.dueAtMs).toBe(s2.dueAtMs + 16.2 * MS_PER_DAY);
  });

  it("ease caps at 3.0 after many corrects, never above", () => {
    let s = updateSchedule(undefined, "i1", T0, true);
    let t = s.dueAtMs;
    for (let i = 0; i < 10; i++) {
      s = updateSchedule(s, "i1", t, true);
      t = s.dueAtMs;
    }
    expect(s.ease).toBeLessThanOrEqual(EASE_CAP);
    expect(s.ease).toBeCloseTo(EASE_CAP, 12);
  });

  it("wrong: lapse, due in 0.5 days, interval reset to 1, ease -0.2, streak 0", () => {
    const s1 = updateSchedule(undefined, "i1", T0, true); // ease 2.6
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, false);
    expect(s2.lapsed).toBe(true);
    expect(s2.consecutiveCorrect).toBe(0);
    expect(s2.intervalDays).toBe(1);
    expect(s2.ease).toBeCloseTo(2.4, 12); // 2.6 - 0.2
    expect(s2.dueAtMs).toBe(s1.dueAtMs + 0.5 * MS_PER_DAY);
  });

  it("ease floors at 1.3 after repeated wrongs", () => {
    let s = updateSchedule(undefined, "i1", T0, false); // 2.5 - 0.2 = 2.3
    let t = s.dueAtMs;
    for (let i = 0; i < 20; i++) {
      s = updateSchedule(s, "i1", t, false);
      t = s.dueAtMs;
    }
    expect(s.ease).toBeCloseTo(1.3, 12);
  });
});

describe("mock mode does not advance schedules (measurement, not review)", () => {
  it("a mock event creates no schedule entry", () => {
    let sched = new Map<string, ItemSchedule>();
    sched = applyEventToSchedules(sched, evt("i1", T0, true, "mock"));
    expect(sched.size).toBe(0);
  });

  it("a mock event leaves an existing schedule untouched", () => {
    let sched = new Map<string, ItemSchedule>();
    sched = applyEventToSchedules(sched, evt("i1", T0, true, "practice"));
    const before = sched.get("i1")!;
    sched = applyEventToSchedules(sched, evt("i1", T0 + MS_PER_DAY, false, "mock"));
    expect(sched.get("i1")).toEqual(before);
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

  it("a converging item near the exam gets compressed due dates via updateSchedule", () => {
    const examMs = T0 + 20 * MS_PER_DAY;
    const s1 = updateSchedule(undefined, "i1", T0, true, examMs); // interval 1, fits
    expect(s1.dueAtMs).toBe(T0 + 1 * MS_PER_DAY);
    const s2 = updateSchedule(s1, "i1", s1.dueAtMs, true, examMs); // interval 6
    // at s1.due (T0+1d), days remaining = 19, half = 9.5; 6 < 9.5 so no compress.
    expect(s2.dueAtMs).toBe(s1.dueAtMs + 6 * MS_PER_DAY);
  });

  it("a post-exam event creates no schedule entry", () => {
    const examMs = T0 + 5 * MS_PER_DAY;
    let sched = new Map<string, ItemSchedule>();
    sched = applyEventToSchedules(sched, evt("i1", examMs + MS_PER_DAY, true), examMs);
    expect(sched.size).toBe(0);
  });
});

describe("pack transitions (ADR 0009): tombstone drop and supersession transfer", () => {
  function bankOf(...items: BankItem[]): Bank {
    return new Map(items.map((i) => [i.id, i]));
  }

  it("a scheduled item absent from the bank is dropped", () => {
    const sched = new Map<string, ItemSchedule>([
      ["gone", { itemId: "gone", intervalDays: 6, ease: 2.7, lastSeenMs: T0, dueAtMs: T0 + 6 * MS_PER_DAY, consecutiveCorrect: 2, lapsed: false }],
    ]);
    const reconciled = reconcileSchedules(sched, bankOf());
    expect(reconciled.size).toBe(0);
  });

  it("a tombstoned item with no successor is dropped", () => {
    const sched = new Map<string, ItemSchedule>([
      ["t1", { itemId: "t1", intervalDays: 6, ease: 2.7, lastSeenMs: T0, dueAtMs: T0 + 6 * MS_PER_DAY, consecutiveCorrect: 2, lapsed: false }],
    ]);
    const bank = bankOf(item("t1", { verification_status: "retired" }));
    expect(reconcileSchedules(sched, bank).size).toBe(0);
  });

  it("a superseded item transfers its schedule (same due, same ease) to the successor", () => {
    const entry: ItemSchedule = {
      itemId: "old",
      intervalDays: 6,
      ease: 2.7,
      lastSeenMs: T0,
      dueAtMs: T0 + 6 * MS_PER_DAY,
      consecutiveCorrect: 2,
      lapsed: false,
    };
    const sched = new Map<string, ItemSchedule>([["old", entry]]);
    const bank = bankOf(
      item("old", { verification_status: "retired", superseded_by: "new" }),
      item("new", { verification_status: "verified" }),
    );
    const reconciled = reconcileSchedules(sched, bank);
    expect(reconciled.has("old")).toBe(false);
    const transferred = reconciled.get("new")!;
    expect(transferred.dueAtMs).toBe(entry.dueAtMs);
    expect(transferred.ease).toBe(entry.ease);
    expect(transferred.consecutiveCorrect).toBe(entry.consecutiveCorrect);
    expect(transferred.itemId).toBe("new");
  });

  it("supersession to a tombstoned successor drops instead of transferring", () => {
    const entry: ItemSchedule = {
      itemId: "old", intervalDays: 6, ease: 2.7, lastSeenMs: T0,
      dueAtMs: T0 + 6 * MS_PER_DAY, consecutiveCorrect: 2, lapsed: false,
    };
    const sched = new Map([["old", entry]]);
    const bank = bankOf(
      item("old", { verification_status: "retired", superseded_by: "new" }),
      item("new", { verification_status: "retired" }),
    );
    expect(reconcileSchedules(sched, bank).size).toBe(0);
  });
});
