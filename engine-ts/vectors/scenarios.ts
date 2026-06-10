/**
 * Golden-vector scenarios (W1-10; SPEC sections 8 and 9).
 *
 * Deterministic, seeded scenario definitions for the frozen public engine API.
 * NO Date.now and NO Math.random anywhere: every random choice flows from a
 * seeded mulberry32 (the helper copied from tests/mastery.test.ts), and every
 * timestamp is derived from a fixed epoch T0. The emitter (vectors/emit.ts) runs
 * each scenario through replay / selectNextAction / computeReadiness and freezes
 * the outputs; tests/vectors.test.ts re-runs them live and asserts equality.
 *
 * Each scenario family pins one documented engine rule:
 *   fresh_student        — insufficient_data gate, empty schedules (SPEC 6).
 *   cold_start_1/5/19    — below the 20-event readiness gate (SPEC 6).
 *   converging_student   — stationary tracker convergence at 200 events (SPEC 3).
 *   improving_student    — drift band extension upward, slowRating lag (SPEC 3,6).
 *   lapsing_student      — wrong-streak lapses + lapse review priority (SPEC 4,5).
 *   idle_gap_35/100      — fade grace boundary and beyond (SPEC 3).
 *   exam_week_compression— exam capping/compression of intervals (SPEC 4).
 *   pack_removal         — scheduled item absent from bank drops (SPEC 4, ADR 0009).
 *   pack_supersession    — schedule transfers to successor (SPEC 4, ADR 0009).
 *   pack_rekey           — re-score from raw response on key change (SPEC 7, ADR 0009).
 *   mock_anchor          — a 100-Q mock day anchors; a 20-answer day does NOT (SPEC 6).
 */

import type { RescoreRule } from "../src/replay.js";
import {
  CA_FOUNDATION_QA_MARKING,
  type BankItem,
  type Blueprint,
  type Event,
  type MarkingScheme,
} from "../src/types.js";
import { DIFFICULTY_ANCHOR, GUESSING_FLOOR, sigmoid } from "../src/scale.js";

// ---------------------------------------------------------------------------
// Deterministic RNG (copied verbatim from tests/mastery.test.ts).
// ---------------------------------------------------------------------------

/** Deterministic RNG: golden vectors and CI depend on reproducibility. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Fixed clock anchors. Never a wall clock (SPEC 9).
// ---------------------------------------------------------------------------

const T0 = Date.UTC(2025, 0, 6, 9, 0, 0); // 2025-01-06T09:00:00Z, a fixed instant
const HOUR = 3_600_000;
const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// A compact but realistic blueprint over real CA Foundation QA family ids.
// Three families, one per part, summing question quotas under the marking
// scheme. Mark-per-question is 1 in every part, matching marking.json.
// ---------------------------------------------------------------------------

export const BLUEPRINT: Blueprint = {
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
      sections: [{ id: "IV", families: [{ nodeId: "qa.lr.seating", quota: 6 }] }],
    },
    {
      id: "qa.stats",
      marks: 40,
      questions: 40,
      sections: [{ id: "VI", families: [{ nodeId: "qa.stats.probability", quota: 11 }] }],
    },
  ],
};

export const MARKING: MarkingScheme = CA_FOUNDATION_QA_MARKING;

const FAMILIES = ["qa.bmath.finance", "qa.lr.seating", "qa.stats.probability"] as const;
type Family = (typeof FAMILIES)[number];

// ---------------------------------------------------------------------------
// Bank construction. Each family carries 3+ items across difficulty labels so
// selection (sibling review, difficulty-nearest practice, coverage) has real
// material to work with.
// ---------------------------------------------------------------------------

const LABELS = ["L1", "L2", "L3"] as const;

function defaultBank(): Map<string, BankItem> {
  const m = new Map<string, BankItem>();
  for (const fam of FAMILIES) {
    // Four items per family: L1, L2, L3, plus a second L2 sibling.
    const specs: Array<{ suffix: string; label: (typeof LABELS)[number] }> = [
      { suffix: "a", label: "L1" },
      { suffix: "b", label: "L2" },
      { suffix: "c", label: "L3" },
      { suffix: "d", label: "L2" },
    ];
    for (const { suffix, label } of specs) {
      const id = `${fam}#${suffix}`;
      m.set(id, {
        id,
        tests: [fam],
        difficulty_label: label,
        item_type: "single_best",
        expected_seconds: label === "L1" ? 45 : label === "L2" ? 75 : 110,
        verification_status: "verified",
      });
    }
  }
  return m;
}

/** A pure event builder. All fields realistic per uqs-event-2 (ADR 0009). */
function makeEvent(args: {
  id: string;
  itemId: string;
  family: Family;
  t: number;
  correct: boolean;
  label?: (typeof LABELS)[number];
  mode?: Event["mode"];
  misconception?: string | null;
  contentHash?: string;
  response?: unknown;
  resurfaced?: boolean;
}): Event {
  const label = args.label ?? "L2";
  return {
    event_id: args.id,
    occurredAtMs: args.t,
    item_id: args.itemId,
    item_content_hash: args.contentHash ?? "v1",
    taxonomy_version: 2,
    tests: [args.family],
    difficulty_label: label,
    item_type: "single_best",
    mode: args.mode ?? "practice",
    correct: args.correct,
    selected_misconception: args.misconception ?? null,
    response: args.response,
    time_ms: 60_000,
    resurfaced: args.resurfaced ?? false,
  };
}

