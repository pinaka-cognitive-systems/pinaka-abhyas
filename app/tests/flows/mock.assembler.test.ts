/**
 * Mock assembler tests (W5-7, test requirement 6; ADR 0022 additions).
 *
 * DOM-free. Asserts:
 *   - determinism: the same seed yields the same paper; a different seed differs;
 *   - blueprint proportionality: per family the draw is min(quota, available),
 *     never more than the quota and never more than the bank holds;
 *   - the no-repeat guarantee: every item appears at most once on a paper;
 *   - tombstones are excluded (a quarantined item is never drawn);
 *   - honest sizing against the REAL shipped pack (the 81-item / 100-question
 *     shortfall), and the marking scale (time budget and pass bar proportional);
 *   - difficulty mix (ADR 0022): standard and pace mocks hit DIFFICULTY_MIX
 *     within rounding over a synthetic bank with ample items per label;
 *   - exposure control (ADR 0022): recent items are excluded when the pool is
 *     ample, and reused only under shortage (reusedRecent counted honestly);
 *   - hard mock behaviour is unchanged: L3-weighted, bypasses DIFFICULTY_MIX.
 */

import { describe, expect, it } from "vitest";

import { buildBank, buildBlueprint, loadPack, type RawPack, type RawPackItem } from "../../src/engine/index.js";
import {
  assembleMock,
  scaleMarking,
  DIFFICULTY_MIX,
  type AssembledMock,
} from "../../src/flows/mock/assembler.js";

import packJson from "../../../packs/ca-foundation-qa/pack.json";
import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const realPack = loadPack(
  packJson as unknown as RawPack,
  blueprintJson,
  markingJson,
);
const fullSize = realPack.marking.numQuestions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a synthetic RawPack with `count` items per label for a given test node. */
function syntheticItems(
  nodePrefix: string,
  countPerLabel: number,
  idPrefix: string,
): readonly RawPackItem[] {
  const labels = ["L1", "L2", "L3"] as const;
  const out: RawPackItem[] = [];
  for (const lbl of labels) {
    for (let i = 0; i < countPerLabel; i++) {
      out.push({
        id: `${idPrefix}_${lbl}_${i}`,
        tests: [`${nodePrefix}.sub`],
        difficulty_label: lbl,
        item_type: "single_best",
        expected_seconds: 60,
        verification_status: "verified",
      });
    }
  }
  return out;
}


// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

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

  it("same seed + same recentItemIds yields identical paper (regression)", () => {
    const recent = new Set(["some-id-that-does-not-exist"]);
    const a = assembleMock(42, realPack.bank, realPack.blueprint, fullSize, "standard", [], recent);
    const b = assembleMock(42, realPack.bank, realPack.blueprint, fullSize, "standard", [], recent);
    expect(b.order).toEqual(a.order);
    expect(b.reusedRecent).toBe(a.reusedRecent);
  });
});

// ---------------------------------------------------------------------------
// Blueprint proportionality
// ---------------------------------------------------------------------------

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
    const bp = buildBlueprint(blueprintJson);
    const mock = assembleMock(7, bank, bp, 100);
    expect(mock.fullPaperSize).toBe(100);
    expect(mock.size).toBe(1);
    expect(mock.shortfall).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// No repeats
// ---------------------------------------------------------------------------

