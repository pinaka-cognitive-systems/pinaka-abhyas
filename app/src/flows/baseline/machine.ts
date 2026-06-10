/**
 * Baseline session machine (W5-8).
 *
 * The cold-start baseline progresses through a FIXED plan (plan.ts) rather than
 * the engine's per-question selection: on an empty log the engine has nothing to
 * say, so the baseline lays down a deliberate spread instead. Everything else is
 * shared with the practice loop — the question/feedback components, the event
 * builder, the readiness summary — imported, not duplicated (requirement 2).
 *
 * This module holds only the LOGIC the baseline does differently: walking the
 * fixed plan to the next servable question, and detecting the plan's end. The
 * React layer (BaselineFlow.tsx) renders the shared practice components over it.
 *
 * Every served question still produces an engine event in mode "practice"
 * (requirement 2): the engine receives the full session, so the closing
 * diagnosis is real. The only difference from practice at the event level is
 * that `resurfaced` is always false — a baseline item is always fresh.
 */

import type { BaselinePlan } from "./plan.js";
import type { ContentItem } from "../practice/types.js";

/** A served baseline question: the plan entry's content paired with its 1-based
 * ordinal within the session. Mirrors the shape the shared feedback derivation
 * (practice/machine.ts buildFeedback) consumes — it only needs the ContentItem. */
export interface ServedBaselineQuestion {
  /** The content the shared QuestionScreen / FeedbackScreen render. */
  readonly content: ContentItem;
  /** Ordinal within the baseline session, 1-based. */
  readonly ordinal: number;
  /** Total questions in this baseline plan (for "Question X of N"). */
  readonly total: number;
}

/**
 * Serve the question at `cursor` (0-based) in the plan, or null when the plan is
 * exhausted. Skips any plan item the content map lacks (a defensive guard; the
 * plan is built against the same content predicate, so this should not happen
 * for a well-formed pack) by advancing to the next present item.
 */
export function serveAt(
  plan: BaselinePlan,
  content: ReadonlyMap<string, ContentItem>,
  cursor: number,
): ServedBaselineQuestion | null {
  const total = plan.items.length;
  let i = cursor;
  while (i < total) {
    const entry = plan.items[i]!;
    const c = content.get(entry.itemId);
    if (c !== undefined) {
      return { content: c, ordinal: i + 1, total };
    }
    i++;
  }
  return null;
}

/** The next cursor after answering the question served at `cursor`. */
export function advanceCursor(cursor: number): number {
  return cursor + 1;
}

/** True when the cursor has walked past the end of the plan. */
export function isBaselineComplete(plan: BaselinePlan, cursor: number): boolean {
  return cursor >= plan.items.length;
}
