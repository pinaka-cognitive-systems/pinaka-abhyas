/**
 * Event construction completeness + validity (W5-5 flow a, test requirement 5).
 *
 * The uqs-event-2 record built from an answer must be COMPLETE and structurally
 * valid against the engine `Event` type, for BOTH item types. These tests assert
 * every required field is present and correctly typed, that the engine can fold
 * the event (replay accepts it and counts it), and that scoring + misconception
 * resolution are correct for single_best and numeric_entry. DOM-free.
 */

import { describe, expect, it } from "vitest";

import { buildEngineState } from "../../src/engine/index.js";
import type { Event } from "@pinaka/engine";
import {
  buildEvent,
  deviceContext,
  formFactor,
  scoreResponse,
  type EventInputs,
} from "../../src/flows/practice/event.js";
import { toContentItem, type ContentItem } from "../../src/flows/practice/types.js";

/** A single_best content item with a mapped misconception on option 2. */
const SBT: ContentItem = toContentItem({
  id: "arn_test_sb",
  content_hash: "a".repeat(64),
  taxonomy_version: 4,
  tests: ["qa.bmath.finance.compound_interest"],
  difficulty_label: "L2",
  item_type: "single_best",
  stem: "A sum of Rs 20,000 at 10% per annum compounded annually for 2 years earns what compound interest?",
  options: [
    { key: 1, text: "Rs 4,200" },
    { key: 2, text: "Rs 4,000" },
    { key: 3, text: "Rs 2,000" },
    { key: 4, text: "Rs 4,420" },
  ],
  answer_key: { correct: 1 },
  per_option_rationale: [
    { option_key: 1, verdict: "correct", rationale: "Compounds on the grown principal." },
    {
      option_key: 2,
      verdict: "incorrect",
      rationale: "You applied simple interest to a compounding question.",
      misconception: "compound_interest_confusion",
    },
  ],
  explanation:
    "Year 1 interest is 2,000 and the principal becomes 22,000. Year 2 interest is 2,200 on the grown principal. The compound interest is 4,200.",
});

/** A numeric_entry content item (none ship today; the flow must still handle it). */
const NUM: ContentItem = toContentItem({
  id: "arn_test_num",
  content_hash: "b".repeat(64),
  taxonomy_version: 4,
  tests: ["qa.bmath.equations.quadratic"],
  difficulty_label: "L1",
  item_type: "numeric_entry",
  stem: "Solve for the positive root of x squared minus 9 equals 0.",
  options: [],
  answer_key: { value: 3, tolerance: 0 },
  per_option_rationale: [],
  explanation: "x squared equals 9, so the positive root is 3.",
});

const BASE_INPUTS: EventInputs = {
  eventId: "11111111-1111-4111-8111-111111111111",
  occurredAtMs: Date.UTC(2026, 5, 10, 9, 0, 0),
  timeMs: 42_000,
  viewportWidth: 360,
  resurfaced: false,
  mode: "practice",
};

/** Assert an Event has every required uqs-event-2 / engine field, correctly
 * typed. This is the COMPLETENESS gate. */
function assertCompleteEvent(e: Event): void {
  expect(typeof e.event_id).toBe("string");
  expect(e.event_id.length).toBeGreaterThan(0);
  expect(typeof e.occurredAtMs).toBe("number");
  expect(Number.isFinite(e.occurredAtMs)).toBe(true);
  expect(typeof e.item_id).toBe("string");
  expect(typeof e.item_content_hash).toBe("string");
  expect(e.item_content_hash.length).toBe(64);
  expect(typeof e.taxonomy_version).toBe("number");
  expect(Array.isArray(e.tests)).toBe(true);
  expect(e.tests.length).toBeGreaterThan(0);
  expect(["L1", "L2", "L3"]).toContain(e.difficulty_label);
  expect(["single_best", "numeric_entry"]).toContain(e.item_type);
  expect(e.mode).toBe("practice");
  expect(typeof e.correct).toBe("boolean");
  // selected_misconception is string|null — the property must exist.
  expect(e.selected_misconception === null || typeof e.selected_misconception === "string").toBe(
    true,
  );
  expect(e.response).not.toBeUndefined();
  expect(typeof e.time_ms).toBe("number");
  expect(e.time_ms).toBeGreaterThanOrEqual(0);
  expect(typeof e.resurfaced).toBe("boolean");
  expect(e.device_context).not.toBeUndefined();
  const dc = e.device_context as { form_factor: string; viewport_width: number };
  expect(["phone", "tablet", "desktop"]).toContain(dc.form_factor);
  expect(typeof dc.viewport_width).toBe("number");
}

