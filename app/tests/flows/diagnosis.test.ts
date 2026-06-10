/**
 * Diagnosis + readiness flow logic (W5-5 flow c, test requirement 5).
 *
 * The flow LOGIC, tested directly without a DOM (the repo convention):
 *   - state selection (empty / early / ready),
 *   - band formatting and the readiness honesty rules,
 *   - the never-a-bare-point-estimate rule and the insufficient-data path,
 *   - mastery grouping by blueprint part/section,
 *   - the too-few-attempts heuristic (deviation near prior),
 *   - the recurring-misconceptions ranking with marks framing,
 *   - and a real-engine check that a fresh student is gated and the engine note
 *     never contains the forbidden "predicted score" string.
 * DOM-free: no jsdom dep.
 */

import { describe, expect, it } from "vitest";

import {
  PRIOR_DEVIATION,
  PRIOR_RATING,
  NUM_QUESTIONS,
  type Blueprint,
  type EngineState,
  type MisconceptionHit,
  type Readiness,
} from "@pinaka/engine";
import {
  buildEngineState,
  loadPack,
  readiness as computeReadiness,
  masteryByNode,
  type LoadedPack,
  type NodeMastery,
  type RawBlueprint,
  type RawMarking,
  type RawPack,
} from "../../src/engine/index.js";
import {
  confidenceLabel,
  formatBand,
  formatDistanceToPass,
  formatTimeLine,
  groupByBlueprint,
  nodeLabel,
  nodeMasteryView,
  readinessView,
  recurringMisconceptions,
  selectDiagnosisState,
  TOO_FEW_DEVIATION_FRACTION,
} from "../../src/flows/diagnosis/diagnosis.js";

import blueprintJson from "../../../schema/profiles/ca-foundation-qa/blueprint.json";
import markingJson from "../../../schema/profiles/ca-foundation-qa/marking.json";

const NOW = Date.UTC(2026, 5, 10, 9, 0, 0);

// ---------------------------------------------------------------------------
// Fixtures.
// ---------------------------------------------------------------------------

/** A readiness object with overridable fields (defaults: a healthy, ungated
 * estimate). */
function readinessFixture(over: Partial<Readiness> = {}): Readiness {
  return {
    expectedMarks: 52,
    low: 44,
    high: 60,
    distanceToPass: 12,
    confidence: "low",
    estMinutes: 110,
    skippedForTime: 0,
    timeFeasible: true,
    isEstimate: true,
    note: "All figures are estimates; parameters are provisional until calibration.",
    ...over,
  };
}

const GATED: Readiness = readinessFixture({
  expectedMarks: null,
  low: null,
  high: null,
  distanceToPass: null,
  confidence: "insufficient_data",
  estMinutes: null,
  skippedForTime: null,
  timeFeasible: null,
  note: "Fewer than 20 events recorded. Keep practising — a number appears once there is enough data.",
});

function node(over: Partial<NodeMastery> & { nodeId: string }): NodeMastery {
  return { rating: PRIOR_RATING, deviation: 0.4, observed: true, ...over };
}

// ---------------------------------------------------------------------------
// State selection.
// ---------------------------------------------------------------------------

describe("selectDiagnosisState", () => {
  it("is empty when there are no events, regardless of confidence", () => {
    expect(selectDiagnosisState(0, "insufficient_data")).toBe("empty");
    expect(selectDiagnosisState(0, "medium")).toBe("empty");
  });

  it("is early when there are events but the data gate is not cleared", () => {
    expect(selectDiagnosisState(5, "insufficient_data")).toBe("early");
  });

  it("is ready once confidence clears the gate", () => {
    expect(selectDiagnosisState(40, "low")).toBe("ready");
    expect(selectDiagnosisState(40, "medium")).toBe("ready");
  });
});

// ---------------------------------------------------------------------------
// Confidence label — only the three the engine emits; never "good"/"high".
// ---------------------------------------------------------------------------

describe("confidenceLabel", () => {
  it("maps exactly the three engine confidence tiers", () => {
    expect(confidenceLabel("low")).toBe("Low confidence");
    expect(confidenceLabel("medium")).toBe("Medium confidence");
    expect(confidenceLabel("insufficient_data")).toBe("Not enough data yet");
  });

  it("never produces the words 'good' or 'high'", () => {
    for (const c of ["low", "medium", "insufficient_data"] as const) {
      expect(confidenceLabel(c).toLowerCase()).not.toContain("good");
      expect(confidenceLabel(c).toLowerCase()).not.toContain("high");
    }
  });
});

// ---------------------------------------------------------------------------
// HONESTY RULE: readiness is always a band, never a bare point estimate.
// ---------------------------------------------------------------------------

