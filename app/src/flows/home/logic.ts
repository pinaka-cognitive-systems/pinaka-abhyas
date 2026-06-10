/**
 * Home-surface logic (W5-9 honest adherence) — pure, DOM-free.
 *
 * The four mechanisms' decision logic lives here so the React view (HomeFlow)
 * is a thin renderer and every claim is traceable to an engine value, tested
 * without a DOM (app/tests/flows/home.test.ts).
 *
 * HONESTY CONTRACT (docs/design/adherence-spec.md):
 *   - The today card derives EVERY claim from the engine. The session contents
 *     come from planSession (the engine's actual selection tiers, threaded
 *     through recordServed), not from a guess. The only literals here are the
 *     session length default (an engine constant) and zero.
 *   - The delta is a PURE function of two engine states (then, now); the "then"
 *     state is rebuilt by replaying the event slice up to the prior-day
 *     boundary. Marks framing, band-honest, no decimal theater on whole-mark
 *     figures.
 *   - Re-entry triggers at a gap of >= 7 days and NEVER exposes the gap length.
 *
 * Chosen derivation path (documented per the task's "honest cheap path"):
 * the today card calls planSession against the engine, which threads
 * SessionProgress exactly as the live practice loop does. This characterizes
 * what today holds by the engine's own tiers (remediate / review / practice /
 * coverage) with zero re-implementation of selection. It is the same call the
 * practice loop will make, so the card can never disagree with the session the
 * student then plays. dueItems + masteryByNode would re-derive a subset of the
 * same facts less faithfully; planSession is both cheaper to reason about and
 * exactly honest.
 */

import {
  DEFAULT_SESSION_LENGTH,
  planSession,
  type LoadedPack,
} from "../../engine/index.js";
import type { EngineState, Event, NextAction } from "@pinaka/engine";

/** Milliseconds in a day. The engine uses the same value internally
 * (engine-ts/src/time.ts MS_PER_DAY) but does not re-export it on its public
 * surface, so the single literal lives here. */
export const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Mechanism 1: today, bounded and finite.
// ---------------------------------------------------------------------------

/**
 * The today card's view model. Every number is the engine's: `total` is the
 * length of the engine's planned session, and the per-kind counts sum to it.
 * `total === 0` is the honest "nothing to serve" case (a finished bank or a
 * fully-reviewed-and-covered student), handled by the view as a done-like state.
 */
export interface TodayCard {
  /** Total questions the engine would serve this session. */
  readonly total: number;
  /** Due reviews (engine tier 2). */
  readonly reviews: number;
  /** Misconception remediation (engine tier 1). */
  readonly remediation: number;
  /** Learnable-band practice (engine tier 3). */
  readonly practice: number;
  /** Coverage of unseen ground (engine tier 4). */
  readonly coverage: number;
}

/** Map an engine action kind to the card's bucket. `none` is never counted
 * (planSession stops before emitting it). */
function bucketOf(kind: NextAction["kind"]): keyof Omit<TodayCard, "total"> | null {
  switch (kind) {
    case "review":
      return "reviews";
    case "remediate":
      return "remediation";
    case "practice":
      return "practice";
    case "coverage":
      return "coverage";
    case "none":
      return null;
  }
}

/**
 * Derive the today card from the engine. Calls planSession (the engine's actual
 * selection tiers, threaded through a copy of session progress) and tallies the
 * result by kind. Pure: no clock of its own, no mutation of inputs.
 *
 * @param state   the rebuilt engine state (from the full event log).
 * @param pack    the loaded pack (bank + blueprint).
 * @param nowMs   the read clock, epoch ms (a parameter, never Date.now).
 * @param length  session length; defaults to the engine's session-length const.
 */
