/**
 * Mock submission scoring + event batch (W5-7).
 *
 * On submit, every question on the paper becomes one uqs-event-2 event with
 * mode "mock": answered questions are scored against the key, skipped questions
 * become skipped events (recorded so the engine and the breakdown both see the
 * full paper, not just the attempted part). The whole batch is appended in one
 * write (the caller's job); this module builds the batch and the score reveal
 * purely.
 *
 * SCORING. Net marks under negative marking (marking.json): +marksPerCorrect for
 * a correct answer, -negativePerWrong for a wrong one, marksPerUnattempted for a
 * skip (zero on this paper). The per-part breakdown groups by the blueprint part
 * an item's family belongs to, and the wrong answers list carries each item's
 * named misconception so the breakdown can show where the marks went.
 *
 * Mocks are MEASUREMENT, not practice: mode "mock" events update mastery but
 * never create or advance item schedules (engine SPEC 4), and they anchor the
 * readiness estimate (SPEC 6). This module does not touch schedules; it only
 * emits the events and the score, and the engine does the rest on replay.
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
import type { ScaledMarking } from "./assembler.js";

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
          mode: "mock",
        }),
      );
    } else {
      // Skipped: a recorded mock event, correct=false, no misconception, raw
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
        mode: "mock",
        correct: false,
        selected_misconception: null,
        response: { skipped: true },
        time_ms: timeMs,
        resurfaced: false,
        device_context: { form_factor: session.formFactor, viewport_width: session.viewportWidth },
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
