/**
 * reviewFilter.ts — pure filter and pacing logic for the mock review phase.
 *
 * No DOM, no React. All inputs are plain values so tests run without jsdom.
 *
 * FILTER MEMBERSHIP. Six filter ids mirror the design tab row
 * (design-team/v2/scr-review-mock.jsx:25-32):
 *   toReview  wrong + skipped (the default)
 *   wrong     answered with the wrong option
 *   skipped   no answer recorded
 *   correct   answered correctly
 *   marked    flagged by the student during the hall
 *   all       every question on the paper
 *
 * The time verdict (speed x correctness, six labels) lives in
 * engine/insights.ts timeVerdict — one implementation, design-verbatim.
 */

import type { MockSession, MockAnswer } from "./state.js";
import type { MockScore } from "./scoring.js";
import type { ContentItem } from "../practice/types.js";

// ---------------------------------------------------------------------------
// Outcome and filter types.
// ---------------------------------------------------------------------------

/** The resolved outcome for one question in the review. */
export type ReviewOutcome = "correct" | "wrong" | "skipped";

/** Filter id matching the tab row. */
export type ReviewFilterId = "toReview" | "wrong" | "skipped" | "correct" | "marked" | "all";


/** The flattened record for one question used by the navigator and detail pane. */
export interface ReviewEntry {
  /** 1-based display number (index in order + 1). */
  readonly num: number;
  /** Item id. */
  readonly itemId: string;
  /** Outcome from scoring or session data. */
  readonly outcome: ReviewOutcome;
  /** True if the student flagged this question in the hall. */
  readonly marked: boolean;
  /** Selected option key, or null for skipped. */
  readonly yourPick: number | null;
  /** Correct option key, or null if not determinable. */
  readonly correctKey: number | null;
  /** Active milliseconds from the session answer, or 0 for skipped. */
  readonly timeMs: number;
  /** Authored expected seconds from the item. */
  readonly expectedSeconds: number;
}

// ---------------------------------------------------------------------------
// Build the full entry list from session + score + content.
// ---------------------------------------------------------------------------

/**
 * Build the flat ordered list of ReviewEntry for the whole paper.
 *
 * We resolve outcome by checking:
 *   answered + correct -> "correct"
 *   answered + wrong   -> "wrong"
 *   not answered       -> "skipped"
 *
 * The wrongAnswers set in MockScore gives us the itemIds that were answered
 * incorrectly; anything answered but not in that set is correct.
 */
export function buildReviewEntries(
  session: MockSession,
  score: MockScore,
  content: ReadonlyMap<string, ContentItem>,
): readonly ReviewEntry[] {
  const wrongIds = new Set(score.wrongAnswers.map((w) => w.itemId));
  const flaggedSet = new Set(session.flagged);

  return session.order.map((itemId, i) => {
    const answer: MockAnswer | undefined = session.answers[itemId];
    const item = content.get(itemId);

    let outcome: ReviewOutcome;
    if (answer === undefined) {
      outcome = "skipped";
    } else if (wrongIds.has(itemId)) {
      outcome = "wrong";
    } else {
      outcome = "correct";
    }

    return {
      num: i + 1,
      itemId,
      outcome,
      marked: flaggedSet.has(itemId),
      yourPick: answer?.selectedOption ?? null,
      correctKey: item?.answer_key.correct ?? null,
      timeMs: answer?.timeMs ?? 0,
      expectedSeconds: item?.expected_seconds ?? 90,
    };
  });
}

// ---------------------------------------------------------------------------
// Filter membership.
// ---------------------------------------------------------------------------

/** True when entry passes the given filter. */
export function passesFilter(entry: ReviewEntry, filterId: ReviewFilterId): boolean {
  switch (filterId) {
    case "toReview":
      return entry.outcome !== "correct";
    case "wrong":
      return entry.outcome === "wrong";
    case "skipped":
      return entry.outcome === "skipped";
    case "correct":
      return entry.outcome === "correct";
    case "marked":
      return entry.marked;
    case "all":
      return true;
  }
}

/** Filter a list to only entries matching the filter id. */
export function applyFilter(
  entries: readonly ReviewEntry[],
  filterId: ReviewFilterId,
): readonly ReviewEntry[] {
  return entries.filter((e) => passesFilter(e, filterId));
}

// ---------------------------------------------------------------------------
// Filter counts.
// ---------------------------------------------------------------------------

/** Counts per filter tab, derived from the full entry list once. */
export interface FilterCounts {
  readonly toReview: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly correct: number;
  readonly marked: number;
  readonly all: number;
}

/** Derive all filter counts from the full list in one pass per filter id. */
export function buildFilterCounts(entries: readonly ReviewEntry[]): FilterCounts {
  return {
    toReview: entries.filter((e) => passesFilter(e, "toReview")).length,
    wrong: entries.filter((e) => passesFilter(e, "wrong")).length,
    skipped: entries.filter((e) => passesFilter(e, "skipped")).length,
    correct: entries.filter((e) => passesFilter(e, "correct")).length,
    marked: entries.filter((e) => passesFilter(e, "marked")).length,
    all: entries.length,
  };
}

