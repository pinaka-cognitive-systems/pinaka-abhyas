/**
 * Home surface logic (W5-9 honest adherence) — DOM-free.
 *
 * The four mechanisms' pure logic, tested directly without a DOM (the repo
 * convention). Covers, per the task's test requirements:
 *   - the delta function over REAL engine states: improvement, no-change, and
 *     regression cases;
 *   - the gap threshold logic (mechanism 3), and that the gap LENGTH never
 *     leaks;
 *   - today-card derivation honesty: every number traceable to an engine value,
 *     with an assertion that the card's totals equal the engine plan and the
 *     per-kind counts sum to the total (no literal invented in the view model);
 *   - the reminder logic (off by default, time parsing, next-fire delay,
 *     availability, one-tap arm/disarm);
 *   - the instrumentation log fold and the export reader.
 *
 * Real engine states are built through the app's buildEngineState seam from the
 * actual CA blueprint, so the numbers under test are the engine's.
 */

import { describe, expect, it } from "vitest";

import { PRIOR_RATING, type EngineState, type Event } from "@pinaka/engine";
import {
  buildEngineState,
  loadPack,
  planSession,
  type LoadedPack,
  type RawBlueprint,
  type RawMarking,
  type RawPack,
} from "../../src/engine/index.js";
import {
  deriveTodayCard,
  eventsBefore,
  eventsSince,
  isReentry,
  isTodayDone,
  lastActiveMs,
  priorDayBoundaryMs,
  MS_PER_DAY,
  REENTRY_GAP_DAYS,
} from "../../src/flows/home/logic.js";
import {
  buildDelta,
  costliestMisconception,
  deltaLine,
  firmerNodeCount,
} from "../../src/flows/home/delta.js";
import {
  armReminder,
  msUntilNext,
  parseTime,
  reminderAvailability,
  REMINDER_OFF,
  type ReminderEnv,
} from "../../src/flows/home/reminder.js";
import {
  parseLog,
  readInstrumentation,
  recordDay,
  recordSessionStart,
  utcDay,
  ADHERENCE_META_KEY,
} from "../../src/flows/home/instrument.js";
import { MemoryAdapter } from "../../src/storage/memory.js";

import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";
import packJson from "../../../packs/ca-foundation-qa/pack.json";

const NOW = Date.UTC(2026, 5, 10, 9, 0, 0);

/** The real CA pack, so the engine plan and mastery are the genuine article. */
function caPack(): LoadedPack {
  return loadPack(
    packJson as unknown as RawPack,
    blueprintJson as unknown as RawBlueprint,
    markingJson as unknown as RawMarking,
  );
}

/** Build a practice event for an item the bank actually has, at a given time. */
function ev(over: Partial<Event> & { item_id: string; tests: readonly string[] }): Event {
  return {
    event_id: over.event_id ?? `e_${over.item_id}_${over.occurredAtMs ?? NOW}`,
    occurredAtMs: over.occurredAtMs ?? NOW,
    item_id: over.item_id,
    item_content_hash: over.item_content_hash ?? "h",
    taxonomy_version: over.taxonomy_version ?? 2,
    tests: over.tests,
    difficulty_label: over.difficulty_label ?? "L2",
    item_type: over.item_type ?? "single_best",
    mode: over.mode ?? "practice",
    correct: over.correct ?? true,
    selected_misconception: over.selected_misconception ?? null,
    time_ms: over.time_ms ?? 30_000,
    resurfaced: over.resurfaced ?? false,
  };
}

// ---------------------------------------------------------------------------
// Mechanism 1: today-card derivation honesty.
// ---------------------------------------------------------------------------

describe("deriveTodayCard — every number is the engine's", () => {
  it("total equals the engine plan length and per-kind counts sum to total", () => {
    const pack = caPack();
    const state = buildEngineState([], pack.bank, NOW);
    const card = deriveTodayCard(state, pack, NOW);

    // The independent ground truth: the engine's own plan.
    const plan = planSession(state, pack, NOW);
    expect(card.total).toBe(plan.length);

    // Every counted bucket sums back to total: no number invented in the card.
    const sum = card.reviews + card.remediation + card.practice + card.coverage;
    expect(sum).toBe(card.total);

    // Each per-kind count equals the engine plan's count of that kind.
    const count = (k: string): number => plan.filter((a) => a.kind === k).length;
    expect(card.reviews).toBe(count("review"));
    expect(card.remediation).toBe(count("remediate"));
    expect(card.practice).toBe(count("practice"));
    expect(card.coverage).toBe(count("coverage"));
  });

  it("a fresh student's first session is all coverage (unseen high-weight nodes)", () => {
    const pack = caPack();
    const state = buildEngineState([], pack.bank, NOW);
    const card = deriveTodayCard(state, pack, NOW);
    // A zero-history student has nothing due and no misconceptions: the engine
    // opens marks with coverage. Whatever the bank yields, no review/remediation
    // can exist without history.
    expect(card.reviews).toBe(0);
    expect(card.remediation).toBe(0);
    expect(card.total).toBeGreaterThan(0);
  });
});

