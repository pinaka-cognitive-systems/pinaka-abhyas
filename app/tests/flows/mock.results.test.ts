/**
 * Completed mock result persistence tests (results.ts).
 *
 * Covers: round-trip serialize/parse, cap enforcement (newest-first, max 3),
 * invalid input returning [], wrong-schema records being skipped, and date
 * formatting.
 */

import { describe, expect, it } from "vitest";

import {
  appendResult,
  formatResultDate,
  parseResults,
  serializeResults,
  type MockResultRecord,
} from "../../src/flows/mock/results.js";
import type { MockSession } from "../../src/flows/mock/state.js";

// ---------------------------------------------------------------------------
// Fixtures.
// ---------------------------------------------------------------------------

const START = Date.UTC(2026, 5, 11, 9, 0, 0);

function freshSession(id = "mock-1"): MockSession {
  return {
    id,
    seed: 42,
    order: ["a", "b", "c"],
    fullPaperSize: 100,
    budgetMs: 91 * 60_000,
    startedAtMs: START,
    answers: {},
    flagged: [],
    struck: {},
    activeMs: 0,
    formFactor: "phone",
    viewportWidth: 360,
  };
}

const READINESS_BEFORE = {
  expectedMarks: 55,
  low: 48,
  high: 62,
  distanceToPass: -5,
  confidence: "low" as const,
  estMinutes: 120,
  skippedForTime: 0,
  timeFeasible: true,
  isEstimate: true as const,
  note: "Estimated from prior practice.",
};

const READINESS_AFTER = {
  expectedMarks: 58,
  low: 51,
  high: 65,
  distanceToPass: -2,
  confidence: "low" as const,
  estMinutes: 120,
  skippedForTime: 0,
  timeFeasible: true,
  isEstimate: true as const,
  note: "Anchored to this mock.",
};

function makeRecord(
  overrides: Partial<MockResultRecord> = {},
): MockResultRecord {
  return {
    schema: 1,
    finishedAtMs: START + 91 * 60_000,
    session: freshSession(),
    before: READINESS_BEFORE,
    after: READINESS_AFTER,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Round-trip.
// ---------------------------------------------------------------------------

describe("serializeResults / parseResults round-trip", () => {
  it("round-trips an empty list", () => {
    expect(parseResults(serializeResults([]))).toEqual([]);
  });

  it("round-trips a single record", () => {
    const rec = makeRecord();
    const parsed = parseResults(serializeResults([rec]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(rec);
  });

  it("round-trips three records and preserves order", () => {
    const r1 = makeRecord({ finishedAtMs: START + 1 });
    const r2 = makeRecord({ finishedAtMs: START + 2, session: freshSession("mock-2") });
    const r3 = makeRecord({ finishedAtMs: START + 3, session: freshSession("mock-3") });
    const list = [r1, r2, r3];
    const parsed = parseResults(serializeResults(list));
    expect(parsed).toEqual(list);
  });
});

// ---------------------------------------------------------------------------
// Invalid / missing input.
// ---------------------------------------------------------------------------

describe("parseResults — invalid input returns []", () => {
  it("returns [] for null", () => {
    expect(parseResults(null)).toEqual([]);
  });

  it("returns [] for an empty string", () => {
    expect(parseResults("")).toEqual([]);
  });

  it("returns [] for non-JSON text", () => {
    expect(parseResults("not json")).toEqual([]);
  });

  it("returns [] when the top-level value is not an array", () => {
    expect(parseResults(JSON.stringify({ schema: 1 }))).toEqual([]);
    expect(parseResults(JSON.stringify(42))).toEqual([]);
  });

  it("skips records with wrong schema version", () => {
    const badSchema = { ...makeRecord(), schema: 2 };
    const good = makeRecord({ finishedAtMs: START + 5 });
    const raw = JSON.stringify([badSchema, good]);
    const parsed = parseResults(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(good);
  });

  it("skips records missing required fields", () => {
    const missingSession = { schema: 1, finishedAtMs: START, before: READINESS_BEFORE, after: READINESS_AFTER };
    const missingBefore = { schema: 1, finishedAtMs: START, session: freshSession(), after: READINESS_AFTER };
    expect(parseResults(JSON.stringify([missingSession]))).toEqual([]);
    expect(parseResults(JSON.stringify([missingBefore]))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// appendResult: cap and newest-first ordering.
// ---------------------------------------------------------------------------

describe("appendResult — cap and newest-first", () => {
  it("prepends a record to an empty list", () => {
    const rec = makeRecord();
    const result = appendResult([], rec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(rec);
  });

  it("prepends a record (newest first)", () => {
    const r1 = makeRecord({ finishedAtMs: START + 1 });
    const r2 = makeRecord({ finishedAtMs: START + 2, session: freshSession("mock-2") });
    const result = appendResult([r1], r2);
    expect(result[0]).toEqual(r2);
    expect(result[1]).toEqual(r1);
  });

  it("does not mutate the original list", () => {
    const list: MockResultRecord[] = [makeRecord()];
    const original = [...list];
    appendResult(list, makeRecord({ session: freshSession("mock-x") }));
    expect(list).toEqual(original);
  });

  it("caps the list at 3, dropping the oldest", () => {
    const r1 = makeRecord({ finishedAtMs: START + 1, session: freshSession("m1") });
    const r2 = makeRecord({ finishedAtMs: START + 2, session: freshSession("m2") });
    const r3 = makeRecord({ finishedAtMs: START + 3, session: freshSession("m3") });
    const r4 = makeRecord({ finishedAtMs: START + 4, session: freshSession("m4") });
    const after3 = appendResult(appendResult(appendResult([], r1), r2), r3);
    expect(after3).toHaveLength(3);
    const after4 = appendResult(after3, r4);
    expect(after4).toHaveLength(3);
    // r4 is newest, so it is first; r1 (oldest) is dropped.
    expect(after4[0]).toEqual(r4);
    expect(after4[1]).toEqual(r3);
    expect(after4[2]).toEqual(r2);
    expect(after4.some((r) => r.session.id === "m1")).toBe(false);
  });

  it("cap of exactly 3 retains all three with correct order", () => {
    const r1 = makeRecord({ finishedAtMs: START + 1, session: freshSession("m1") });
    const r2 = makeRecord({ finishedAtMs: START + 2, session: freshSession("m2") });
    const r3 = makeRecord({ finishedAtMs: START + 3, session: freshSession("m3") });
    const list = appendResult(appendResult(appendResult([], r1), r2), r3);
    expect(list).toHaveLength(3);
    expect(list[0]!.session.id).toBe("m3");
    expect(list[1]!.session.id).toBe("m2");
    expect(list[2]!.session.id).toBe("m1");
  });
});

// ---------------------------------------------------------------------------
// formatResultDate.
// ---------------------------------------------------------------------------

describe("formatResultDate", () => {
  it("formats a date as day Mon year with no leading zero on day", () => {
    // 11 Jun 2026 at 09:00 UTC
    expect(formatResultDate(Date.UTC(2026, 5, 11, 9, 0, 0))).toBe("11 Jun 2026");
  });

  it("formats a single-digit day without leading zero", () => {
    // 3 Jan 2026
    expect(formatResultDate(Date.UTC(2026, 0, 3, 12, 0, 0))).toBe("3 Jan 2026");
  });

  it("formats December correctly", () => {
    expect(formatResultDate(Date.UTC(2025, 11, 25, 0, 0, 0))).toBe("25 Dec 2025");
  });
});
