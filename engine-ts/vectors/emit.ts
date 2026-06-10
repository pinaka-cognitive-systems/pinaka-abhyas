/**
 * Golden-vector emitter (W1-10; SPEC sections 8 and 9).
 *
 * Run from engine-ts/ with:  npx -y tsx vectors/emit.ts
 *
 * Runs every scenario (vectors/scenarios.ts) through the public engine API:
 *   replay -> a sequence of 10 selectNextAction calls -> computeReadiness,
 * then writes vectors/golden.json. Every exported float is rounded at the
 * boundary to 1e-9 (SPEC 9); object keys are sorted so diffs stay clean; the
 * generation date is the EMITTED_AT constant, never a wall clock (SPEC 9).
 *
 * The shared scenario module and the rounding/serialization helpers below are
 * imported by tests/vectors.test.ts so the regression pin re-runs the IDENTICAL
 * computation and compares against the committed JSON.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { replay } from "../src/replay.js";
import {
  EMPTY_SESSION,
  recordServed,
  selectNextAction,
  type SessionProgress,
} from "../src/selector.js";
import { computeReadiness } from "../src/readiness.js";
import type { EngineState, Event, ItemSchedule, NextAction, Readiness } from "../src/types.js";
import type { SkillState } from "../src/mastery.js";
import {
  EMITTED_AT,
  rekeyRescoreTable,
  type Scenario,
  SCENARIOS,
  SPEC_VERSION,
} from "./scenarios.js";

const QUANTUM = 1e-9;
const SELECT_COUNT = 10;

/** Round a float to the 1e-9 vector boundary (SPEC 9). Integers and non-finite
 * values pass through unchanged. -0 is normalized to 0 so JSON is canonical. */
export function round9(x: number): number {
  if (!Number.isFinite(x)) return x;
  const r = Math.round(x / QUANTUM) * QUANTUM;
  return r === 0 ? 0 : r;
}

/** Recursively sort object keys so JSON.stringify yields a canonical, diff-clean
 * ordering regardless of insertion order. Arrays keep their order. */
export function sortKeys<T>(value: T): T {
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

// --- Serialization of inputs (events + bank) to plain, stable JSON. ---

function serializeEvent(e: Event): unknown {
  return {
    event_id: e.event_id,
    occurredAtMs: e.occurredAtMs,
    item_id: e.item_id,
    item_content_hash: e.item_content_hash,
    taxonomy_version: e.taxonomy_version,
    tests: [...e.tests],
    difficulty_label: e.difficulty_label,
    item_type: e.item_type,
    mode: e.mode,
    correct: e.correct,
    selected_misconception: e.selected_misconception,
    response: e.response ?? null,
    time_ms: e.time_ms,
    resurfaced: e.resurfaced,
  };
}

function serializeBank(bank: Scenario["bank"]): unknown[] {
  const ids = [...bank.keys()].sort();
  return ids.map((id) => {
    const it = bank.get(id)!;
    const obj: Record<string, unknown> = {
      id: it.id,
      tests: [...it.tests],
      difficulty_label: it.difficulty_label,
      item_type: it.item_type,
      expected_seconds: it.expected_seconds,
      verification_status: it.verification_status,
    };
    if (it.empirical !== undefined) obj.empirical = it.empirical;
    if (it.superseded_by !== undefined) obj.superseded_by = it.superseded_by;
    if (it.targets_misconceptions !== undefined) {
      obj.targets_misconceptions = [...it.targets_misconceptions];
    }
    return obj;
  });
}

// --- Serialization of outputs (state, actions, readiness) with 1e-9 rounding. ---

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
  return {
    skills,
    schedules,
    misconceptions,
    eventCount: state.eventCount,
    lastSeenMs,
  };
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

/** Run one scenario through the full public API and return its serialized
 * inputs + outputs. Shared by the emitter and the regression test. */
export function runScenario(scenario: Scenario): {
  name: string;
  pins: string;
  seed: number;
  inputs: unknown;
  outputs: unknown;
} {
  const options = scenario.applyRekey
    ? { rescoreTable: rekeyRescoreTable() }
    : scenario.taxonomyMigration !== undefined
      ? { taxonomyMigration: scenario.taxonomyMigration }
      : undefined;

  const state = replay(scenario.events, scenario.bank, scenario.nowMs, scenario.examMs, options);

  // A sequence of 10 next-action picks, threading session progress so the
  // review budget is enforced without mutation or a wall clock (SPEC 5).
  const actions: NextAction[] = [];
  let session: SessionProgress = EMPTY_SESSION;
  for (let i = 0; i < SELECT_COUNT; i++) {
    const action = selectNextAction(
      state,
      scenario.bank,
      scenario.blueprint,
      scenario.nowMs,
      SELECT_COUNT,
      session,
    );
    actions.push(action);
    session = recordServed(session, action);
  }

  const readiness = computeReadiness(
    state,
    scenario.events,
    scenario.bank,
    scenario.blueprint,
    scenario.marking,
    scenario.nowMs,
  );

  const inputs = {
    nowMs: scenario.nowMs,
    examMs: scenario.examMs ?? null,
    applyRekey: scenario.applyRekey,
    marking: {
      marksPerCorrect: scenario.marking.marksPerCorrect,
      negativePerWrong: scenario.marking.negativePerWrong,
      marksPerUnattempted: scenario.marking.marksPerUnattempted,
      numQuestions: scenario.marking.numQuestions,
      passMark: scenario.marking.passMark,
      durationMinutes: scenario.marking.durationMinutes,
    },
    blueprint: scenario.blueprint,
    bank: serializeBank(scenario.bank),
    events: scenario.events.map(serializeEvent),
  };

  const outputs = {
    state: serializeState(state),
    actions: actions.map(serializeAction),
    readiness: serializeReadiness(readiness),
  };

  return {
    name: scenario.name,
    pins: scenario.pins,
    seed: scenario.seed,
    inputs: sortKeys(inputs),
    outputs: sortKeys(outputs),
  };
}

/** Build the full golden document (meta + every scenario). */
export function buildGolden(): unknown {
  const scenarios = SCENARIOS.map(runScenario);
  return sortKeys({
    meta: {
      specVersion: SPEC_VERSION,
      emittedAt: EMITTED_AT,
      scenarioCount: scenarios.length,
      selectActionsPerScenario: SELECT_COUNT,
      roundingQuantum: QUANTUM,
    },
    scenarios,
  });
}

export const GOLDEN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden.json",
);

function main(): void {
  const golden = buildGolden();
  const json = JSON.stringify(golden, null, 2) + "\n";
  writeFileSync(GOLDEN_PATH, json, "utf8");
  process.stdout.write(`Wrote ${GOLDEN_PATH} (${SCENARIOS.length} scenarios)\n`);
}

// Run only when invoked directly (not when imported by the test).
const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main();
}
