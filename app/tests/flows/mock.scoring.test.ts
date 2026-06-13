/**
 * Mock scoring + event-batch tests (W5-7, test requirement 6).
 *
 * DOM-free. Asserts:
 *   - scoring math against the marking scheme: net = correct - 0.25*wrong, with
 *     skipped costing nothing; the pass-bar distance and cleared flag;
 *   - per-part breakdown sums to the totals; wrong answers carry their named
 *     misconceptions;
 *   - the event batch is COMPLETE (one event per paper question) and every event
 *     is mode "mock"; answered questions are scored, skipped questions become
 *     skipped events (correct false, no misconception, raw response flagged);
 *   - the engine folds the whole batch (replay accepts it).
 */

import { describe, expect, it } from "vitest";

import { buildEngineState } from "../../src/engine/index.js";
import { buildBank } from "../../src/engine/pack.js";
import { toContentItem, type ContentItem } from "../../src/flows/practice/types.js";
import { scaleMarking, type ScaledMarking } from "../../src/flows/mock/assembler.js";
import {
  buildSubmissionBatch,
  scoreMock,
  partOfItem,
  waterfall,
  misconceptionsByShare,
  insightText,
  type FamilyRef,
  type WaterfallModel,
  type MisconceptionRow,
} from "../../src/flows/mock/scoring.js";
import type { MockSession } from "../../src/flows/mock/state.js";
import type { MarkingScheme } from "@pinaka/engine";

// --- Fixtures: three single_best items across two parts. ---
function item(id: string, node: string, correct: number, misOn2: string): ContentItem {
  return toContentItem({
    id,
    content_hash: "h".repeat(64),
    taxonomy_version: 4,
    tests: [node],
    difficulty_label: "L2",
    item_type: "single_best",
    stem: `Stem for ${id}.`,
    options: [
      { key: 1, text: "Option 1" },
      { key: 2, text: "Option 2" },
      { key: 3, text: "Option 3" },
      { key: 4, text: "Option 4" },
    ],
    answer_key: { correct },
    per_option_rationale: [
      { option_key: 2, verdict: "wrong", rationale: "A common slip.", misconception: misOn2 },
    ],
    explanation: "Worked steps.",
  });
}

const ITEMS: ContentItem[] = [
  item("q_bm", "qa.bmath.finance.simple_interest", 1, "mis.bm"),
  item("q_lr", "qa.lr.seating", 3, "mis.lr"),
  item("q_st", "qa.stats.probability.classical", 2, "mis.st"),
];
const CONTENT = new Map(ITEMS.map((c) => [c.id, c]));

const FAMILIES: FamilyRef[] = [
  { partId: "qa.bmath", nodeId: "qa.bmath.finance" },
  { partId: "qa.lr", nodeId: "qa.lr.seating" },
  { partId: "qa.stats", nodeId: "qa.stats.probability" },
];

const FULL_MARKING: MarkingScheme = {
  marksPerCorrect: 1,
  negativePerWrong: 0.25,
  marksPerUnattempted: 0,
  numQuestions: 100,
  passMark: 40,
  durationMinutes: 120,
};
// A 3-question paper scaled from the 100-question scheme.
const MARKING: ScaledMarking = scaleMarking(FULL_MARKING, 3);

const NOW = Date.UTC(2026, 5, 10, 10, 0, 0);

function session(over: Partial<MockSession> = {}): MockSession {
  return {
    id: "m1",
    seed: 1,
    order: ["q_bm", "q_lr", "q_st"],
    fullPaperSize: 100,
    budgetMs: 4 * 60_000,
    startedAtMs: NOW,
    answers: {},
    flagged: [],
    struck: {},
    activeMs: 0,
    formFactor: "phone",
    viewportWidth: 360,
    ...over,
  };
}

