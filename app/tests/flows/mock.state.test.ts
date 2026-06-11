/**
 * Mock state + resume accounting tests (W5-7, test requirement 6).
 *
 * DOM-free. Asserts the ADR 0009 wall-clock resume policy: elapsed wall time
 * counts against the budget (time lost to an interruption is gone, not forgiven
 * and not double-charged), auto-submit fires at time, the persisted shape round-
 * trips, a corrupt value is treated as "no mock", and the answer/flag mutations
 * are immutable and accumulate per-question active time honestly.
 */

import { describe, expect, it } from "vitest";

import {
  answeredCount,
  isTimeUp,
  parseSession,
  remainingMs,
  resumeNote,
  serializeSession,
  withAnswer,
  withAnswerAndUnstrike,
  withClearedAnswer,
  withToggledFlag,
  withToggledStrike,
  type MockSession,
} from "../../src/flows/mock/state.js";

const START = Date.UTC(2026, 5, 10, 9, 0, 0);
const BUDGET_MIN = 91;
const BUDGET_MS = BUDGET_MIN * 60_000;

function freshSession(over: Partial<MockSession> = {}): MockSession {
  return {
    id: "mock-1",
    seed: 42,
    order: ["a", "b", "c"],
    fullPaperSize: 100,
    budgetMs: BUDGET_MS,
    startedAtMs: START,
    answers: {},
    flagged: [],
    struck: {},
    activeMs: 0,
    formFactor: "phone",
    viewportWidth: 360,
    ...over,
  };
}

describe("remainingMs — wall-clock policy", () => {
  it("charges elapsed wall time against the budget", () => {
    const s = freshSession();
    // 30 minutes have passed on the wall clock.
    const now = START + 30 * 60_000;
    expect(remainingMs(s, now)).toBe(BUDGET_MS - 30 * 60_000);
  });

  it("does not forgive time lost to an interruption: a 60-minute gap is charged in full", () => {
    const s = freshSession();
    // The student opened the mock, left for an hour (call/lock), and reopened.
    const now = START + 60 * 60_000;
    // The honest policy: 60 minutes are gone, exactly as in the exam hall.
    expect(remainingMs(s, now)).toBe(BUDGET_MS - 60 * 60_000);
  });

  it("never returns negative remaining time", () => {
    const s = freshSession();
    const now = START + (BUDGET_MIN + 10) * 60_000;
    expect(remainingMs(s, now)).toBe(0);
  });

  it("auto-submit fires exactly when the budget is exhausted", () => {
    const s = freshSession();
    expect(isTimeUp(s, START + (BUDGET_MIN - 1) * 60_000)).toBe(false);
    expect(isTimeUp(s, START + BUDGET_MIN * 60_000)).toBe(true);
    expect(isTimeUp(s, START + (BUDGET_MIN + 1) * 60_000)).toBe(true);
  });
});

describe("resumeNote — states the policy plainly", () => {
  it("names the remaining time and that the clock kept running", () => {
    const s = withAnswer(freshSession(), "a", 2, 1000);
    const now = START + 30 * 60_000;
    const note = resumeNote(s, now);
    expect(note).toContain("clock kept running");
    expect(note).toContain("1 of 3"); // answered 1 of 3
    // Fellow voice: no exclamation, no em-dash, no contraction apostrophes.
    expect(note).not.toContain("!");
    expect(note).not.toContain("—");
    expect(note).not.toMatch(/\b\w+'\w+\b/);
  });
});

describe("serialize / parse round-trip", () => {
  it("round-trips a session through storage meta", () => {
    const s = withToggledFlag(withAnswer(freshSession(), "a", 3, 5000), "b");
    const parsed = parseSession(serializeSession(s));
    expect(parsed).toEqual(s);
  });

  it("treats a null or corrupt value as no mock in progress", () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession("")).toBeNull();
    expect(parseSession("not json")).toBeNull();
    expect(parseSession(JSON.stringify({ id: "x" }))).toBeNull(); // missing fields
  });
});

