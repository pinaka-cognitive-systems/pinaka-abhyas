/**
 * insights.test.ts — the design-shaped view-model selectors.
 *
 * These tests pin the profile contract the screens render: the six-state
 * classifier, the recommendation ladder, the review-queue reason vocabulary,
 * the misconception cost accounting (mock 1.25 / practice 1.0), the matrix
 * heat math (the design's own mxCell numbers), the time-triage verdicts, and
 * the honesty rules (no raw ids, declared absences).
 */

import { describe, expect, it } from "vitest";

import type { Event } from "@pinaka/engine";

import {
  calibration,
  classifyDataState,
  examDateView,
  familyOf,
  fallbackName,
  formatMarks,
  matrixCellStyle,
  misconceptionCosts,
  misconceptionMatrix,
  mockHistory,
  readinessView,
  recommend,
  relativeDate,
  timeVerdict,
} from "../../src/engine/insights.js";
import { loadPack } from "../../src/engine/pack.js";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const NOW = Date.UTC(2026, 5, 12); // 2026-06-12
const DAY = 86_400_000;

/** A tiny two-part blueprint: two families under one part, one under another. */
const PACK = loadPack(
  {
    items: [
      {
        id: "it-1",
        tests: ["qa.bmath.finance.simple_interest"],
        difficulty_label: "L2",
        item_type: "single_best",
        expected_seconds: 60,
        verification_status: "verified",
      },
    ],
  },
  {
    parts: [
      {
        id: "qa.bmath",
        marks: 40,
        questions: 40,
        sections: [
          { icai_section: "II", families: ["qa.bmath.finance", "qa.bmath.ratio"] },
        ],
      },
      {
        id: "qa.stats",
        marks: 40,
        questions: 40,
        sections: [{ icai_section: "VII", families: ["qa.stats.probability"] }],
      },
    ],
  },
  {
    marks_per_correct: 1,
    negative_mark_per_wrong: 0.25,
    marks_per_unattempted: 0,
    num_questions: 100,
    duration_minutes: 120,
    pass: { paper_min_marks: 40 },
  },
);

function wrongEvent(
  id: string,
  mis: string,
  node: string,
  mode: Event["mode"],
  agoMs: number,
): Event {
  return {
    event_id: id,
    occurredAtMs: NOW - agoMs,
    item_id: `item-${id}`,
    item_content_hash: "h",
    taxonomy_version: 1,
    tests: [node],
    difficulty_label: "L2",
    item_type: "single_best",
    mode,
    correct: false,
    selected_misconception: mis,
    time_ms: 60_000,
    resurfaced: false,
  };
}

const NAMES = new Map([["compound_interest_confusion", "Simple vs compound interest"]]);
const TOPICS = new Map([
  ["qa.bmath.finance", "Mathematics of Finance"],
  ["qa.bmath.ratio", "Ratio, Indices, Logarithms"],
  ["qa.stats.probability", "Probability"],
]);

/* ------------------------------------------------------------------ */
/* Data states (Handout section 04)                                    */
/* ------------------------------------------------------------------ */

describe("classifyDataState", () => {
  it("is empty with zero mocks, regardless of practice history", () => {
    expect(classifyDataState(0, [])).toBe("empty");
  });

  it("is early with exactly one mock", () => {
    expect(classifyDataState(1, [38])).toBe("early");
  });

  it("is returning with two steady mocks", () => {
    expect(classifyDataState(2, [41.5, 41.0])).toBe("returning");
  });

  it("is progressing on an upward delta of two or more", () => {
    expect(classifyDataState(3, [49.0, 45.25, 41.5])).toBe("progressing");
  });

  it("is plateau when the last three standard nets sit within one mark", () => {
    expect(classifyDataState(4, [43.5, 43.25, 42.75])).toBe("plateau");
  });

  it("plateau wins over progressing (narrow flat band is the louder fact)", () => {
    // span 1.0 exactly -> plateau even though last-vs-previous is positive.
    expect(classifyDataState(3, [43.5, 42.5, 43.0])).toBe("plateau");
  });

  it("ignores hard/pace mocks via the standard-nets input contract", () => {
    // Caller passes standard nets only; two mocks of which one standard.
    expect(classifyDataState(2, [38])).toBe("returning");
  });
});

/* ------------------------------------------------------------------ */
/* Recommendation ladder (data.jsx PROFILES)                           */
/* ------------------------------------------------------------------ */

