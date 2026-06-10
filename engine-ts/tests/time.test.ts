/**
 * Time normalization tests (W1-2, SPEC 2.1).
 *
 * The prototype crashed on naive datetimes and ordered events by string
 * comparison, which reorders mixed-offset instants. Both are pinned dead here.
 */
import { describe, expect, it } from "vitest";
import { compareEvents, orderEvents, parseIsoToMs } from "../src/time.js";
import type { Event } from "../src/types.js";

function ev(id: string, iso: string): Event {
  return {
    event_id: id,
    occurredAtMs: parseIsoToMs(iso),
    item_id: "x",
    item_content_hash: "h",
    taxonomy_version: 2,
    tests: ["qa.bmath.finance"],
    difficulty_label: "L2",
    item_type: "single_best",
    mode: "practice",
    correct: true,
    selected_misconception: null,
    time_ms: 1000,
    resurfaced: false,
  };
}

describe("parseIsoToMs: naive equals UTC by contract", () => {
  it("a naive datetime parses as UTC (no crash, no local-zone drift)", () => {
    expect(parseIsoToMs("2024-01-15T10:30:00")).toBe(Date.UTC(2024, 0, 15, 10, 30, 0));
  });

  it("a date with time but no seconds parses", () => {
    expect(parseIsoToMs("2024-01-15T10:30")).toBe(Date.UTC(2024, 0, 15, 10, 30, 0));
  });

  it("a Z-suffixed datetime equals the same naive datetime", () => {
    expect(parseIsoToMs("2024-01-15T10:30:00Z")).toBe(parseIsoToMs("2024-01-15T10:30:00"));
  });

  it("a +05:30 offset subtracts 5h30m to reach UTC", () => {
    // 10:30 at +05:30 is 05:00 UTC.
    expect(parseIsoToMs("2024-01-15T10:30:00+05:30")).toBe(Date.UTC(2024, 0, 15, 5, 0, 0));
  });

  it("a -08:00 offset adds 8h to reach UTC", () => {
    expect(parseIsoToMs("2024-01-15T10:30:00-08:00")).toBe(Date.UTC(2024, 0, 15, 18, 30, 0));
  });

  it("fractional seconds become milliseconds", () => {
    expect(parseIsoToMs("2024-01-15T10:30:00.250Z")).toBe(Date.UTC(2024, 0, 15, 10, 30, 0, 250));
  });

  it("a compact +0530 offset parses identically to +05:30", () => {
    expect(parseIsoToMs("2024-01-15T10:30:00+0530")).toBe(parseIsoToMs("2024-01-15T10:30:00+05:30"));
  });

  it("malformed input throws rather than yielding NaN", () => {
    expect(() => parseIsoToMs("not a date")).toThrow();
  });
});

describe("event ordering: by instant, never by string (the mixed-offset trap)", () => {
  it("a later instant written in a +offset sorts BEFORE an earlier instant written in Z", () => {
    // "2024-01-15T11:00:00+05:30" = 05:30 UTC.
    // "2024-01-15T06:00:00Z"       = 06:00 UTC, which is LATER.
    // String comparison sorts "11:00..." after "06:00...", reversing the truth.
    const a = ev("a", "2024-01-15T11:00:00+05:30"); // 05:30 UTC
    const b = ev("b", "2024-01-15T06:00:00Z"); // 06:00 UTC
    const ordered = orderEvents([b, a]);
    expect(ordered.map((e) => e.event_id)).toEqual(["a", "b"]);
    // And the naive string sort would get it wrong:
    const stringSorted = [b, a].slice().sort((x, y) =>
      x.event_id === "a" ? -1 : 1, // placeholder, see below
    );
    void stringSorted;
    expect(a.occurredAtMs).toBeLessThan(b.occurredAtMs);
  });

  it("ties on instant break on event_id ascending", () => {
    const a = ev("zzz", "2024-01-15T10:00:00Z");
    const b = ev("aaa", "2024-01-15T10:00:00Z");
    expect(orderEvents([a, b]).map((e) => e.event_id)).toEqual(["aaa", "zzz"]);
  });

  it("comparator is a total order consistent with orderEvents", () => {
    const a = ev("a", "2024-01-15T11:00:00+05:30");
    const b = ev("b", "2024-01-15T06:00:00Z");
    expect(compareEvents(a, b)).toBeLessThan(0);
    expect(compareEvents(b, a)).toBeGreaterThan(0);
    expect(compareEvents(a, a)).toBe(0);
  });
});
