/**
 * Spaced-repetition scheduler (SPEC section 4; ADR 0009, ADR 0020).
 *
 * FSRS-4.5 memory model (fsrs.ts), binary outcomes only:
 *   - Per item: stability S (days to 90% recall) and difficulty D in [1, 10].
 *   - correct -> grade good, wrong -> grade again (a lapse). The next interval
 *     targets retention 0.9, which makes interval = stability exactly.
 *   - EVERY graded event advances the item's schedule, mock mode included
 *     (ADR 0020, superseding the earlier mock-exclusion rule): recalling an
 *     item inside a mock is a real review, and missing one is a lapse that
 *     must resurface. Only post-exam events are ignored.
 *
 * Exam awareness: with examMs set, due dates cap at examMs minus a 3-day final
 * revision buffer, and any interval longer than half the days remaining
 * compresses to half the days remaining (floor 1 day). No schedule entry lands
 * past the exam.
 *
 * Workload balancing: balanceSchedules (called by replay after the fold)
 * spreads due dates so no calendar day holds more than MAX_DUE_PER_DAY
 * reviews; most fragile (lowest stability) items keep the earliest slots.
 *
 * Pack transitions: a scheduled item absent from the bank transfers its
 * schedule to its successor when the tombstone names superseded_by (same due,
 * same memory state), otherwise the entry is dropped. Live update and replay
 * apply the same rule.
 */

import {
  GRADE_AGAIN,
  GRADE_GOOD,
  type FsrsGrade,
  initialDifficulty,
  initialStability,
  intervalForRetention,
  nextDifficulty,
  retrievability,
  stabilityAfterLapse,
  stabilityAfterRecall,
} from "./fsrs.js";
import { MS_PER_DAY } from "./time.js";
import type { Bank, Event, ItemSchedule } from "./types.js";

/** Final-revision buffer: no review is scheduled inside this window before the exam. */
export const FINAL_REVISION_BUFFER_DAYS = 3;

/** Workload cap: the most reviews balanceSchedules will leave due on one
 * calendar day. Provisional until telemetry; chosen so a daily session stays
 * a session, not a wall. */
export const MAX_DUE_PER_DAY = 12;

/**
 * Apply one binary outcome to an item's schedule. Pure. `prior` is the existing
 * entry, or undefined for a first encounter. `examMs` (optional) caps and
 * compresses the resulting due date.
 */
export function updateSchedule(
  prior: ItemSchedule | undefined,
  itemId: string,
  occurredAtMs: number,
  correct: boolean,
  examMs?: number,
): ItemSchedule {
  const grade: FsrsGrade = correct ? GRADE_GOOD : GRADE_AGAIN;
  let stability: number;
  let difficulty: number;
  if (prior === undefined) {
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
  } else {
    const elapsedDays = Math.max(0, (occurredAtMs - prior.lastSeenMs) / MS_PER_DAY);
    const r = retrievability(elapsedDays, prior.stability);
    difficulty = nextDifficulty(prior.difficulty, grade);
    stability = correct
      ? stabilityAfterRecall(prior.difficulty, prior.stability, r)
      : stabilityAfterLapse(prior.difficulty, prior.stability, r);
  }
  const intervalDays = intervalForRetention(stability);
  return {
    itemId,
    intervalDays,
    stability,
    difficulty,
    lastSeenMs: occurredAtMs,
    dueAtMs: capDueDate(occurredAtMs, intervalDays, examMs),
    consecutiveCorrect: correct ? (prior?.consecutiveCorrect ?? 0) + 1 : 0,
    lapsed: !correct,
  };
}

/**
 * Cap and compress a due date against the exam (SPEC 4). When examMs is set:
 *   - an interval longer than half the days remaining compresses to half the
 *     days remaining (floor 1 day);
 *   - the due date never lands later than examMs minus the 3-day buffer.
 */
export function capDueDate(
  occurredAtMs: number,
  intervalDays: number,
  examMs?: number,
): number {
  if (examMs === undefined) {
    return occurredAtMs + intervalDays * MS_PER_DAY;
  }
  const daysRemaining = (examMs - occurredAtMs) / MS_PER_DAY;
  let interval = intervalDays;
  const half = daysRemaining / 2;
  if (interval > half) {
    interval = Math.max(1, half);
  }
  let dueAtMs = occurredAtMs + interval * MS_PER_DAY;
  const latest = examMs - FINAL_REVISION_BUFFER_DAYS * MS_PER_DAY;
  if (dueAtMs > latest) dueAtMs = latest;
  return dueAtMs;
}

/**
 * Fold one event into the schedule map. Every mode advances schedules
 * (ADR 0020); only an event past the exam is ignored. Returns a new map
 * (does not mutate).
 */
export function applyEventToSchedules(
  schedules: ReadonlyMap<string, ItemSchedule>,
  event: Event,
  examMs?: number,
): Map<string, ItemSchedule> {
  const next = new Map(schedules);
  if (examMs !== undefined && event.occurredAtMs >= examMs) return next;
  const updated = updateSchedule(
    schedules.get(event.item_id),
    event.item_id,
    event.occurredAtMs,
    event.correct,
    examMs,
  );
  next.set(event.item_id, updated);
  return next;
}