describe("formatBand — never a bare point estimate", () => {
  it("renders a low-to-high range, not a single number", () => {
    const band = formatBand(readinessFixture(), NUM_QUESTIONS);
    expect(band).not.toBeNull();
    expect(band).toBe("44 to 60 marks out of 100");
    // It is a range: it must contain both bounds joined by 'to'.
    expect(band).toMatch(/\d+ to \d+/);
  });

  it("STILL renders a range even when low equals high (degenerate band)", () => {
    // The honesty rule forbids ever emitting a lone number; a zero-width band is
    // shown as "N to N", not "N".
    const band = formatBand(
      readinessFixture({ low: 50, high: 50, expectedMarks: 50 }),
      NUM_QUESTIONS,
    );
    expect(band).toBe("50 to 50 marks out of 100");
    expect(band).toMatch(/\bto\b/);
  });

  it("withholds the band entirely below the data threshold (returns null)", () => {
    expect(formatBand(GATED, NUM_QUESTIONS)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HONESTY RULE: insufficient-data path withholds every number.
// ---------------------------------------------------------------------------

describe("readinessView — insufficient-data path", () => {
  it("gates the view, withholds the band, and shows the engine note verbatim", () => {
    const view = readinessView(GATED, NUM_QUESTIONS);
    expect(view.gated).toBe(true);
    expect(view.band).toBeNull();
    expect(view.distanceToPass).toBeNull();
    expect(view.timeLine).toBeNull();
    expect(view.confidenceLabel).toBe("Not enough data yet");
    // The note is passed through verbatim (honesty line lives in the engine).
    expect(view.note).toBe(GATED.note);
  });

  it("an ungated view carries the band, distance, confidence, and verbatim note", () => {
    const r = readinessFixture({ note: "Time permitting, attempt everything. X." });
    const view = readinessView(r, NUM_QUESTIONS);
    expect(view.gated).toBe(false);
    expect(view.band).toBe("44 to 60 marks out of 100");
    expect(view.confidenceLabel).toBe("Low confidence");
    expect(view.note).toBe(r.note); // verbatim, never paraphrased
  });

  it("no rendered string in either view contains 'predicted score'", () => {
    for (const r of [GATED, readinessFixture()]) {
      const view = readinessView(r, NUM_QUESTIONS);
      const strings = [
        view.band ?? "",
        view.confidenceLabel,
        view.distanceToPass ?? "",
        view.timeLine ?? "",
        view.note,
      ]
        .join(" ")
        .toLowerCase();
      expect(strings).not.toContain("predicted score");
    }
  });
});

describe("formatDistanceToPass / formatTimeLine", () => {
  it("frames distance as marks above/below the pass mark", () => {
    expect(formatDistanceToPass(readinessFixture({ distanceToPass: 12 }))).toMatch(
      /12 marks above/,
    );
    expect(formatDistanceToPass(readinessFixture({ distanceToPass: -8 }))).toMatch(
      /8 marks below/,
    );
    expect(formatDistanceToPass(readinessFixture({ distanceToPass: 0 }))).toMatch(
      /at the pass mark/i,
    );
    expect(formatDistanceToPass(GATED)).toBeNull();
  });

  it("frames any time-skip as a time decision, never an ability verdict", () => {
    const line = formatTimeLine(readinessFixture({ estMinutes: 120, skippedForTime: 3 }));
    expect(line).toMatch(/time decision/);
    expect(line).toMatch(/not an ability verdict/);
    expect(formatTimeLine(readinessFixture({ estMinutes: 100, skippedForTime: 0 }))).toBe(
      "Estimated attempt time about 100 min.",
    );
    expect(formatTimeLine(GATED)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Node labels + mastery view + too-few heuristic.
// ---------------------------------------------------------------------------

describe("nodeLabel", () => {
  it("title-cases the leaf segment of a node id", () => {
    expect(nodeLabel("qa.bmath.ratio_indices_log")).toBe("Ratio Indices Log");
    expect(nodeLabel("qa.bmath.finance")).toBe("Finance");
    expect(nodeLabel("standalone")).toBe("Standalone");
  });
});

describe("nodeMasteryView — too-few-attempts heuristic (deviation near prior)", () => {
  it("flags an unobserved node as too few attempts", () => {
    const v = nodeMasteryView(node({ nodeId: "qa.bmath.finance", observed: false }));
    expect(v.tooFew).toBe(true);
  });

  it("flags a node whose deviation is still near the prior as too few", () => {
    const nearPrior = PRIOR_DEVIATION * (TOO_FEW_DEVIATION_FRACTION + 0.01);
    const v = nodeMasteryView(
      node({ nodeId: "qa.bmath.finance", deviation: nearPrior, observed: true }),
    );
    expect(v.tooFew).toBe(true);
  });

  it("does NOT flag a node that has moved well off the prior deviation", () => {
    const v = nodeMasteryView(
      node({ nodeId: "qa.bmath.finance", rating: 1.2, deviation: 0.4, observed: true }),
    );
    expect(v.tooFew).toBe(false);
    // The interval is ordered and the point estimate sits inside it.
    expect(v.low).toBeLessThanOrEqual(v.p);
    expect(v.p).toBeLessThanOrEqual(v.high);
    expect(v.p).toBeGreaterThan(0);
    expect(v.p).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// Grouping by blueprint part/section.
// ---------------------------------------------------------------------------

function caBlueprint(): Blueprint {
  return loadPack(
    { items: [] } as unknown as RawPack,
    blueprintJson as unknown as RawBlueprint,
    markingJson as unknown as RawMarking,
  ).blueprint;
}

describe("groupByBlueprint", () => {
  const blueprint = caBlueprint();

  it("groups observed nodes under their blueprint part and section, dropping empties", () => {
    const mastery: NodeMastery[] = [
      node({ nodeId: "qa.bmath.finance", rating: 1.0 }),
      node({ nodeId: "qa.stats.probability", rating: 0.5 }),
    ];
    const parts = groupByBlueprint(mastery, blueprint);
    const partIds = parts.map((p) => p.partId);
    // Only parts that contain an observed node appear; qa.lr has none here.
    expect(partIds).toContain("qa.bmath");
    expect(partIds).toContain("qa.stats");
    expect(partIds).not.toContain("qa.lr");
    // Each surviving part carries its marks for marks framing.
    const bmath = parts.find((p) => p.partId === "qa.bmath")!;
    expect(bmath.marks).toBe(40);
    // Finance lives alone in section II.
    const sectionWithFinance = bmath.sections.find((s) =>
      s.nodes.some((n) => n.nodeId === "qa.bmath.finance"),
    );
    expect(sectionWithFinance).toBeDefined();
  });

  it("attributes a deeper-leaf node to its blueprint family", () => {
    const mastery: NodeMastery[] = [
      node({ nodeId: "qa.bmath.finance.compound_interest", rating: 1.0 }),
    ];
    const parts = groupByBlueprint(mastery, blueprint);
    const bmath = parts.find((p) => p.partId === "qa.bmath");
    expect(bmath).toBeDefined();
    const found = bmath!.sections.some((s) =>
      s.nodes.some((n) => n.nodeId === "qa.bmath.finance.compound_interest"),
    );
    expect(found).toBe(true);
  });

  it("returns an empty array when no observed node maps to the blueprint", () => {
    const mastery: NodeMastery[] = [node({ nodeId: "qa.unweighted.misc" })];
    expect(groupByBlueprint(mastery, blueprint)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Recurring misconceptions with marks framing.
// ---------------------------------------------------------------------------

function hit(eventId: string): MisconceptionHit {
  return { occurredAtMs: NOW, eventId, nodes: ["qa.bmath.finance"] };
}

function stateWithMisconceptions(
  map: Record<string, number>,
): EngineState {
  const misconceptions = new Map<string, readonly MisconceptionHit[]>();
  for (const [id, count] of Object.entries(map)) {
    misconceptions.set(
      id,
      Array.from({ length: count }, (_, i) => hit(`${id}_${i}`)),
    );
  }
  return {
    skills: new Map(),
    schedules: new Map(),
    misconceptions,
    eventCount: Object.values(map).reduce((a, b) => a + b, 0),
    lastSeenMs: new Map(),
  };
}

describe("recurringMisconceptions", () => {
  it("ranks by marks lost (count x negative-marking penalty), costliest first", () => {
    const state = stateWithMisconceptions({
      si_ci_swap: 4, // 4 * 0.25 = 1.00 marks
      decimal_slip: 2, // 2 * 0.25 = 0.50 marks
    });
    const out = recurringMisconceptions(state);
    expect(out.map((m) => m.id)).toEqual(["si_ci_swap", "decimal_slip"]);
    expect(out[0]!.marks).toBeCloseTo(1.0, 5);
    expect(out[1]!.marks).toBeCloseTo(0.5, 5);
    expect(out[0]!.count).toBe(4);
  });

  it("excludes a single occurrence — one slip is not a recurring pattern", () => {
    const state = stateWithMisconceptions({ one_off: 1, recurring: 2 });
    const out = recurringMisconceptions(state);
    expect(out.map((m) => m.id)).toEqual(["recurring"]);
  });

  it("returns an empty list when nothing recurs", () => {
    expect(recurringMisconceptions(stateWithMisconceptions({}))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Real-engine integration: the fresh-student honesty path end to end.
// ---------------------------------------------------------------------------

function caPack(): LoadedPack {
  return loadPack(
    { items: [] } as unknown as RawPack,
    blueprintJson as unknown as RawBlueprint,
    markingJson as unknown as RawMarking,
  );
}

describe("real-engine honesty path (fresh student)", () => {
  it("a fresh student is gated, the view withholds every number, and the note has no 'predicted score'", () => {
    const pack = caPack();
    const state = buildEngineState([], pack.bank, NOW);
    const r = computeReadiness(state, [], pack, NOW);
    const mastery = masteryByNode(state, NOW);

    // State selection: no events -> empty.
    expect(selectDiagnosisState(state.eventCount, r.confidence)).toBe("empty");

    // The view is gated and shows no number.
    const view = readinessView(r, NUM_QUESTIONS);
    expect(view.gated).toBe(true);
    expect(view.band).toBeNull();

    // The engine note (rendered verbatim) never contains the forbidden phrase.
    expect(view.note.toLowerCase()).not.toContain("predicted score");

    // No observed node exists yet, so the grouped map is empty (no fake zeros).
    expect(masteryByNode).toBeTypeOf("function");
    expect(groupByBlueprint(mastery, pack.blueprint)).toEqual([]);
  });
});
