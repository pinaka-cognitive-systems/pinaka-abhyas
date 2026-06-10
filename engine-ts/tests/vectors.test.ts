/**
 * Golden-vector regression pin (W1-10; SPEC sections 8 and 9).
 *
 * Loads vectors/golden.json (the committed, deliberately regenerated outputs)
 * and re-runs every scenario live through the SAME public-API path the emitter
 * uses (replay -> 10x selectNextAction -> computeReadiness, with identical 1e-9
 * boundary rounding and key sorting). Any behavioural change that alters a
 * student-facing output fails here, loudly. CI replays this forever.
 *
 * This is the contract from ADR 0010: vectors prove STABILITY (nothing changes
 * student-facing behaviour unnoticed); correctness is proven elsewhere
 * (tests/ certification + refutation/ adversarial pass + W1-12 cross-check).
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildGolden, GOLDEN_PATH, runScenario } from "../vectors/emit.js";
import { SCENARIOS } from "../vectors/scenarios.js";

interface GoldenScenario {
  name: string;
  pins: string;
  seed: number;
  inputs: unknown;
  outputs: unknown;
}
interface GoldenDoc {
  meta: { scenarioCount: number };
  scenarios: GoldenScenario[];
}

const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as GoldenDoc;
const byName = new Map(golden.scenarios.map((s) => [s.name, s]));

describe("golden vectors (regression pin)", () => {
  it("the committed file covers exactly the live scenario set", () => {
    expect(golden.scenarios.length).toBe(SCENARIOS.length);
    expect(golden.meta.scenarioCount).toBe(SCENARIOS.length);
    expect(new Set(byName.keys())).toEqual(new Set(SCENARIOS.map((s) => s.name)));
  });

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: live outputs match the committed vector`, () => {
      const live = runScenario(scenario);
      const committed = byName.get(scenario.name);
      expect(committed, `no committed vector for ${scenario.name}`).toBeDefined();
      // Inputs and outputs must both match the frozen JSON exactly (after the
      // emitter's 1e-9 rounding + key sort, which runScenario already applied).
      expect(live.inputs).toEqual(committed!.inputs);
      expect(live.outputs).toEqual(committed!.outputs);
    });
  }

  it("regenerating the whole document reproduces the committed bytes", () => {
    // Determinism end to end: a fresh full build must equal the committed file
    // byte for byte (no Date.now, no Math.random anywhere in the path).
    const rebuilt = JSON.stringify(buildGolden(), null, 2) + "\n";
    const committed = readFileSync(GOLDEN_PATH, "utf8");
    expect(rebuilt).toBe(committed);
  });
});
