/**
 * MockFlow — the full mock experience rebuilt to design parity (2026-06-12).
 *
 * ROUTE CONTRACT (router.tsx is already wired — do not edit):
 *   #/mock          renders inside AppShell (hub, always, even with zero history)
 *   #/mock/{sub}    renders full-window (hall, reveal, breakdown, review)
 *
 * Sub-route vocabulary (owned here):
 *   mock            hub
 *   mock/start      pre-mock (honesty content, type carry-through)
 *   mock/hall       exam hall
 *   mock/reveal     score reveal
 *   mock/breakdown  breakdown (i = 0, newest)
 *   mock/breakdown/N breakdown for result index N (0-based, newest-first)
 *   mock/review     review (i = 0)
 *   mock/review/N   review for result index N
 *
 * Internal guards: hall only when a live session exists, else redirect to hub.
 * Reveal/breakdown/review require loadedRef to be populated.
 *
 * The selected mock type is carried through sessionStorage ("mock_type_v1") so
 * the pre-mock screen and the start action know what to assemble.
 *
 * HONESTY DEVIATIONS (kept from the existing implementation, per KEEP ruling):
 *   - Pre-mock interstitial with device note, shortfall details, and distraction
 *     shield (design has none; restyled to design system).
 *   - Shortfall-sized papers when the bank cannot fill 100 questions.
 *   - Resume banner in the hall (ADR 0009 wall-clock honesty).
 *   - Expired session: surfaced on the hub as a card rather than auto-submitted.
 *
 * MOCK TYPES (Handout §10):
 *   standard  mode "mock" → anchors readiness
 *   hard      mode "drill" → mastery learns, readiness does not anchor
 *   pace      mode "drill", 50q / 45min
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { buildEngineState } from "../../engine/state.js";
import { readiness as computeReadiness } from "../../engine/selectors.js";
import type { LoadedPack } from "../../engine/pack.js";
import type { Readiness } from "@pinaka/engine";
import { getSharedStorage, type StorageAdapter } from "../../storage/index.js";
import { getExamMs } from "../firstrun/meta.js";
import { loadCaContent } from "../practice/content.js";
import type { ContentItem } from "../practice/types.js";
import {
  assembleMock,
  scaleMarking,
  type AssembledMock,
  type ScaledMarking,
  type MockAssemblyType,
} from "./assembler.js";
import {
  answeredCount,
  isTimeUp,
  MOCK_SESSION_META_KEY,
  parseSession,
  remainingMs,
  resumeNote,
  serializeSession,
  withAnswer,
  withAnswerAndUnstrike,
  withClearedAnswer,
  withToggledFlag,
  withToggledStrike,
  withVisited,
  type MockSession,
} from "./state.js";
import {
  buildSubmissionBatch,
  scoreMock,
  waterfall,
  misconceptionsByShare,
  insightText,
  type FamilyRef,
  type MockScore,
  type WaterfallModel,
  type MisconceptionRow,
  type InsightModel,
} from "./scoring.js";
import {
  appendResult,
  parseResults,
  serializeResults,
  MOCK_RESULTS_META_KEY,
  type MockResultRecord,
  type MockSummary,
} from "./results.js";
import {
  loadTopicNames,
  loadMisconceptionNames,
  topicLabel,
  fallbackTopicLabel,
} from "../../engine/topics.js";
import { META_MOCK_COUNT, META_DISCARDED_SESSION, relativeDate } from "../../engine/insights.js";
import {
  deviceNote,
  formFactor,
  lengthSummary,
  shieldChecklist,
  shortfallLines,
  type BatteryReading,
} from "./premock.js";
import { acquireMockGuard, releaseMockGuard } from "./guard.js";
import { MockReview } from "./MockReview.js";
import { Icon, Caveat, ScreenHead, Sheet } from "../../components/ui.js";
import { navigate, readRoute } from "../../components/navigate.js";
import { invalidateAppSnapshot } from "../../state/appData.js";
import "./mock.css";

// ---------------------------------------------------------------------------
// MOCK_TYPES — verbatim from design-team/v2/data.jsx:24-50
// ---------------------------------------------------------------------------

interface MockTypeSpec {
  readonly id: MockAssemblyType;
  readonly name: string;
  readonly tag: string;
  readonly icon: "clipboard" | "trend-up" | "clock";
  readonly line: string;
  readonly spec: readonly [string, string, string, string];
  readonly detail: string;
  readonly estimate: boolean;
}

const MOCK_TYPES: readonly MockTypeSpec[] = [
  {
    id: "standard", name: "Standard", tag: "Exam pattern",
    icon: "clipboard",
    line: "The real paper. ICAI section weightage, application-level, full timing.",
    spec: ["100 questions", "2 hours", "−0.25 per wrong", "Blueprint-weighted"],
    detail: "Mirrors the ICAI May 2025 pattern: 40 Business Mathematics, 20 Logical Reasoning, 40 Statistics, all at application level. This is the score that maps to the 40 pass bar.",
    estimate: true,
  },
  {
    id: "hard", name: "Hard", tag: "Practice difficulty",
    icon: "trend-up",
    line: "Same blueprint, skewed to L3 and trap-heavy items that bait your misconceptions.",
    spec: ["100 questions", "2 hours", "−0.25 per wrong", "L3-weighted, trap-dense"],
    detail: "Built from the items your wrong answers cluster around. Expect harder method choices and more questions that punish the errors in your diagnosis. Your net here will read below a standard mock. That is the point.",
    estimate: false,
  },
  {
    id: "pace", name: "Pace", tag: "Practice speed",
    icon: "clock",
    line: "Shorter, on a tight per-question budget. Builds the time discipline the real paper demands.",
    spec: ["50 questions", "45 minutes", "−0.25 per wrong", "54s per question"],
    detail: "Half length on roughly two-thirds the per-question time. Slow questions are flagged in the breakdown so you can see where time, not knowledge, costs you marks.",
    estimate: false,
  },
] as const;

// ---------------------------------------------------------------------------
// SessionStorage key for carrying the selected type through navigation
// ---------------------------------------------------------------------------

const MOCK_TYPE_KEY = "mock_type_v1";

function readSelectedType(): MockAssemblyType {
  try {
    const v = sessionStorage.getItem(MOCK_TYPE_KEY);
    if (v === "hard" || v === "pace") return v;
  } catch { /* ignore */ }
  return "standard";
}

function writeSelectedType(t: MockAssemblyType): void {
  try { sessionStorage.setItem(MOCK_TYPE_KEY, t); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function familyRefs(pack: LoadedPack): FamilyRef[] {
  const out: FamilyRef[] = [];
  for (const part of pack.blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) out.push({ partId: part.id, nodeId: fam.nodeId });
    }
  }
  return out;
}

function viewportWidth(): number {
  return typeof window === "undefined" ? 360 : window.innerWidth;
}

function nextSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function firstUnanswered(session: MockSession): number {
  for (let i = 0; i < session.order.length; i++) {
    if (session.answers[session.order[i]!] === undefined) return i;
  }
  return 0;
}

/**
 * Build the exposure-control exclusion set from the two most recent stored
 * mock results. Items drawn on those papers are deprioritised in the next
 * assembly so the student is less likely to re-encounter the same questions
 * from memory (ADR 0022).
 */
function recentItemIdsFromResults(results: readonly MockResultRecord[]): ReadonlySet<string> {
  const ids = new Set<string>();
  const limit = Math.min(2, results.length);
  for (let i = 0; i < limit; i++) {
    for (const id of results[i]!.session.order) {
      ids.add(id);
    }
  }
  return ids;
}

