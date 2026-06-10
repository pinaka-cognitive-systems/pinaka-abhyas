/**
 * Unit tests for the shared envelope/merge logic (W5-2).
 *
 * These pin the pure functions both backends rely on, independently of any
 * storage I/O: validation, ordering, the merge plan, and envelope assembly.
 */

import { describe, expect, it } from "vitest";
import {
  buildEnvelope,
  compareEvents,
  planMerge,
  validateEnvelope,
  validateEvent,
} from "../../src/storage/envelope.js";
import type { StoredEvent } from "../../src/storage/adapter.js";
import { makeEvent } from "./contract.js";

describe("validateEvent", () => {
  it("accepts a well-formed event", () => {
    expect(validateEvent(makeEvent({ event_id: "e1" }))).toBeNull();
  });
  it("rejects a missing event_id", () => {
    expect(validateEvent({ ...makeEvent({ event_id: "e1" }), event_id: "" })).toContain("event_id");
  });
  it("rejects a non-finite occurredAtMs", () => {
    expect(validateEvent({ ...makeEvent({ event_id: "e1" }), occurredAtMs: NaN })).toContain(
      "occurredAtMs",
    );
  });
  it("rejects a non-integer taxonomy_version", () => {
    expect(validateEvent({ ...makeEvent({ event_id: "e1" }), taxonomy_version: 1.5 })).toContain(
      "taxonomy_version",
    );
  });
  it("rejects a non-object", () => {
    expect(validateEvent(null)).toBe("not an object");
    expect(validateEvent(7)).toBe("not an object");
  });
});

describe("compareEvents", () => {
  it("orders by occurredAtMs then event_id", () => {
    const list: StoredEvent[] = [
      makeEvent({ event_id: "b", occurredAtMs: 100 }),
      makeEvent({ event_id: "a", occurredAtMs: 100 }),
      makeEvent({ event_id: "z", occurredAtMs: 50 }),
    ];
    expect([...list].sort(compareEvents).map((e) => e.event_id)).toEqual(["z", "a", "b"]);
  });
});

describe("validateEnvelope", () => {
  it("accepts format_version 1", () => {
    const env = buildEnvelope(
      { app_version: "0.1.0", pack_id: "p", pack_version: "1", taxonomy_version: 2, install_id: "i" },
      [],
      new Date().toISOString(),
    );
    expect(validateEnvelope(env)).toBeNull();
  });
  it("rejects other format_versions", () => {
    expect(validateEnvelope({ format_version: 2 })).toContain("format_version");
  });
});

describe("planMerge", () => {
  it("classifies add / duplicate / invalid", () => {
    const plan = planMerge(
      [
        makeEvent({ event_id: "new1" }),
        makeEvent({ event_id: "existing" }),
        { bad: true },
      ],
      new Set(["existing"]),
    );
    expect(plan.added).toBe(1);
    expect(plan.duplicate).toBe(1);
    expect(plan.invalid).toBe(1);
    expect(plan.total).toBe(3);
    expect(plan.toAdd.map((e) => e.event_id)).toEqual(["new1"]);
  });
});
