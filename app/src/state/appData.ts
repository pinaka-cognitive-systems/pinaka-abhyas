/**
 * appData.ts — the shared app snapshot (app/state layer).
 *
 * One cached load of everything the shell and the profile-driven screens
 * read: the event log, the pack, the rebuilt engine state, display names,
 * the data-state classification, the recommendation, the review queue, and
 * the mock history. Flows that mutate the log (practice answers, mock
 * submission, import, delete-all) call invalidateAppSnapshot() so the next
 * read recomputes.
 *
 * This is the app-level realization of the Handout's profile contract: the
 * screens read this snapshot the way the prototype screens read PROFILES.
 * All math lives in engine/insights.ts (pure, tested); this module only
 * loads, joins, and caches.
 */

import type { EngineState, Event, Readiness } from "@pinaka/engine";

import { loadCaPack } from "../engine/caPack.js";
import { buildEngineState } from "../engine/state.js";
import { readiness as computeReadiness } from "../engine/selectors.js";
import type { LoadedPack } from "../engine/pack.js";
import {
  classifyDataState,
  examDateView,
  misconceptionCosts,
  mockHistory,
  readinessView,
  recommend,
  reviewQueue,
  standardNets,
  weakestFamily,
  META_EXAM_DATE,
  META_MOCK_COUNT,
  META_TARGET,
  type DataState,
  type ExamDateView,
  type MisconceptionCost,
  type MockHistoryRow,
  type Recommendation,
  type ReadinessView,
  type ReviewQueueView,
} from "../engine/insights.js";
import { loadMisconceptionNames, loadTopicNames } from "../engine/topics.js";
import { getSharedStorage, type StorageAdapter } from "../storage/index.js";
import {
  parseSession,
  MOCK_SESSION_META_KEY,
  type MockSession,
} from "../flows/mock/state.js";
import { MOCK_RESULTS_META_KEY } from "../flows/mock/results.js";

export interface AppSnapshot {
  readonly adapter: StorageAdapter;
  readonly events: readonly Event[];
  readonly pack: LoadedPack;
  readonly engineState: EngineState;
  readonly topicNames: ReadonlyMap<string, string>;
  readonly misNames: ReadonlyMap<string, string>;
  /** Leaf subtopic count per family id (taxonomy direct children). */
  readonly leavesByFamily: ReadonlyMap<string, number>;

  readonly dataState: DataState;
  readonly mockCount: number;
  readonly history: readonly MockHistoryRow[];
  readonly readiness: Readiness;
  readonly readinessView: ReadinessView | null;
  readonly target: number | null;
  readonly examDate: ExamDateView | null;
  /** An in-progress (interrupted) mock, or null. */
  readonly interrupted: MockSession | null;
  readonly queue: ReviewQueueView;
  readonly reviewsDue: number;
  readonly costs: readonly MisconceptionCost[];
  readonly weakest: { readonly id: string; readonly name: string } | null;
  readonly recommendation: Recommendation;
}

let cache: Promise<AppSnapshot> | null = null;

/** Drop the cached snapshot; the next loadAppSnapshot() recomputes. Call
 * after any event append or meta write that changes derived state. */
export function invalidateAppSnapshot(): void {
  cache = null;
}

/** Load (cached) the shared snapshot. `nowMs` defaults to the wall clock at
 * the boundary, per SPEC 9 (the engine itself never reads a clock). */
export function loadAppSnapshot(nowMs: number = Date.now()): Promise<AppSnapshot> {
  if (cache === null) {
    cache = build(nowMs).catch((err: unknown) => {
      cache = null; // a failed load is never cached
      throw err;
    });
  }
  return cache;
}

async function build(nowMs: number): Promise<AppSnapshot> {
  const [{ adapter }, pack, topicNames, misNames] = await Promise.all([
    getSharedStorage(),
    loadCaPack(),
    loadTopicNames(),
    loadMisconceptionNames(),
  ]);

  const [events, examRaw, targetRaw, mockCountRaw, sessionRaw, resultsRaw] = await Promise.all([
    adapter.readAllEvents(),
    adapter.getMeta(META_EXAM_DATE),
    adapter.getMeta(META_TARGET),
    adapter.getMeta(META_MOCK_COUNT),
    adapter.getMeta(MOCK_SESSION_META_KEY),
    adapter.getMeta(MOCK_RESULTS_META_KEY),
  ]);

  const examDate = examDateView(examRaw, nowMs);
  const engineState = buildEngineState(events, pack.bank, nowMs, examDate?.examMs);
  const r = computeReadiness(engineState, events, pack, nowMs);

  const target = targetRaw !== null && /^\d+$/.test(targetRaw) ? Number(targetRaw) : null;
  const history = mockHistory(resultsRaw, parseCount(mockCountRaw, resultsRaw), nowMs);
  const mockCount = parseCount(mockCountRaw, resultsRaw);
  const dataState = classifyDataState(mockCount, standardNets(history));
  const interrupted = parseSession(sessionRaw);

  const costs = misconceptionCosts(events, pack, misNames, topicNames, nowMs);
  const weakest = weakestFamily(costs, topicNames);
  const queue = reviewQueue(engineState, events, pack.bank, topicNames, misNames, nowMs);

  const recommendation = recommend({
    state: dataState,
    reviewsDue: queue.due.length,
    weakestTopic: weakest?.name ?? null,
    topMisconception:
      costs.length > 0
        ? { name: costs[0]!.name, marksLost: costs[0]!.marksLost, id: costs[0]!.id }
        : null,
    interrupted:
      interrupted !== null
        ? {
            name: `Mock ${String(mockCount + 1).padStart(2, "0")}`,
            answered: Object.keys(interrupted.answers).length,
            total: interrupted.order.length,
          }
        : null,
  });

  return {
    adapter,
    events,
    pack,
    engineState,
    topicNames,
    misNames,
    leavesByFamily: await loadLeafCounts(),
    dataState,
    mockCount,
    history,
    readiness: r,
    readinessView: readinessView(r, target),
    target,
    examDate,
    interrupted,
    queue,
    reviewsDue: queue.due.length,
    costs,
    weakest,
    recommendation,
  };
}

/** Mock count: the meta counter, else the stored-results length (a device
 * that predates the counter undercounts gracefully, never overcounts). */
function parseCount(raw: string | null, resultsRaw: string | null): number {
  if (raw !== null && /^\d+$/.test(raw)) return Number(raw);
  if (resultsRaw === null) return 0;
  try {
    const v: unknown = JSON.parse(resultsRaw);
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

let leafCache: ReadonlyMap<string, number> | null = null;

/** Direct-children counts per taxonomy node (the syllabus "N subtopics"). */
async function loadLeafCounts(): Promise<ReadonlyMap<string, number>> {
  if (leafCache !== null) return leafCache;
  const mod = await import("../../../schema/profiles/ca-foundation-qa/taxonomy.json");
  const nodes = (mod.default as { readonly nodes: readonly { readonly id: string }[] }).nodes;
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const dot = n.id.lastIndexOf(".");
    if (dot === -1) continue;
    const parent = n.id.slice(0, dot);
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }
  leafCache = counts;
  return counts;
}
