/**
 * Spaced-repetition scheduler (SPEC section 4, W1-4; ADR 0009).
 *
 * SM-2-lite, binary outcomes only:
 *   - First correct: due in 1 day. Second consecutive correct: 6 days.
 *     Thereafter interval = previous * ease.
 *   - Ease starts 2.5, +0.1 per correct, -0.2 per wrong, floored 1.3, capped 3.0.
 *   - Wrong: a lapse — due in 0.5 days, interval resets to 1 day, streak resets.
 *   - Mock-mode events update mastery (elsewhere) but never touch schedules:
 *     a mock is measurement, not review practice.
 *
 * Exam awareness: with examMs set, due dates cap at examMs minus a 3-day final
 * revision buffer, and any interval longer than half the days remaining
 * compresses to half the days remaining (floor 1 day). No schedule entry lands
 * past the exam.
 *
 * Pack transitions: a scheduled item absent from the bank transfers its schedule
 * to its successor when the tombstone names superseded_by (same due, same ease),
 * otherwise the entry is dropped. Live update and replay apply the same rule.
 */

import { MS_PER_DAY } from "./time.js";
import type { Bank, Event, ItemSchedule } from "./types.js";

export const EASE_START = 2.5;
export const EASE_BONUS = 0.1;
export const EASE_PENALTY = 0.2;
export const EASE_FLOOR = 1.3;
export const EASE_CAP = 3.0;

export const FIRST_INTERVAL_DAYS = 1;
export const SECOND_INTERVAL_DAYS = 6;
export const LAPSE_INTERVAL_DAYS = 0.5;
export const LAPSE_RESET_INTERVAL_DAYS = 1;

/** Final-revision buffer: no review is scheduled inside this window before the exam. */
export const FINAL_REVISION_BUFFER_DAYS = 3;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

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
  const ease0 = prior?.ease ?? EASE_START;
  const prevInterval = prior?.intervalDays ?? 0;
  const streak0 = prior?.consecutiveCorrect ?? 0;

  let interval: number;
  let ease: number;
  let streak: number;
  let lapsed: boolean;

  if (correct) {
    streak = streak0 + 1;
    if (streak === 1) interval = FIRST_INTERVAL_DAYS;
    else if (streak === 2) interval = SECOND_INTERVAL_DAYS;
    else interval = prevInterval * ease0;
    ease = clamp(ease0 + EASE_BONUS, EASE_FLOOR, EASE_CAP);
    lapsed = false;
  } else {
    streak = 0;
    interval = LAPSE_RESET_INTERVAL_DAYS;
    ease = clamp(ease0 - EASE_PENALTY, EASE_FLOOR, EASE_CAP);
    lapsed = true;
  }

  // A lapse is reviewed sooner than its reset interval would imply.
  const dueIntervalDays = lapsed ? LAPSE_INTERVAL_DAYS : interval;
  const dueAtMs = capDueDate(occurredAtMs, dueIntervalDays, examMs);

  return {
    itemId,
    intervalDays: interval,
    ease,
    lastSeenMs: occurredAtMs,
    dueAtMs,
    consecutiveCorrect: streak,
    lapsed,
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
 * Fold one event into the schedule map. Mock-mode events are ignored (they
 * measure, they do not create or advance review schedules). Returns a new map
 * (does not mutate). Past the exam, no event creates a schedule entry.
 */
export function applyEventToSchedules(
  schedules: ReadonlyMap<string, ItemSchedule>,
  event: Event,
  examMs?: number,
): Map<string, ItemSchedule> {
  const next = new Map(schedules);
  if (event.mode === "mock") return next;
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
 * Reconcile schedules against the current bank (ADR 0009 pack transition).
 * An entry whose item is absent from the bank, or present only as a tombstone:
 *   - transfers to the named successor (same due, same ease) when the tombstone
 *     carries superseded_by and that successor is selectable;
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
        // Transfer: same due date, same ease; re-key onto the successor.
        // If the successor already has an entry, the later due date wins is
        // not the rule — the transferred schedule replaces (supersession means
        // the old item's history governs the successor).
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