describe("isTodayDone — finite end, traceable to engine and log", () => {
  it("is done when the engine plan is empty", () => {
    const empty = { total: 0, reviews: 0, remediation: 0, practice: 0, coverage: 0 };
    expect(isTodayDone(empty, 0, 20)).toBe(true);
  });
  it("is done when a full session has been answered today", () => {
    const card = { total: 20, reviews: 2, remediation: 0, practice: 8, coverage: 10 };
    expect(isTodayDone(card, 20, 20)).toBe(true);
    expect(isTodayDone(card, 19, 20)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mechanism 3: gap threshold; the gap length never leaks.
// ---------------------------------------------------------------------------

describe("isReentry — the 7-day gap threshold", () => {
  const pack = caPack();
  function stateLastSeen(daysAgo: number): EngineState {
    const last = NOW - daysAgo * MS_PER_DAY;
    return buildEngineState(
      [ev({ item_id: firstItemId(pack), tests: ["qa.bmath.finance"], occurredAtMs: last })],
      pack.bank,
      NOW,
    );
  }

  it("is false with no history", () => {
    const state = buildEngineState([], pack.bank, NOW);
    expect(isReentry(state, NOW)).toBe(false);
    expect(lastActiveMs(state)).toBeNull();
  });

  it("is false below the threshold (6 days)", () => {
    expect(isReentry(stateLastSeen(6), NOW)).toBe(false);
  });

  it("is true at exactly the threshold (7 days)", () => {
    expect(isReentry(stateLastSeen(REENTRY_GAP_DAYS), NOW)).toBe(true);
  });

  it("is true past the threshold (30 days)", () => {
    expect(isReentry(stateLastSeen(30), NOW)).toBe(true);
  });

  it("returns only a boolean: the API exposes no gap length", () => {
    const r = isReentry(stateLastSeen(30), NOW);
    expect(typeof r).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Mechanism 2: the delta over REAL engine states.
// ---------------------------------------------------------------------------

describe("delta over real engine states", () => {
  const pack = caPack();
  const node = "qa.bmath.finance";
  const boundary = priorDayBoundaryMs(NOW);
  const yesterday = boundary - 6 * 60 * 60 * 1000; // within the prior day
  const today = boundary + 60 * 60 * 1000; // after the boundary

  it("IMPROVEMENT: more correct answers today raise the rating -> a topic firmer", () => {
    const items = bankItemsForNode(pack, node, 6);
    // Prior day: two wrong answers (rating sits low).
    const before: Event[] = items.slice(0, 2).map((id, i) =>
      ev({ item_id: id, tests: [node], occurredAtMs: yesterday + i, correct: false }),
    );
    // Today: several correct answers (rating climbs).
    const since: Event[] = items.slice(2).map((id, i) =>
      ev({ item_id: id, tests: [node], occurredAtMs: today + i, correct: true }),
    );
    const all = [...before, ...since];

    const then = buildEngineState(before, pack.bank, boundary);
    const now = buildEngineState(all, pack.bank, NOW);

    const firmer = firmerNodeCount(then, now);
    expect(firmer).toBeGreaterThanOrEqual(1);

    const delta = buildDelta(then, now, eventsSince(all, boundary), pack.marking.negativePerWrong);
    expect(delta.questions).toBe(since.length);
    expect(delta.firmer).toBeGreaterThanOrEqual(1);
    expect(delta.flat).toBe(false);

    const line = deltaLine(delta, "Tuesday");
    expect(line.startsWith("Since Tuesday: ")).toBe(true);
    expect(line).toContain(`${since.length} questions`);
    expect(line).toContain("firmer");
    expect(line.endsWith(".")).toBe(true);
  });

  it("NO CHANGE: nothing practised since -> the plain nothing-since line", () => {
    const before = [ev({ item_id: firstItemId(pack), tests: [node], occurredAtMs: yesterday })];
    const then = buildEngineState(before, pack.bank, boundary);
    const now = buildEngineState(before, pack.bank, NOW);
    const delta = buildDelta(then, now, eventsSince(before, boundary));
    expect(delta.questions).toBe(0);
    expect(deltaLine(delta, "Monday")).toBe("Since last time: nothing new practised yet.");
  });

  it("FLAT: questions practised but no firmer node and no cost line -> practised-only, no praise/blame", () => {
    // Build a 'then' that already equals 'now' on ratings by using mock-mode
    // events today (they update mastery the same direction with the same data),
    // but craft so no rating rises and no recurring misconception exists.
    const items = bankItemsForNode(pack, node, 3);
    const before = [ev({ item_id: items[0]!, tests: [node], occurredAtMs: yesterday, correct: true })];
    // Today: a single wrong answer — rating does NOT rise, no recurring (>=2) misconception.
    const since = [ev({ item_id: items[1]!, tests: [node], occurredAtMs: today, correct: false })];
    const all = [...before, ...since];
    const then = buildEngineState(before, pack.bank, boundary);
    const now = buildEngineState(all, pack.bank, NOW);
    const delta = buildDelta(then, now, eventsSince(all, boundary));
    expect(delta.firmer).toBe(0);
    expect(delta.costliest).toBeNull();
    expect(delta.flat).toBe(true);
    expect(deltaLine(delta, "Friday")).toBe(
      "Since last time: 1 question practised, estimates holding steady.",
    );
  });

  it("REGRESSION/cost: a recurring misconception surfaces a marks-framed cost line", () => {
    const items = bankItemsForNode(pack, node, 8);
    // Today: many wrong answers all carrying the same misconception -> recurring,
    // costing whole marks under the +1/-0.25 scheme.
    const since: Event[] = items.map((id, i) =>
      ev({
        item_id: id,
        tests: [node],
        occurredAtMs: today + i,
        correct: false,
        selected_misconception: "si_ci_swap",
      }),
    );
    const before = [ev({ item_id: firstItemId(pack), tests: [node], occurredAtMs: yesterday })];
    const all = [...before, ...since];
    const then = buildEngineState(before, pack.bank, boundary);
    const now = buildEngineState(all, pack.bank, NOW);

    const cost = costliestMisconception(now, pack.marking.negativePerWrong);
    expect(cost).not.toBeNull();
    expect(cost!.marks).toBeGreaterThanOrEqual(1);

    const delta = buildDelta(then, now, eventsSince(all, boundary), pack.marking.negativePerWrong);
    const line = deltaLine(delta, "Wednesday");
    expect(line).toContain("still costs you about");
    expect(line).toMatch(/about \d+ marks?/);
  });

  it("the delta is PURE: same inputs, same output", () => {
    const items = bankItemsForNode(pack, node, 4);
    const before = items.slice(0, 1).map((id) => ev({ item_id: id, tests: [node], occurredAtMs: yesterday }));
    const all = [...before, ...items.slice(1).map((id, i) => ev({ item_id: id, tests: [node], occurredAtMs: today + i, correct: true }))];
    const then = buildEngineState(before, pack.bank, boundary);
    const now = buildEngineState(all, pack.bank, NOW);
    const a = buildDelta(then, now, eventsSince(all, boundary));
    const b = buildDelta(then, now, eventsSince(all, boundary));
    expect(a).toEqual(b);
  });
});

describe("event slicing for the delta", () => {
  it("eventsBefore and eventsSince partition the log at the boundary", () => {
    const boundary = priorDayBoundaryMs(NOW);
    const log = [
      ev({ item_id: "a", tests: ["n"], occurredAtMs: boundary - 1 }),
      ev({ item_id: "b", tests: ["n"], occurredAtMs: boundary }),
      ev({ item_id: "c", tests: ["n"], occurredAtMs: boundary + 1 }),
    ];
    expect(eventsBefore(log, boundary).map((e) => e.item_id)).toEqual(["a"]);
    expect(eventsSince(log, boundary)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Mechanism 4: the reminder.
// ---------------------------------------------------------------------------

describe("reminder — off by default, parsing, scheduling, availability", () => {
  it("is off by default", () => {
    expect(REMINDER_OFF.enabled).toBe(false);
  });

  it("parses valid HH:MM and rejects junk", () => {
    expect(parseTime("19:00")).toBe("19:00");
    expect(parseTime("07:05")).toBe("07:05");
    expect(parseTime("23:59")).toBe("23:59");
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("9:00")).toBeNull();
    expect(parseTime("noon")).toBeNull();
    expect(parseTime(null)).toBeNull();
  });

  it("msUntilNext targets today when the time is still ahead, tomorrow when past", () => {
    const DAY = 86_400_000;
    // local time 08:00 into the day; target 19:00 -> 11 hours ahead.
    const morning = { nowMs: 0, localMsIntoDay: 8 * 3_600_000 };
    expect(msUntilNext("19:00", morning)).toBe(11 * 3_600_000);
    // local time 20:00; target 19:00 -> already past, so tomorrow.
    const evening = { nowMs: 0, localMsIntoDay: 20 * 3_600_000 };
    expect(msUntilNext("19:00", evening)).toBe(DAY - 1 * 3_600_000);
    // always strictly positive.
    expect(msUntilNext("19:00", evening)).toBeGreaterThan(0);
  });

  it("availability maps capabilities honestly", () => {
    expect(reminderAvailability({ hasNotificationApi: false, permission: null })).toBe("unavailable");
    expect(reminderAvailability({ hasNotificationApi: true, permission: "denied" })).toBe("denied");
    expect(reminderAvailability({ hasNotificationApi: true, permission: "granted" })).toBe("available");
    expect(reminderAvailability({ hasNotificationApi: true, permission: "default" })).toBe("available");
  });

  it("armReminder does nothing when off, and schedules one timer when on+granted", () => {
    let scheduled = 0;
    let notified = 0;
    const env: ReminderEnv = {
      caps: () => ({ hasNotificationApi: true, permission: "granted" }),
      requestPermission: async () => "granted",
      schedule: (_d, fire) => {
        scheduled += 1;
        fire(); // fire immediately to exercise notify
        return () => {};
      },
      notify: () => {
        notified += 1;
      },
      localNow: () => ({ nowMs: 0, localMsIntoDay: 0 }),
    };
    // Off: no schedule.
    armReminder({ enabled: false, time: "19:00" }, env, { title: "t", body: "b" });
    expect(scheduled).toBe(0);
    // On + granted: exactly one schedule and one notify.
    armReminder({ enabled: true, time: "19:00" }, env, { title: "t", body: "b" });
    expect(scheduled).toBe(1);
    expect(notified).toBe(1);
  });

  it("armReminder does nothing when permission is not granted", () => {
    let scheduled = 0;
    const env: ReminderEnv = {
      caps: () => ({ hasNotificationApi: true, permission: "default" }),
      requestPermission: async () => "default",
      schedule: () => {
        scheduled += 1;
        return () => {};
      },
      notify: () => {},
      localNow: () => ({ nowMs: 0, localMsIntoDay: 0 }),
    };
    armReminder({ enabled: true, time: "19:00" }, env, { title: "t", body: "b" });
    expect(scheduled).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Instrumentation: the per-day fold and the export reader.
// ---------------------------------------------------------------------------

describe("instrumentation — per-day flags in meta, export reader", () => {
  it("utcDay is the YYYY-MM-DD of the instant", () => {
    expect(utcDay(NOW)).toBe("2026-06-10");
  });

  it("recordDay ORs flags onto a day (accumulates across observations)", () => {
    let log = recordDay({}, "2026-06-10", { todayCard: true });
    expect(log["2026-06-10"]).toEqual({
      todayCard: true,
      deltaLine: false,
      reentry: false,
      reminderFired: false,
    });
    log = recordDay(log, "2026-06-10", { deltaLine: true });
    expect(log["2026-06-10"]!.todayCard).toBe(true);
    expect(log["2026-06-10"]!.deltaLine).toBe(true);
  });

  it("parseLog tolerates absent and corrupt values", () => {
    expect(parseLog(null)).toEqual({});
    expect(parseLog("not json")).toEqual({});
    expect(parseLog("[]")).toEqual({});
  });

  it("recordSessionStart persists to meta and the reader reads it back", async () => {
    const adapter = await MemoryAdapter.open({});
    await recordSessionStart(adapter, NOW, { todayCard: true, reentry: true });
    const raw = await adapter.getMeta(ADHERENCE_META_KEY);
    expect(raw).not.toBeNull();

    const block = await readInstrumentation(adapter);
    expect(block.kind).toBe("adherence");
    expect(block.version).toBe(1);
    expect(block.days["2026-06-10"]).toEqual({
      todayCard: true,
      deltaLine: false,
      reentry: true,
      reminderFired: false,
    });
    await adapter.close();
  });
});

// ---------------------------------------------------------------------------
// Helpers over the real pack.
// ---------------------------------------------------------------------------

/** The first selectable bank item id (any), for simple presence events. */
function firstItemId(pack: LoadedPack): string {
  for (const [id, item] of pack.bank) {
    if (item.verification_status !== "retired" && item.verification_status !== "quarantined") {
      return id;
    }
  }
  throw new Error("the CA pack has no selectable items");
}

/** Up to `n` selectable bank item ids exercising `node` (or a descendant). */
function bankItemsForNode(pack: LoadedPack, node: string, n: number): string[] {
  const out: string[] = [];
  for (const [id, item] of pack.bank) {
    if (item.verification_status === "retired" || item.verification_status === "quarantined") continue;
    if (item.tests.some((t) => t === node || t.startsWith(node + "."))) out.push(id);
    if (out.length >= n) break;
  }
  if (out.length === 0) throw new Error(`the CA pack has no items for ${node}`);
  // The finance family carries ~12 distinct items, enough for these tests; if a
  // caller asks for more than exist we simply return what the bank has (each id
  // unique, so events never collide).
  return out;
}

// Keep PRIOR_RATING referenced so the import documents the rating scale origin.
void PRIOR_RATING;
