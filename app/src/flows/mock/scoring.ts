/**
 * Mock submission scoring + event batch (W5-7).
 *
 * On submit, every question on the paper becomes one uqs-event-2 event. For a
 * standard mock the mode is "mock" (anchors readiness, SPEC 6). For hard and
 * pace mocks the mode is "drill" so the engine keeps them out of readiness
 * anchoring while mastery still learns from them (Handout §10: "only standard
 * mocks feed readiness"; the drill mode ensures the engine treats these as
 * practice, not measurement). Device context records the mock_type so telemetry
 * can distinguish them. — RULING 2026-06-12.
 *
 * SCORING. Net marks under negative marking (marking.json): +marksPerCorrect for
 * a correct answer, -negativePerWrong for a wrong one, marksPerUnattempted for a
 * skip (zero on this paper). The per-part breakdown groups by the blueprint part
 * an item's family belongs to, and the wrong answers list carries each item's
 * named misconception so the breakdown can show where the marks went.
 *
 * Pure and DOM-free: the event ids and the occurredAt clock are parameters
 * (SPEC 9). The event construction reuses the practice flow's buildEvent /
 * scoreResponse so there is exactly one place an answer becomes an event and one
 * place the answer key is consulted (see event.ts).
 */

import type { Event } from "@pinaka/engine";
import { buildEvent, scoreResponse, type Response } from "../practice/event.js";
import type { ContentItem } from "../practice/types.js";
import type { MockSession } from "./state.js";
import type { MockAssemblyType, ScaledMarking } from "./assembler.js";

/** The blueprint family attribution helper, mirrored from the assembler: an
 * item belongs to the first family whose node id its tests match. Kept here so
 * the breakdown groups answers by part exactly as the paper was drawn. */
export interface FamilyRef {
  readonly partId: string;
  readonly nodeId: string;
}

/** Resolve the blueprint family (and thus part) an item belongs to, by the same
 * equal-or-dot-descendant rule the assembler uses. Null when none claims it. */
export function partOfItem(item: ContentItem, families: readonly FamilyRef[]): string | null {
  for (const fam of families) {
    for (const t of item.tests) {
      if (t === fam.nodeId || t.startsWith(fam.nodeId + ".")) return fam.partId;
    }
  }
  return null;
}

/** Per-boundary input the React layer measures (event ids + clock). One id per
 * question on the paper, in paper order, so every event is uniquely keyed. */
export interface SubmissionInputs {
  /** crypto.randomUUID() per question, paper order; length === order.length. */
  readonly eventIds: readonly string[];
  /** Date.now() at submit, epoch ms. All mock events share this occurredAt so
   * they group into one mock day for readiness anchoring (SPEC 6). */
  readonly occurredAtMs: number;
}

/**
 * Build the full event batch for a submitted mock: one event per question in
 * paper order. Answered questions carry their selected option; skipped questions
 * are recorded as skipped events.
 *
 * SKIPPED EVENTS. A skip on the paper is a real, recorded fact (the student saw
 * the question and left it blank), so it becomes an event with mode "mock",
 * correct=false, and no selected misconception — distinct from a wrong answer.
 * We model the raw response as `{ skipped: true }` so a later re-key never
 * mistakes a skip for an attempt, and we mark it correct=false with no
 * misconception. The engine treats it as a seen-but-unscored mock event; the
 * scorer below counts it as a skip (marksPerUnattempted), never a wrong answer.
 */
export interface MockEventBatch {
  readonly events: readonly Event[];
  /** item id -> whether that question was answered (vs skipped). */
  readonly answeredFlags: ReadonlyMap<string, boolean>;
}

