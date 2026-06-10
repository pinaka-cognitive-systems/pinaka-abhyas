/**
 * Pack-loader unit tests (W5-3).
 *
 * Exercises the app-owned transform that turns the pack build artifact and the
 * profile blueprint/marking JSON into the engine's Bank, Blueprint, and
 * MarkingScheme. This logic is NOT covered by the golden vectors (the vectors
 * carry already-shaped engine inputs), so it is pinned here against the real
 * fixture pack and the real profile JSON.
 */

import { describe, expect, it } from "vitest";

import {
  buildBank,
  buildBlueprint,
  buildMarking,
  loadPack,
  type RawBlueprint,
  type RawMarking,
  type RawPack,
} from "../../src/engine/index.js";

import packJson from "../fixtures/pack.json";
import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const pack = packJson as unknown as RawPack;
const blueprint = blueprintJson as unknown as RawBlueprint;
const marking = markingJson as unknown as RawMarking;

describe("buildBank", () => {
  it("maps every fixture item into the bank, keyed by id", () => {
    const bank = buildBank(pack);
    expect(bank.size).toBe(pack.items.length);
    for (const item of pack.items) {
      expect(bank.has(item.id)).toBe(true);
    }
  });

  it("derives targets_misconceptions from incorrect-option rationales, sorted", () => {
    const bank = buildBank(pack);
    // Item 1 (compound interest) targets three misconceptions across its
    // distractors per the real pack data.
    const first = bank.get("arn_caf_qa_000001")!;
    expect(first.targets_misconceptions).toEqual([
      "arithmetic_slip",
      "compound_interest_confusion",
      "rate_period_mismatch",
    ]);
  });

  it("collapses the machine_verified label to a selectable engine status", () => {
    const bank = buildBank(pack);
    for (const item of bank.values()) {
      // The fixture's items are all machine_verified -> verified (selectable).
      expect(item.verification_status).toBe("verified");
    }
  });

  it("omits the empirical block when no difficulty_b or avg_seconds is present", () => {
    const bank = buildBank(pack);
    // The fixture carries only calibration bookkeeping (none/0), not engine
    // empirical fields, so empirical must be undefined (not an empty object).
    for (const item of bank.values()) {
      expect(item.empirical).toBeUndefined();
    }
  });
});

describe("buildBlueprint", () => {
  it("splits each section's derived target across its families, summing exactly", () => {
    const bp = buildBlueprint(blueprint);
    for (let p = 0; p < blueprint.parts.length; p++) {
      const rawPart = blueprint.parts[p]!;
      const part = bp.parts[p]!;
      for (let s = 0; s < rawPart.sections.length; s++) {
        const rawSection = rawPart.sections[s] as { derived_target_questions?: number };
        const target =
          rawSection.derived_target_questions ??
          Math.round(rawPart.questions / rawPart.sections.length);
        const sum = part.sections[s]!.families.reduce((acc, f) => acc + f.quota, 0);
        expect(sum).toBe(target);
      }
    }
  });

  it("preserves part marks and question totals", () => {
    const bp = buildBlueprint(blueprint);
    expect(bp.parts.map((p) => p.marks)).toEqual([40, 20, 40]);
    expect(bp.parts.map((p) => p.questions)).toEqual([40, 20, 40]);
  });
});

describe("buildMarking", () => {
  it("maps the CA Foundation QA marking scheme from the profile JSON", () => {
    const m = buildMarking(marking);
    expect(m).toEqual({
      marksPerCorrect: 1,
      negativePerWrong: 0.25,
      marksPerUnattempted: 0,
      numQuestions: 100,
      passMark: 40,
      durationMinutes: 120,
    });
  });
});

describe("loadPack", () => {
  it("produces all three engine inputs from the real fixture + profile", () => {
    const loaded = loadPack(pack, blueprint, marking);
    expect(loaded.bank.size).toBe(5);
    expect(loaded.blueprint.parts.length).toBe(3);
    expect(loaded.marking.passMark).toBe(40);
  });
});