export function deriveTodayCard(
  state: EngineState,
  pack: LoadedPack,
  nowMs: number,
  length: number = DEFAULT_SESSION_LENGTH,
): TodayCard {
  const plan = planSession(state, pack, nowMs, length);
  const card: TodayCard = {
    total: plan.length,
    reviews: 0,
    remediation: 0,
    practice: 0,
    coverage: 0,
  };
  const counts = { reviews: 0, remediation: 0, practice: 0, coverage: 0 };
  for (const action of plan) {
    const bucket = bucketOf(action.kind);
    if (bucket !== null) counts[bucket] += 1;
  }
  return { ...card, ...counts };
}

// ---------------------------------------------------------------------------
// Mechanism 3: re-entry without shame.
// ---------------------------------------------------------------------------

/** The gap threshold (spec mechanism 3): 7 or more days since the last event. */
export const REENTRY_GAP_DAYS = 7;

/**
 * The last time the student was active, epoch ms, or null when there is no
 * history. Derived from the engine state's lastSeenMs map (the engine's own
 * record of when each item was last seen), so it cannot disagree with the
 * replay. Pure.
 */
export function lastActiveMs(state: EngineState): number | null {
  let max = -Infinity;
  for (const ms of state.lastSeenMs.values()) {
    if (ms > max) max = ms;
  }
  return Number.isFinite(max) ? max : null;
}

/**
 * Whether to show the re-entry lead (spec mechanism 3): there IS prior history,
 * and the gap from the last activity to now is >= 7 days. The gap LENGTH is
 * never returned — the caller only learns whether to lead with the welcome-back
 * line, never how long the student was away.
 */
export function isReentry(state: EngineState, nowMs: number): boolean {
  const last = lastActiveMs(state);
  if (last === null) return false;
  return nowMs - last >= REENTRY_GAP_DAYS * MS_PER_DAY;
}

// ---------------------------------------------------------------------------
// Event slicing for the delta (mechanism 2): time-bounded replay input.
// ---------------------------------------------------------------------------

/**
 * The start of the calendar day BEFORE nowMs's day, in UTC, as epoch ms. The
 * "then" state is the state as of the end of the prior session day; we slice
 * events strictly before this boundary so the delta compares "where you were
 * when you last left" against "where you are now". UTC day boundaries keep the
 * function pure and deterministic (no local-timezone dependence in the engine
 * layer; the view may localize the weekday label separately for display).
 */
export function priorDayBoundaryMs(nowMs: number): number {
  const startOfToday = Math.floor(nowMs / MS_PER_DAY) * MS_PER_DAY;
  return startOfToday;
}

/**
 * Slice the event log to those that occurred strictly before `boundaryMs`,
 * by `occurred_at` (occurredAtMs). This is the time-bounded slice the engine
 * replay accepts to rebuild the "then" state. Pure; preserves input order.
 */
export function eventsBefore(
  events: readonly Event[],
  boundaryMs: number,
): Event[] {
  return events.filter((e) => e.occurredAtMs < boundaryMs);
}

/** Count of events that occurred on or after `boundaryMs` (today). Used to
 * decide the done state and the delta's question count. Pure. */
export function eventsSince(
  events: readonly Event[],
  boundaryMs: number,
): number {
  let n = 0;
  for (const e of events) if (e.occurredAtMs >= boundaryMs) n += 1;
  return n;
}

/**
 * Whether today's bounded work is complete (mechanism 1 done state). Today is
 * done when the engine has nothing left to serve (an empty plan) OR the student
 * has already answered a full session's worth of questions today. Both are
 * traceable to engine/log values, never a streak or a stored "done" flag.
 *
 * @param todayCard the derived card (its total is the engine plan length).
 * @param answeredToday events recorded since the start of today's UTC day.
 * @param length the session length (the engine constant the card was built at).
 */
export function isTodayDone(
  todayCard: TodayCard,
  answeredToday: number,
  length: number = DEFAULT_SESSION_LENGTH,
): boolean {
  if (todayCard.total === 0) return true;
  return answeredToday >= length;
}