describe("partOfItem", () => {
  it("attributes a deep-leaf item to its blueprint part by prefix", () => {
    expect(partOfItem(ITEMS[0]!, FAMILIES)).toBe("qa.bmath");
    expect(partOfItem(ITEMS[1]!, FAMILIES)).toBe("qa.lr");
    expect(partOfItem(ITEMS[2]!, FAMILIES)).toBe("qa.stats");
  });
});

describe("scoreMock — marking math", () => {
  it("net = correct - 0.25*wrong, skipped costs nothing", () => {
    // q_bm correct (option 1), q_lr wrong (chose 2 not 3), q_st skipped.
    const s = session({ answers: { q_bm: { selectedOption: 1, timeMs: 1000 }, q_lr: { selectedOption: 2, timeMs: 1000 } } });
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    expect(score.correct).toBe(1);
    expect(score.wrong).toBe(1);
    expect(score.skipped).toBe(1);
    expect(score.net).toBe(0.75); // 1 - 0.25
    expect(score.penalty).toBe(0.25);
    expect(score.total).toBe(3);
  });

  it("an all-correct paper scores full marks and clears the bar", () => {
    const s = session({
      answers: {
        q_bm: { selectedOption: 1, timeMs: 1 },
        q_lr: { selectedOption: 3, timeMs: 1 },
        q_st: { selectedOption: 2, timeMs: 1 },
      },
    });
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    expect(score.net).toBe(3);
    expect(score.maxMarks).toBe(3);
    expect(score.cleared).toBe(true);
    expect(score.distanceToPass).toBe(3 - MARKING.passMark);
  });

  it("per-part breakdown sums to the totals", () => {
    const s = session({
      answers: {
        q_bm: { selectedOption: 1, timeMs: 1 }, // bmath correct
        q_lr: { selectedOption: 2, timeMs: 1 }, // lr wrong
        // q_st skipped (stats)
      },
    });
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const sumCorrect = score.parts.reduce((a, p) => a + p.correct, 0);
    const sumWrong = score.parts.reduce((a, p) => a + p.wrong, 0);
    const sumSkipped = score.parts.reduce((a, p) => a + p.skipped, 0);
    expect(sumCorrect).toBe(score.correct);
    expect(sumWrong).toBe(score.wrong);
    expect(sumSkipped).toBe(score.skipped);
  });

  it("lists wrong answers with their named misconception", () => {
    const s = session({ answers: { q_lr: { selectedOption: 2, timeMs: 1 } } });
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    expect(score.wrongAnswers).toHaveLength(1);
    const w = score.wrongAnswers[0]!;
    expect(w.itemId).toBe("q_lr");
    expect(w.chosenOption).toBe(2);
    expect(w.correctOption).toBe(3);
    expect(w.misconception).toBe("mis.lr");
    expect(w.partId).toBe("qa.lr");
  });
});