export function buildSubmissionBatch(
  session: MockSession,
  content: ReadonlyMap<string, ContentItem>,
  inputs: SubmissionInputs,
): MockEventBatch {
  const events: Event[] = [];
  const answeredFlags = new Map<string, boolean>();

  // Handout §10 ruling: standard mocks use mode "mock" (anchor readiness);
  // hard and pace mocks use mode "drill" (mastery learns, readiness does not
  // anchor). Device context records mock_type for telemetry.
  const mockType: MockAssemblyType = session.mockType ?? "standard";
  const eventMode: Event["mode"] = mockType === "standard" ? "mock" : "drill";

  session.order.forEach((itemId, i) => {
    const item = content.get(itemId);
    if (item === undefined) return; // a paper item with no content: cannot score, skip emitting.
    const eventId = inputs.eventIds[i] ?? `${session.id}-${i}`;
    const answer = session.answers[itemId];
    const timeMs = answer?.timeMs ?? 0;

    if (answer !== undefined) {
      answeredFlags.set(itemId, true);
      const response: Response = { kind: "single_best", selected_option: answer.selectedOption };
      events.push(
        buildEvent(item, response, {
          eventId,
          occurredAtMs: inputs.occurredAtMs,
          timeMs,
          viewportWidth: session.viewportWidth,
          resurfaced: false,
          mode: eventMode,
        }),
      );
    } else {
      // Skipped: a recorded event, correct=false, no misconception, raw
      // response flagged as a skip so a re-key never re-scores it as an attempt.
      answeredFlags.set(itemId, false);
      events.push({
        event_id: eventId,
        occurredAtMs: inputs.occurredAtMs,
        item_id: item.id,
        item_content_hash: item.content_hash,
        taxonomy_version: item.taxonomy_version,
        tests: [...item.tests],
        difficulty_label: item.difficulty_label,
        item_type: item.item_type,
        mode: eventMode,
        correct: false,
        selected_misconception: null,
        response: { skipped: true },
        time_ms: timeMs,
        resurfaced: false,
        device_context: {
          form_factor: session.formFactor,
          viewport_width: session.viewportWidth,
          mock_type: mockType,
        },
      });
    }
  });

  return { events, answeredFlags };
}

// ---------------------------------------------------------------------------
// Score reveal + breakdown (pure derivation from the session and content).
// ---------------------------------------------------------------------------

/** One wrong answer in the breakdown: the item, the chosen and correct options,
 * and the named misconception (if the chosen distractor maps one). */
export interface WrongAnswer {
  readonly itemId: string;
  readonly partId: string | null;
  /** The node leaf the item exercises (first test), for context. */
  readonly nodeId: string | null;
  readonly chosenOption: number;
  readonly correctOption: number | null;
  /** The misconception id the chosen distractor targets, or null. */
  readonly misconception: string | null;
}

/** Marks by blueprint part: correct/wrong/skipped counts and net marks. */
export interface PartBreakdown {
  readonly partId: string;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  /** Net marks earned in this part under negative marking. */
  readonly net: number;
}

/** The score reveal: the headline net marks under negative marking, the counts,
 * the pass-bar comparison, and the per-part / wrong-answer breakdown. */
export interface MockScore {
  /** Net marks under negative marking, two-decimal granular. */
  readonly net: number;
  /** Max marks on this (scaled) mock. */
  readonly maxMarks: number;
  /** Questions answered correctly. */
  readonly correct: number;
  /** Questions answered wrongly. */
  readonly wrong: number;
  /** Questions skipped (seen, left blank). */
  readonly skipped: number;
  /** Total questions on the paper. */
  readonly total: number;
  /** Marks lost purely to the negative-marking penalty (wrong * negativePerWrong). */
  readonly penalty: number;
  /** The scaled pass bar for this mock. */
  readonly passMark: number;
  /** net - passMark; positive means cleared. Two-decimal granular. */
  readonly distanceToPass: number;
  /** True when net >= passMark. */
  readonly cleared: boolean;
  /** Per-part breakdown, blueprint order. */
  readonly parts: readonly PartBreakdown[];
  /** Wrong answers with their misconceptions, paper order. */
  readonly wrongAnswers: readonly WrongAnswer[];
}

/** Round to two decimals (marks are quarter-mark granular). */
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ---------------------------------------------------------------------------
// Waterfall: how maxMarks became net.
// ---------------------------------------------------------------------------

/** One column in the marks waterfall. */
export interface WaterfallColumn {
  /** Column identifier. */
  readonly id: "full" | "blank" | "wrong" | "penalty" | "net";
  /** Human label. */
  readonly label: string;
  /** The marks value this column represents (raw, may be negative for penalty). */
  readonly value: number;
  /** Height of this column as a fraction of maxMarks (0..1), used for CSS height. */
  readonly heightRatio: number;
  /** Display value string, e.g. "+51.00" or "-7.75". */
  readonly display: string;
  /** True when this column is the final net (used for pass-bar styling). */
  readonly isNet: boolean;
}

/** The full waterfall model derived from a MockScore. Pure. */
export interface WaterfallModel {
  readonly columns: readonly WaterfallColumn[];
  /** Pass bar as a fraction of maxMarks (0..1). */
  readonly passBarRatio: number;
  /** Prose aria-label that narrates the same numbers for screen readers. */
  readonly ariaLabel: string;
}

