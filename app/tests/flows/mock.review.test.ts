/**
 * Mock review filter, count, and pacing logic (W5 mock review phase).
 *
 * DOM-free. Asserts:
 *   - filter membership for all six filters across correct/wrong/skipped/marked
 *   - filter counts match independent membership checks
 *   - pacing word emits Rushed, Slow, or null under the two specified rules only
 *   - buildReviewEntries maps session + score + content correctly
 *   - formatMs produces the expected "m:ss" shape
 */

import { describe, expect, it } from "vitest";
import {
  buildReviewEntries,
  buildFilterCounts,
  applyFilter,
  passesFilter,
  pacingWord,
  formatMs,
  type ReviewEntry,
  type ReviewOutcome,
} from "../../src/flows/mock/reviewFilter.js";
import type { MockSession } from "../../src/flows/mock/state.js";
import type { MockScore, WrongAnswer } from "../../src/flows/mock/scoring.js";
import { toContentItem, type ContentItem } from "../../src/flows/practice/types.js";

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function entry(
  num: number,
  outcome: ReviewOutcome,
  marked: boolean,
  timeMs: number,
  expectedSeconds: number,
): ReviewEntry {
  return {
    num,
    itemId: `item_${num}`,
    outcome,
    marked,
    yourPick: outcome === "skipped" ? null : 2,
    correctKey: 1,
    timeMs,
    expectedSeconds,
  };
}

// ---------------------------------------------------------------------------
// Filter membership.
// ---------------------------------------------------------------------------

describe("passesFilter — toReview", () => {
  it("wrong is in toReview", () => {
    expect(passesFilter(entry(1, "wrong", false, 0, 75), "toReview")).toBe(true);
  });
  it("skipped is in toReview", () => {
    expect(passesFilter(entry(1, "skipped", false, 0, 75), "toReview")).toBe(true);
  });
  it("correct unmarked is NOT in toReview", () => {
    expect(passesFilter(entry(1, "correct", false, 0, 75), "toReview")).toBe(false);
  });
  it("correct but marked IS in toReview", () => {
    expect(passesFilter(entry(1, "correct", true, 0, 75), "toReview")).toBe(true);
  });
});

