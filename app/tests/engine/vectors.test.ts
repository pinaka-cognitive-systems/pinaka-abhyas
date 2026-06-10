/**
 * Golden-vector replay THROUGH THE APP INTEGRATION LAYER (W5-3).
 *
 * The engine package ships committed golden vectors (engine-ts/vectors/golden.json)
 * that pin student-facing behaviour; the engine's own CI replays them through the
 * engine API directly. THIS suite replays the SAME vectors through the app's
 * integration layer instead — buildEngineState + the typed selectors — and
 * asserts byte-identical outputs after the same 1e-9 boundary rounding.
 *
 * The point: app-level glue can never silently alter engine behaviour. If the
 * integration layer reshapes an input wrong, drops a field, or reorders
 * anything, the serialized outputs diverge from the frozen vector and this fails.
 *
 * Output serialization (round9, sortKeys, and the per-output serializers) is
 * reproduced here verbatim from engine-ts/vectors/emit.ts. It is duplicated
 * rather than imported because emit.ts imports node:fs/path/url (an emitter
 * concern); the app build and typecheck must stay free of node-only imports.
 * The engine's own vectors.test.ts guards that the emitter's serialization
 * still produces the committed bytes, so the two copies cannot silently drift:
 * if emit.ts changes, the engine suite regenerates golden.json and this suite
 * compares against the new bytes.
 *
 * Fallbacks (clearly marked): the `pack_rekey` scenario needs the engine's
 * re-score table (RescoreRule functions over raw responses), which is an
 * engine-test-internal input the app layer does not — and by ADR 0009 should
 * not — reconstruct from the public vector JSON. That one scenario is replayed
 * through the engine's `replay` directly with the committed re-score table,
 * clearly commented. Every other scenario goes through buildEngineState.
 */

import { describe, expect, it } from "vitest";

import {
  recordServed,
  replay,
  selectNextAction,
  EMPTY_SESSION,
  type Bank,
  type BankItem,
  type Blueprint,
  type EngineState,
  type Event,
  type ItemSchedule,
  type MarkingScheme,
  type NextAction,
  type Readiness,
  type SessionProgress,
  type SkillState,
} from "@pinaka/engine";

import { buildEngineState, nextAction, readiness } from "../../src/engine/index.js";

// The committed vectors. Imported as a typed JSON module (resolveJsonModule),
// so this test needs no node:fs and the app build stays node-free.
import golden from "../../../engine-ts/vectors/golden.json";
// The engine-test-internal re-score table for the pack_rekey fallback only.
import { rekeyRescoreTable } from "../../../engine-ts/vectors/scenarios.js";

const SELECT_COUNT = (golden as GoldenDoc).meta.selectActionsPerScenario;

// ---------------------------------------------------------------------------
// Vector document shape.
// ---------------------------------------------------------------------------

interface GoldenDoc {
  meta: { scenarioCount: number; selectActionsPerScenario: number; roundingQuantum: number };
  scenarios: GoldenScenario[];
}
interface GoldenScenario {
  name: string;
  inputs: GoldenInputs;
  outputs: unknown;
}
interface GoldenInputs {
  nowMs: number;
  examMs: number | null;
  applyRekey: boolean;
  marking: MarkingScheme;
  blueprint: Blueprint;
  bank: RawBankItem[];
  events: RawEvent[];
}
type RawEvent = Event & { response: unknown };
interface RawBankItem {
  id: string;
  tests: string[];
  difficulty_label: BankItem["difficulty_label"];
  item_type: BankItem["item_type"];
  expected_seconds: number;
  verification_status: BankItem["verification_status"];
  empirical?: BankItem["empirical"];
  superseded_by?: string;
  targets_misconceptions?: string[];
}

// ---------------------------------------------------------------------------
// Serialization reproduced verbatim from engine-ts/vectors/emit.ts (see header).
// ---------------------------------------------------------------------------

const QUANTUM = 1e-9;

function round9(x: number): number {
  if (!Number.isFinite(x)) return x;
  const r = Math.round(x / QUANTUM) * QUANTUM;
  return r === 0 ? 0 : r;
}

function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeys(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out as unknown as T;
  }
  return value;
}

function serializeSkill(s: SkillState): unknown {
  return {
    rating: round9(s.rating),
    deviation: round9(s.deviation),
    slowRating: round9(s.slowRating),
    lastEventMs: s.lastEventMs,
    attempts: s.attempts,
  };
}

function serializeSchedule(s: ItemSchedule): unknown {
  return {
    itemId: s.itemId,
    intervalDays: round9(s.intervalDays),
    ease: round9(s.ease),
    lastSeenMs: s.lastSeenMs,
    dueAtMs: round9(s.dueAtMs),
    consecutiveCorrect: s.consecutiveCorrect,
    lapsed: s.lapsed,
  };
}

function serializeState(state: EngineState): unknown {
  const skills: Record<string, unknown> = {};
  for (const node of [...state.skills.keys()].sort()) {
    skills[node] = serializeSkill(state.skills.get(node)!);
  }
  const schedules: Record<string, unknown> = {};
  for (const id of [...state.schedules.keys()].sort()) {
    schedules[id] = serializeSchedule(state.schedules.get(id)!);
  }
  const misconceptions: Record<string, unknown> = {};
  for (const mid of [...state.misconceptions.keys()].sort()) {
    misconceptions[mid] = state.misconceptions.get(mid)!.map((h) => ({
      occurredAtMs: h.occurredAtMs,
      eventId: h.eventId,
      nodes: [...h.nodes],
    }));
  }
  const lastSeenMs: Record<string, number> = {};
  for (const id of [...state.lastSeenMs.keys()].sort()) {
    lastSeenMs[id] = state.lastSeenMs.get(id)!;
  }
  return { skills, schedules, misconceptions, eventCount: state.eventCount, lastSeenMs };
}