describe("answer / clear / flag mutations are immutable", () => {
  it("withAnswer records the option and accumulates active time per question", () => {
    const s0 = freshSession();
    const s1 = withAnswer(s0, "a", 2, 3000);
    expect(s0.answers).toEqual({}); // original untouched
    expect(s1.answers.a).toEqual({ selectedOption: 2, timeMs: 3000 });
    expect(s1.activeMs).toBe(3000);
    // Re-answering the same item adds the new visit's time on top.
    const s2 = withAnswer(s1, "a", 4, 2000);
    expect(s2.answers.a).toEqual({ selectedOption: 4, timeMs: 5000 });
    expect(s2.activeMs).toBe(5000);
  });

  it("withClearedAnswer removes the answer but the time was still spent", () => {
    const s1 = withAnswer(freshSession(), "a", 2, 3000);
    const s2 = withClearedAnswer(s1, "a");
    expect(s2.answers.a).toBeUndefined();
    expect(answeredCount(s2)).toBe(0);
  });

  it("withToggledFlag toggles and keeps the list sorted", () => {
    const s1 = withToggledFlag(withToggledFlag(freshSession(), "c"), "a");
    expect(s1.flagged).toEqual(["a", "c"]);
    const s2 = withToggledFlag(s1, "a");
    expect(s2.flagged).toEqual(["c"]);
  });
});

describe("strike mutations are immutable and persist", () => {
  it("withToggledStrike adds a struck option and leaves the original untouched", () => {
    const s0 = freshSession();
    const s1 = withToggledStrike(s0, "a", 2, null);
    expect(s0.struck).toEqual({}); // original untouched
    expect(s1.struck["a"]).toEqual([2]);
  });

  it("withToggledStrike removes a struck option when toggled a second time", () => {
    const s0 = freshSession();
    const s1 = withToggledStrike(s0, "a", 2, null);
    const s2 = withToggledStrike(s1, "a", 2, null);
    expect(s2.struck["a"]).toBeUndefined();
  });

  it("withToggledStrike keeps the struck list sorted and accumulates across options", () => {
    const s0 = freshSession();
    const s1 = withToggledStrike(s0, "a", 3, null);
    const s2 = withToggledStrike(s1, "a", 1, null);
    expect(s2.struck["a"]).toEqual([1, 3]);
  });

  it("striking the currently selected option clears the selection", () => {
    const s0 = withAnswer(freshSession(), "a", 2, 1000);
    // Option 2 is currently selected; striking it should deselect it.
    const s1 = withToggledStrike(s0, "a", 2, 2);
    expect(s1.answers["a"]).toBeUndefined();
    expect(s1.struck["a"]).toEqual([2]);
  });

  it("striking a non-selected option does not change the selection", () => {
    const s0 = withAnswer(freshSession(), "a", 1, 1000);
    const s1 = withToggledStrike(s0, "a", 3, 1);
    // Selection (option 1) is preserved; option 3 is struck.
    expect(s1.answers["a"]?.selectedOption).toBe(1);
    expect(s1.struck["a"]).toEqual([3]);
  });

  it("withAnswerAndUnstrike removes the selected option from struck when it was struck", () => {
    const s0 = withToggledStrike(freshSession(), "a", 2, null);
    expect(s0.struck["a"]).toEqual([2]);
    // Now the student picks option 2 (reconsidering) -- it should be un-struck.
    const s1 = withAnswerAndUnstrike(s0, "a", 2, 500);
    expect(s1.answers["a"]?.selectedOption).toBe(2);
    expect(s1.struck["a"]).toBeUndefined();
  });

  it("withAnswerAndUnstrike leaves other struck options in place", () => {
    let s = freshSession();
    s = withToggledStrike(s, "a", 2, null);
    s = withToggledStrike(s, "a", 3, null);
    // Pick option 2 (un-strike 2), option 3 remains struck.
    const s1 = withAnswerAndUnstrike(s, "a", 2, 500);
    expect(s1.struck["a"]).toEqual([3]);
  });

  it("struck state round-trips through storage serialization", () => {
    let s = freshSession();
    s = withToggledStrike(s, "a", 2, null);
    s = withToggledStrike(s, "b", 1, null);
    const parsed = parseSession(serializeSession(s));
    expect(parsed).not.toBeNull();
    expect(parsed!.struck["a"]).toEqual([2]);
    expect(parsed!.struck["b"]).toEqual([1]);
  });

  it("parseSession defaults struck to {} for sessions written before the strike addendum", () => {
    // Simulate a session stored by an older build that has no struck field.
    const legacy = {
      id: "old-1",
      seed: 1,
      order: ["a"],
      fullPaperSize: 100,
      budgetMs: 5_400_000,
      startedAtMs: START,
      answers: {},
      flagged: [],
      activeMs: 0,
      formFactor: "phone",
      viewportWidth: 360,
      // no struck field
    };
    const parsed = parseSession(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.struck).toEqual({});
  });
});