/**
 * Derive the marks waterfall model from a MockScore.
 *
 * Columns: full marks, minus blank (skipped) marks, minus wrong marks (the
 * forgone correct marks), minus penalty (the negative-marking deduction),
 * equals net. Each column's heightRatio is its absolute mark value as a
 * fraction of maxMarks so CSS can size the bar proportionally.
 */
export function waterfall(score: MockScore): WaterfallModel {
  const mpc = score.maxMarks / score.total; // marks per correct question
  const fullMarks = score.maxMarks;
  const blankLost = round2(score.skipped * mpc);
  const wrongLost = round2(score.wrong * mpc);
  const penaltyLost = score.penalty;
  const net = score.net;

  function col(
    id: WaterfallColumn["id"],
    label: string,
    value: number,
    sign: "+" | "-" | "",
    isNet: boolean,
  ): WaterfallColumn {
    const abs = Math.abs(value);
    const display = sign === "" ? value.toFixed(2) : `${sign}${abs.toFixed(2)}`;
    return { id, label, value: abs, heightRatio: Math.max(0, abs / fullMarks), display, isNet };
  }

  const columns: WaterfallColumn[] = [
    col("full",    "Full marks",  fullMarks,   "+", false),
    col("blank",   "Blank",       blankLost,   "-", false),
    col("wrong",   "Wrong",       wrongLost,   "-", false),
    col("penalty", "Penalty",     penaltyLost, "-", false),
    col("net",     "Net",         Math.max(0, net), "",  true),
  ];

  const ariaLabel =
    `Marks waterfall: ${fullMarks} full marks, minus ${blankLost} for ${score.skipped} blank, ` +
    `minus ${wrongLost} for ${score.wrong} wrong, minus ${penaltyLost} penalty, equals ` +
    `${net.toFixed(2)} net. Pass bar is at ${score.passMark}.`;

  return {
    columns,
    passBarRatio: Math.min(1, score.passMark / fullMarks),
    ariaLabel,
  };
}

// ---------------------------------------------------------------------------
// Misconceptions by share.
// ---------------------------------------------------------------------------

/** One row in the misconceptions-by-share table. */
export interface MisconceptionRow {
  /** Raw misconception id. */
  readonly id: string;
  /** Number of wrong answers tied to this misconception. */
  readonly count: number;
  /**
   * Lost marks: count * (marksPerCorrect + negativePerWrong).
   *
   * Semantics (mirrored from design-team/v2/mockbreakdown.jsx MisBreakdown):
   * The design's "lost" column totals both the mark that was not earned AND
   * the penalty deducted. For each wrong answer attributed to this
   * misconception, the full cost is one forgone correct mark plus the negative
   * penalty: count * (marksPerCorrect + negativePerWrong). At 1 mark correct
   * and 0.25 penalty, a 5-question misconception shows "lost 6.25", which
   * exactly matches the design's sample data. This combined figure is what a
   * student could have recovered had every wrong answer been left blank instead.
   */
  readonly lostMarks: number;
  /** Share as a fraction of the highest lostMarks in the table (0..1). */
  readonly shareRatio: number;
}

/**
 * Aggregate wrongAnswers by misconception id, sorted by lostMarks descending.
 * Items with no misconception (null) are omitted.
 *
 * @param wrongAnswers  the wrongAnswers array from a MockScore.
 * @param marking       the scaled marking scheme for this mock.
 */
export function misconceptionsByShare(
  wrongAnswers: readonly WrongAnswer[],
  marking: Pick<ScaledMarking, "marksPerCorrect" | "negativePerWrong">,
): readonly MisconceptionRow[] {
  const counts = new Map<string, number>();
  for (const w of wrongAnswers) {
    if (w.misconception === null) continue;
    counts.set(w.misconception, (counts.get(w.misconception) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const costPerWrong = marking.marksPerCorrect + marking.negativePerWrong;
  const rows: MisconceptionRow[] = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    count,
    lostMarks: round2(count * costPerWrong),
    shareRatio: 0,
  }));
  rows.sort((a, b) => b.lostMarks - a.lostMarks);

  const maxLost = rows[0]?.lostMarks ?? 0;
  return rows.map((r) => ({ ...r, shareRatio: maxLost > 0 ? r.lostMarks / maxLost : 0 }));
}

// ---------------------------------------------------------------------------
// Insight box.
// ---------------------------------------------------------------------------

