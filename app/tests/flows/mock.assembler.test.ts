/**
 * Mock assembler tests (W5-7, test requirement 6).
 *
 * DOM-free. Asserts:
 *   - determinism: the same seed yields the same paper; a different seed differs;
 *   - blueprint proportionality: per family the draw is min(quota, available),
 *     never more than the quota and never more than the bank holds;
 *   - the no-repeat guarantee: every item appears at most once on a paper;
 *   - tombstones are excluded (a quarantined item is never drawn);
 *   - honest sizing against the REAL shipped pack (the 81-item / 100-question
 *     shortfall), and the marking scale (time budget and pass bar proportional).
 */

import { describe, expect, it } from "vitest";

import { buildBank, buildBlueprint, loadPack, type RawBlueprint, type RawMarking, type RawPack } from "../../src/engine/index.js";
import { assembleMock, scaleMarking } from "../../src/flows/mock/assembler.js";

import packJson from "../../../packs/ca-foundation-qa/pack.json";
import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const realPack = loadPack(
  packJson as unknown as RawPack,
  blueprintJson as unknown as RawBlueprint,
  markingJson as unknown as RawMarking,
);
const fullSize = realPack.marking.numQuestions;

describe("assembleMock — determinism", () => {
  it("the same seed produces the identical paper", () => {
    const a = assembleMock(12345, realPack.bank, realPack.blueprint, fullSize);
    const b = assembleMock(12345, realPack.bank, realPack.blueprint, fullSize);
    expect(b.order).toEqual(a.order);
    expect(b.size).toBe(a.size);
  });

  it("different seeds produce different papers (same items, different order/sample)", () => {
    const a = assembleMock(1, realPack.bank, realPack.blueprint, fullSize);
    const b = assembleMock(2, realPack.bank, realPack.blueprint, fullSize);
    // Same honest size, but the order (and, where a family overdraws, the sample)
    // differs; the two orderings must not be identical.
    expect(a.size).toBe(b.size);
    expect(a.order).not.toEqual(b.order);
  });
});

describe("assembleMock — blueprint proportionality", () => {
  it("draws min(quota, available) per family, never more", () => {
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize);
    for (const fam of mock.families) {
      expect(fam.drawn).toBe(Math.min(fam.quota, fam.available));
      expect(fam.drawn).toBeLessThanOrEqual(fam.quota);
      expect(fam.drawn).toBeLessThanOrEqual(fam.available);
    }
  });

  it("the mock size equals the sum of per-family draws", () => {
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize);
    const sum = mock.families.reduce((acc, f) => acc + f.drawn, 0);
    expect(mock.size).toBe(sum);
    expect(mock.order.length).toBe(sum);
  });

  it("assembles the full paper from the shipped bank with zero shortfall", () => {
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize);
    // Since batch B7 the bank fills every blueprint family at quota, so the
    // honest mock IS the full 100-question paper. Shortfall behavior itself
    // stays covered by the synthetic reduced-bank cases below.
    expect(mock.fullPaperSize).toBe(100);
    expect(mock.size).toBe(100);
    expect(mock.shortfall).toBe(0);
  });

  it("surfaces the honest shortfall when a bank cannot fill the quotas", () => {
    // Synthetic bank: one selectable finance item against the full blueprint.
    const raw: RawPack = {
      items: [
        { id: "only1", tests: ["qa.bmath.finance.simple_interest"], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
      ],
    };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson as unknown as RawBlueprint);
    const mock = assembleMock(7, bank, bp, 100);
    expect(mock.fullPaperSize).toBe(100);
    expect(mock.size).toBe(1);
    expect(mock.shortfall).toBe(99);
  });
});

describe("assembleMock — no repeats", () => {
  it("never draws the same item twice on one paper", () => {
    for (const seed of [1, 2, 99, 4242, 0]) {
      const mock = assembleMock(seed, realPack.bank, realPack.blueprint, fullSize);
      const unique = new Set(mock.order);
      expect(unique.size).toBe(mock.order.length);
    }
  });
});

describe("assembleMock — tombstones excluded", () => {
  it("never draws a quarantined item, and the available count excludes it", () => {
    // Build a tiny bank where a finance item is quarantined; it must never appear.
    const raw: RawPack = {
      items: [
        { id: "ok1", tests: ["qa.bmath.finance.simple_interest"], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "dead", tests: ["qa.bmath.finance.compound_interest"], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "quarantined" },
      ],
    };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson as unknown as RawBlueprint);
    const mock = assembleMock(3, bank, bp, 100);
    expect(mock.order).toContain("ok1");
    expect(mock.order).not.toContain("dead");
    const finance = mock.families.find((f) => f.nodeId === "qa.bmath.finance");
    expect(finance?.available).toBe(1); // only ok1 is selectable
  });
});

describe("scaleMarking — proportional budget and bar", () => {
  it("scales the time budget and pass bar by the size ratio; keeps per-question rules", () => {
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize);
    const scaled = scaleMarking(realPack.marking, mock.size);
    // Per-question marking rules are exam constants, unchanged by paper size.
    expect(scaled.marksPerCorrect).toBe(realPack.marking.marksPerCorrect);
    expect(scaled.negativePerWrong).toBe(realPack.marking.negativePerWrong);
    // Size-dependent fields scale proportionally.
    expect(scaled.numQuestions).toBe(mock.size);
    expect(scaled.maxMarks).toBe(mock.size * realPack.marking.marksPerCorrect);
    const ratio = mock.size / realPack.marking.numQuestions;
    expect(scaled.durationMinutes).toBe(Math.round(realPack.marking.durationMinutes * ratio));
    expect(scaled.passMark).toBe(Math.round(realPack.marking.passMark * ratio));
    // The real bank now fills the paper: full clock, full bar.
    expect(scaled.durationMinutes).toBe(realPack.marking.durationMinutes);
    expect(scaled.passMark).toBe(realPack.marking.passMark);
  });

  it("scales the clock and the bar down for a shorter paper", () => {
    const scaled = scaleMarking(realPack.marking, 50);
    expect(scaled.durationMinutes).toBe(Math.round(realPack.marking.durationMinutes * 0.5));
    expect(scaled.passMark).toBe(Math.round(realPack.marking.passMark * 0.5));
    expect(scaled.durationMinutes).toBeLessThan(realPack.marking.durationMinutes);
    expect(scaled.passMark).toBeLessThan(realPack.marking.passMark);
  });
});
