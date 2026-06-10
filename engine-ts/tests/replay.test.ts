/**
 * Replay tests (SPEC 7; ADR 0009).
 *
 * Pinned: replay determinism (bit-identical state from identical inputs),
 * pack transition (removed item drops, superseded item transfers schedule),
 * and re-key re-score (a correct-against-old-key event becomes wrong after the
 * re-score, and mastery reflects it).
 */
import { describe, expect, it } from "vitest";
import { replay, type RescoreRule } from "../src/replay.js";
import type { Bank, BankItem, Event } from "../src/types.js";

const T0 = Date.UTC(2024, 0, 1, 9, 0, 0);
const DAY = 86_400_000;

function item(id: string, extra: Partial<BankItem> = {}): BankItem {
  return {
    id,
    tests: ["qa.bmath.finance"],
    difficulty_label: "L2",
    item_type: "single_best",
    expected_seconds: 75,
    verification_status: "verified",
    ...extra,
  };
}

function evt(id: string, itemId: string, t: number, correct: boolean, extra: Partial<Event> = {}): Event {
  return {
    event_id: id,
    occurredAtMs: t,
    item_id: itemId,
    item_content_hash: "v1",
    taxonomy_version: 2,
    tests: ["qa.bmath.finance"],
    difficulty_label: "L2",
    item_type: "single_best",
    mode: "practice",
    correct,
    selected_misconception: null,
    time_ms: 1000,
    resurfaced: false,
    ...extra,
  };
}

function bankOf(...items: BankItem[]): Bank {
  return new Map(items.map((i) => [i.id, i]));
}

describe("determinism", () => {
  it("same events, bank, and clock produce bit-identical state", () => {
    const bank = bankOf(item("i1"), item("i2"));
    const events = [
      evt("e1", "i1", T0, true),
      evt("e2", "i1", T0 + DAY, true),
      evt("e3", "i2", T0 + 2 * DAY, false, { selected_misconception: "sign_error" }),
    ];
    const a = replay(events, bank, T0 + 3 * DAY);
    const b = replay([...events].reverse(), bank, T0 + 3 * DAY); // order should not matter
    expect(a.eventCount).toBe(b.eventCount);
    expect([...a.skills.entries()]).toEqual([...b.skills.entries()]);
    expect([...a.schedules.entries()]).toEqual([...b.schedules.entries()]);
    expect([...a.misconceptions.entries()]).toEqual([...b.misconceptions.entries()]);
  });

  it("ordering is by instant then event_id, not by input order", () => {
    const bank = bankOf(item("i1"));
    // Two events at the same instant; event_id breaks the tie.
    const e1 = evt("b", "i1", T0, false);
    const e2 = evt("a", "i1", T0, true);
    // Canonical order: a (correct) then b (wrong). Final schedule is a lapse.
    const state = replay([e1, e2], bank, T0 + DAY);
    expect(state.schedules.get("i1")!.lapsed).toBe(true);
  });
});

describe("pack transition (ADR 0009)", () => {
  it("an item removed from the bank mid-history drops its schedule", () => {
    // Event history references i1, but i1 is no longer in the bank.
    const bank = bankOf(item("i2"));
    const events = [evt("e1", "i1", T0, true), evt("e2", "i2", T0 + DAY, true)];
    const state = replay(events, bank, T0 + 2 * DAY);
    expect(state.schedules.has("i1")).toBe(false);
    expect(state.schedules.has("i2")).toBe(true);
    // Mastery still reflects the i1 history (history is never erased).
    expect(state.skills.get("qa.bmath.finance")!.attempts).toBe(2);
  });

  it("a superseded item transfers its schedule to the successor", () => {
    const bank = bankOf(
      item("old", { verification_status: "retired", superseded_by: "new" }),
      item("new"),
    );
    const events = [evt("e1", "old", T0, true), evt("e2", "old", T0 + DAY, true)];
    const state = replay(events, bank, T0 + 2 * DAY);
    expect(state.schedules.has("old")).toBe(false);
    const transferred = state.schedules.get("new")!;
    expect(transferred.itemId).toBe("new");
    expect(transferred.consecutiveCorrect).toBe(2);
  });
});

describe("re-key re-score (ADR 0009)", () => {
  it("an event recorded correct against an old key becomes wrong; mastery reflects it", () => {
    const bank = bankOf(item("i1", { item_type: "single_best" }));
    // Two events, both recorded correct under the OLD key v1.
    const events = [
      evt("e1", "i1", T0, true, { item_content_hash: "v1", response: { choice: "B" } }),
      evt("e2", "i1", T0 + DAY, true, { item_content_hash: "v1", response: { choice: "B" } }),
    ];

    // No re-score: mastery rises (two corrects).
    const before = replay(events, bank, T0 + 2 * DAY);
    const ratingBefore = before.skills.get("qa.bmath.finance")!.rating;
    expect(ratingBefore).toBeGreaterThan(0);

    // The pack re-keys i1: the correct answer is now "C", so choice "B" is WRONG,
    // and it maps to a misconception. The re-score table corrects history.
    const rule: RescoreRule = {
      fromContentHash: "v1",
      rescore: (response) => {
        const choice = (response as { choice: string }).choice;
        return choice === "C"
          ? { correct: true, selected_misconception: null }
          : { correct: false, selected_misconception: "wrong_formula" };
      },
    };
    const after = replay(events, bank, T0 + 2 * DAY, undefined, {
      rescoreTable: new Map([["i1", rule]]),
    });
    const ratingAfter = after.skills.get("qa.bmath.finance")!.rating;

    // Mastery now reflects two WRONG answers: rating is lower than before, below 0.
    expect(ratingAfter).toBeLessThan(ratingBefore);
    expect(ratingAfter).toBeLessThan(0);
    // The misconception is now recorded twice.
    expect(after.misconceptions.get("wrong_formula")!.length).toBe(2);
    // And the schedule reflects a lapse (last outcome wrong).
    expect(after.schedules.get("i1")!.lapsed).toBe(true);
  });

  it("an event whose hash does NOT match the rule's fromHash is left untouched", () => {
    const bank = bankOf(item("i1"));
    const events = [evt("e1", "i1", T0, true, { item_content_hash: "v2", response: { choice: "B" } })];
    const rule: RescoreRule = {
      fromContentHash: "v1", // mismatch: event is v2
      rescore: () => ({ correct: false, selected_misconception: "x" }),
    };
    const state = replay(events, bank, T0 + DAY, undefined, { rescoreTable: new Map([["i1", rule]]) });
    expect(state.skills.get("qa.bmath.finance")!.rating).toBeGreaterThan(0); // still correct
  });
});

describe("taxonomy migration (ADR 0009)", () => {
  it("an old node id is remapped to the new id before folding", () => {
    const bank = bankOf(item("i1"));
    const events = [
      evt("e1", "i1", T0, true, { tests: ["qa.bmath.finance.si"] }), // old id
    ];
    const migration = new Map([["qa.bmath.finance.si", "qa.bmath.finance.simple_interest"]]);
    const state = replay(events, bank, T0 + DAY, undefined, { taxonomyMigration: migration });
    expect(state.skills.has("qa.bmath.finance.simple_interest")).toBe(true);
    expect(state.skills.has("qa.bmath.finance.si")).toBe(false);
  });
});