/** The derived insight paragraph. */
export interface InsightModel {
  readonly text: string;
}

/**
 * Derive one insight from the mock data.
 *
 * Logic (mirrored from design-team/v2/mockbreakdown.jsx InsightClose):
 * If the total negative-marking penalty exceeds the lost marks of the top
 * single misconception, the insight calls that out. Otherwise it names the
 * top misconception with its display name and count.
 *
 * @param score    the full mock score.
 * @param rows     the result of misconceptionsByShare (sorted, resolved).
 * @param topName  the display name for rows[0].id (or null when the table is
 *                 empty or the name is not yet resolved).
 */
export function insightText(
  score: MockScore,
  rows: readonly MisconceptionRow[],
  topName: string | null,
): InsightModel {
  if (score.wrong === 0) {
    return { text: `You answered every question you attempted correctly. The blank questions cost ${score.skipped} marks.` };
  }

  const top = rows[0];
  if (top === undefined || score.penalty > top.lostMarks) {
    return {
      text:
        `You lost more to negative marking than to any single misconception. ` +
        `${score.wrong} of your wrong answers cost ${score.penalty.toFixed(2)} marks in total.`,
    };
  }

  const name = topName ?? top.id;
  return {
    text:
      `${name} cost you the most: ${top.count} ${top.count === 1 ? "question" : "questions"}, ` +
      `${top.lostMarks.toFixed(2)} marks lost.`,
  };
}

/**
 * Score a submitted mock: net marks under negative marking, the counts, and the
 * per-part and per-misconception breakdown. Pure; reads the same answer key as
 * the event batch via scoreResponse, so the score and the events can never
 * disagree.
 *
 * @param session   the submitted mock.
 * @param content   the screen content map (for keys, options, misconceptions).
 * @param marking   the scaled marking scheme for this mock.
 * @param families  blueprint families in part order (for part attribution).
 */
export function scoreMock(
  session: MockSession,
  content: ReadonlyMap<string, ContentItem>,
  marking: ScaledMarking,
  families: readonly FamilyRef[],
): MockScore {
  const partOrder: string[] = [];
  const partRows = new Map<string, { correct: number; wrong: number; skipped: number; net: number }>();
  const ensurePart = (partId: string): { correct: number; wrong: number; skipped: number; net: number } => {
    let row = partRows.get(partId);
    if (row === undefined) {
      row = { correct: 0, wrong: 0, skipped: 0, net: 0 };
      partRows.set(partId, row);
      partOrder.push(partId);
    }
    return row;
  };

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let net = 0;
  const wrongAnswers: WrongAnswer[] = [];

  for (const itemId of session.order) {
    const item = content.get(itemId);
    if (item === undefined) continue;
    const partId = partOfItem(item, families);
    const row = partId !== null ? ensurePart(partId) : null;
    const answer = session.answers[itemId];

    if (answer === undefined) {
      skipped += 1;
      net += marking.marksPerUnattempted;
      if (row !== null) {
        row.skipped += 1;
        row.net += marking.marksPerUnattempted;
      }
      continue;
    }

    const scored = scoreResponse(item, { kind: "single_best", selected_option: answer.selectedOption });
    if (scored.correct) {
      correct += 1;
      net += marking.marksPerCorrect;
      if (row !== null) {
        row.correct += 1;
        row.net += marking.marksPerCorrect;
      }
    } else {
      wrong += 1;
      net -= marking.negativePerWrong;
      if (row !== null) {
        row.wrong += 1;
        row.net -= marking.negativePerWrong;
      }
      wrongAnswers.push({
        itemId,
        partId,
        nodeId: item.tests[0] ?? null,
        chosenOption: answer.selectedOption,
        correctOption: item.answer_key.correct ?? null,
        misconception: scored.selected_misconception,
      });
    }
  }

  const parts: PartBreakdown[] = partOrder.map((partId) => {
    const row = partRows.get(partId)!;
    return {
      partId,
      correct: row.correct,
      wrong: row.wrong,
      skipped: row.skipped,
      net: round2(row.net),
    };
  });

  const netRounded = round2(net);
  return {
    net: netRounded,
    maxMarks: marking.maxMarks,
    correct,
    wrong,
    skipped,
    total: session.order.length,
    penalty: round2(wrong * marking.negativePerWrong),
    passMark: marking.passMark,
    distanceToPass: round2(netRounded - marking.passMark),
    cleared: netRounded >= marking.passMark,
    parts,
    wrongAnswers,
  };
}