/** Derive "Mock NN" name from mockCount + result index (0 = newest). */
function mockName(mockCount: number, idx: number): string {
  return `Mock ${String(Math.max(1, mockCount - idx)).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Loaded {
  readonly pack: LoadedPack;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly adapter: StorageAdapter;
  readonly names: ReadonlyMap<string, string>;
  readonly misNames: ReadonlyMap<string, string>;
}

// Sub-route parsing
function parseSubRoute(): { sub: string; idx: number } {
  const route = readRoute();
  const parts = route.split("/");
  const sub = parts[1] ?? "";
  const idx = parts[2] !== undefined ? Math.max(0, parseInt(parts[2], 10) || 0) : 0;
  return { sub, idx };
}

export interface MockFlowProps {
  readonly onExit: () => void;
}

// ---------------------------------------------------------------------------
// MockFlow — the top-level component
// ---------------------------------------------------------------------------

export function MockFlow({ onExit }: MockFlowProps): JSX.Element {
  const loadedRef = useRef<Loaded | null>(null);
  const sessionRef = useRef<MockSession | null>(null);
  const completedSessionRef = useRef<MockSession | null>(null);
  // Assembled mock + marking: assembled at boot, rebuilt on start
  const assembledRef = useRef<{ mock: AssembledMock; marking: ScaledMarking } | null>(null);
  const examMsRef = useRef<number | undefined>(undefined);
  const guardHeldRef = useRef<boolean>(false);
  const questionStartRef = useRef<number>(0);
  const mockCountRef = useRef<number>(0);
  // True only when the live session is being re-entered (loaded from storage
  // at boot, or via the hub's Resume button after Save & exit). start() and
  // discard reset it. This is the ONLY signal for the hall's welcome-back
  // note; a fresh attempt never shows it.
  const resumedRef = useRef<boolean>(false);
  const resultsRef = useRef<readonly MockResultRecord[]>([]);
  const scoreRef = useRef<{ score: MockScore; before: Readiness; after: Readiness } | null>(null);

  // Route state: drives re-renders on hash change (value read via parseSubRoute).
  const [, setRoute] = useState<string>(readRoute);
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for hash changes from navigate()
  useEffect(() => {
    const onHash = (): void => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Boot: load pack + content + storage. Does NOT assemble a mock yet (hub is
  // synchronous; assembly happens when the student actually clicks Begin).
  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      const [{ loadCaPack }, content, names, misNames] = await Promise.all([
        import("../../engine/caPack.js"),
        loadCaContent(),
        loadTopicNames(),
        loadMisconceptionNames(),
      ]);
      const pack = await loadCaPack();
      const { adapter } = await getSharedStorage();
      if (cancelled) return;
      examMsRef.current = await getExamMs(adapter);

      // Load results and mock count.
      const [resultsRaw, mockCountRaw] = await Promise.all([
        adapter.getMeta(MOCK_RESULTS_META_KEY),
        adapter.getMeta(META_MOCK_COUNT),
      ]);
      resultsRef.current = parseResults(resultsRaw);
      mockCountRef.current = typeof mockCountRaw === "string" && mockCountRaw !== ""
        ? (parseInt(mockCountRaw, 10) || 0)
        : 0;

      loadedRef.current = { pack, content, adapter, names, misNames };

      // Pre-assemble a standard mock so the hub is not slow when Begin is clicked.
      const preType = readSelectedType();
      const preRecent = recentItemIdsFromResults(resultsRef.current);
      const preMock = assembleMock(nextSeed(), pack.bank, pack.blueprint, pack.marking.numQuestions, preType, [], preRecent);
      const preMarking = scaleMarking(pack.marking, preMock.size, preType);
      assembledRef.current = { mock: preMock, marking: preMarking };

      // If there is a live session and the hash is already mock/hall, honour it.
      // Otherwise, if there is a live session and we are at #/mock, the hub will
      // render the resume/expired banner — we do NOT auto-navigate.
      const stored = parseSession(await adapter.getMeta(MOCK_SESSION_META_KEY));
      if (stored !== null) {
        sessionRef.current = stored;
        // A session loaded from storage is by definition a resume: the hall
        // shows the wall-clock note exactly when this flag is set, never on
        // a time heuristic (a fresh attempt must never read "welcome back").
        resumedRef.current = true;
        acquireMockGuard();
        guardHeldRef.current = true;
      }

      if (cancelled) return;
      // Ready only once the stored session is also known: the hall route
      // gates on `ready`, and flipping it before the session read would let
      // the hall mount against an empty ref and bounce a real resume.
      setReady(true);
    }

    boot().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : "The mock could not start.");
    });

    return () => {
      cancelled = true;
      if (guardHeldRef.current) {
        releaseMockGuard();
        guardHeldRef.current = false;
      }
    };
  }, []);

  const persist = useCallback(async (session: MockSession): Promise<void> => {
    sessionRef.current = session;
    const loaded = loadedRef.current;
    if (loaded === null) return;
    await loaded.adapter.setMeta(MOCK_SESSION_META_KEY, serializeSession(session));
    // The shared snapshot carries the in-progress session (Today's recovery
    // banner reads it); every persisted change must drop the cache.
    invalidateAppSnapshot();
  }, []);

  const start = useCallback(async (type: MockAssemblyType): Promise<void> => {
    const loaded = loadedRef.current;
    if (loaded === null) return;
    writeSelectedType(type);
    // Re-assemble if the type changed since pre-assembly.
    let assembled = assembledRef.current;
    if (assembled === null || (loaded.pack.marking.numQuestions > 0)) {
      const recent = recentItemIdsFromResults(resultsRef.current);
      const m = assembleMock(nextSeed(), loaded.pack.bank, loaded.pack.blueprint, loaded.pack.marking.numQuestions, type, [], recent);
      const mk = scaleMarking(loaded.pack.marking, m.size, type);
      assembled = { mock: m, marking: mk };
      assembledRef.current = assembled;
    }
    const nowMs = Date.now();
    const session: MockSession = {
      id: crypto.randomUUID(),
      seed: assembled.mock.seed,
      order: assembled.mock.order,
      fullPaperSize: assembled.mock.fullPaperSize,
      budgetMs: assembled.marking.durationMinutes * 60_000,
      startedAtMs: nowMs,
      answers: {},
      flagged: [],
      struck: {},
      activeMs: 0,
      formFactor: formFactor(viewportWidth()),
      viewportWidth: viewportWidth(),
      visited: [],
      mockType: type,
    };
    if (!guardHeldRef.current) {
      acquireMockGuard();
      guardHeldRef.current = true;
    }
    resumedRef.current = false; // a fresh attempt is never a resume
    await persist(session);
    questionStartRef.current = nowMs;
    navigate("mock/hall");
  }, [persist]);

  const flushVisit = useCallback(
    (session: MockSession, itemId: string, picked: number | null): MockSession => {
      const nowMs = Date.now();
      const visitMs = Math.max(0, nowMs - questionStartRef.current);
      questionStartRef.current = nowMs;
      if (picked === null) {
        const prior = session.answers[itemId];
        if (prior === undefined) return session;
        return withAnswer(session, itemId, prior.selectedOption, visitMs);
      }
      return withAnswer(session, itemId, picked, visitMs);
    },
    [],
  );

  const submit = useCallback(async (nowMs: number): Promise<void> => {
    const loaded = loadedRef.current;
    const session = sessionRef.current;
    if (loaded === null || session === null) {
      setError("The mock state was lost before it could be scored.");
      return;
    }
    const assembled = assembledRef.current;
    if (assembled === null) {
      setError("The marking scheme was not available.");
      return;
    }

    const priorEvents = await loaded.adapter.readAllEvents();
    const beforeState = buildEngineState(priorEvents, loaded.pack.bank, nowMs, examMsRef.current);
    const before = computeReadiness(beforeState, priorEvents, loaded.pack, nowMs);

    const eventIds = session.order.map(() => crypto.randomUUID());
    const batch = buildSubmissionBatch(session, loaded.content, { eventIds, occurredAtMs: nowMs });
    await loaded.adapter.appendEvents(batch.events);

    const score = scoreMock(session, loaded.content, assembled.marking, familyRefs(loaded.pack));
    const afterEvents = await loaded.adapter.readAllEvents();
    const afterState = buildEngineState(afterEvents, loaded.pack.bank, nowMs, examMsRef.current);
    const after = computeReadiness(afterState, afterEvents, loaded.pack, nowMs);

    completedSessionRef.current = session;
    scoreRef.current = { score, before, after };

    // Increment mock count.
    const newCount = mockCountRef.current + 1;
    mockCountRef.current = newCount;
    await loaded.adapter.setMeta(META_MOCK_COUNT, String(newCount));

    // Build and persist the schema-2 result record.
    const summary: MockSummary = {
      net: score.net,
      correct: score.correct,
      wrong: score.wrong,
      skipped: score.skipped,
      penalty: score.penalty,
      denominator: score.maxMarks,
      type: session.mockType ?? "standard",
    };
    const newRecord: MockResultRecord = {
      schema: 2,
      finishedAtMs: nowMs,
      session,
      before,
      after,
      summary,
    };
    const updatedResults = appendResult(resultsRef.current, newRecord);
    resultsRef.current = updatedResults;
    await loaded.adapter.setMeta(MOCK_RESULTS_META_KEY, serializeResults(updatedResults));

    // Clear in-progress session and release guard.
    await loaded.adapter.setMeta(MOCK_SESSION_META_KEY, "");
    sessionRef.current = null;
    resumedRef.current = false;
    if (guardHeldRef.current) {
      releaseMockGuard();
      guardHeldRef.current = false;
    }
    invalidateAppSnapshot();
    navigate("mock/reveal");
  }, []);

  // ---------------------------------------------------------------------------
  // Route dispatch
  // ---------------------------------------------------------------------------

  if (error !== null) {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <section role="alert">
              <p className="screen__lede">The mock could not start</p>
              <p className="screen__lede" style={{ marginTop: "var(--space-3)" }}>{error}</p>
              <div style={{ marginTop: "var(--space-5)" }}>
                <button type="button" className="sa-btn sa-btn--primary" onClick={onExit}>
                  Back to home
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  const { sub, idx } = parseSubRoute();
  const loaded = loadedRef.current;

  // Hub (route === "mock")
  if (!sub) {
    return (
      <MocksHub
        results={resultsRef.current}
        mockCount={mockCountRef.current}
        session={sessionRef.current}
        ready={ready}
        onStart={(type) => {
          writeSelectedType(type);
          navigate("mock/start");
        }}
        onResume={() => {
          resumedRef.current = true;
          navigate("mock/hall");
        }}
        onBreakdown={(i) => {
          // Load the score for this result index
          if (loaded === null) return;
          const record = resultsRef.current[i];
          if (record === undefined) return;
          const assembled = assembledRef.current;
          const marking = scaleMarking(loaded.pack.marking, record.session.order.length, record.session.mockType ?? "standard");
          const score = scoreMock(record.session, loaded.content, marking, familyRefs(loaded.pack));
          completedSessionRef.current = record.session;
          scoreRef.current = { score, before: record.before, after: record.after };
          assembledRef.current = { mock: { seed: record.session.seed, order: record.session.order, size: record.session.order.length, fullPaperSize: record.session.fullPaperSize, families: assembled?.mock.families ?? [], shortfall: 0, reusedRecent: 0 }, marking };
          navigate(i === 0 ? "mock/breakdown" : `mock/breakdown/${i}`);
        }}
        onReview={(i) => {
          if (loaded === null) return;
          const record = resultsRef.current[i];
          if (record === undefined) return;
          const marking = scaleMarking(loaded.pack.marking, record.session.order.length, record.session.mockType ?? "standard");
          const score = scoreMock(record.session, loaded.content, marking, familyRefs(loaded.pack));
          completedSessionRef.current = record.session;
          scoreRef.current = { score, before: record.before, after: record.after };
          navigate(i === 0 ? "mock/review" : `mock/review/${i}`);
        }}
        onDiscardExpired={() => {
          const session = sessionRef.current;
          if (session === null || loaded === null) return;
          void (async () => {
            await loaded.adapter.setMeta(META_DISCARDED_SESSION, serializeSession(session));
            await loaded.adapter.setMeta(MOCK_SESSION_META_KEY, "");
            sessionRef.current = null;
    resumedRef.current = false;
            if (guardHeldRef.current) {
              releaseMockGuard();
              guardHeldRef.current = false;
            }
            invalidateAppSnapshot();
            setRoute(readRoute());
          })();
        }}
        onSubmitExpired={() => void submit(Date.now())}
      />
    );
  }

  // Pre-mock (mock/start)
  if (sub === "start") {
    const type = readSelectedType();
    const typeDef = MOCK_TYPES.find((t) => t.id === type) ?? MOCK_TYPES[0]!;
    const assembled = assembledRef.current;
    return (
      <div className="flow-screen">
        <PreMockScreen
          typeDef={typeDef}
          mock={assembled?.mock ?? null}
          marking={assembled?.marking ?? null}
          onStart={() => void start(type)}
          onBack={() => navigate("mock")}
        />
      </div>
    );
  }

  // Hall (mock/hall)
  if (sub === "hall") {
    // Entering the hall remounts this flow when coming from a shell route
    // (the hub or Today's recovery banner): refs are empty until boot
    // finishes. Hold the route with a loading frame — bouncing here threw
    // every resume back to the hub (the same deep-link defect fixed earlier
    // for breakdown/review).
    if (!ready || loaded === null) {
      return (
        <main className="screen" aria-busy="true">
          <div className="screen__scroll"><div className="screen__pad">
            <p className="screen__lede">Loading your mock</p>
          </div></div>
        </main>
      );
    }
    const session = sessionRef.current;
    if (session === null) {
      // Boot is done and there is truly nothing to resume.
      navigate("mock");
      return <></>;
    }
    const assembled = assembledRef.current;
    if (assembled === null) {
      navigate("mock");
      return <></>;
    }
    return (
      <div className="flow-screen">
        <Hall
          loaded={loaded}
          session={session}
          resumed={resumedRef.current}
          attemptName={`Mock ${String(mockCountRef.current + 1).padStart(2, "0")}`}
          questionStartRef={questionStartRef}
          onMutate={(next) => void persist(next)}
          flushVisit={flushVisit}
          onSubmit={() => void submit(Date.now())}
          onExitHall={() => {
            if (guardHeldRef.current) {
              releaseMockGuard();
              guardHeldRef.current = false;
            }
            navigate("mock");
          }}
        />
      </div>
    );
  }

  // Score reveal (mock/reveal)
  if (sub === "reveal") {
    const scored = scoreRef.current;
    if (scored === null) {
    if (loaded === null) {
      // Deep link still booting: wait for the load, never bounce to the hub.
      return (
        <main className="screen" aria-busy="true">
          <div className="screen__scroll"><div className="screen__pad">
            <p className="screen__lede">Loading mock</p>
          </div></div>
        </main>
      );
    }
      navigate(resultsRef.current.length > 0 ? "mock/breakdown" : "mock");
      return <></>;
    }
    const prevNet = resultsRef.current.length > 1
      ? (resultsRef.current[1]?.summary?.net ?? null)
      : null;
    const prevName = resultsRef.current.length > 1
      ? mockName(mockCountRef.current, 1)
      : null;
    return (
      <div className="flow-screen">
        <ScoreReveal
          score={scored.score}
          mockName={mockName(mockCountRef.current, 0)}
          prevNet={prevNet}
          prevName={prevName}
          onSeeBreakdown={() => navigate("mock/breakdown")}
        />
      </div>
    );
  }

  // Breakdown (mock/breakdown or mock/breakdown/N)
  if (sub === "breakdown") {
    let scored = scoreRef.current;
    if (scored === null || idx > 0) {
      // Load from stored results
    if (loaded === null) {
      // Deep link still booting: wait for the load, never bounce to the hub.
      return (
        <main className="screen" aria-busy="true">
          <div className="screen__scroll"><div className="screen__pad">
            <p className="screen__lede">Loading mock</p>
          </div></div>
        </main>
      );
    }
      const record = resultsRef.current[idx];
      if (record === undefined) { navigate("mock"); return <></>; }
      const marking = scaleMarking(loaded.pack.marking, record.session.order.length, record.session.mockType ?? "standard");
      const score = scoreMock(record.session, loaded.content, marking, familyRefs(loaded.pack));
      completedSessionRef.current = record.session;
      scored = { score, before: record.before, after: record.after };
      scoreRef.current = scored;
      assembledRef.current = { mock: { seed: record.session.seed, order: record.session.order, size: record.session.order.length, fullPaperSize: record.session.fullPaperSize, families: assembledRef.current?.mock.families ?? [], shortfall: 0, reusedRecent: 0 }, marking };
    }
    if (loaded === null) { navigate("mock"); return <></>; }
    const assembled = assembledRef.current!;
    return (
      <main className="screen" style={{ display: "flex", flexDirection: "column" }}>
        <MockBreakdown
          score={scored.score}
          marking={assembled.marking}
          mockName={mockName(mockCountRef.current, idx)}
          misNames={loaded.misNames}
          onExit={onExit}
          onReview={() => navigate(idx === 0 ? "mock/review" : `mock/review/${idx}`)}
        />
      </main>
    );
  }

  // Review (mock/review or mock/review/N)
  if (sub === "review") {
    let scored = scoreRef.current;
    let reviewSession = completedSessionRef.current;
    if (scored === null || reviewSession === null || idx > 0) {
    if (loaded === null) {
      // Deep link still booting: wait for the load, never bounce to the hub.
      return (
        <main className="screen" aria-busy="true">
          <div className="screen__scroll"><div className="screen__pad">
            <p className="screen__lede">Loading mock</p>
          </div></div>
        </main>
      );
    }
      const record = resultsRef.current[idx];
      if (record === undefined) { navigate("mock"); return <></>; }
      const marking = scaleMarking(loaded.pack.marking, record.session.order.length, record.session.mockType ?? "standard");
      const score = scoreMock(record.session, loaded.content, marking, familyRefs(loaded.pack));
      reviewSession = record.session;
      completedSessionRef.current = reviewSession;
      scored = { score, before: record.before, after: record.after };
      scoreRef.current = scored;
    }
    if (loaded === null || reviewSession === null) { navigate("mock"); return <></>; }
    return (
      <MockReview
        session={reviewSession}
        score={scored.score}
        content={loaded.content}
        mockLabel={mockName(mockCountRef.current, idx)}
        onBack={() => navigate(idx === 0 ? "mock/breakdown" : `mock/breakdown/${idx}`)}
        onExit={() => navigate("mock")}
      />
    );
  }

  // Unknown sub-route — fall back to hub
  navigate("mock");
  return <></>;
}

// ---------------------------------------------------------------------------
// MOCKS HUB
// ---------------------------------------------------------------------------

function MocksHub({
  results,
  mockCount,
  session,
  ready,
  onStart,
  onResume,
  onBreakdown,
  onReview,
  onDiscardExpired,
  onSubmitExpired,
}: {
  readonly results: readonly MockResultRecord[];
  readonly mockCount: number;
  readonly session: MockSession | null;
  readonly ready: boolean;
  readonly onStart: (type: MockAssemblyType) => void;
  readonly onResume: () => void;
  readonly onBreakdown: (i: number) => void;
  readonly onReview: (i: number) => void;
  readonly onDiscardExpired: () => void;
  readonly onSubmitExpired: () => void;
}): JSX.Element {
  const [type, setType] = useState<MockAssemblyType>(readSelectedType);
  const [showSubmitExpired, setShowSubmitExpired] = useState<boolean>(false);
  const sel = MOCK_TYPES.find((t) => t.id === type) ?? MOCK_TYPES[0]!;

  const nowMs = Date.now();
  const isInterrupted = session !== null && !isTimeUp(session, nowMs);
  const isExpired = session !== null && isTimeUp(session, nowMs);

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">
          <ScreenHead
            title="Mocks"
            lede="Sit a new mock, or walk back through one you have done. Only the standard mock maps to the 40 pass bar; the others train specific weaknesses."
          />

          {/* Interrupted session banner */}
          {isInterrupted && session !== null && (
            <div className="banner" style={{ marginBottom: "var(--space-6)" }}>
              <Icon name="clock" size={18} className="banner__icon" />
              <div>
                <div className="banner__title">
                  Mock {String(mockCount + 1).padStart(2, "0")} in progress
                </div>
                <div className="banner__detail">
                  {Math.ceil(remainingMs(session, nowMs) / 60_000)} minutes remain on the clock.
                  Nothing is scored until you submit.
                </div>
              </div>
              <div className="banner__actions">
                <button
                  type="button"
                  className="sa-btn sa-btn--primary"
                  style={{ fontSize: 13 }}
                  onClick={() => {
                    onResume();
                  }}
                >
                  Resume mock
                </button>
              </div>
            </div>
          )}

          {/* Expired session card */}
          {isExpired && session !== null && (
            <div className="sa-card" style={{ marginBottom: "var(--space-6)", borderColor: "var(--color-danger-border)" }}>
              <div className="screen__eyebrow" style={{ color: "var(--color-danger-text)", marginBottom: "var(--space-3)" }}>
                <Icon name="clock" size={13} />
                Time ran out
              </div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted-foreground)", margin: "0 0 var(--space-4)", lineHeight: "var(--leading-normal)" }}>
                The clock ran out on this mock. You answered {answeredCount(session)} of {session.order.length} questions.
                You can score it now or discard it.
              </p>
              <div className="btn-row">
                <button type="button" className="sa-btn sa-btn--ghost" style={{ fontSize: 13 }} onClick={onDiscardExpired}>
                  Discard
                </button>
                <button type="button" className="sa-btn sa-btn--primary" style={{ fontSize: 13 }} onClick={() => setShowSubmitExpired(true)}>
                  Score this mock
                </button>
              </div>
            </div>
          )}

          {/* Take a mock */}
          <section className="hub-block">
            <div className="hub-block__head">
              <div className="hub-block__eyebrow">
                <Icon name="clipboard" size={13} />
                Take a mock
              </div>
            </div>
            <div className="mt-grid">
              {MOCK_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`mt${type === t.id ? " is-sel" : ""}`}
                  onClick={() => { setType(t.id); writeSelectedType(t.id); }}
                >
                  <div className="mt__icon"><Icon name={t.icon} size={20} /></div>
                  <div className="mt__name">{t.name}</div>
                  <div className="mt__tag">{t.tag}</div>
                  <p className="mt__line">{t.line}</p>
                  <div className="mt__spec">
                    {t.spec.map((s) => (
                      <div className="mt__spec-item" key={s}>
                        <Icon name="dot" size={8} />
                        <span className="mono">{s}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-detail">
              <p className="mt-detail__text">{sel.detail}</p>
              {!sel.estimate && (
                <p className="caveat" style={{ marginTop: "var(--space-3)" }}>
                  <Icon name="alert" size={12} />
                  This mock does not feed the readiness estimate. Only standard mocks do.
                </p>
              )}
            </div>
            <div className="btn-row" style={{ marginTop: "var(--space-5)", justifyContent: "space-between" }}>
              <Caveat icon="clock">{sel.spec[1]} · negative marking is visible throughout</Caveat>
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                disabled={!ready}
                onClick={() => onStart(type)}
              >
                Begin {sel.name.toLowerCase()} mock
                <Icon name="arrow-right" size={15} />
              </button>
            </div>
          </section>

          {/* Past mocks */}
          <section className="hub-block" style={{ marginTop: "var(--space-6)" }}>
            <div className="hub-block__head">
              <div className="hub-block__eyebrow">
                <Icon name="repeat" size={13} />
                Past mocks
              </div>
            </div>
            {results.length === 0 ? (
              <Caveat icon="clock">No mocks yet. Your first one starts the diagnosis.</Caveat>
            ) : (
              <div className="pastmock">
                {results.map((record, i) => {
                  const s = record.summary;
                  const net = s.net;
                  const denom = s.denominator;
                  const name = mockName(mockCount, i);
                  return (
                    <div className="pastmock__row" key={record.session.id ?? i}>
                      <div className="pastmock__id">
                        <div className="pastmock__name">
                          {name}{" "}
                          <span className="minihist__type">{s.type}</span>
                        </div>
                        <div className="pastmock__date">
                          {relativeDate(record.finishedAtMs, nowMs)}
                        </div>
                      </div>
                      <div className="pastmock__net">
                        <span className="mono">{net.toFixed(2)}</span>
                        <span className="pastmock__den">/{denom}</span>
                      </div>
                      <div className={`pastmock__bar${net >= 40 ? " is-pass" : ""}`}>
                        <span style={{ width: `${Math.min(100, (net / denom) * 100)}%` }} />
                      </div>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="sa-btn sa-btn--ghost"
                          style={{ fontSize: 13 }}
                          onClick={() => onBreakdown(i)}
                        >
                          Breakdown
                        </button>
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary"
                          style={{ fontSize: 13 }}
                          onClick={() => onReview(i)}
                        >
                          <Icon name="repeat" size={14} />
                          Walk through
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Expired-submit confirmation */}
      <Sheet open={showSubmitExpired} onClose={() => setShowSubmitExpired(false)} label="Score this mock" width={460}>
        <div className="sheet__head">
          <span className="eyebrow">Score this mock</span>
          <button className="sheet__close" type="button" onClick={() => setShowSubmitExpired(false)} aria-label="Close">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="sheet__body">
          <p style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: "var(--color-muted-foreground)", margin: "0 0 var(--space-5)" }}>
            Once you submit, the paper is scored net of negative marking and cannot be reopened.
            Unanswered questions cost nothing; wrong answers cost 0.25 each.
          </p>
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="sa-btn sa-btn--ghost" autoFocus onClick={() => setShowSubmitExpired(false)}>
              Keep working
            </button>
            <button type="button" className="sa-btn sa-btn--primary" onClick={() => { setShowSubmitExpired(false); void onSubmitExpired(); }}>
              Submit &amp; score
            </button>
          </div>
        </div>
      </Sheet>
    </main>
  );
}

// ---------------------------------------------------------------------------
// PRE-MOCK SCREEN (mock/start) — restyled to design system, honesty kept
// ---------------------------------------------------------------------------

function PreMockScreen({
  typeDef,
  mock,
  marking,
  onStart,
  onBack,
}: {
  readonly typeDef: MockTypeSpec;
  readonly mock: AssembledMock | null;
  readonly marking: ScaledMarking | null;
  readonly onStart: () => void;
  readonly onBack: () => void;
}): JSX.Element {
  const ff = formFactor(viewportWidth());
  const battery = useRef<BatteryReading | null>(null);
  const shield = shieldChecklist(battery.current);
  const shortfalls = mock !== null ? shortfallLines(mock) : [];

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">
          <ScreenHead
            eyebrow="Before you begin"
            eyebrowIcon="clipboard"
            title={`${typeDef.name} mock.`}
            lede={typeDef.detail}
          />

          {/* Device note */}
          <section className="hub-block" style={{ marginBottom: "var(--space-5)" }}>
            <div className="hub-block__head">
              <div className="hub-block__eyebrow">Device &amp; environment</div>
            </div>
            <Caveat icon="clock" style={{ display: "flex", lineHeight: "var(--leading-normal)" }}>
              {deviceNote(ff)}
            </Caveat>
            {shortfalls.length > 0 && (
              <details style={{ marginTop: "var(--space-4)" }}>
                <summary style={{ cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--color-muted-foreground)" }}>
                  Where this paper is short of the full blueprint
                </summary>
                <ul style={{ marginTop: "var(--space-3)", paddingLeft: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--color-muted-foreground)" }}>
                  {shortfalls.map((s) => (
                    <li key={s.nodeId}>
                      {s.short} fewer {s.short === 1 ? "question" : "questions"} than the blueprint asks
                      {" "}({fallbackTopicLabel(s.nodeId)})
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {mock !== null && mock.reusedRecent > 0 && (
              <Caveat icon="repeat" style={{ display: "flex", marginTop: "var(--space-3)", lineHeight: "var(--leading-normal)" }}>
                {mock.reusedRecent} {mock.reusedRecent === 1 ? "question repeats" : "questions repeat"} from
                your last two mocks — the bank could not fill every slot fresh.
              </Caveat>
            )}
          </section>

          {/* Distraction shield */}
          <section className="hub-block" style={{ marginBottom: "var(--space-5)" }}>
            <div className="hub-block__head">
              <div className="hub-block__eyebrow">Set yourself up</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {shield.map((item) => (
                <Caveat key={item.id} icon="check">{item.label}</Caveat>
              ))}
            </div>
          </section>

          {/* Length summary */}
          {mock !== null && marking !== null && (
            <p className="caveat" style={{ marginBottom: "var(--space-6)" }}>
              <Icon name="clock" size={12} />
              {lengthSummary(mock, marking)}
            </p>
          )}

          <div className="btn-row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="sa-btn sa-btn--ghost" onClick={onBack}>
              <Icon name="arrow-left" size={15} />
              Back
            </button>
            <button type="button" className="sa-btn sa-btn--primary" onClick={onStart}>
              Start the {typeDef.name.toLowerCase()} mock
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// COUNTDOWN — HH:MM:SS timer component
// ---------------------------------------------------------------------------

function Countdown({
  session,
  onTimeUp,
}: {
  readonly session: MockSession;
  readonly onTimeUp: () => void;
}): JSX.Element {
  const [now, setNow] = useState<number>(() => Date.now());
  const firedRef = useRef<boolean>(false);
  const announcedLowRef = useRef<boolean>(false);
  const [announceText, setAnnounceText] = useState<string>("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rem = remainingMs(session, now);
  const low = rem <= 5 * 60_000;

  useEffect(() => {
    if (rem <= 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUp();
    }
  }, [rem, onTimeUp]);

  // One-shot assertive announcement at the 5-minute crossing (design contract).
  useEffect(() => {
    if (low && !announcedLowRef.current) {
      announcedLowRef.current = true;
      setAnnounceText("Five minutes remaining");
    }
  }, [low]);

  const totalSec = Math.max(0, Math.floor(rem / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  return (
    <>
      <span className={`hall__timer${low ? " is-low" : ""}`}>
        <Icon name="clock" size={18} />
        {hh}:{mm}:{ss}
      </span>
      {/* One-shot assertive announcement — low time only */}
      <span className="sr-only" aria-live="assertive" aria-atomic="true">
        {announceText}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// EXAM HALL
// ---------------------------------------------------------------------------

function Hall({
  loaded,
  session,
  resumed,
  attemptName,
  questionStartRef,
  onMutate,
  flushVisit,
  onSubmit,
  onExitHall,
}: {
  readonly loaded: Loaded;
  readonly session: MockSession;
  /** True only when this session is being re-entered (storage boot or the
   * hub's Resume button). A fresh attempt never reads "welcome back". */
  readonly resumed: boolean;
  /** "Mock NN" — the attempt the student is continuing. */
  readonly attemptName: string;
  readonly questionStartRef: React.MutableRefObject<number>;
  readonly onMutate: (next: MockSession) => void;
  readonly flushVisit: (s: MockSession, itemId: string, picked: number | null) => MockSession;
  readonly onSubmit: () => void;
  readonly onExitHall: () => void;
}): JSX.Element {
  // Computed once at mount and dismissible: a resume notice is an arrival
  // message, not a fixture of the next two hours.
  const [resumeStr, setResumeStr] = useState<string | null>(() =>
    resumed ? resumeNote(session, Date.now(), attemptName) : null,
  );

  // Find starting index
  const [idx, setIdx] = useState<number>(() => {
    // Use the first unanswered question
    return firstUnanswered(session);
  });
  const [live, setLive] = useState<MockSession>(session);
  const [picked, setPicked] = useState<number | null>(() => {
    const id = session.order[firstUnanswered(session)];
    return id !== undefined ? (session.answers[id]?.selectedOption ?? null) : null;
  });
  const [showSubmit, setShowSubmit] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  // Polite sr-only region for selection announcement
  const [selAnnounce, setSelAnnounce] = useState<string>("");

  const itemId = live.order[idx]!;
  const item = loaded.content.get(itemId);
  const partOf = familyRefs(loaded.pack);

  // Record visit on every question render
  useEffect(() => {
    if (itemId === undefined) return;
    const next = withVisited(live, itemId);
    if (next !== live) {
      setLive(next);
      onMutate(next);
    }
  }, [idx, itemId]); // intentionally omit live/onMutate: visit only fires on index/id change

  const commitVisit = useCallback(
    (sel: number | null, then: (next: MockSession) => void): void => {
      const next = flushVisit(live, itemId, sel);
      setLive(next);
      onMutate(next);
      then(next);
    },
    [flushVisit, live, itemId, onMutate],
  );

  const goTo = useCallback(
    (target: number): void => {
      if (target < 0 || target >= live.order.length) return;
      commitVisit(picked, () => {
        setIdx(target);
        const tid = live.order[target]!;
        setPicked(live.answers[tid]?.selectedOption ?? null);
        questionStartRef.current = Date.now();
      });
    },
    [commitVisit, picked, live, questionStartRef],
  );

  const pick = useCallback(
    (key: number): void => {
      setPicked(key);
      const next = withAnswerAndUnstrike(
        live, itemId, key,
        Math.max(0, Date.now() - questionStartRef.current),
      );
      questionStartRef.current = Date.now();
      setLive(next);
      onMutate(next);
      // Announce selection
      const letter = String.fromCharCode(65 + (item?.options.findIndex((o) => o.key === key) ?? 0));
      setSelAnnounce(`Option ${letter} selected for question ${idx + 1}`);
    },
    [live, itemId, onMutate, questionStartRef, item, idx],
  );

  const clear = useCallback((): void => {
    setPicked(null);
    const next = withClearedAnswer(live, itemId);
    setLive(next);
    onMutate(next);
    setSelAnnounce("");
  }, [live, itemId, onMutate]);

  const toggleMark = useCallback((): void => {
    const next = withToggledFlag(live, itemId);
    setLive(next);
    onMutate(next);
  }, [live, itemId, onMutate]);

  const toggleStrike = useCallback(
    (optionKey: number): void => {
      const next = withToggledStrike(live, itemId, optionKey, picked);
      if (picked !== null && optionKey === picked && next.answers[itemId] === undefined) {
        setPicked(null);
      }
      setLive(next);
      onMutate(next);
    },
    [live, itemId, picked, onMutate],
  );

  // Palette arrow-key navigation handler
  const onPaletteKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const cells = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".pcell")];
    const i = cells.indexOf(document.activeElement as HTMLElement);
    if (i < 0) { cells[0]?.focus(); return; }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[e.key] ?? 0;
    cells[i + step]?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      // Palette cells consume arrow keys — don't intercept when palette has focus
      if (target && target.classList.contains("pcell")) return;
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && item) {
        const n = Number(digit[1]);
        const opt = item.options[n - 1];
        if (opt) {
          e.preventDefault();
          if (e.shiftKey) toggleStrike(opt.key);
          else pick(opt.key);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "m") toggleMark();
      else if (k === "c") clear();
      else if (e.key === "ArrowRight" && !target?.classList.contains("pcell")) goTo(idx + 1);
      else if (e.key === "ArrowLeft" && !target?.classList.contains("pcell")) goTo(idx - 1);
      else if (e.key === "Escape") {
        if (showSubmit) setShowSubmit(false);
        else if (showExitConfirm) setShowExitConfirm(false);
        else setShowExitConfirm(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [item, pick, toggleStrike, toggleMark, clear, goTo, idx, showSubmit, showExitConfirm]);

  const answered = answeredCount(live);
  const marked = new Set(live.flagged);
  const struckForItem = new Set(live.struck[itemId] ?? []);
  const isMarked = marked.has(itemId);
  const notAnswered = live.order.length - answered;
  const markedTotal = marked.size;

  // Determine part name for current question
  let partName = "";
  if (item) {
    for (const fam of partOf) {
      if (item.tests.some((t) => t === fam.nodeId || t.startsWith(`${fam.nodeId}.`))) {
        partName = topicLabel(loaded.names, fam.partId) ?? fam.partId;
        break;
      }
    }
  }

  // Build part sections for palette
  const groups = new Map<string, { indices: number[]; from: number; to: number }>();
  const partOrder: string[] = [];
  live.order.forEach((iId, i) => {
    const it = loaded.content.get(iId);
    let pId = "other";
    if (it) {
      for (const fam of partOf) {
        if (it.tests.some((t) => t === fam.nodeId || t.startsWith(`${fam.nodeId}.`))) {
          pId = fam.partId;
          break;
        }
      }
    }
    if (!groups.has(pId)) {
      groups.set(pId, { indices: [], from: i + 1, to: i + 1 });
      partOrder.push(pId);
    }
    const g = groups.get(pId)!;
    g.indices.push(i);
    g.to = i + 1;
  });

  if (item === undefined) {
    return (
      <div className="hall">
        <div className="hall__main">
          <div className="hall__bar">
            <Countdown session={live} onTimeUp={onSubmit} />
            <div className="hall__bar-right">
              <div className="hall__neg">
                <Icon name="alert" size={13} />
                Wrong −0.25 · unanswered 0
              </div>
              <button type="button" className="btn-dark" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowExitConfirm(true)}>
                Save &amp; exit
              </button>
            </div>
          </div>
          <div className="hall__q">
            <div className="hall__qinner">
              <p style={{ color: "var(--color-muted-foreground)" }}>A question could not be shown. Submit what you have.</p>
              <button type="button" className="btn-dark btn-dark--primary" onClick={onSubmit}>Submit now</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ContentItem does not declare `table`; the pack may include it as an extra
  // field. Access it defensively so the branch is ready when table data ships.
  type ItemWithTable = ContentItem & { table?: { cols: readonly string[]; rows: readonly (readonly string[])[] } };
  const table = (item as ItemWithTable).table;

  const OptionsBlock = (): JSX.Element => (
    <div className="hall__choices">
      <div className="hall__choices-label">
        Choose one · click <Icon name="x" size={11} style={{ verticalAlign: "-1px" }} /> to rule a choice out
      </div>
      {item.options.map((o, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSel = picked === o.key;
        const isStruck = struckForItem.has(o.key);
        return (
          <div key={o.key} className={`hall-opt${isSel ? " is-sel" : ""}${isStruck ? " is-struck" : ""}`}>
            <button
              type="button"
              className="hall-opt__main"
              onClick={() => pick(o.key)}
              aria-pressed={isSel}
            >
              <span className="hall-opt__letter">{letter}</span>
              <span className="hall-opt__body">{o.text}</span>
              <kbd className="kbd hall-opt__kbd">{i + 1}</kbd>
            </button>
            <button
              type="button"
              className="hall-opt__strike"
              onClick={() => toggleStrike(o.key)}
              title={isStruck ? `Restore (Shift+${i + 1})` : `Eliminate (Shift+${i + 1})`}
              aria-label={isStruck ? "Restore option" : "Eliminate option"}
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Polite region for selection announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{selAnnounce}</span>

      <div className="hall">
        <div className="hall__main">
          {/* Bar */}
          <div className="hall__bar">
            <Countdown session={live} onTimeUp={onSubmit} />
            <div className="hall__bar-right">
              <div className="hall__neg">
                <Icon name="alert" size={13} />
                Wrong −0.25 · unanswered 0
              </div>
              <button
                type="button"
                className="btn-dark"
                style={{ padding: "6px 12px", fontSize: 13 }}
                onClick={() => setShowExitConfirm(true)}
              >
                Save &amp; exit
              </button>
            </div>
          </div>

          {/* Question area */}
          <div className="hall__q">
            {resumeStr !== null && (
              <p className="mk-resume" role="status">
                <span>{resumeStr}</span>
                <button
                  type="button"
                  className="mk-resume__dismiss"
                  aria-label="Dismiss"
                  onClick={() => setResumeStr(null)}
                >
                  <Icon name="x" size={14} />
                </button>
              </p>
            )}
            {table !== undefined ? (
              <div className="hall__split">
                <div className="hall__exhibit">
                  <div className="hall__qnum">
                    Q {idx + 1} / {live.order.length}
                    <span>·</span>
                    {partName}
                    {isMarked && <Icon name="flag" size={13} style={{ color: "var(--color-warning)", marginLeft: 6 }} />}
                  </div>
                  <p className="hall__stem">{item.stem}</p>
                  <table className="q-table">
                    <thead>
                      <tr>{table.cols.map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((cell, ci) => <td key={ci}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <OptionsBlock />
              </div>
            ) : (
              <div className="hall__qinner">
                <div className="hall__qnum">
                  Q {idx + 1} / {live.order.length}
                  <span>·</span>
                  {partName}
                  {isMarked && <Icon name="flag" size={13} style={{ color: "var(--color-warning)", marginLeft: 6 }} />}
                </div>
                <p className="hall__stem">{item.stem}</p>
                <OptionsBlock />
              </div>
            )}
          </div>

          {/* Pinned footer */}
          <div className="hall__foot">
            <button
              type="button"
              className="btn-dark"
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
            >
              <Icon name="arrow-left" size={15} />
              Previous
            </button>
            <div className="btn-row">
              <button
                type="button"
                className="btn-dark"
                disabled={picked === null}
                onClick={clear}
              >
                Clear response <kbd className="kbd" style={{ marginLeft: 4 }}>C</kbd>
              </button>
              <button
                type="button"
                className={`btn-dark btn-dark--mark${isMarked ? " is-on" : ""}`}
                onClick={toggleMark}
                aria-pressed={isMarked}
              >
                <Icon name="flag" size={15} />
                {isMarked ? "Marked" : "Mark"} <kbd className="kbd" style={{ marginLeft: 4 }}>M</kbd>
              </button>
              {idx + 1 < live.order.length ? (
                <button
                  type="button"
                  className="btn-dark btn-dark--primary"
                  onClick={() => goTo(idx + 1)}
                >
                  Save &amp; next <Icon name="arrow-right" size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-dark btn-dark--primary"
                  onClick={() => setShowSubmit(true)}
                >
                  Review &amp; submit <Icon name="arrow-right" size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Palette */}
        <div className="hall__side">
          <div className="hall__side-head">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
              <span className="hall__side-title">Question palette</span>
            </div>
            <div className="pcount">
              <span className="pcount__seg">
                <span className="pcount__dot" style={{ background: "var(--color-brand-primary)" }} />
                {answered} done
              </span>
              <span className="pcount__seg">
                <span className="pcount__dot" style={{ background: "var(--color-border-strong)" }} />
                {notAnswered} left
              </span>
              <span className="pcount__seg">
                <span className="pcount__dot" style={{ background: "var(--color-warning)" }} />
                {markedTotal} marked
              </span>
            </div>
            <div className="pbar">
              <span style={{ width: `${live.order.length > 0 ? (answered / live.order.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="palette-scroll" onKeyDown={onPaletteKey}>
            {partOrder.map((pId) => {
              const g = groups.get(pId)!;
              const partDisplayName = topicLabel(loaded.names, pId) ?? pId;
              // Short names for palette per design (Business Maths for Business Mathematics)
              const shortName =
                partDisplayName === "Business Mathematics" ? "Business Maths" : partDisplayName;
              return (
                <div className="psec" key={pId}>
                  <div className="psec__head">
                    <span className="psec__name">{shortName}</span>
                    <span className="psec__range">{g.from}–{g.to}</span>
                  </div>
                  <div className="psec__grid">
                    {g.indices.map((i) => {
                      const iId = live.order[i]!;
                      const isCur = i === idx;
                      const isAns = isCur ? !!picked : live.answers[iId] !== undefined;
                      const isVisited = !isCur && !isAns && (live.visited ?? []).includes(iId);
                      const isMk = marked.has(iId);
                      return (
                        <button
                          key={iId}
                          type="button"
                          className={
                            `pcell` +
                            (isAns ? " is-answered" : isVisited ? " is-visited" : "") +
                            (isCur ? " is-current" : "") +
                            (isMk ? " is-marked" : "")
                          }
                          aria-label={`Question ${i + 1}, ${isAns ? "answered" : isVisited ? "seen, not answered" : "not visited"}${isMk ? ", marked for review" : ""}${isCur ? ", current" : ""}`}
                          aria-current={isCur ? "true" : undefined}
                          onClick={() => {
                            commitVisit(picked, () => {
                              setIdx(i);
                              setPicked(live.answers[iId]?.selectedOption ?? null);
                              questionStartRef.current = Date.now();
                            });
                          }}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="palette-legend">
            <span className="pleg">
              // verify-hex-allow: the accent at 16% and 34%, matching .pcell.is-answered in design.css.
              <span className="pleg__sw" style={{ background: "rgba(154, 52, 18, 0.16)", borderColor: "rgba(154, 52, 18, 0.34)" }} />
              Answered
            </span>
            <span className="pleg">
              <span className="pleg__sw" style={{ background: "var(--color-muted)" }} />
              Seen, not answered
            </span>
            <span className="pleg">
              <span className="pleg__sw" style={{ background: "var(--color-card)" }} />
              Not visited
            </span>
            <span className="pleg">
              <span className="pleg__sw" style={{ position: "relative", background: "var(--color-card)" }}>
                <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: "50%", background: "var(--color-warning)" }} />
              </span>
              Marked
            </span>
            <button
              type="button"
              className="btn-dark btn-dark--primary"
              style={{ marginTop: "var(--space-3)", gridColumn: "1 / -1", width: "100%" }}
              onClick={() => setShowSubmit(true)}
            >
              Submit mock
            </button>
          </div>
        </div>
      </div>

      {/* Save & exit dialog */}
      <Sheet open={showExitConfirm} onClose={() => setShowExitConfirm(false)} label="Save and exit" width={440}>
        <div className="sheet__head">
          <span className="eyebrow">Save &amp; exit</span>
          <button className="sheet__close" type="button" onClick={() => setShowExitConfirm(false)} aria-label="Close">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="sheet__body">
          <p style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: "var(--color-muted-foreground)", margin: "0 0 var(--space-5)" }}>
            Leave the mock for now. Your answers and the timer are saved on this device.
            You can resume exactly here. Nothing is scored until you submit.
          </p>
          <Caveat icon="clock" style={{ display: "flex", lineHeight: "var(--leading-normal)", marginBottom: "var(--space-5)" }}>
            The clock keeps running, the same as it would in the exam hall.
          </Caveat>
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="sa-btn sa-btn--ghost" autoFocus onClick={() => setShowExitConfirm(false)}>
              Keep going
            </button>
            <button type="button" className="sa-btn sa-btn--primary" onClick={onExitHall}>
              Save &amp; exit
            </button>
          </div>
        </div>
      </Sheet>

      {/* Submit dialog */}
      <Sheet open={showSubmit} onClose={() => setShowSubmit(false)} label="Submit mock" width={460}>
        <div className="sheet__head">
          <span className="eyebrow">Submit mock</span>
          <button className="sheet__close" type="button" onClick={() => setShowSubmit(false)} aria-label="Close">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="sheet__body">
          <div className="submit-sum">
            <div className="submit-sum__row">
              <span className="submit-sum__dot" style={{ background: "var(--color-brand-primary)" }} />
              <span>Answered</span>
              <span className="submit-sum__n">{answered}</span>
            </div>
            <div className="submit-sum__row">
              <span className="submit-sum__dot" style={{ background: "var(--color-border-strong)" }} />
              <span>Not answered</span>
              <span className="submit-sum__n">{notAnswered}</span>
            </div>
            <div className="submit-sum__row">
              <span className="submit-sum__dot" style={{ background: "var(--color-warning)" }} />
              <span>Marked for review</span>
              <span className="submit-sum__n">{markedTotal}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, lineHeight: "var(--leading-normal)", color: "var(--color-text-subtle)", margin: "var(--space-4) 0 var(--space-5)" }}>
            Once you submit, the paper is scored net of negative marking and cannot be reopened.
            Unanswered questions cost nothing; wrong answers cost 0.25 each.
          </p>
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="sa-btn sa-btn--ghost" autoFocus onClick={() => setShowSubmit(false)}>
              Keep working
            </button>
            <button type="button" className="sa-btn sa-btn--primary" onClick={onSubmit}>
              Submit &amp; score
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// SCORE REVEAL
// ---------------------------------------------------------------------------

function ScoreReveal({
  score,
  mockName: name,
  prevNet,
  prevName,
  onSeeBreakdown,
}: {
  readonly score: MockScore;
  readonly mockName: string;
  readonly prevNet: number | null;
  readonly prevName: string | null;
  readonly onSeeBreakdown: () => void;
}): JSX.Element {
  const [shown, setShown] = useState<boolean>(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80);
    return () => clearTimeout(t);
  }, []);

  const cleared = score.net >= score.passMark;
  const pend = shown ? "" : "is-pending";
  const delta = prevNet !== null ? score.net - prevNet : null;

  return (
    <div className="reveal">
      <div className={`reveal__eyebrow breath ${pend}`}>{name} · complete</div>
      <div className={`breath breath-2 ${pend}`}>
        <span className="reveal__num" style={{ viewTransitionName: "score" }}>
          {score.net.toFixed(2)}
        </span>
        <span className="reveal__den"> / {score.maxMarks}</span>
      </div>
      <div className={`reveal__label breath breath-2 ${pend}`}>Net of negative marking</div>
      <p className={`reveal__verdict breath breath-3 ${pend}`}>
        {cleared ? (
          <>
            You cleared the {score.passMark} bar by <b>{score.distanceToPass.toFixed(2)}</b>.
            The marks you gave back to wrong answers were the difference between comfortable and close.
          </>
        ) : (
          <>
            You fell <b>{Math.abs(score.distanceToPass).toFixed(2)}</b> short of the {score.passMark} bar.
            {/* The design's second sentence (scr-mock.jsx:319) is a claim about
                negative marking; say it only when the penalty actually covers
                most of the shortfall — never an unbacked number (Handout s01). */}
            {score.penalty >= Math.abs(score.distanceToPass) / 2
              ? " Most of the gap was negative marking, not topics you do not know."
              : " The breakdown shows exactly where those marks went."}
          </>
        )}
      </p>
      {delta !== null && prevName !== null && (
        <div className={`reveal__delta breath breath-3 ${pend}`}>
          <Icon name="trend-up" size={16} />
          {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(2)} vs {prevName}
        </div>
      )}
      <div className={`reveal__cta breath breath-3 ${pend}`}>
        <button
          type="button"
          className="btn-dark btn-dark--primary"
          style={{ padding: "12px 26px", fontSize: "var(--text-base)" }}
          onClick={onSeeBreakdown}
        >
          See where the marks went
          <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MOCK BREAKDOWN
// ---------------------------------------------------------------------------

function MockBreakdown({
  score,
  marking,
  mockName: name,
  misNames,
  onExit,
  onReview,
}: {
  readonly score: MockScore;
  readonly marking: ScaledMarking;
  readonly mockName: string;
  readonly misNames: ReadonlyMap<string, string>;
  readonly onExit: () => void;
  readonly onReview: () => void;
}): JSX.Element {

  const wf: WaterfallModel = waterfall(score);
  const misRows: readonly MisconceptionRow[] = misconceptionsByShare(score.wrongAnswers, marking);
  const topMisName: string | null =
    misRows.length > 0
      ? (misNames.get(misRows[0]!.id) ?? misRows[0]!.id)
      : null;

  // Insight with counterfactual text per design
  let insightContent: JSX.Element;
  if (misRows.length > 0 && topMisName !== null) {
    const top = misRows[0]!;
    const liftedNet = (score.net + top.count * 0.25).toFixed(2);
    insightContent = (
      <p className="insight__text">
        Your <b>{top.count}</b> {topMisName} {top.count === 1 ? "error" : "errors"} cost{" "}
        <span className="mono">{top.lostMarks.toFixed(2)}</span> marks. Leaving them blank would have
        lifted your net from <span className="mono">{score.net.toFixed(2)}</span> to{" "}
        <span className="mono">{liftedNet}</span>.
      </p>
    );
  } else {
    const insight: InsightModel = insightText(score, misRows, topMisName);
    insightContent = <p className="insight__text">{insight.text}</p>;
  }

  // Waterfall column positions: design uses absolute positioning at cx%
  // We use the shared wf classes from design.css plus inline bottom/height styles.
  // Design WF_COLS: cx at 10/30/50/70/90%, width 12%.
  // Connect lines at running levels.
  const total = score.total;
  const blank = score.skipped;
  const wrong = score.wrong;
  const penalty = score.penalty;
  const net = score.net;
  const maxM = score.maxMarks;

  // Heights as % of maxMarks
  const h = (v: number): number => Math.max(0, Math.min(100, (v / maxM) * 100));
  const blankH = h(blank * (maxM / total));
  const wrongH = h(wrong * (maxM / total));
  const penaltyH = h(penalty);
  const netH = h(Math.max(0, net));

  // Running bottom levels
  const baseLevel = 100;
  const afterBlank = baseLevel - blankH;
  const afterWrong = afterBlank - wrongH;
  const afterPenalty = afterWrong - penaltyH;
  const passBarPct = h(score.passMark);

  return (
    <>
      {/* fb-context bar */}
      <div className="fb-context" style={{ height: 48 }}>
        <div className="fb-context__left">
          <Icon name="chevron-mark" size={16} />
          <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>{name} · net</span>
          <span
            className="mono"
            style={{ viewTransitionName: "score", fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-base)" }}
          >
            {score.net.toFixed(2)}
          </span>
        </div>
        <div className="fb-context__right">
          <button
            type="button"
            className="sa-btn sa-btn--ghost"
            style={{ fontSize: 13 }}
            onClick={onExit}
          >
            <Icon name="arrow-left" size={14} />
            Back to Today
          </button>
        </div>
      </div>

      <div className="screen__scroll">
        <div className="screen__pad" style={{ maxWidth: 940, margin: "0 auto" }}>
          {/* Head */}
          <div className="screen__head" style={{ marginBottom: "var(--space-6)" }}>
            <div className="screen__eyebrow">
              <Icon name="clipboard" size={13} />
              Mock breakdown
            </div>
            <h1 className="screen__title">
              How {maxM} marks became {score.net.toFixed(2)}.
            </h1>
            <p className="screen__lede">
              Full length · {total} questions · {marking.durationMinutes} minutes.
              Every mark that did not reach your net, accounted for.
              Net of negative marking, not a readiness estimate.
            </p>
          </div>

          {/* Waterfall */}
          <div className="wf" style={{ marginBottom: "var(--space-8)" }} role="img" aria-label={wf.ariaLabel}>
            <div className="wf__plot" style={{ height: 300 }}>
              {/* Pass bar */}
              <div className="wf__bar" style={{ bottom: `${passBarPct}%` }}>
                <span className="wf__bar-label">Pass {score.passMark}</span>
              </div>
              {/* Connect lines */}
              <div className="wf__connect" style={{ bottom: `${baseLevel}%`, left: "16%", width: "14%" }} />
              <div className="wf__connect" style={{ bottom: `${afterBlank}%`, left: "36%", width: "14%" }} />
              <div className="wf__connect" style={{ bottom: `${afterWrong}%`, left: "56%", width: "14%" }} />
              <div className="wf__connect" style={{ bottom: `${afterPenalty}%`, left: "76%", width: "14%" }} />
              {/* Col 1: base */}
              <div className="wf__seg wf__seg--base" style={{ left: "4%", width: "12%", bottom: "0%", height: "100%" }} />
              <div className="wf__val" style={{ bottom: "calc(100% + 6px)", left: "1%", width: "18%" }}>100</div>
              <div className="wf__cap" style={{ left: "0%", width: "22%" }}><b>Marks possible</b>{maxM} questions</div>
              {/* Col 2: blank */}
              <div className="wf__seg wf__seg--blank" style={{ left: "24%", width: "12%", bottom: `${afterBlank}%`, height: `${blankH}%` }} />
              {blank > 0 && <div className="wf__val wf__val--drop" style={{ bottom: `calc(${afterBlank + blankH}% + 6px)`, left: "21%", width: "18%" }}>−{blank}</div>}
              <div className="wf__cap" style={{ left: "20%", width: "22%" }}><b>Left blank</b>{blank} unattempted</div>
              {/* Col 3: wrong */}
              <div className="wf__seg wf__seg--wrong" style={{ left: "44%", width: "12%", bottom: `${afterWrong}%`, height: `${wrongH}%` }} />
              {wrong > 0 && <div className="wf__val wf__val--drop" style={{ bottom: `calc(${afterWrong + wrongH}% + 6px)`, left: "41%", width: "18%" }}>−{wrong}</div>}
              <div className="wf__cap" style={{ left: "40%", width: "22%" }}><b>Wrong</b>{wrong} questions</div>
              {/* Col 4: penalty */}
              <div className="wf__seg wf__seg--penalty" style={{ left: "64%", width: "12%", bottom: `${afterPenalty}%`, height: `${penaltyH}%` }} />
              {penalty > 0 && <div className="wf__val wf__val--drop" style={{ bottom: `calc(${afterPenalty + penaltyH}% + 6px)`, left: "61%", width: "18%" }}>−{penalty.toFixed(2)}</div>}
              <div className="wf__cap" style={{ left: "60%", width: "22%" }}><b>Penalty</b>−0.25 × {wrong}</div>
              {/* Col 5: net */}
              <div className="wf__seg wf__seg--net" style={{ left: "84%", width: "12%", bottom: "0%", height: `${netH}%` }} />
              <div className="wf__val" style={{ bottom: `calc(${netH}% + 6px)`, left: "81%", width: "18%" }}>{score.net.toFixed(2)}</div>
              <div className="wf__cap" style={{ left: "80%", width: "22%" }}>
                <b>Net score</b>
                {score.cleared
                  ? `cleared ${score.passMark} by ${score.distanceToPass.toFixed(2)}`
                  : `short of ${score.passMark} by ${Math.abs(score.distanceToPass).toFixed(2)}`}
              </div>
            </div>
            <p className="caveat" style={{ marginTop: "var(--space-16)" }}>
              The two largest pools are recoverable in different ways. The {blank} left blank are marks
              your accuracy has not yet earned the confidence to attempt. The {wrong} wrong are where
              the misconceptions live, below.
            </p>
          </div>

          {/* Misconceptions by share */}
          {misRows.length > 0 && (
            <section style={{ marginBottom: "var(--space-8)" }}>
              <h2 className="section-title">The {wrong} wrong, by misconception</h2>
              <div className="brk">
                <div className="brk__row brk__row--head">
                  <span className="brk__h">Misconception</span>
                  <span className="brk__h brk__h--r">Questions</span>
                  <span className="brk__h brk__h--r">Lost</span>
                  <span className="brk__h">Share</span>
                </div>
                {misRows.map((row) => {
                  const misName = misNames.get(row.id) ?? row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className="brk__row"
                      style={{ width: "100%", font: "inherit", cursor: "pointer", background: "none", textAlign: "left" }}
                      onClick={() => navigate(`misconception/${row.id}`)}
                    >
                      <span className="brk__name">{misName}</span>
                      <span className="brk__num">{row.count}</span>
                      <span className="brk__num is-neg">−{row.lostMarks.toFixed(2)}</span>
                      <span className="brk__minibar">
                        <span style={{ width: `${Math.round(row.shareRatio * 100)}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Insight card */}
          <div className="insight" style={{ marginBottom: "var(--space-8)" }}>
            <Icon name="lightbulb" size={20} className="insight__icon" />
            <div>
              <div className="insight__label">One thing from this mock</div>
              {insightContent}
            </div>
          </div>

          <p className="caveat" style={{ justifyContent: "center" }}>
            Schedule the next mock when ready. Drills are queued in Review.
          </p>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: "var(--space-2)" }}>
            <button type="button" className="sa-btn sa-btn--secondary" onClick={onReview}>
              <Icon name="repeat" size={15} />
              Review the answers
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