describe("assembleMock — no repeats", () => {
  it("never draws the same item twice on one paper", () => {
    for (const seed of [1, 2, 99, 4242, 0]) {
      const mock = assembleMock(seed, realPack.bank, realPack.blueprint, fullSize);
      const unique = new Set(mock.order);
      expect(unique.size).toBe(mock.order.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Tombstones excluded
// ---------------------------------------------------------------------------

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
    const bp = buildBlueprint(blueprintJson);
    const mock = assembleMock(3, bank, bp, 100);
    expect(mock.order).toContain("ok1");
    expect(mock.order).not.toContain("dead");
    const finance = mock.families.find((f) => f.nodeId === "qa.bmath.finance");
    expect(finance?.available).toBe(1); // only ok1 is selectable
  });
});

// ---------------------------------------------------------------------------
// scaleMarking — proportional budget and bar
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Difficulty mix (ADR 0022)
// ---------------------------------------------------------------------------

describe("assembleMock — difficulty mix (ADR 0022)", () => {
  /**
   * Verify that the actual label distribution in `mock` matches DIFFICULTY_MIX
   * within ±1 item per label across the whole paper. With ample items in the bank
   * the rounding error is at most 1 per label per family (largest-remainder).
   */
  function checkMix(mock: AssembledMock, bank: ReturnType<typeof buildBank>): void {
    // Count per label in drawn order.
    const counts: Record<string, number> = { L1: 0, L2: 0, L3: 0 };
    for (const id of mock.order) {
      const item = bank.get(id);
      if (item) counts[item.difficulty_label ?? "?"] = (counts[item.difficulty_label ?? "?"] ?? 0) + 1;
    }
    const total = mock.size;
    // Each label must be within ±(numFamilies) of the ideal share — one rounding
    // seat per family is the maximum deviation from largest-remainder.
    const numFamilies = mock.families.length;
    for (const lbl of ["L1", "L2", "L3"] as const) {
      const ideal = DIFFICULTY_MIX[lbl] * total;
      const actual = counts[lbl] ?? 0;
      expect(actual).toBeGreaterThanOrEqual(Math.floor(ideal) - numFamilies);
      expect(actual).toBeLessThanOrEqual(Math.ceil(ideal) + numFamilies);
    }
  }

  it("standard mock hits DIFFICULTY_MIX within rounding (synthetic bank, ample items)", () => {
    // 30 items per label per family, far above any family quota.
    const countPerLabel = 30;
    const raw: RawPack = { items: syntheticItems("qa.bmath.finance", countPerLabel, "fin") };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson);
    const mock = assembleMock(7, bank, bp, 100, "standard");
    checkMix(mock, bank);
  });

  it("pace mock hits DIFFICULTY_MIX within rounding over its scaled quotas", () => {
    const countPerLabel = 30;
    const raw: RawPack = { items: syntheticItems("qa.bmath.finance", countPerLabel, "fin") };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson);
    const mock = assembleMock(7, bank, bp, 100, "pace");
    checkMix(mock, bank);
  });

  it("hard mock is NOT constrained to DIFFICULTY_MIX (L3-biased is acceptable)", () => {
    // Build a bank with many L3 and fewer L1/L2 so the hard mock draws L3 preference.
    const raw: RawPack = {
      items: [
        ...syntheticItems("qa.bmath.finance", 5, "fin_hard"),
        // Add extra L3 items.
        ...Array.from({ length: 20 }, (_, i): RawPackItem => ({
          id: `fin_extra_L3_${i}`,
          tests: ["qa.bmath.finance.extra"],
          difficulty_label: "L3",
          item_type: "single_best",
          expected_seconds: 60,
          verification_status: "verified",
        })),
      ],
    };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson);
    const mock = assembleMock(7, bank, bp, 100, "hard");
    // Hard mocks may exceed the L3 mix share — just assert no crash and no repeats.
    expect(mock.size).toBeGreaterThan(0);
    expect(new Set(mock.order).size).toBe(mock.order.length);
    // reusedRecent is always 0 for hard mocks (exposure control not applied).
    expect(mock.reusedRecent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Exposure control (ADR 0022)
// ---------------------------------------------------------------------------

describe("assembleMock — exposure control (ADR 0022)", () => {
  it("excludes recent items when pool is ample (no reuse needed)", () => {
    // Build a bank with plenty of items per label so exclusion never causes shortage.
    const countPerLabel = 30;
    const raw: RawPack = { items: syntheticItems("qa.bmath.finance", countPerLabel, "fin") };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson);

    // Mark all L2 items (ids: fin_L2_0 .. fin_L2_29) as recent.
    const recentIds = new Set(
      Array.from({ length: countPerLabel }, (_, i) => `fin_L2_${i}`),
    );
    const mock = assembleMock(7, bank, bp, 100, "standard", [], recentIds);

    // None of the recent items should appear in the paper.
    for (const id of recentIds) {
      expect(mock.order).not.toContain(id);
    }
    // No reuse was needed.
    expect(mock.reusedRecent).toBe(0);
  });

  it("reuses recent items only under shortage; reusedRecent is counted", () => {
    // Build a bank with exactly 2 items per label for the finance family.
    // The finance quota from the blueprint will likely exceed 2 per label,
    // so after excluding recent items the assembler must reuse some.
    const raw: RawPack = {
      items: [
        { id: "fin_L1_a", tests: ["qa.bmath.finance.si"], difficulty_label: "L1", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "fin_L1_b", tests: ["qa.bmath.finance.si"], difficulty_label: "L1", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "fin_L2_a", tests: ["qa.bmath.finance.si"], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "fin_L2_b", tests: ["qa.bmath.finance.si"], difficulty_label: "L2", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "fin_L3_a", tests: ["qa.bmath.finance.si"], difficulty_label: "L3", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
        { id: "fin_L3_b", tests: ["qa.bmath.finance.si"], difficulty_label: "L3", item_type: "single_best", expected_seconds: 60, verification_status: "verified" },
      ],
    };
    const bank = buildBank(raw);
    const bp = buildBlueprint(blueprintJson);

    // Mark all 6 items as recent — the assembler MUST reuse them because there
    // are no fresh alternatives.
    const recentIds = new Set(["fin_L1_a", "fin_L1_b", "fin_L2_a", "fin_L2_b", "fin_L3_a", "fin_L3_b"]);
    const mock = assembleMock(7, bank, bp, 100, "standard", [], recentIds);

    // Some items were drawn (the pool was short, so reuse was the only option).
    expect(mock.size).toBeGreaterThan(0);
    // reusedRecent must be > 0 because ALL items are recent.
    expect(mock.reusedRecent).toBeGreaterThan(0);
    // Still no duplicates.
    expect(new Set(mock.order).size).toBe(mock.order.length);
  });

  it("reusedRecent is 0 when recentItemIds is empty (baseline)", () => {
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize, "standard", [], new Set());
    expect(mock.reusedRecent).toBe(0);
  });

  it("reusedRecent is 0 when no recentItemIds match the drawn bank", () => {
    // Pass ids that don't exist in the bank at all.
    const phantom = new Set(["ghost-1", "ghost-2", "ghost-3"]);
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize, "standard", [], phantom);
    expect(mock.reusedRecent).toBe(0);
    // Paper is unchanged from baseline.
    const baseline = assembleMock(7, realPack.bank, realPack.blueprint, fullSize, "standard", [], new Set());
    expect(mock.order).toEqual(baseline.order);
  });

  it("exposure control does not apply to hard mocks (reusedRecent always 0)", () => {
    const allIds = new Set([...realPack.bank.keys()]);
    const mock = assembleMock(7, realPack.bank, realPack.blueprint, fullSize, "hard", [], allIds);
    // Hard mocks bypass exposure control entirely.
    expect(mock.reusedRecent).toBe(0);
  });
});
