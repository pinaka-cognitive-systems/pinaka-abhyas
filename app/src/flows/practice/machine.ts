/**
 * Practice-loop state machine (W5-5 flow a).
 *
 * All flow LOGIC lives here as pure functions, never inline in JSX (task
 * requirement 5): selecting what to serve next, recording an answer, deriving
 * the feedback panel, and detecting the session boundary. The React component
 * (PracticeFlow.tsx) is a thin renderer over this state plus the side effects
 * (storage append, engine rebuild, clock, uuid) it cannot avoid.
 *
 * SERVING POLICY. The screen serves whatever the engine's `nextAction` names
 * (SPEC 5): remediation, budgeted review, learnable practice, or coverage, with
 * its marks-framed reason rendered verbatim. When the engine returns `none`
 * (nothing in its tiers is selectable — common on a fresh log against the real
 * pack, whose items are tagged at a deeper leaf than the blueprint family node,
 * see app/tests/engine/demo.test.ts), the loop does NOT die: it falls back to
 * the next unseen, selectable bank item in id order, with an honest fallback
 * reason. The engine drives the loop whenever it has an opinion; the fallback
 * only keeps a fresh student practising when the engine's tiers are empty.
 *
 * SESSION BOUNDARY. A practice session is bounded to `sessionLength` answered
 * questions (engine default DEFAULT_SESSION_LENGTH). The summary closes the loop
 * with what was practised and the engine's honest readiness line.
 */

import {
  EMPTY_SESSION,
  isSelectable,
  recordServed,
  type Bank,
  type EngineState,
  type NextAction,
  type SessionProgress,
} from "@pinaka/engine";
import type { LoadedPack } from "../../engine/pack.js";
import type { ContentItem, ExplanationSections } from "./types.js";
import { DEFAULT_SESSION_LENGTH, nextAction } from "../../engine/selectors.js";

/** A served question: the engine's action (for the reason + resurfaced flag)
 * paired with the screen content to render. */
export interface ServedQuestion {
  /** The engine action that selected this item (or the fallback, see `fromEngine`). */
  readonly action: NextAction;
  /** The content the screen renders. */
  readonly content: ContentItem;
  /** True when the engine's own tiers chose this item; false for the
   * fresh-student fallback. Drives the event `resurfaced` flag together with
   * the action kind. */
  readonly fromEngine: boolean;
  /** Ordinal of this question within the session, 1-based. */
  readonly ordinal: number;
}

/** Whether a served item should be stamped `resurfaced` on its event: only the
 * engine's review/remediation tiers resurface a past item. */
export function isResurfaced(q: ServedQuestion): boolean {
  return q.fromEngine && (q.action.kind === "review" || q.action.kind === "remediate");
}

/**
 * Choose the next question to serve, given the rebuilt engine state, the loaded
 * pack, the screen-content map, the read clock, and the per-session progress.
 *
 * Returns null when there is genuinely nothing left to serve (engine says
 * `none` AND every selectable item has been served this session) — the caller
 * ends the session.
 */
export function selectQuestion(
  state: EngineState,
  pack: LoadedPack,
  content: ReadonlyMap<string, ContentItem>,
  nowMs: number,
  session: SessionProgress,
  sessionLength: number,
): ServedQuestion | null {
  const ordinal = session.served + 1;
  const action = nextAction(state, pack, nowMs, sessionLength, session);

  if (action.kind !== "none" && action.itemId !== null) {
    const c = content.get(action.itemId);
    if (c !== undefined) {
      return { action, content: c, fromEngine: true, ordinal };
    }
    // The engine named an item we have no content for (should not happen for a
    // well-formed pack); fall through to the fallback rather than render blank.
  }

  // Fallback: the next unseen, selectable item in id order.
  const fallbackId = firstUnseenSelectable(pack.bank, content, session);
  if (fallbackId === null) return null;
  const c = content.get(fallbackId)!;
  return {
    action: {
      kind: "coverage",
      itemId: fallbackId,
      nodeId: c.tests[0] ?? null,
      reason:
        "A fresh question to build coverage. The diagnosis sharpens as you " +
        "answer; there is not yet enough history to target one weakness.",
    },
    content: c,
    fromEngine: false,
    ordinal,
  };
}

/** The first bank item, by id order, that is selectable, has screen content, and
 * has not been served this session. */
function firstUnseenSelectable(
  bank: Bank,
  content: ReadonlyMap<string, ContentItem>,
  session: SessionProgress,
): string | null {
  const ids = [...bank.keys()].sort();
  for (const id of ids) {
    if (session.servedItems.has(id)) continue;
    const item = bank.get(id);
    if (item === undefined || !isSelectable(item)) continue;
    if (!content.has(id)) continue;
    return id;
  }
  return null;
}