describe("recommend", () => {
  it("empty: take your first mock", () => {
    const r = recommend({ state: "empty", reviewsDue: 0, weakestTopic: null, topMisconception: null });
    expect(r.title).toBe("Take your first mock");
    expect(r.cta).toBe("Start standard mock");
    expect(r.dest).toBe("mock");
  });

  it("reviews due beat everything except plateau", () => {
    const r = recommend({ state: "returning", reviewsDue: 5, weakestTopic: "Probability", topMisconception: null });
    expect(r.title).toBe("5 reviews are due");
    expect(r.evidence).toBe("review");
  });

  it("plateau names the single lever", () => {
    const r = recommend({
      state: "plateau", reviewsDue: 5, weakestTopic: "Mathematics of Finance",
      topMisconception: { name: "Simple vs compound interest", marksLost: 7, id: "compound_interest_confusion" },
    });
    expect(r.title).toBe("Attack one error, not everything");
    expect(r.detail).toContain("Simple vs compound interest alone is 7 of them");
    expect(r.dest).toBe("misconception/compound_interest_confusion");
  });

  it("progressing recommends the hard mock", () => {
    const r = recommend({ state: "progressing", reviewsDue: 0, weakestTopic: "Probability", topMisconception: null });
    expect(r.title).toBe("Take a hard mock");
  });

  it("singular review grammar", () => {
    const r = recommend({ state: "returning", reviewsDue: 1, weakestTopic: null, topMisconception: null });
    expect(r.title).toBe("1 review is due");
  });

});

/* ------------------------------------------------------------------ */
/* Misconception costs + matrix (Handout section 07)                   */
/* ------------------------------------------------------------------ */

describe("misconceptionCosts", () => {
  it("charges 1.25 for a mock wrong and 1.0 for a practice wrong", () => {
    const events = [
      wrongEvent("a", "compound_interest_confusion", "qa.bmath.finance.simple_interest", "mock", DAY),
      wrongEvent("b", "compound_interest_confusion", "qa.bmath.finance.compound_interest", "drill", 2 * DAY),
    ];
    const costs = misconceptionCosts(events, PACK, NAMES, TOPICS, NOW);
    expect(costs).toHaveLength(1);
    expect(costs[0]!.marksLost).toBe(2.25);
    expect(costs[0]!.count).toBe(2);
    expect(costs[0]!.name).toBe("Simple vs compound interest");
    expect(costs[0]!.topics).toBe("Mathematics of Finance");
  });

  it("hides single occurrences below the threshold (declared elsewhere)", () => {
    const events = [
      wrongEvent("a", "ratio_inverted", "qa.bmath.ratio.x", "mock", DAY),
    ];
    expect(misconceptionCosts(events, PACK, NAMES, TOPICS, NOW)).toHaveLength(0);
  });

  it("never returns a raw id as the display name", () => {
    const events = [
      wrongEvent("a", "unnamed_thing", "qa.stats.probability.x", "mock", DAY),
      wrongEvent("b", "unnamed_thing", "qa.stats.probability.x", "mock", DAY),
    ];
    const costs = misconceptionCosts(events, PACK, NAMES, TOPICS, NOW);
    expect(costs[0]!.name).toBe("Unnamed thing");
  });
});

describe("misconceptionMatrix", () => {
  it("builds rows by family, weakest first, with declared hidden count", () => {
    const events = [
      wrongEvent("a", "compound_interest_confusion", "qa.bmath.finance.simple_interest", "mock", DAY),
      wrongEvent("b", "compound_interest_confusion", "qa.bmath.finance.simple_interest", "mock", DAY),
      wrongEvent("c", "compound_interest_confusion", "qa.stats.probability.x", "drill", DAY),
    ];
    const costs = misconceptionCosts(events, PACK, NAMES, TOPICS, NOW);
    const m = misconceptionMatrix(events, PACK, costs, TOPICS);
    expect(m.rows[0]!.name).toBe("Mathematics of Finance"); // 2.5 lost beats 1.0
    expect(m.cells[0]![0]).toBe(2.5);
    expect(m.cells[1]![0]).toBe(1.0);
    // 3 blueprint families, 2 rows shown -> 1 declared hidden.
    expect(m.hiddenCount).toBe(1);
  });
});