describe("buildSubmissionBatch — complete, mode mock, skipped events", () => {
  const s = session({
    answers: {
      q_bm: { selectedOption: 1, timeMs: 1000 }, // correct
      q_lr: { selectedOption: 2, timeMs: 2000 }, // wrong
      // q_st skipped
    },
  });
  const eventIds = ["e0", "e1", "e2"];
  const batch = buildSubmissionBatch(s, CONTENT, { eventIds, occurredAtMs: NOW });

  it("emits exactly one event per paper question", () => {
    expect(batch.events).toHaveLength(3);
  });

  it("every event is mode mock", () => {
    for (const e of batch.events) expect(e.mode).toBe("mock");
  });

  it("answered events are scored; the skipped event is a recorded skip", () => {
    const byItem = new Map(batch.events.map((e) => [e.item_id, e]));
    expect(byItem.get("q_bm")!.correct).toBe(true);
    expect(byItem.get("q_lr")!.correct).toBe(false);
    expect(byItem.get("q_lr")!.selected_misconception).toBe("mis.lr");
    const skip = byItem.get("q_st")!;
    expect(skip.correct).toBe(false);
    expect(skip.selected_misconception).toBeNull();
    expect(skip.response).toEqual({ skipped: true });
    expect(batch.answeredFlags.get("q_st")).toBe(false);
    expect(batch.answeredFlags.get("q_bm")).toBe(true);
  });

  it("every event carries the device context and the mock_type (ADR 0018 ruling 11)", () => {
    for (const e of batch.events) {
      // Answered events go through buildEvent with mockType set; skipped
      // events are built inline. Both record form factor, viewport, and the
      // mock type for telemetry.
      const ctx = e.device_context as Record<string, unknown>;
      expect(ctx["form_factor"]).toBe("phone");
      expect(ctx["viewport_width"]).toBe(360);
      expect(ctx["mock_type"]).toBe("standard");
    }
  });

  it("the engine folds the whole batch (replay counts every event)", () => {
    const bank = buildBank({ items: ITEMS.map((c) => ({
      id: c.id,
      tests: c.tests,
      difficulty_label: c.difficulty_label,
      item_type: c.item_type,
      expected_seconds: 60,
      verification_status: "verified",
    })) });
    const state = buildEngineState(batch.events, bank, NOW);
    expect(state.eventCount).toBe(3);
    // Mock answers are real reviews (ADR 0020, engine SPEC 4): all three
    // items enter the spaced system. The skip is correct=false, so it
    // schedules as a lapse — it cost marks, and resurfacing it is the point
    // (drill-mode mocks already behaved this way).
    expect(state.schedules.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// waterfall
// ---------------------------------------------------------------------------

describe("waterfall", () => {
  const s = session({
    answers: {
      q_bm: { selectedOption: 1, timeMs: 1000 }, // correct
      q_lr: { selectedOption: 2, timeMs: 1000 }, // wrong
      // q_st skipped
    },
  });
  let wf: WaterfallModel;

  it("produces five columns in order", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    wf = waterfall(score);
    const ids = wf.columns.map((c) => c.id);
    expect(ids).toEqual(["full", "blank", "wrong", "penalty", "net"]);
  });

  it("full column value equals maxMarks", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    expect(w.columns[0]!.value).toBe(score.maxMarks);
  });

  it("blank column value equals skipped * (maxMarks / total)", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    const expected = Math.round(score.skipped * (score.maxMarks / score.total) * 100) / 100;
    expect(w.columns[1]!.value).toBe(expected);
  });

  it("net column value equals score.net clamped to 0", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    expect(w.columns[4]!.value).toBe(Math.max(0, score.net));
    expect(w.columns[4]!.isNet).toBe(true);
  });

  it("passBarRatio equals passMark / maxMarks", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    expect(w.passBarRatio).toBeCloseTo(score.passMark / score.maxMarks, 10);
  });

  it("ariaLabel mentions all the key numbers", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    expect(w.ariaLabel).toContain(String(score.maxMarks));
    expect(w.ariaLabel).toContain(String(score.net.toFixed(2)));
    expect(w.ariaLabel).toContain(String(score.passMark));
  });

  it("heightRatio is always 0..1", () => {
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const w = waterfall(score);
    for (const col of w.columns) {
      expect(col.heightRatio).toBeGreaterThanOrEqual(0);
      expect(col.heightRatio).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// misconceptionsByShare
// ---------------------------------------------------------------------------

describe("misconceptionsByShare", () => {
  const marking = { marksPerCorrect: 1, negativePerWrong: 0.25 };

  it("returns an empty array when there are no wrong answers", () => {
    expect(misconceptionsByShare([], marking)).toHaveLength(0);
  });

  it("omits wrong answers with no misconception", () => {
    const noMis = [{ itemId: "x", partId: null, nodeId: null, chosenOption: 2, correctOption: 1, misconception: null }];
    expect(misconceptionsByShare(noMis, marking)).toHaveLength(0);
  });

  it("aggregates by misconception id and sorts by lostMarks descending", () => {
    const answers = [
      { itemId: "a1", partId: null, nodeId: null, chosenOption: 2, correctOption: 1, misconception: "mis.a" },
      { itemId: "a2", partId: null, nodeId: null, chosenOption: 2, correctOption: 1, misconception: "mis.a" },
      { itemId: "b1", partId: null, nodeId: null, chosenOption: 2, correctOption: 1, misconception: "mis.b" },
    ];
    const rows = misconceptionsByShare(answers, marking) as MisconceptionRow[];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe("mis.a");
    expect(rows[0]!.count).toBe(2);
    // lostMarks = 2 * (1 + 0.25) = 2.5
    expect(rows[0]!.lostMarks).toBe(2.5);
    expect(rows[1]!.id).toBe("mis.b");
    expect(rows[1]!.lostMarks).toBe(1.25);
  });

  it("shareRatio of the top row is 1.0", () => {
    const answers = [
      { itemId: "a1", partId: null, nodeId: null, chosenOption: 2, correctOption: 1, misconception: "mis.a" },
    ];
    const rows = misconceptionsByShare(answers, marking);
    expect(rows[0]!.shareRatio).toBe(1);
  });

  it("lostMarks = count * (marksPerCorrect + negativePerWrong) mirrors the design table", () => {
    // Design sample: 5 questions on a misconception => lost 6.25 (5 * 1.25)
    const answers = Array.from({ length: 5 }, (_, i) => ({
      itemId: `q${i}`,
      partId: null,
      nodeId: null,
      chosenOption: 2,
      correctOption: 1,
      misconception: "mis.design",
    }));
    const rows = misconceptionsByShare(answers, { marksPerCorrect: 1, negativePerWrong: 0.25 });
    expect(rows[0]!.lostMarks).toBe(6.25);
  });
});

// ---------------------------------------------------------------------------
// insightText
// ---------------------------------------------------------------------------

describe("insightText", () => {
  const marking = { marksPerCorrect: 1, negativePerWrong: 0.25 };

  it("no wrong answers: returns a correct-answers variant", () => {
    const s = session({ answers: {
      q_bm: { selectedOption: 1, timeMs: 1 },
      q_lr: { selectedOption: 3, timeMs: 1 },
      q_st: { selectedOption: 2, timeMs: 1 },
    }});
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    const rows = misconceptionsByShare(score.wrongAnswers, marking);
    const insight = insightText(score, rows, null);
    expect(insight.text).toMatch(/correct/i);
  });

  it("penalty > top misconception lost marks: names negative marking", () => {
    // Make penalty dominant: one wrong answer with no misconception costs 0.25
    // penalty but 0 misconception lost marks, so penalty > 0.
    // Build a mock score with these answers directly using a high penalty.
    const s = session({ answers: { q_bm: { selectedOption: 2, timeMs: 1 }, q_lr: { selectedOption: 2, timeMs: 1 }, q_st: { selectedOption: 1, timeMs: 1 } } });
    const score = scoreMock(s, CONTENT, MARKING, FAMILIES);
    // score.wrong >= 1, misconception table is empty for mis.st since q_st has mis.st on option2 but q_st chose option1 which is wrong (correct is 2)
    // Force the penalty-dominant path by passing empty rows
    const insight = insightText(score, [], null);
    expect(insight.text).toMatch(/negative marking/i);
  });

  it("top misconception lost marks >= penalty: names the top misconception", () => {
    // 5 wrong answers on mis.design = lost 6.25, penalty = 5 * 0.25 = 1.25
    // 6.25 >= 1.25 so the misconception path fires.
    const rows: MisconceptionRow[] = [{ id: "mis.design", count: 5, lostMarks: 6.25, shareRatio: 1 }];
    const score = scoreMock(session({ answers: { q_lr: { selectedOption: 2, timeMs: 1 } } }), CONTENT, MARKING, FAMILIES);
    // Override penalty to be less than lostMarks
    const fakePenalty = 1.25;
    const fakeScore = { ...score, penalty: fakePenalty, wrong: 5 };
    const insight = insightText(fakeScore, rows, "Simple vs compound interest");
    expect(insight.text).toContain("Simple vs compound interest");
    expect(insight.text).toContain("5");
  });
});