/** Record that a question was served, advancing the session bookkeeping. The
 * engine's `recordServed` threads the review budget; we add the item id so the
 * fallback never re-serves within a session. */
export function advanceSession(
  session: SessionProgress,
  q: ServedQuestion,
): SessionProgress {
  // recordServed bumps served/reviewsServed and adds the action's item to
  // servedItems. For the fallback (a synthetic coverage action) it still
  // records the item id, which is exactly what we need.
  return recordServed(session, q.action);
}

/** True when the session has reached its bound (enough answered) and should
 * close to the summary. */
export function isSessionComplete(answered: number, sessionLength: number): boolean {
  return answered >= sessionLength;
}

/** The default session length the practice loop serves. */
export const SESSION_LENGTH = DEFAULT_SESSION_LENGTH;

export { EMPTY_SESSION };
export type { SessionProgress };

// ---------------------------------------------------------------------------
// Feedback derivation (pure).
// ---------------------------------------------------------------------------

/** A per-option entry for the feedback panel: the option key, its rationale
 * text (for all options), and the misconception id for wrong choices. */
export interface FeedbackOptionEntry {
  readonly optionKey: number;
  readonly rationale: string;
  readonly misconception?: string;
}

/** The data the feedback panel renders, derived from the item, the response,
 * and the scored outcome. No JSX, no engine call — just the strings. */
export interface FeedbackView {
  readonly correct: boolean;
  /** The correct option key (single_best) for highlighting, or null. */
  readonly correctKey: number | null;
  /** The chosen option key (single_best), or null for numeric. */
  readonly chosenKey: number | null;
  /** Second-person misconception line for a wrong answer, or null. Sourced from
   * the chosen option's rationale; never scolding (the rationale text is the
   * approved second-person explanation). */
  readonly misconceptionLine: string | null;
  /** Worked explanation steps, split from the item's explanation. */
  readonly steps: readonly string[];
  /** The marks-framed line summarising the outcome. */
  readonly outcomeLine: string;
  /** Structured teaching sections (ADR 0017). Absent when the pack item does
   * not carry them; the feedback screen degrades to its pre-sections layout. */
  readonly sections?: ExplanationSections;
  /** Rationale for every option, so reveal 01 can show all diagnoses.
   * Populated from per_option_rationale; empty array when none present. */
  readonly optionEntries: readonly FeedbackOptionEntry[];
}

/**
 * Split an explanation into steps. The pack stores `explanation` as prose;
 * split on sentence boundaries so the panel can render numbered working without
 * the pack needing a separate steps array. A single-sentence explanation
 * becomes one step. Plain text only (ADR 0015): no HTML, no markdown.
 */
export function explanationSteps(explanation: string): string[] {
  const trimmed = explanation.trim();
  if (trimmed.length === 0) return [];
  return trimmed
    .split(/(?<=[.;])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Derive the feedback view for a single_best or numeric answer. `chosenKey`
 * is the selected option key (single_best) or null (numeric). */
export function buildFeedback(
  item: ContentItem,
  args: { readonly correct: boolean; readonly chosenKey: number | null },
): FeedbackView {
  const correctKey = item.answer_key.correct ?? null;
  let misconceptionLine: string | null = null;
  if (!args.correct && args.chosenKey !== null) {
    const chosen = item.per_option_rationale.find((r) => r.option_key === args.chosenKey);
    misconceptionLine = chosen?.rationale ?? null;
  }
  const outcomeLine = args.correct
    ? "Correct. One mark banked."
    : correctKey !== null && item.item_type === "single_best"
      ? `Not correct. The answer was option ${correctKey}. A wrong answer costs a quarter mark on the paper, so the habit to build is to skip when unsure.`
      : "Not correct. A wrong answer costs a quarter mark on the paper, so the habit to build is to skip when unsure.";

  // Build per-option entries so the feedback panel can show every option's
  // rationale inside reveal 01, not just the chosen wrong option's misconception.
  // exactOptionalPropertyTypes: omit the optional key when absent rather than
  // assigning undefined, which the strict mode rejects.
  const optionEntries: FeedbackOptionEntry[] = item.per_option_rationale.map((r) =>
    r.misconception !== undefined
      ? { optionKey: r.option_key, rationale: r.rationale, misconception: r.misconception }
      : { optionKey: r.option_key, rationale: r.rationale },
  );

  // Omit optional fields when absent (exactOptionalPropertyTypes strict mode).
  const base = {
    correct: args.correct,
    correctKey,
    chosenKey: args.chosenKey,
    misconceptionLine,
    steps: explanationSteps(item.explanation),
    outcomeLine,
    optionEntries,
  };
  return item.explanationSections !== undefined
    ? { ...base, sections: item.explanationSections }
    : base;
}