function serializeAction(a: NextAction): unknown {
  return { kind: a.kind, itemId: a.itemId, nodeId: a.nodeId, reason: a.reason };
}

function serializeReadiness(r: Readiness): unknown {
  const n = (x: number | null): number | null => (x === null ? null : round9(x));
  return {
    expectedMarks: n(r.expectedMarks),
    low: n(r.low),
    high: n(r.high),
    distanceToPass: n(r.distanceToPass),
    confidence: r.confidence,
    estMinutes: n(r.estMinutes),
    skippedForTime: r.skippedForTime,
    timeFeasible: r.timeFeasible,
    isEstimate: r.isEstimate,
    note: r.note,
  };
}

// ---------------------------------------------------------------------------
// Reconstruct the engine inputs from the committed vector JSON.
// ---------------------------------------------------------------------------

/** Rebuild the engine Bank from the vector's serialized bank. The serialized
 * items are already in BankItem shape; this reconstructs the Map the engine
 * keys on (and the app's loadPack produces). */
function bankFromVector(items: RawBankItem[]): Bank {
  const bank = new Map<string, BankItem>();
  for (const it of items) {
    const out: {
      id: string;
      tests: readonly string[];
      difficulty_label: BankItem["difficulty_label"];
      item_type: BankItem["item_type"];
      expected_seconds: number;
      verification_status: BankItem["verification_status"];
      empirical?: NonNullable<BankItem["empirical"]>;
      superseded_by?: string;
      targets_misconceptions?: readonly string[];
    } = {
      id: it.id,
      tests: [...it.tests],
      difficulty_label: it.difficulty_label,
      item_type: it.item_type,
      expected_seconds: it.expected_seconds,
      verification_status: it.verification_status,
    };
    if (it.empirical !== undefined) out.empirical = it.empirical;
    if (it.superseded_by !== undefined) out.superseded_by = it.superseded_by;
    if (it.targets_misconceptions !== undefined) {
      out.targets_misconceptions = [...it.targets_misconceptions];
    }
    bank.set(it.id, out);
  }
  return bank;
}

/** A LoadedPack-equivalent for the selectors, built from vector inputs. */
function packFromVector(inputs: GoldenInputs): {
  bank: Bank;
  blueprint: Blueprint;
  marking: MarkingScheme;
} {
  return {
    bank: bankFromVector(inputs.bank),
    blueprint: inputs.blueprint,
    marking: inputs.marking,
  };
}

// ---------------------------------------------------------------------------
// The suite.
// ---------------------------------------------------------------------------

const doc = golden as unknown as GoldenDoc;

describe("golden vectors replayed through the app integration layer", () => {
  it("covers exactly the committed scenario set", () => {
    expect(doc.scenarios.length).toBe(doc.meta.scenarioCount);
  });

  for (const scenario of doc.scenarios) {
    it(`${scenario.name}: app-layer outputs match the committed vector`, () => {
      const inputs = scenario.inputs;
      const examMs = inputs.examMs ?? undefined;
      const pack = packFromVector(inputs);

      let state: EngineState;
      if (inputs.applyRekey) {
        // FALLBACK (pack_rekey only): re-scoring needs the engine's RescoreRule
        // functions (closures over the corrected key), which are not — and per
        // ADR 0009 should not be — reconstructable from the public vector JSON.
        // The app's pack-update client (W5-4) supplies a real re-score table
        // through buildEngineState's ReplayOptions in production; here we use
        // the engine-test-internal table directly via the engine's replay so
        // the re-score path is still exercised end to end.
        state = replay(inputs.events, pack.bank, inputs.nowMs, examMs, {
          rescoreTable: rekeyRescoreTable(),
        });
      } else {
        // Every other scenario goes THROUGH the app layer: the storage adapter's
        // StoredEvent[] is the engine Event[], so the vector events feed
        // buildEngineState unchanged.
        state = buildEngineState(inputs.events, pack.bank, inputs.nowMs, examMs);
      }

      // Ten next-action picks, threading session progress exactly as the emitter
      // does (a fixed count of SELECT_COUNT, not stopping early). Goes through the
      // app's nextAction selector for the non-rekey scenarios; for pack_rekey the
      // selector reads the engine-replayed state, which is the same public path.
      const actions: NextAction[] = [];
      let session: SessionProgress = EMPTY_SESSION;
      for (let i = 0; i < SELECT_COUNT; i++) {
        const action = inputs.applyRekey
          ? // pack_rekey: selection over the fallback state, via the engine API
            // the app selector wraps (identical math).
            selectNextAction(state, pack.bank, pack.blueprint, inputs.nowMs, SELECT_COUNT, session)
          : nextAction(state, pack, inputs.nowMs, SELECT_COUNT, session);
        actions.push(action);
        session = recordServed(session, action);
      }

      // Readiness through the app selector (rekey reads the fallback state via
      // the same public computeReadiness the app selector wraps).
      const ready = readiness(state, inputs.events, pack, inputs.nowMs);

      const liveOutputs = sortKeys({
        state: serializeState(state),
        actions: actions.map(serializeAction),
        readiness: serializeReadiness(ready),
      });

      expect(liveOutputs).toEqual(scenario.outputs);
    });
  }
});