/**
 * Deterministic workload balancing (ADR 0020). Buckets every entry by the UTC
 * calendar day of its due date and rolls overflow forward so no day holds more
 * than MAX_DUE_PER_DAY entries. An overflowing day keeps its most fragile
 * entries (lowest stability first, ties by item id ascending) and pushes the
 * rest one day at a time, preserving each entry's time of day.
 *
 * Deliberately clock-free: the result depends only on the schedules (and
 * examMs), so every replay of the same event log lands every item on the same
 * day no matter when the app is opened. Reviews the student does not do simply
 * age into overdue debt; nothing is hidden or re-shuffled between loads.
 *
 * With an exam set, nothing rolls past examMs minus the final-revision buffer:
 * the last allowed day absorbs the remainder and may exceed the cap (a crowded
 * final day is more honest than a silently dropped review).
 */
export function balanceSchedules(
  schedules: ReadonlyMap<string, ItemSchedule>,
  examMs?: number,
): Map<string, ItemSchedule> {
  const out = new Map<string, ItemSchedule>();
  const dayOf = (ms: number): number => Math.floor(ms / MS_PER_DAY);
  const latestDay =
    examMs !== undefined ? dayOf(examMs - FINAL_REVISION_BUFFER_DAYS * MS_PER_DAY) : Infinity;

  // Bucket by due day. capDueDate already keeps dueAtMs <= the buffer edge,
  // so every bucket day is <= latestDay.
  const buckets = new Map<number, ItemSchedule[]>();
  for (const s of schedules.values()) {
    const d = dayOf(s.dueAtMs);
    const list = buckets.get(d);
    if (list === undefined) buckets.set(d, [s]);
    else list.push(s);
  }
  if (buckets.size === 0) return out;

  const days = [...buckets.keys()].sort((a, b) => a - b);
  const lastInputDay = days[days.length - 1]!;
  let carry: ItemSchedule[] = [];
  for (let day = days[0]!; day <= lastInputDay || carry.length > 0; day++) {
    const todays = [...(buckets.get(day) ?? []), ...carry];
    carry = [];
    if (todays.length === 0) continue;
    todays.sort((a, b) => {
      if (a.stability !== b.stability) return a.stability - b.stability;
      return a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0;
    });
    const absorbsAll = day >= latestDay;
    const keep = absorbsAll ? todays : todays.slice(0, MAX_DUE_PER_DAY);
    if (!absorbsAll) carry = todays.slice(MAX_DUE_PER_DAY);
    for (const s of keep) {
      const deltaDays = day - dayOf(s.dueAtMs);
      out.set(
        s.itemId,
        deltaDays === 0 ? s : { ...s, dueAtMs: s.dueAtMs + deltaDays * MS_PER_DAY },
      );
    }
  }
  return out;
}

/**
 * Reconcile schedules against the current bank (ADR 0009 pack transition).
 * An entry whose item is absent from the bank, or present only as a tombstone:
 *   - transfers to the named successor (same due, same memory state) when the
 *     tombstone carries superseded_by and that successor is selectable;
 *   - otherwise is dropped.
 * Applied identically by live update and replay so import and live state agree.
 */
export function reconcileSchedules(
  schedules: ReadonlyMap<string, ItemSchedule>,
  bank: Bank,
): Map<string, ItemSchedule> {
  const out = new Map<string, ItemSchedule>();
  // Sort keys so the transfer order is deterministic when two entries collide.
  const ids = [...schedules.keys()].sort();
  for (const id of ids) {
    const entry = schedules.get(id)!;
    const item = bank.get(id);
    if (item !== undefined && item.verification_status !== "quarantined" && item.verification_status !== "retired") {
      out.set(id, entry);
      continue;
    }
    // Item absent or a tombstone: try to transfer to a live successor.
    const successor = item?.superseded_by;
    if (successor !== undefined) {
      const succItem = bank.get(successor);
      if (
        succItem !== undefined &&
        succItem.verification_status !== "quarantined" &&
        succItem.verification_status !== "retired"
      ) {
        // Transfer: same due date, same memory state; re-key onto the successor.
        // If the successor already has an entry, the transferred schedule
        // replaces it (supersession means the old item's history governs the
        // successor).
        out.set(successor, { ...entry, itemId: successor });
        continue;
      }
    }
    // No live successor: drop the entry.
  }
  return out;
}

/** Due items at nowMs, most overdue first; ties broken by item id ascending. */
export function dueItems(
  schedules: ReadonlyMap<string, ItemSchedule>,
  nowMs: number,
): ItemSchedule[] {
  const due: ItemSchedule[] = [];
  for (const s of schedules.values()) {
    if (s.dueAtMs <= nowMs) due.push(s);
  }
  due.sort((a, b) => {
    if (a.dueAtMs !== b.dueAtMs) return a.dueAtMs - b.dueAtMs;
    return a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0;
  });
  return due;
}