describe("matrixCellStyle (the design mxCell math)", () => {
  it("matches the design opacity curve", () => {
    expect(matrixCellStyle(7).background).toBe("rgba(99, 102, 241, 0.92)");
    expect(matrixCellStyle(7).color).toBe("#fff");
    expect(matrixCellStyle(1.5).color).toBe("var(--color-foreground)");
    expect(matrixCellStyle(0).background).toBe("var(--color-card)");
  });
});

describe("familyOf", () => {
  it("maps a leaf node to its longest blueprint family prefix", () => {
    expect(familyOf("qa.bmath.finance.simple_interest", ["qa.bmath.finance", "qa.bmath"]))
      .toBe("qa.bmath.finance");
  });
});

/* ------------------------------------------------------------------ */
/* Time triage + calibration (Handout section 12)                      */
/* ------------------------------------------------------------------ */

describe("timeVerdict", () => {
  it("covers the six speed x correctness verdicts", () => {
    expect(timeVerdict("skipped", 0).label).toBe("Skipped");
    expect(timeVerdict("wrong", 38).label).toBe("Rushed");
    expect(timeVerdict("wrong", 121).label).toBe("Hard for you");
    expect(timeVerdict("wrong", 64).label).toBe("Missed");
    expect(timeVerdict("correct", 134).label).toBe("Inefficient");
    expect(timeVerdict("correct", 31).label).toBe("Solid");
  });
});

describe("calibration", () => {
  it("flags overconfidence and underconfidence by band", () => {
    expect(calibration("high", 40).label).toBe("Overconfident");
    expect(calibration("low", 80).label).toBe("Underconfident");
    expect(calibration("mid", 60).label).toBe("Well calibrated");
  });
});

/* ------------------------------------------------------------------ */
/* Readiness view + small helpers                                      */
/* ------------------------------------------------------------------ */

describe("readinessView", () => {
  const base = {
    expectedMarks: 43, low: 39, high: 47, distanceToPass: 3,
    estMinutes: 120, skippedForTime: 0, timeFeasible: true,
    isEstimate: true as const, note: "",
  };

  it("maps engine medium to the display word moderate", () => {
    const v = readinessView({ ...base, confidence: "medium" }, 50);
    expect(v).toEqual({ net: 43, lo: 39, hi: 47, confidence: "moderate", target: 50 });
  });

  it("hides the band entirely on insufficient data (never a guess)", () => {
    expect(readinessView({ ...base, confidence: "insufficient_data" }, null)).toBeNull();
  });
});

describe("examDateView", () => {
  it("parses the ISO month and counts days honestly", () => {
    const v = examDateView("2026-09", NOW);
    expect(v?.display).toBe("Sep 2026");
    expect(v?.daysLeft).toBeGreaterThan(70);
  });

  it("rejects junk silently", () => {
    expect(examDateView("soon", NOW)).toBeNull();
  });
});

describe("mockHistory", () => {
  it("reads schema-2 summaries and numbers mocks from the device count", () => {
    const raw = JSON.stringify([
      { finishedAtMs: NOW - 2 * DAY, summary: { net: 43.25, correct: 51, wrong: 31, skipped: 18, penalty: 7.75, denominator: 100, type: "standard" } },
      { finishedAtMs: NOW - 11 * DAY, summary: { net: 41.0, correct: 49, wrong: 32, skipped: 19, penalty: 8, denominator: 100, type: "standard" } },
    ]);
    const rows = mockHistory(raw, 3, NOW);
    expect(rows[0]!.name).toBe("Mock 03");
    expect(rows[1]!.name).toBe("Mock 02");
    expect(rows[0]!.date).toBe("2 days ago");
  });

  it("skips records without a summary instead of guessing", () => {
    const raw = JSON.stringify([{ finishedAtMs: NOW, session: {} }]);
    expect(mockHistory(raw, 1, NOW)).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("formats marks plainly", () => {
    expect(formatMarks(7)).toBe("7");
    expect(formatMarks(6.25)).toBe("6.25");
  });

  it("relative dates use the design vocabulary", () => {
    expect(relativeDate(NOW, NOW)).toBe("today");
    expect(relativeDate(NOW - DAY, NOW)).toBe("1 day ago");
    expect(relativeDate(NOW - 11 * DAY, NOW)).toBe("11 days ago");
  });

  it("fallbackName never leaks snake_case", () => {
    expect(fallbackName("complement_confusion")).toBe("Complement confusion");
  });
});
