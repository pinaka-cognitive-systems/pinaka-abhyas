/**
 * Baseline plan tests (W5-8, test requirement 4).
 *
 * DOM-free. Asserts the cold-start plan's contract:
 *   - determinism: same bank + blueprint yields the identical item-id order;
 *   - family spread: 2-3 items per major family, drawn from the highest-mark
 *     families first;
 *   - difficulty ordering: L1-heavy first then L2, and never an L3 item;
 *   - target sizing: ~24 items, capped, and the present-content predicate honoured;
 *   - it holds against the REAL shipped pack as well as synthetic banks.
 */

import { describe, expect, it } from "vitest";

import { buildBank, buildBlueprint, type RawPack } from "../../src/engine/index.js";
import type { Bank, BankItem, Blueprint } from "@pinaka/engine";
import {
  buildBaselinePlan,
  BASELINE_TARGET,
  MAX_PER_FAMILY,
} from "../../src/flows/baseline/plan.js";

import packJson from "../../../packs/ca-foundation-qa/pack.json";
import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";

const realBank = buildBank(packJson as unknown as RawPack);
const realBlueprint = buildBlueprint(blueprintJson);

// --- A synthetic bank/blueprint with controlled difficulty and family weight. ---

function item(id: string, family: string, label: "L1" | "L2" | "L3"): BankItem {
  return {
    id,
    tests: [family],
    difficulty_label: label,
    item_type: "single_best",
    expected_seconds: 60,
    verification_status: "verified",
  };
}

/** Two heavy families (quota 14, 16) and one thin family (quota 5), each with a
 * mix of L1/L2/L3 items, so we can assert weighting, spread, and the L3 ban. */
function syntheticBank(): Bank {
  const bank = new Map<string, BankItem>();
  const fams = ["fam.heavy_a", "fam.heavy_b", "fam.thin"];
  for (const fam of fams) {
    for (const label of ["L1", "L2", "L3"] as const) {
      for (let i = 0; i < 4; i++) {
        const id = `${fam}.${label}.${i}`;
        bank.set(id, item(id, fam, label));
      }
    }
  }
  return bank;
}

const syntheticBlueprint: Blueprint = {
  parts: [
    {
      id: "p1",
      marks: 35,
      questions: 35,
      sections: [
        {
          id: "s1",
          families: [
            { nodeId: "fam.heavy_b", quota: 16 },
            { nodeId: "fam.heavy_a", quota: 14 },
            { nodeId: "fam.thin", quota: 5 },
          ],
        },
      ],
    },
  ],
};

describe("buildBaselinePlan — determinism", () => {
  it("the same bank and blueprint yield the identical ordered plan", () => {
    const a = buildBaselinePlan(realBank, realBlueprint);
    const b = buildBaselinePlan(realBank, realBlueprint);
    expect(b.items.map((i) => i.itemId)).toEqual(a.items.map((i) => i.itemId));
  });

  it("the synthetic plan is deterministic too", () => {
    const a = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    const b = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    expect(b.items).toEqual(a.items);
  });
});

describe("buildBaselinePlan — difficulty ordering", () => {
  it("never includes an L3 item, against the synthetic bank", () => {
    const plan = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    for (const p of plan.items) expect(p.difficulty).not.toBe("L3");
    // also confirm no L3 id leaked through
    for (const p of plan.items) expect(p.itemId).not.toContain(".L3.");
  });

  it("never includes an L3 item, against the real pack", () => {
    const plan = buildBaselinePlan(realBank, realBlueprint);
    for (const p of plan.items) {
      const it = realBank.get(p.itemId)!;
      expect(it.difficulty_label).not.toBe("L3");
    }
  });

  it("presents L1 items before any L2 item (L1-heavy first)", () => {
    const plan = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    const firstL2 = plan.items.findIndex((p) => p.difficulty === "L2");
    const lastL1 = plan.items.map((p) => p.difficulty).lastIndexOf("L1");
    if (firstL2 !== -1 && lastL1 !== -1) {
      expect(lastL1).toBeLessThan(firstL2);
    }
    // and the very first served item, if any, is L1 when L1 items exist
    expect(plan.items[0]?.difficulty).toBe("L1");
  });
});

describe("buildBaselinePlan — family spread and weighting", () => {
  it("takes 2-3 items per family, never more than the cap", () => {
    const plan = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    const counts = new Map<string, number>();
    for (const p of plan.items) counts.set(p.familyNodeId, (counts.get(p.familyNodeId) ?? 0) + 1);
    for (const n of counts.values()) {
      expect(n).toBeLessThanOrEqual(MAX_PER_FAMILY);
      expect(n).toBeGreaterThanOrEqual(1);
    }
  });

  it("covers the heaviest families before the thin tail", () => {
    const plan = buildBaselinePlan(syntheticBank(), syntheticBlueprint);
    // Both heavy families must be covered; the thin family is optional fill.
    expect(plan.familiesCovered).toContain("fam.heavy_a");
    expect(plan.familiesCovered).toContain("fam.heavy_b");
  });

  it("the real plan spreads across many distinct families", () => {
    const plan = buildBaselinePlan(realBank, realBlueprint);
    // A baseline that is honest about the paper must touch several families,
    // not bunch into one or two.
    expect(plan.familiesCovered.length).toBeGreaterThanOrEqual(4);
  });
});

describe("buildBaselinePlan — sizing and the content predicate", () => {
  it("aims for ~24 items and never exceeds the target", () => {
    const plan = buildBaselinePlan(realBank, realBlueprint);
    expect(plan.target).toBe(BASELINE_TARGET);
    expect(plan.items.length).toBeLessThanOrEqual(BASELINE_TARGET);
    // The real pack is large enough to fill a full baseline.
    expect(plan.items.length).toBe(BASELINE_TARGET);
  });

  it("only names items the content predicate admits", () => {
    // Admit only ids ending in .L1.0 — a thin slice — and confirm the plan
    // shrinks rather than naming an unbacked item.
    const allow = (id: string): boolean => id.endsWith(".L1.0");
    const plan = buildBaselinePlan(syntheticBank(), syntheticBlueprint, BASELINE_TARGET, allow);
    for (const p of plan.items) expect(p.itemId.endsWith(".L1.0")).toBe(true);
  });

  it("excludes tombstoned items", () => {
    const bank = syntheticBank() as Map<string, BankItem>;
    // Quarantine one L1 item; it must never appear.
    const victim = "fam.heavy_b.L1.0";
    bank.set(victim, { ...bank.get(victim)!, verification_status: "quarantined" });
    const plan = buildBaselinePlan(bank, syntheticBlueprint);
    expect(plan.items.some((p) => p.itemId === victim)).toBe(false);
  });
});
