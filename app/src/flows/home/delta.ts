/**
 * The delta line (W5-9 mechanism 2) — a pure function of two engine states.
 *
 * Spec: "On return (a new calendar day with prior history), one line above the
 * today card: what changed since last time, computed from the event log:
 * 'Since Tuesday: 14 questions, two topics firmer, compound interest still
 * costs you about 3 marks.' Marks framing, band-honest (no decimal theater). If
 * nothing improved, the line says what was practised without praise or blame.
 * Implemented as a pure function over two engine states (then, now)."
 *
 * This module is the pure function. The view rebuilds the "then" state by
 * replaying the event slice up to the prior-day boundary (logic.ts:
 * eventsBefore + priorDayBoundaryMs), then hands (then, now, eventsSince) here.
 *
 * HONESTY: every number is engine-derived.
 *   - questions = count of events recorded since the prior boundary.
 *   - firmer = number of nodes whose mastery RATING rose from then to now.
 *   - the costliest line = the single recurring misconception costing the most
 *     marks in `now`, framed in WHOLE marks (round, no decimal theater) using
 *     the same marks framing the diagnosis screen uses (count x negative-mark
 *     penalty). Shown only when it rounds to >= 1 mark, so we never report
 *     "about 0 marks".
 *   No invented numbers; no praise, no blame.
 */

import { NEGATIVE_PER_WRONG, type EngineState } from "@pinaka/engine";
import { recurringMisconceptions, nodeLabel } from "../diagnosis/diagnosis.js";
import { COPY } from "./copy.js";

/** A node counts as "firmer" when its rating rose by at least this much. A
 * trivial wobble is not a claim of improvement (band-honest). On the logit
 * rating scale this is a small but real positive move. */
export const FIRMER_RATING_EPSILON = 0.05;

/**
 * Count nodes whose mastery rating rose from `then` to `now` by at least the
 * epsilon. Only nodes observed in BOTH states are compared (a node first seen
 * since "then" is new ground, surfaced by the today card, not "firmer"). Pure.
 */
export function firmerNodeCount(then: EngineState, now: EngineState): number {
  let firmer = 0;
  for (const [nodeId, nowSkill] of now.skills) {
    const thenSkill = then.skills.get(nodeId);
    if (thenSkill === undefined) continue;
    if (nowSkill.rating - thenSkill.rating >= FIRMER_RATING_EPSILON) firmer += 1;
  }
  return firmer;
}

/**
 * The single costliest recurring misconception in `now`, as a label and a
 * WHOLE-mark figure, or null when none rounds to at least one mark. Reuses the
 * diagnosis marks framing (count x negative-marking penalty) so the home delta
 * and the diagnosis screen can never disagree.
 */
export function costliestMisconception(
  now: EngineState,
  negativePerWrong: number = NEGATIVE_PER_WRONG,
): { readonly label: string; readonly marks: number } | null {
  const ranked = recurringMisconceptions(now, negativePerWrong);
  if (ranked.length === 0) return null;
  const top = ranked[0]!;
  const marks = Math.round(top.marks); // whole marks; no decimal theater.
  if (marks < 1) return null;
  return { label: top.label, marks };
}

/**
 * The delta view model the line is built from. Pure data so the view renders it
 * and a test asserts it without a DOM.
 */
export interface Delta {
  /** Questions answered since the prior boundary. */
  readonly questions: number;
  /** Nodes that grew firmer. */
  readonly firmer: number;
  /** The costliest recurring misconception, or null. */
  readonly costliest: { readonly label: string; readonly marks: number } | null;
  /** True when there is nothing positive to report (no firmer node and no
   * cost line): the line states what was practised, without praise or blame. */
  readonly flat: boolean;
}

/**
 * Build the delta view model from two engine states and the count of events
 * since the prior boundary. Pure: no clock, no I/O.
 */
export function buildDelta(
  then: EngineState,
  now: EngineState,
  questionsSince: number,
  negativePerWrong: number = NEGATIVE_PER_WRONG,
): Delta {
  const firmer = firmerNodeCount(then, now);
  const costliest = costliestMisconception(now, negativePerWrong);
  return {
    questions: questionsSince,
    firmer,
    costliest,
    flat: firmer === 0 && costliest === null,
  };
}

/**
 * Render the delta as the spec's single line. `weekday` is the calendar-day
 * label of the prior session (computed by the view from the prior boundary; it
 * names a day, never a count of days). The format mirrors the spec example:
 *   "Since Tuesday: 14 questions, two topics firmer, compound interest still
 *    costs you about 3 marks."
 *
 * When nothing improved, the line states what was practised without praise or
 * blame; when nothing was practised since, it says so plainly.
 */
export function deltaLine(delta: Delta, weekday: string): string {
  if (delta.questions === 0) {
    return COPY.delta.nothingSince;
  }
  if (delta.flat) {
    return COPY.delta.practisedOnly(delta.questions);
  }
  const parts: string[] = [COPY.delta.questions(delta.questions)];
  if (delta.firmer > 0) parts.push(COPY.delta.firmer(delta.firmer));
  if (delta.costliest !== null) {
    parts.push(COPY.delta.stillCosts(delta.costliest.label, delta.costliest.marks));
  }
  return COPY.delta.sincePrefix(weekday) + parts.join(", ") + ".";
}

// Re-export so the view can label a node without importing diagnosis directly.
export { nodeLabel };