describe("form-factor heuristic", () => {
  it("classifies by viewport width at the documented breakpoints", () => {
    expect(formFactor(360)).toBe("phone");
    expect(formFactor(599)).toBe("phone");
    expect(formFactor(600)).toBe("tablet");
    expect(formFactor(899)).toBe("tablet");
    expect(formFactor(900)).toBe("desktop");
    expect(deviceContext(360)).toEqual({ form_factor: "phone", viewport_width: 360 });
  });
});

describe("single_best event construction", () => {
  it("a correct answer builds a complete, valid event with no misconception", () => {
    const e = buildEvent(SBT, { kind: "single_best", selected_option: 1 }, BASE_INPUTS);
    assertCompleteEvent(e);
    expect(e.correct).toBe(true);
    expect(e.selected_misconception).toBeNull();
    expect(e.item_type).toBe("single_best");
    expect(e.response).toEqual({ selected_option: 1 });
    expect(e.item_content_hash).toBe(SBT.content_hash);
    expect(e.tests).toEqual(["qa.bmath.finance.compound_interest"]);
  });

  it("a wrong answer resolves the chosen option's mapped misconception", () => {
    const e = buildEvent(SBT, { kind: "single_best", selected_option: 2 }, BASE_INPUTS);
    assertCompleteEvent(e);
    expect(e.correct).toBe(false);
    expect(e.selected_misconception).toBe("compound_interest_confusion");
    expect(e.response).toEqual({ selected_option: 2 });
  });

  it("a wrong answer on an option with no mapped misconception yields null", () => {
    const e = buildEvent(SBT, { kind: "single_best", selected_option: 4 }, BASE_INPUTS);
    expect(e.correct).toBe(false);
    expect(e.selected_misconception).toBeNull();
  });

  it("the engine folds the constructed event (replay accepts and counts it)", () => {
    const e = buildEvent(SBT, { kind: "single_best", selected_option: 2 }, BASE_INPUTS);
    const bank = new Map([
      [
        SBT.id,
        {
          id: SBT.id,
          tests: SBT.tests,
          difficulty_label: SBT.difficulty_label,
          item_type: SBT.item_type,
          expected_seconds: 75,
          verification_status: "verified" as const,
        },
      ],
    ]);
    const state = buildEngineState([e], bank, BASE_INPUTS.occurredAtMs + 1000);
    expect(state.eventCount).toBe(1);
    expect(state.skills.size).toBeGreaterThan(0);
  });
});

describe("numeric_entry event construction", () => {
  it("an exact numeric answer builds a complete, valid correct event", () => {
    const e = buildEvent(NUM, { kind: "numeric_entry", entered_value: 3 }, BASE_INPUTS);
    assertCompleteEvent(e);
    expect(e.correct).toBe(true);
    expect(e.selected_misconception).toBeNull();
    expect(e.item_type).toBe("numeric_entry");
    expect(e.response).toEqual({ entered_value: 3 });
  });

  it("a wrong numeric answer outside tolerance is incorrect", () => {
    const e = buildEvent(NUM, { kind: "numeric_entry", entered_value: 4 }, BASE_INPUTS);
    assertCompleteEvent(e);
    expect(e.correct).toBe(false);
  });

  it("scoring honours an explicit tolerance", () => {
    const tol = toContentItem({
      ...NUM,
      answer_key: { value: 3.14, tolerance: 0.01 },
    });
    expect(scoreResponse(tol, { kind: "numeric_entry", entered_value: 3.145 }).correct).toBe(true);
    expect(scoreResponse(tol, { kind: "numeric_entry", entered_value: 3.2 }).correct).toBe(false);
  });
});

describe("device context + resurfaced flag", () => {
  it("a desktop viewport and resurfaced review are recorded faithfully", () => {
    const e = buildEvent(
      SBT,
      { kind: "single_best", selected_option: 1 },
      { ...BASE_INPUTS, viewportWidth: 1280, resurfaced: true },
    );
    expect(e.resurfaced).toBe(true);
    expect((e.device_context as { form_factor: string }).form_factor).toBe("desktop");
    expect((e.device_context as { viewport_width: number }).viewport_width).toBe(1280);
  });
});
