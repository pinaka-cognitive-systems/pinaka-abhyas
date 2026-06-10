/**
 * Baseline handoff + gate tests (W5-8, test requirement 4).
 *
 * DOM-free. Asserts:
 *   - the handoff conditions: shouldShowBaseline is true ONLY for a zero-event
 *     student who has not done the baseline; a student with history, or one who
 *     has completed/skipped, never sees it again;
 *   - the gate arithmetic: a full ~24-event baseline clears the engine's
 *     20-event readiness gate, so the close screen shows the band (with whatever
 *     confidence wording the engine emits), while a short session below 20 stays
 *     insufficient_data.
 */

import { describe, expect, it } from "vitest";

import {
  buildBank,
  buildBlueprint,
  buildMarking,
  buildEngineState,
  readiness as computeReadiness,
  type RawPack,
  type LoadedPack,
} from "../../src/engine/index.js";
import type { Event } from "@pinaka/engine";
import { shouldShowBaseline } from "../../src/flows/baseline/meta.js";
import { buildBaselinePlan } from "../../src/flows/baseline/plan.js";
import { buildContentMap } from "../../src/flows/practice/types.js";
import { buildEvent } from "../../src/flows/practice/event.js";

import packJson from "../../../packs/ca-foundation-qa/pack.json";
import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const pack: LoadedPack = {
  bank: buildBank(packJson as unknown as RawPack),
  blueprint: buildBlueprint(blueprintJson),
  marking: buildMarking(markingJson),
};
const content = buildContentMap(
  (packJson as unknown as { items: Parameters<typeof buildContentMap>[0] }).items,
);

describe("shouldShowBaseline — handoff conditions", () => {
  it("shows the baseline for a fresh student: zero events, not done", () => {
    expect(shouldShowBaseline({ baselineDone: false, eventCount: 0 })).toBe(true);
  });

  it("skips a student who already has history (even if not done)", () => {
    expect(shouldShowBaseline({ baselineDone: false, eventCount: 1 })).toBe(false);
    expect(shouldShowBaseline({ baselineDone: false, eventCount: 50 })).toBe(false);
  });

  it("skips a student who has completed or skipped the baseline (flag set)", () => {
    expect(shouldShowBaseline({ baselineDone: true, eventCount: 0 })).toBe(false);
    expect(shouldShowBaseline({ baselineDone: true, eventCount: 5 })).toBe(false);
  });
});

// --- Gate arithmetic: build a real event log by "answering" the baseline plan. ---

const NOW = Date.UTC(2026, 5, 10);

/** Answer the first `n` plan items correctly, producing real engine events
 * (mode "practice", as the flow does). */
function answerPlan(n: number): Event[] {
  const plan = buildBaselinePlan(pack.bank, pack.blueprint, undefined, (id) => content.has(id));
  const events: Event[] = [];
  for (let i = 0; i < Math.min(n, plan.items.length); i++) {
    const c = content.get(plan.items[i]!.itemId)!;
    const correctKey = c.answer_key.correct ?? c.options[0]?.key ?? 1;
    events.push(
      buildEvent(
        c,
        { kind: "single_best", selected_option: correctKey },
        {
          eventId: `ev-${i}`,
          occurredAtMs: NOW - (n - i) * 60_000,
          timeMs: 45_000,
          viewportWidth: 390,
          resurfaced: false,
          mode: "practice",
        },
      ),
    );
  }
  return events;
}

describe("readiness gate arithmetic — 24-event baseline vs the 20-event gate", () => {
  it("a full baseline (~24 events) clears the 20-event gate", () => {
    const plan = buildBaselinePlan(pack.bank, pack.blueprint, undefined, (id) => content.has(id));
    // The baseline is sized to exceed the 20-event gate.
    expect(plan.items.length).toBeGreaterThanOrEqual(20);

    const events = answerPlan(plan.items.length);
    expect(events.length).toBeGreaterThanOrEqual(20);

    const state = buildEngineState(events, pack.bank, NOW);
    const r = computeReadiness(state, events, pack, NOW);
    // The 20-event arm of the gate is cleared: confidence is no longer gated by
    // event count. (It MAY still be insufficient on the coverage arm — that is
    // the engine's call; we assert the event-count arm did not trip.)
    if (r.confidence === "insufficient_data") {
      // If still insufficient, it must be coverage, not the event count.
      expect(r.note.toLowerCase()).toContain("coverage");
    } else {
      // Cleared: a real band is reported.
      expect(r.expectedMarks).not.toBeNull();
      expect(r.low).not.toBeNull();
      expect(r.high).not.toBeNull();
    }
  });

  it("a short session below 20 events stays insufficient_data on the count arm", () => {
    const events = answerPlan(10);
    expect(events.length).toBe(10);
    const state = buildEngineState(events, pack.bank, NOW);
    const r = computeReadiness(state, events, pack, NOW);
    expect(r.confidence).toBe("insufficient_data");
    expect(r.expectedMarks).toBeNull();
  });
});