/** True P(correct) for a student of ability theta on a label, with guessing. */
function trueP(theta: number, label: (typeof LABELS)[number]): number {
  const c = GUESSING_FLOOR.single_best;
  return c + (1 - c) * sigmoid(theta - DIFFICULTY_ANCHOR[label]);
}

// ---------------------------------------------------------------------------
// Re-key rescore rules, named so both emitter and test reproduce them without
// serializing functions. The pack re-keys qa.stats.probability#b: the recorded
// raw response { choice } is re-scored against the corrected key ("C" correct).
// ---------------------------------------------------------------------------

export const REKEY_ITEM = "qa.stats.probability#b";

export function rekeyRescoreTable(): Map<string, RescoreRule> {
  const rule: RescoreRule = {
    fromContentHash: "v1",
    rescore: (response) => {
      const choice = (response as { choice?: string } | undefined)?.choice;
      return choice === "C"
        ? { correct: true, selected_misconception: null }
        : { correct: false, selected_misconception: "prob_complement_confusion" };
    },
  };
  return new Map([[REKEY_ITEM, rule]]);
}

// ---------------------------------------------------------------------------
// Scenario type.
// ---------------------------------------------------------------------------

export interface Scenario {
  /** Stable scenario name (vector key). */
  readonly name: string;
  /** One-line description of the rule this scenario pins. */
  readonly pins: string;
  readonly seed: number;
  readonly events: readonly Event[];
  readonly bank: Map<string, BankItem>;
  readonly blueprint: Blueprint;
  readonly marking: MarkingScheme;
  readonly nowMs: number;
  readonly examMs: number | undefined;
  /** Whether this scenario applies the re-key rescore table on replay. */
  readonly applyRekey: boolean;
  /** Taxonomy migration map (old node id -> new node id), when present. */
  readonly taxonomyMigration?: ReadonlyMap<string, string>;
}

// ---------------------------------------------------------------------------
// Scenario builders.
// ---------------------------------------------------------------------------

function itemFor(family: Family, label: (typeof LABELS)[number]): string {
  if (label === "L1") return `${family}#a`;
  if (label === "L3") return `${family}#c`;
  return `${family}#b`;
}

/** A stationary practice stream of `n` events on all families at ability theta. */
function stationaryStream(seed: number, n: number, theta: number, startT: number): Event[] {
  const rng = mulberry32(seed);
  const out: Event[] = [];
  let t = startT;
  for (let i = 0; i < n; i++) {
    const family = FAMILIES[Math.floor(rng() * FAMILIES.length)]!;
    const label = LABELS[Math.floor(rng() * 3)]!;
    const correct = rng() < trueP(theta, label);
    out.push(
      makeEvent({
        id: `ev${i.toString().padStart(4, "0")}`,
        itemId: itemFor(family, label),
        family,
        t,
        correct,
        label,
      }),
    );
    t += 4 * HOUR;
  }
  return out;
}