describe("passesFilter — specific filters", () => {
  it("wrong filter: only wrong entries pass", () => {
    expect(passesFilter(entry(1, "wrong", false, 0, 75), "wrong")).toBe(true);
    expect(passesFilter(entry(1, "skipped", false, 0, 75), "wrong")).toBe(false);
    expect(passesFilter(entry(1, "correct", false, 0, 75), "wrong")).toBe(false);
  });
  it("skipped filter: only skipped entries pass", () => {
    expect(passesFilter(entry(1, "skipped", false, 0, 75), "skipped")).toBe(true);
    expect(passesFilter(entry(1, "wrong", false, 0, 75), "skipped")).toBe(false);
    expect(passesFilter(entry(1, "correct", false, 0, 75), "skipped")).toBe(false);
  });
  it("correct filter: only correct entries pass", () => {
    expect(passesFilter(entry(1, "correct", false, 0, 75), "correct")).toBe(true);
    expect(passesFilter(entry(1, "wrong", false, 0, 75), "correct")).toBe(false);
    expect(passesFilter(entry(1, "skipped", false, 0, 75), "correct")).toBe(false);
  });
  it("marked filter: only marked entries pass, regardless of outcome", () => {
    expect(passesFilter(entry(1, "correct", true, 0, 75), "marked")).toBe(true);
    expect(passesFilter(entry(1, "wrong", true, 0, 75), "marked")).toBe(true);
    expect(passesFilter(entry(1, "correct", false, 0, 75), "marked")).toBe(false);
  });
  it("all filter: every entry passes", () => {
    for (const outcome of ["correct", "wrong", "skipped"] as ReviewOutcome[]) {
      expect(passesFilter(entry(1, outcome, false, 0, 75), "all")).toBe(true);
      expect(passesFilter(entry(1, outcome, true, 0, 75), "all")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Filter counts.
// ---------------------------------------------------------------------------

describe("buildFilterCounts", () => {
  const entries: ReviewEntry[] = [
    entry(1, "correct", false, 60_000, 75),
    entry(2, "wrong", false, 30_000, 75),
    entry(3, "skipped", false, 0, 75),
    entry(4, "correct", true, 80_000, 75),
    entry(5, "wrong", true, 20_000, 75),
  ];

  it("all count is total length", () => {
    const counts = buildFilterCounts(entries);
    expect(counts.all).toBe(5);
  });
  it("correct count", () => {
    const counts = buildFilterCounts(entries);
    expect(counts.correct).toBe(2);
  });
  it("wrong count", () => {
    const counts = buildFilterCounts(entries);
    expect(counts.wrong).toBe(2);
  });
  it("skipped count", () => {
    const counts = buildFilterCounts(entries);
    expect(counts.skipped).toBe(1);
  });
  it("marked count", () => {
    const counts = buildFilterCounts(entries);
    expect(counts.marked).toBe(2);
  });
  it("toReview = wrong + skipped + marked-correct (union)", () => {
    // wrong (2) + skipped (1) + marked-correct (1) = 4 unique entries
    const counts = buildFilterCounts(entries);
    expect(counts.toReview).toBe(4);
  });
  it("counts match applyFilter lengths", () => {
    const counts = buildFilterCounts(entries);
    const filters = ["toReview", "wrong", "skipped", "correct", "marked", "all"] as const;
    for (const f of filters) {
      expect(counts[f]).toBe(applyFilter(entries, f).length);
    }
  });
});

// ---------------------------------------------------------------------------
// Pacing word rules.
// ---------------------------------------------------------------------------

describe("pacingWord", () => {
  it("Rushed: under half expected_seconds AND wrong", () => {
    // expected 75s -> threshold is 37.5s -> under is < 37500ms
    const e = entry(1, "wrong", false, 30_000, 75);
    expect(pacingWord(e)).toBe("Rushed");
  });
  it("NOT Rushed when under half expected but correct (no chip)", () => {
    const e = entry(1, "correct", false, 30_000, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("NOT Rushed when under half expected but skipped (no chip)", () => {
    const e = entry(1, "skipped", false, 0, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("Slow: over double expected_seconds, wrong", () => {
    // expected 75s -> 2x = 150s -> over is > 150000ms
    const e = entry(1, "wrong", false, 200_000, 75);
    expect(pacingWord(e)).toBe("Slow");
  });
  it("Slow: over double expected_seconds, correct (any outcome)", () => {
    const e = entry(1, "correct", false, 200_000, 75);
    expect(pacingWord(e)).toBe("Slow");
  });
  it("Slow takes precedence over Rushed threshold (over double is always Slow)", () => {
    // If somehow timeMs > 2x expected AND < half expected (impossible, but the
    // code evaluates Slow first): this test verifies the Slow branch fires first.
    // In practice Slow check runs first in the code, so test the boundary.
    const e = entry(1, "wrong", false, 160_000, 75);
    expect(pacingWord(e)).toBe("Slow");
  });
  it("null: normal pace, correct", () => {
    const e = entry(1, "correct", false, 60_000, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("null: normal pace, wrong", () => {
    const e = entry(1, "wrong", false, 60_000, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("null: timeMs is 0 (skipped, no time data)", () => {
    const e = entry(1, "skipped", false, 0, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("null: exactly at half expected (not under), wrong", () => {
    const e = entry(1, "wrong", false, 37_500, 75);
    expect(pacingWord(e)).toBeNull();
  });
  it("null: exactly at double expected (not over), any", () => {
    const e = entry(1, "wrong", false, 150_000, 75);
    expect(pacingWord(e)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildReviewEntries.
// ---------------------------------------------------------------------------

describe("buildReviewEntries", () => {
  function rawItem(id: string, correct: number) {
    return toContentItem({
      id,
      content_hash: "h".repeat(64),
      taxonomy_version: 4,
      tests: ["qa.bmath.finance"],
      difficulty_label: "L2",
      item_type: "single_best",
      expected_seconds: 75,
      stem: `Stem ${id}`,
      options: [
        { key: 1, text: "A" },
        { key: 2, text: "B" },
      ],
      answer_key: { correct },
      per_option_rationale: [],
      explanation: "Explanation.",
    });
  }

  const contentMap: ReadonlyMap<string, ContentItem> = new Map([
    ["q1", rawItem("q1", 1)],
    ["q2", rawItem("q2", 1)],
    ["q3", rawItem("q3", 1)],
  ]);

  const session: MockSession = {
    id: "sess_1",
    seed: 1,
    order: ["q1", "q2", "q3"],
    fullPaperSize: 100,
    budgetMs: 180 * 60_000,
    startedAtMs: 0,
    answers: {
      q1: { selectedOption: 1, timeMs: 60_000 },
      q2: { selectedOption: 2, timeMs: 30_000 },
      // q3 skipped
    },
    flagged: ["q2"],
    struck: {},
    activeMs: 90_000,
    formFactor: "phone",
    viewportWidth: 360,
  };

  const wrongAnswer: WrongAnswer = {
    itemId: "q2",
    partId: "part_a",
    nodeId: "qa.bmath.finance",
    chosenOption: 2,
    correctOption: 1,
    misconception: null,
  };

  const score: MockScore = {
    net: 0.75,
    maxMarks: 3,
    correct: 1,
    wrong: 1,
    skipped: 1,
    total: 3,
    penalty: 0.25,
    passMark: 1.5,
    distanceToPass: -0.75,
    cleared: false,
    parts: [],
    wrongAnswers: [wrongAnswer],
  };

  it("builds one entry per question in order", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.num).toBe(1);
    expect(entries[1]!.num).toBe(2);
    expect(entries[2]!.num).toBe(3);
  });
  it("correct outcome for q1 (answered, not in wrongAnswers)", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[0]!.outcome).toBe("correct");
    expect(entries[0]!.yourPick).toBe(1);
  });
  it("wrong outcome for q2 (answered, in wrongAnswers)", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[1]!.outcome).toBe("wrong");
    expect(entries[1]!.yourPick).toBe(2);
    expect(entries[1]!.correctKey).toBe(1);
  });
  it("skipped outcome for q3 (no answer)", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[2]!.outcome).toBe("skipped");
    expect(entries[2]!.yourPick).toBeNull();
    expect(entries[2]!.timeMs).toBe(0);
  });
  it("marked flag matches session.flagged", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[0]!.marked).toBe(false);
    expect(entries[1]!.marked).toBe(true);
    expect(entries[2]!.marked).toBe(false);
  });
  it("timeMs is pulled from session answer", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[0]!.timeMs).toBe(60_000);
    expect(entries[1]!.timeMs).toBe(30_000);
  });
  it("expectedSeconds comes from content item", () => {
    const entries = buildReviewEntries(session, score, contentMap);
    expect(entries[0]!.expectedSeconds).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// formatMs.
// ---------------------------------------------------------------------------

describe("formatMs", () => {
  it("formats 0 as 0:00", () => expect(formatMs(0)).toBe("0:00"));
  it("formats 75 000 ms as 1:15", () => expect(formatMs(75_000)).toBe("1:15"));
  it("formats 3600 000 ms as 60:00", () => expect(formatMs(3_600_000)).toBe("60:00"));
  it("formats 599 000 ms as 9:59", () => expect(formatMs(599_000)).toBe("9:59"));
  it("pads seconds with leading zero", () => expect(formatMs(5_000)).toBe("0:05"));
});