/** An improving practice stream: ability rises linearly from lo to hi. */
function improvingStream(seed: number, n: number, lo: number, hi: number, startT: number): Event[] {
  const rng = mulberry32(seed);
  const out: Event[] = [];
  let t = startT;
  for (let i = 0; i < n; i++) {
    const theta = lo + ((hi - lo) * i) / (n - 1);
    const family = FAMILIES[Math.floor(rng() * FAMILIES.length)]!;
    const label = LABELS[Math.floor(rng() * 3)]!;
    const correct = rng() < trueP(theta, label);
    out.push(
      makeEvent({
        id: `ev${i.toString().padStart(4, "0")}`,
        itemId: itemFor(family, label),
        family,
        t,
        correct,
        label,
      }),
    );
    t += 6 * HOUR;
  }
  return out;
}

function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];

  // --- fresh student: zero events. Pins the insufficient_data gate. ---
  scenarios.push({
    name: "fresh_student",
    pins: "zero events -> insufficient_data readiness, empty schedules, coverage action",
    seed: 0,
    events: [],
    bank: defaultBank(),
    blueprint: BLUEPRINT,
    marking: MARKING,
    nowMs: T0,
    examMs: undefined,
    applyRekey: false,
  });

  // --- cold start: 1, 5, 19 events (all below the 20-event readiness gate). ---
  for (const n of [1, 5, 19]) {
    scenarios.push({
      name: `cold_start_${n}`,
      pins: `${n} events: below the 20-event readiness gate -> insufficient_data`,
      seed: 100 + n,
      events: stationaryStream(100 + n, n, 0.4, T0),
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: T0 + n * 4 * HOUR + DAY,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- converging student: 200 stationary events. Pins tracker convergence. ---
  {
    const n = 200;
    const events = stationaryStream(202, n, 0.6, T0);
    scenarios.push({
      name: "converging_student",
      pins: "200 stationary events -> mastery tracks true ability; medium-band readiness",
      seed: 202,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: T0 + n * 4 * HOUR + DAY,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- improving student: ability -1 -> +2 over 240 events. Pins drift band. ---
  {
    const n = 240;
    const events = improvingStream(303, n, -1, 2, T0);
    scenarios.push({
      name: "improving_student",
      pins: "rising ability -> slowRating lags rating; readiness band extends upward (drift)",
      seed: 303,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: T0 + n * 6 * HOUR + DAY,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- lapsing student: builds a streak, then a wrong streak with lapse reviews. ---
  {
    const events: Event[] = [];
    const fam: Family = "qa.bmath.finance";
    const item = itemFor(fam, "L2");
    let t = T0;
    let i = 0;
    // Four corrects: schedule advances (1d, 6d, then *ease).
    for (let k = 0; k < 4; k++) {
      events.push(makeEvent({ id: `ev${i++}`, itemId: item, family: fam, t, correct: true }));
      t += 2 * DAY;
    }
    // Then three wrongs in a row, each a lapse on the exact item with a
    // misconception (drives lapse-review priority and remediation candidacy).
    for (let k = 0; k < 3; k++) {
      events.push(
        makeEvent({
          id: `ev${i++}`,
          itemId: item,
          family: fam,
          t,
          correct: false,
          mode: "review",
          misconception: "compound_simple_mixup",
          resurfaced: true,
        }),
      );
      t += DAY;
    }
    // Pad with stationary low-ability events on other families so the readiness
    // gate (>= 20 events, >= 25% coverage) is cleared and a real band is emitted.
    const pad = stationaryStream(404, 22, -0.2, t);
    for (const e of pad) events.push(e);
    const nowMs = pad[pad.length - 1]!.occurredAtMs + DAY;
    scenarios.push({
      name: "lapsing_student",
      pins: "wrong streak -> lapses (due 0.5d, interval reset, ease floored); lapse review served on exact item; recent misconception drives remediation",
      seed: 404,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- idle-gap student: 35 days (just past the 30-day grace) and 100 days. ---
  for (const gapDays of [35, 100]) {
    const base = stationaryStream(500 + gapDays, 40, 1.2, T0);
    const lastEventT = base[base.length - 1]!.occurredAtMs;
    const nowMs = lastEventT + gapDays * DAY;
    scenarios.push({
      name: `idle_gap_${gapDays}`,
      pins:
        gapDays === 35
          ? "35-day idle gap (just past the 30-day fade grace) -> small rating fade, widened deviation on read"
          : "100-day idle gap -> rating fades toward prior, deviation grows toward the prior ceiling",
      seed: 500 + gapDays,
      events: base,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- exam-week compression: exam 5 days out, long-interval schedules compress. ---
  {
    // Build a strong streak so intervals grow long (would exceed half the days
    // remaining), then set examMs 5 days after the last event.
    const events: Event[] = [];
    const fam: Family = "qa.bmath.finance";
    const item = itemFor(fam, "L2");
    let t = T0;
    let i = 0;
    for (let k = 0; k < 6; k++) {
      events.push(makeEvent({ id: `ev${i++}`, itemId: item, family: fam, t, correct: true }));
      t += 3 * DAY;
    }
    // Pad to clear the readiness gate; keep all events before the exam.
    const pad = stationaryStream(606, 24, 0.8, t);
    for (const e of pad) events.push(e);
    const lastT = pad[pad.length - 1]!.occurredAtMs;
    const examMs = lastT + 5 * DAY;
    scenarios.push({
      name: "exam_week_compression",
      pins: "examMs 5 days out -> long intervals compress to half days remaining and cap at exam minus 3-day buffer (SPEC 4 exam awareness)",
      seed: 606,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: lastT + DAY,
      examMs,
      applyRekey: false,
    });
  }

  // --- pack transition: item removed mid-history (schedule drops). ---
  {
    const events: Event[] = [];
    const fam: Family = "qa.bmath.finance";
    const removed = `${fam}#d`; // an L2 sibling we will delete from the bank
    const kept = `${fam}#b`;
    let t = T0;
    let i = 0;
    // Two corrects on the removed item -> it gets a live schedule entry...
    events.push(makeEvent({ id: `ev${i++}`, itemId: removed, family: fam, t, correct: true }));
    t += DAY;
    events.push(makeEvent({ id: `ev${i++}`, itemId: removed, family: fam, t, correct: true }));
    t += DAY;
    // ...plus history on a kept item so the contrast is visible in the schedule.
    events.push(makeEvent({ id: `ev${i++}`, itemId: kept, family: fam, t, correct: true }));
    t += DAY;
    const pad = stationaryStream(707, 22, 0.5, t);
    for (const e of pad) events.push(e);
    const bank = defaultBank();
    bank.delete(removed); // the item is gone from the bank entirely
    scenarios.push({
      name: "pack_removal",
      pins: "scheduled item absent from the bank -> its schedule entry is dropped on reconcile (ADR 0009); kept item survives",
      seed: 707,
      events,
      bank,
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: pad[pad.length - 1]!.occurredAtMs + DAY,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- pack transition: item superseded (schedule transfers to successor). ---
  {
    const events: Event[] = [];
    const fam: Family = "qa.lr.seating";
    const oldItem = `${fam}#d`; // retired, superseded_by #b
    const successor = `${fam}#b`;
    let t = T0;
    let i = 0;
    // Three corrects on the old item -> a real schedule (interval beyond first).
    for (let k = 0; k < 3; k++) {
      events.push(makeEvent({ id: `ev${i++}`, itemId: oldItem, family: fam, t, correct: true }));
      t += 2 * DAY;
    }
    const pad = stationaryStream(808, 22, 0.5, t);
    for (const e of pad) events.push(e);
    const bank = defaultBank();
    const old = bank.get(oldItem)!;
    bank.set(oldItem, {
      ...old,
      verification_status: "retired",
      superseded_by: successor,
    });
    scenarios.push({
      name: "pack_supersession",
      pins: "retired item with superseded_by -> schedule transfers to the live successor (same due, same ease, re-keyed itemId) (ADR 0009)",
      seed: 808,
      events,
      bank,
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: pad[pad.length - 1]!.occurredAtMs + DAY,
      examMs: undefined,
      applyRekey: false,
    });
  }

  // --- pack transition: item re-keyed (events re-scored from raw response). ---
  {
    const events: Event[] = [];
    const fam: Family = "qa.stats.probability";
    const rekeyed = REKEY_ITEM; // qa.stats.probability#b
    let t = T0;
    let i = 0;
    // Three events on the re-keyed item, recorded "correct" under the OLD key v1
    // with raw response { choice: "B" }. Under the corrected key "C" is right, so
    // re-scoring flips them to WRONG with a misconception.
    for (let k = 0; k < 3; k++) {
      events.push(
        makeEvent({
          id: `ev${i++}`,
          itemId: rekeyed,
          family: fam,
          t,
          correct: true,
          contentHash: "v1",
          response: { choice: "B" },
        }),
      );
      t += DAY;
    }
    const pad = stationaryStream(909, 22, 0.3, t);
    for (const e of pad) events.push(e);
    scenarios.push({
      name: "pack_rekey",
      pins: "re-key: events on the old content hash are re-scored from raw response (correct->wrong, misconception recorded), mastery and schedule rebuilt (SPEC 7, ADR 0009)",
      seed: 909,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs: pad[pad.length - 1]!.occurredAtMs + DAY,
      examMs: undefined,
      applyRekey: true,
    });
  }

  // --- mock anchoring: a qualifying 100-question mock day plus a sub-25-answer day. ---
  {
    // A practice baseline (cleared gate), then one full 100-question mock day
    // (qualifies: >= 25 answered) and one 20-answer day (does NOT anchor).
    const events: Event[] = [];
    const base = stationaryStream(1010, 30, 0.2, T0);
    for (const e of base) events.push(e);
    let t = base[base.length - 1]!.occurredAtMs + 2 * DAY;

    // Full mock day: 100 answered, ~62 correct (net = 62 - 0.25*38 = 52.5).
    const mockDayT = t;
    const rngMock = mulberry32(1111);
    for (let q = 0; q < 100; q++) {
      const family = FAMILIES[q % FAMILIES.length]!;
      events.push(
        makeEvent({
          id: `mockA${q.toString().padStart(3, "0")}`,
          itemId: itemFor(family, "L2"),
          family,
          t: mockDayT + q * 60_000,
          correct: rngMock() < 0.62,
          mode: "mock",
        }),
      );
    }
    t += 5 * DAY;

    // Sub-25-answer "mock" day: 20 answers, all correct. MUST NOT anchor.
    const tinyDayT = t;
    for (let q = 0; q < 20; q++) {
      const family = FAMILIES[q % FAMILIES.length]!;
      events.push(
        makeEvent({
          id: `mockB${q.toString().padStart(3, "0")}`,
          itemId: itemFor(family, "L2"),
          family,
          t: tinyDayT + q * 60_000,
          correct: true,
          mode: "mock",
        }),
      );
    }
    const nowMs = tinyDayT + DAY; // both mock days within the 21-day window
    scenarios.push({
      name: "mock_anchor",
      pins: "100-answer mock day anchors the readiness estimate; a 20-answer day is below the 25-answer floor and does NOT anchor (SPEC 6, W1-11 attack FF)",
      seed: 1010,
      events,
      bank: defaultBank(),
      blueprint: BLUEPRINT,
      marking: MARKING,
      nowMs,
      examMs: undefined,
      applyRekey: false,
    });
  }

  return scenarios;
}

export const SCENARIOS: readonly Scenario[] = buildScenarios();

export const SPEC_VERSION = "0.2";
export const EMITTED_AT = "2026-06-10";
