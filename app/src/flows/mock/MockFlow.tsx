/**
 * Mock experience — the timed mock hall (W5-5 flow b, W5-7).
 *
 * A thin React renderer over the pure logic in assembler.ts, state.ts,
 * scoring.ts, and premock.ts. The component owns only the unavoidable side
 * effects: the storage adapter, the clock (Date.now at the boundary), event ids
 * (crypto.randomUUID), the viewport width, the Battery API read, the countdown
 * tick, and the MockGuard it holds for the duration (ADR 0009). Every decision
 * (what to draw, how to score, the resume note, the readiness shift) lives in
 * the tested logic modules.
 *
 * PHASES: premock (device note + distraction shield + length) -> hall (question
 * display, palette, countdown, flag, skip) -> reveal (net score) -> breakdown
 * (marks by part, wrong answers with misconceptions, readiness before/after).
 * A resume of an in-progress mock skips premock and re-enters the hall with the
 * honest wall-clock note.
 *
 * LAYOUT: 360px floor (ADR 0011). The palette is a bottom strip on the phone and
 * a side panel at >=900px (v2 addendum intent). 44px targets, visible focus,
 * keyboard as a secondary path. Tokens only (mock.css).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildEngineState,
  readiness as computeReadinessSelector,
  type LoadedPack,
} from "../../engine/index.js";
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
  type MockSession,
} from "./state.js";

/**
 * The one-line marking reminder shown in the hall bar, palette header, and
 * submit dialog. Single source of truth: extracted here so the three surfaces
 * always read identically and a change propagates everywhere at once.
 */
export const MARKING_REMINDER = "Wrong -0.25 - unanswered 0" as const;
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
  loadTopicNames,
  loadMisconceptionNames,
  topicLabel,
  fallbackTopicLabel,
} from "../../engine/topics.js";
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
import "./mock.css";

/** Read the live viewport width at the boundary; phone floor when window absent. */
function viewportWidth(): number {
  return typeof window === "undefined" ? 360 : window.innerWidth;
}

/** Read the Battery Status API where available; null otherwise (no fake check). */
async function readBattery(): Promise<BatteryReading | null> {
  if (typeof navigator === "undefined") return null;
  const getBattery = (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean }> })
    .getBattery;
  if (typeof getBattery !== "function") return null;
  try {
    const b = await getBattery.call(navigator);
    return { level: b.level, charging: b.charging };
  } catch {
    return null;
  }
}

/** Flatten the loaded pack's blueprint into the part-ordered family refs the
 * scorer and assembler attribution need. */
function familyRefs(pack: LoadedPack): FamilyRef[] {
  const out: FamilyRef[] = [];
  for (const part of pack.blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) out.push({ partId: part.id, nodeId: fam.nodeId });
    }
  }
  return out;
}

interface Loaded {
  readonly pack: LoadedPack;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly adapter: StorageAdapter;
  readonly mock: AssembledMock;
  readonly marking: ScaledMarking;
  /** Taxonomy node id to display name ("Simple interest"), engine/topics.ts. */
  readonly names: ReadonlyMap<string, string>;
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "premock";
      readonly battery: BatteryReading | null;
      readonly ff: "phone" | "tablet" | "desktop";
    }
  | { readonly kind: "hall"; readonly current: number; readonly resume: string | null }
  | {
      readonly kind: "reveal";
      readonly score: MockScore;
      readonly before: Readiness;
      readonly after: Readiness;
    }
  | {
      readonly kind: "breakdown";
      readonly score: MockScore;
      readonly before: Readiness;
      readonly after: Readiness;
    }
  | {
      readonly kind: "review";
      readonly score: MockScore;
      readonly before: Readiness;
      readonly after: Readiness;
    };

export interface MockFlowProps {
  /** Exit back to the hub/home. */
  readonly onExit: () => void;
}

export function MockFlow({ onExit }: MockFlowProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const loadedRef = useRef<Loaded | null>(null);
  const examMsRef = useRef<number | undefined>(undefined);
  const sessionRef = useRef<MockSession | null>(null);
  // Holds the completed session (answers + flagged) so the review phase can read
  // it after submit() has cleared sessionRef.current.
  const completedSessionRef = useRef<MockSession | null>(null);
  const questionStartRef = useRef<number>(0);
  // True once the guard is held, so cleanup releases exactly once.
  const guardHeldRef = useRef<boolean>(false);

  // ---- Boot: load pack + content + storage; resume an in-progress mock or
  //      assemble a fresh one and show the pre-mock screen. ----
  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      const [{ loadCaPack }, content, names] = await Promise.all([
        import("../../engine/caPack.js"),
        loadCaContent(),
        loadTopicNames(),
      ]);
      const pack = await loadCaPack();
      const { adapter } = await getSharedStorage();
      if (cancelled) {
        // Shared page-level connection: flows never close it (storage/index.ts).
        return;
      }
      examMsRef.current = await getExamMs(adapter);

      // Resume path: a stored, parseable session means a mock is in progress.
      const stored = parseSession(await adapter.getMeta(MOCK_SESSION_META_KEY));
      const nowMs = Date.now();

      if (stored !== null) {
        const marking = scaleMarking(pack.marking, stored.order.length);
        const mock: AssembledMock = assembleMock(stored.seed, pack.bank, pack.blueprint, stored.fullPaperSize);
        loadedRef.current = { pack, content, adapter, mock, marking, names };
        sessionRef.current = stored;
        acquireMockGuard();
        guardHeldRef.current = true;
        if (cancelled) return;
        if (isTimeUp(stored, nowMs)) {
          // The clock ran out while away: submit immediately, honestly.
          await submit(nowMs);
          return;
        }
        questionStartRef.current = nowMs;
        const current = firstUnanswered(stored);
        setPhase({ kind: "hall", current, resume: resumeNote(stored, nowMs) });
        return;
      }

      // Fresh path: assemble against the live bank, scale the marking, pre-mock.
      const mock = assembleMock(
        nextSeed(),
        pack.bank,
        pack.blueprint,
        pack.marking.numQuestions,
      );
      const marking = scaleMarking(pack.marking, mock.size);
      loadedRef.current = { pack, content, adapter, mock, marking, names };
      const battery = await readBattery();
      if (cancelled) return;
      setPhase({ kind: "premock", battery, ff: formFactor(viewportWidth()) });
    }

    boot().catch((err: unknown) => {
      if (cancelled) return;
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "The mock could not start.",
      });
    });

    return () => {
      cancelled = true;
      if (guardHeldRef.current) {
        releaseMockGuard();
        guardHeldRef.current = false;
      }
      // Shared page-level connection stays open for the page lifetime.
    };
  }, []);

  /** Persist the current session to storage meta (called on every mutation). */
  const persist = useCallback(async (session: MockSession): Promise<void> => {
    sessionRef.current = session;
    const loaded = loadedRef.current;
    if (loaded === null) return;
    await loaded.adapter.setMeta(MOCK_SESSION_META_KEY, serializeSession(session));
  }, []);

  /** Start the mock: build the session, hold the guard, enter the hall. */
  const start = useCallback(async (): Promise<void> => {
    const loaded = loadedRef.current;
    if (loaded === null) return;
    const nowMs = Date.now();
    const session: MockSession = {
      id: crypto.randomUUID(),
      seed: loaded.mock.seed,
      order: loaded.mock.order,
      fullPaperSize: loaded.mock.fullPaperSize,
      budgetMs: loaded.marking.durationMinutes * 60_000,
      startedAtMs: nowMs,
      answers: {},
      flagged: [],
      struck: {},
      activeMs: 0,
      formFactor: formFactor(viewportWidth()),
      viewportWidth: viewportWidth(),
    };
    acquireMockGuard();
    guardHeldRef.current = true;
    await persist(session);
    questionStartRef.current = nowMs;
    setPhase({ kind: "hall", current: 0, resume: null });
  }, [persist]);

  /** Record the active time spent on the question being left, then move. */
  const flushVisit = useCallback(
    (session: MockSession, itemId: string, picked: number | null): MockSession => {
      const nowMs = Date.now();
      const visitMs = Math.max(0, nowMs - questionStartRef.current);
      questionStartRef.current = nowMs;
      if (picked === null) {
        // No selection this visit: keep any prior answer, but still bank the time
        // on a previously-answered item (re-visiting counts). For an unanswered
        // item, only the time is relevant and withAnswer would need a key; so we
        // only accumulate time when there is an existing answer.
        const prior = session.answers[itemId];
        if (prior === undefined) return session;
        return withAnswer(session, itemId, prior.selectedOption, visitMs);
      }
      return withAnswer(session, itemId, picked, visitMs);
    },
    [],
  );

  /** Score and submit the mock: build the event batch, append it, clear the
   * in-progress state, release the guard, and reveal the score with the honest
   * before/after readiness shift. */
  const submit = useCallback(async (nowMs: number): Promise<void> => {
    const loaded = loadedRef.current;
    const session = sessionRef.current;
    if (loaded === null || session === null) {
      setPhase({ kind: "error", message: "The mock state was lost before it could be scored." });
      return;
    }

    // Readiness BEFORE the mock anchors: replay the log without the new events.
    const priorEvents = await loaded.adapter.readAllEvents();
    const beforeState = buildEngineState(priorEvents, loaded.pack.bank, nowMs, examMsRef.current);
    const before = computeReadinessSelector(beforeState, priorEvents, loaded.pack, nowMs);

    // Build the full mock event batch (answered + skipped), append in one write.
    const eventIds = session.order.map(() => crypto.randomUUID());
    const batch = buildSubmissionBatch(session, loaded.content, {
      eventIds,
      occurredAtMs: nowMs,
    });
    await loaded.adapter.appendEvents(batch.events);

    // Score the paper (same key as the events) and compute the AFTER readiness.
    const score = scoreMock(session, loaded.content, loaded.marking, familyRefs(loaded.pack));
    const afterEvents = await loaded.adapter.readAllEvents();
    const afterState = buildEngineState(afterEvents, loaded.pack.bank, nowMs, examMsRef.current);
    const after = computeReadinessSelector(afterState, afterEvents, loaded.pack, nowMs);

    // Preserve the completed session for the review phase before clearing it.
    completedSessionRef.current = session;

    // Clear the in-progress mock and release the guard (a swap may now apply).
    await loaded.adapter.setMeta(MOCK_SESSION_META_KEY, "");
    sessionRef.current = null;
    if (guardHeldRef.current) {
      releaseMockGuard();
      guardHeldRef.current = false;
    }

    setPhase({ kind: "reveal", score, before, after });
  }, []);

  // ---- Render per phase. ----
  if (phase.kind === "loading") {
    return (
      <MockFrame onExit={onExit} title="Mock">
        <section className="mk-status" aria-busy="true">
          <p className="mk-status__label">Preparing your mock</p>
          <p className="mk-status__body">Drawing a paper from the question bank.</p>
        </section>
      </MockFrame>
    );
  }

  if (phase.kind === "error") {
    return (
      <MockFrame onExit={onExit} title="Mock">
        <section className="mk-status mk-status--error" role="alert">
          <p className="mk-status__label">The mock could not start</p>
          <p className="mk-status__body">{phase.message}</p>
          <button type="button" className="mk-btn mk-btn--primary" onClick={onExit}>
            Back to home
          </button>
        </section>
      </MockFrame>
    );
  }

  if (phase.kind === "premock") {
    const loaded = loadedRef.current!;
    return (
      <MockFrame onExit={onExit} title="Mock">
        <PreMockScreen
          mock={loaded.mock}
          marking={loaded.marking}
          battery={phase.battery}
          ff={phase.ff}
          onStart={() => void start()}
        />
      </MockFrame>
    );
  }

  if (phase.kind === "reveal") {
    return (
      <MockFrame onExit={onExit} title="Mock result">
        <ScoreReveal
          score={phase.score}
          onSeeBreakdown={() =>
            setPhase({ kind: "breakdown", score: phase.score, before: phase.before, after: phase.after })
          }
        />
      </MockFrame>
    );
  }

  if (phase.kind === "breakdown") {
    const loaded = loadedRef.current!;
    return (
      <MockFrame onExit={onExit} title="Mock breakdown">
        <MockBreakdown
          score={phase.score}
          marking={loaded.marking}
          before={phase.before}
          after={phase.after}
          content={loaded.content}
          onExit={onExit}
          onReview={() =>
            setPhase({ kind: "review", score: phase.score, before: phase.before, after: phase.after })
          }
        />
      </MockFrame>
    );
  }

  if (phase.kind === "review") {
    const loaded = loadedRef.current!;
    const reviewSession = completedSessionRef.current;
    if (reviewSession === null) {
      return (
        <MockFrame onExit={onExit} title="Mock review">
          <section className="mk-status mk-status--error" role="alert">
            <p className="mk-status__label">Review unavailable</p>
            <p className="mk-status__body">
              The session data was not available for review. Return to the breakdown.
            </p>
            <button
              type="button"
              className="mk-btn mk-btn--primary"
              onClick={() =>
                setPhase({ kind: "breakdown", score: phase.score, before: phase.before, after: phase.after })
              }
            >
              Back to breakdown
            </button>
          </section>
        </MockFrame>
      );
    }
    return (
      <MockReview
        session={reviewSession}
        score={phase.score}
        content={loaded.content}
        onBack={() =>
          setPhase({ kind: "breakdown", score: phase.score, before: phase.before, after: phase.after })
        }
        onExit={onExit}
      />
    );
  }

  // hall
  const loaded = loadedRef.current!;
  const session = sessionRef.current!;
  return (
    <Hall
      loaded={loaded}
      session={session}
      current={phase.current}
      resume={phase.resume}
      questionStartRef={questionStartRef}
      onMutate={(next) => void persist(next)}
      flushVisit={flushVisit}
      onSubmit={() => void submit(Date.now())}
      onExitHall={() => {
        // Save & exit: the session is already persisted; release and leave.
        if (guardHeldRef.current) {
          releaseMockGuard();
          guardHeldRef.current = false;
        }
        onExit();
      }}
    />
  );
}

/** The first unanswered question index, or 0 when all answered. */
function firstUnanswered(session: MockSession): number {
  for (let i = 0; i < session.order.length; i++) {
    if (session.answers[session.order[i]!] === undefined) return i;
  }
  return 0;
}

/** A fresh mock seed from the boundary clock. Stored on the session so the paper
 * is reproducible on resume; the only entropy in the otherwise-pure assembler. */
function nextSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

// ---------------------------------------------------------------------------
// Presentational pieces.
// ---------------------------------------------------------------------------

function MockFrame({
  children,
  onExit,
  title,
}: {
  readonly children: React.ReactNode;
  readonly onExit: () => void;
  readonly title: string;
}): JSX.Element {
  return (
    <div className="mk-screen">
      <header className="mk-bar">
        <span className="mk-bar__title">{title}</span>
        <button
          type="button"
          className="mk-bar__close"
          aria-label="Leave the mock and return home"
          onClick={onExit}
        >
          Close
        </button>
      </header>
      <main className="mk-body">{children}</main>
    </div>
  );
}

function PreMockScreen({
  mock,
  marking,
  battery,
  ff,
  onStart,
}: {
  readonly mock: AssembledMock;
  readonly marking: ScaledMarking;
  readonly battery: BatteryReading | null;
  readonly ff: "phone" | "tablet" | "desktop";
  readonly onStart: () => void;
}): JSX.Element {
  const shield = shieldChecklist(battery);
  const shortfalls = shortfallLines(mock);
  return (
    <section className="mk-premock">
      <p className="mk-premock__eyebrow">Before you begin</p>
      <h2 className="mk-premock__title">A timed mock under exam rules.</h2>

      <div className="mk-note" role="note">
        <p className="mk-note__body">{deviceNote(ff)}</p>
      </div>

      <p className="mk-premock__length">{lengthSummary(mock, marking)}</p>

      {shortfalls.length > 0 && (
        <details className="mk-shortfall">
          <summary className="mk-shortfall__summary">
            Where the paper is short of the full blueprint
          </summary>
          <ul className="mk-shortfall__list">
            {shortfalls.map((s) => (
              <li key={s.nodeId} className="mk-shortfall__row">
                <span className="mk-mono">{s.nodeId}</span>
                <span>
                  {s.short} fewer {s.short === 1 ? "question" : "questions"} than the blueprint asks
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="mk-shield" aria-label="Distraction shield">
        <p className="mk-shield__eyebrow">Set yourself up</p>
        <ul className="mk-shield__list">
          {shield.map((item) => (
            <li key={item.id} className="mk-shield__item">
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <div className="mk-actions">
        <button type="button" className="mk-btn mk-btn--primary" onClick={onStart}>
          Start the mock
        </button>
      </div>
    </section>
  );
}

/** The countdown timer: ticks once a second from the wall-clock budget, and
 * fires onTimeUp exactly once when the budget is exhausted. */
function Countdown({
  session,
  onTimeUp,
}: {
  readonly session: MockSession;
  readonly onTimeUp: () => void;
}): JSX.Element {
  const [now, setNow] = useState<number>(() => Date.now());
  const firedRef = useRef<boolean>(false);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const rem = remainingMs(session, now);
  useEffect(() => {
    if (rem <= 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUp();
    }
  }, [rem, onTimeUp]);
  const totalSec = Math.max(0, Math.floor(rem / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const low = rem <= 5 * 60_000;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;
  return (
    // aria-live="polite" + aria-atomic: announces the countdown to screen
    // readers. "polite" queues after the current utterance so it does not
    // interrupt answer selection. The announcement fires every second but
    // screen readers debounce rapidly changing live regions; the accessible
    // label (minutes + seconds) is always current. When time is low (<= 5 min)
    // aria-live stays polite — "assertive" would interrupt the student reading
    // the question. (WCAG 4.1.3, W5-6)
    <span
      className={`mk-timer${low ? " mk-timer--low" : ""}`}
      aria-label={`Time remaining: ${mm} minutes ${ss} seconds`}
      aria-live="polite"
      aria-atomic="true"
    >
      {label}
    </span>
  );
}

function Hall({
  loaded,
  session,
  current,
  resume,
  questionStartRef,
  onMutate,
  flushVisit,
  onSubmit,
  onExitHall,
}: {
  readonly loaded: Loaded;
  readonly session: MockSession;
  readonly current: number;
  readonly resume: string | null;
  readonly questionStartRef: React.MutableRefObject<number>;
  readonly onMutate: (next: MockSession) => void;
  readonly flushVisit: (s: MockSession, itemId: string, picked: number | null) => MockSession;
  readonly onSubmit: () => void;
  readonly onExitHall: () => void;
}): JSX.Element {
  const [idx, setIdx] = useState<number>(current);
  // The live session is held in a ref-like state so mutations re-render.
  const [live, setLive] = useState<MockSession>(session);
  const [picked, setPicked] = useState<number | null>(() => {
    const id = session.order[current];
    return id !== undefined ? (session.answers[id]?.selectedOption ?? null) : null;
  });
  const [showSubmit, setShowSubmit] = useState<boolean>(false);

  const itemId = live.order[idx]!;
  const item = loaded.content.get(itemId);

  /** Commit the current visit's selection + time, persist, and run `then`. */
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
        live,
        itemId,
        key,
        Math.max(0, Date.now() - questionStartRef.current),
      );
      questionStartRef.current = Date.now();
      setLive(next);
      onMutate(next);
    },
    [live, itemId, onMutate, questionStartRef],
  );

  const clear = useCallback((): void => {
    setPicked(null);
    const next = withClearedAnswer(live, itemId);
    setLive(next);
    onMutate(next);
  }, [live, itemId, onMutate]);

  const toggleFlag = useCallback((): void => {
    const next = withToggledFlag(live, itemId);
    setLive(next);
    onMutate(next);
  }, [live, itemId, onMutate]);

  const toggleStrike = useCallback(
    (optionKey: number): void => {
      const next = withToggledStrike(live, itemId, optionKey, picked);
      // If the strike cleared the selection (striking the picked option), sync it.
      if (picked !== null && optionKey === picked && next.answers[itemId] === undefined) {
        setPicked(null);
      }
      setLive(next);
      onMutate(next);
    },
    [live, itemId, picked, onMutate],
  );

  // Keyboard: 1-4 select, Shift+1-4 strike, F flag, C clear, arrows move.
  // Secondary to the buttons; Shift+digit toggles strike without selecting.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && item) {
        const n = Number(digit[1]);
        const opt = item.options[n - 1];
        if (opt) {
          e.preventDefault();
          if (e.shiftKey) {
            toggleStrike(opt.key);
          } else {
            pick(opt.key);
          }
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "f") toggleFlag();
      else if (k === "c") clear();
      else if (e.key === "ArrowRight") goTo(idx + 1);
      else if (e.key === "ArrowLeft") goTo(idx - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [item, pick, toggleStrike, toggleFlag, clear, goTo, idx]);

  const answered = answeredCount(live);
  const flagged = new Set(live.flagged);
  const partOf = familyRefs(loaded.pack);
  const struckForItem = new Set(live.struck[itemId] ?? []);

  if (item === undefined) {
    return (
      <MockFrame onExit={onExitHall} title="Mock">
        <section className="mk-status mk-status--error" role="alert">
          <p className="mk-status__label">A question could not be shown</p>
          <p className="mk-status__body">Submit what you have so the work is not lost.</p>
          <button type="button" className="mk-btn mk-btn--primary" onClick={onSubmit}>
            Submit now
          </button>
        </section>
      </MockFrame>
    );
  }

  const topic = topicLabel(loaded.names, item.tests[0] ?? null) ?? "";
  return (
    <div className="mk-screen mk-screen--hall">
      <header className="mk-hallbar">
        <Countdown session={live} onTimeUp={onSubmit} />
        <span className="mk-hallbar__neg" aria-label="Marking scheme">
          {MARKING_REMINDER}
        </span>
        <button type="button" className="mk-hallbar__exit" onClick={onExitHall}>
          Save and exit
        </button>
      </header>

      <div className="mk-hall">
        <main className="mk-hall__main">
          {resume !== null && (
            <p className="mk-resume" role="status">
              {resume}
            </p>
          )}
          <div className="mk-qmeta">
            <span className="mk-qmeta__num">
              Q {idx + 1} of {live.order.length}
            </span>
            <span className="mk-qmeta__node">{topic}</span>
          </div>
          <p className="mk-stem">{item.stem}</p>

          <div className="mk-options" role="radiogroup" aria-label="Answer options">
            {item.options.map((o, i) => {
              const sel = picked === o.key;
              const isStruck = struckForItem.has(o.key);
              return (
                <div
                  key={o.key}
                  className={`mk-optrow${isStruck ? " mk-optrow--struck" : ""}`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    className={`mk-opt${sel ? " mk-opt--picked" : ""}${isStruck ? " mk-opt--struck" : ""}`}
                    onClick={() => pick(o.key)}
                  >
                    <span className="mk-opt__key">{o.key}</span>
                    <span className="mk-opt__text">{o.text}</span>
                    <kbd className="mk-opt__kbd">{i + 1}</kbd>
                  </button>
                  <button
                    type="button"
                    className="mk-opt__strike"
                    aria-pressed={isStruck}
                    aria-label={isStruck ? `Restore option ${o.key}` : `Rule out option ${o.key}`}
                    title={isStruck ? `Restore (Shift+${i + 1})` : `Rule out (Shift+${i + 1})`}
                    onClick={() => toggleStrike(o.key)}
                  >
                    <span className="mk-opt__strike-icon" aria-hidden="true">
                      {isStruck ? "+" : "x"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mk-hallactions">
            <button type="button" className="mk-btn mk-btn--ghost" onClick={() => goTo(idx - 1)} disabled={idx === 0}>
              Previous
            </button>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={clear} disabled={picked === null}>
              Clear
            </button>
            <button
              type="button"
              className={`mk-btn mk-btn--flag${flagged.has(itemId) ? " mk-btn--flag-on" : ""}`}
              onClick={toggleFlag}
              aria-pressed={flagged.has(itemId)}
            >
              {flagged.has(itemId) ? "Flagged" : "Flag"}
            </button>
            {idx + 1 < live.order.length ? (
              <button type="button" className="mk-btn mk-btn--primary" onClick={() => goTo(idx + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="mk-btn mk-btn--primary" onClick={() => setShowSubmit(true)}>
                Review and submit
              </button>
            )}
          </div>
        </main>

        <Palette
          session={live}
          parts={partOf}
          content={loaded.content}
          names={loaded.names}
          current={idx}
          answeredTotal={answered}
          onJump={goTo}
          onSubmit={() => setShowSubmit(true)}
          markingReminder={MARKING_REMINDER}
        />
      </div>

      {showSubmit && (
        <SubmitDialog
          answered={answered}
          flagged={live.flagged.length}
          total={live.order.length}
          negativePerWrong={loaded.marking.negativePerWrong}
          markingReminder={MARKING_REMINDER}
          onCancel={() => setShowSubmit(false)}
          onConfirm={onSubmit}
        />
      )}
    </div>
  );
}

/** The question palette: answered / flagged / current state per question,
 * grouped by blueprint part. A bottom strip on the phone, a side panel at
 * >=900px (mock.css media query). */
function Palette({
  session,
  parts,
  content,
  names,
  current,
  answeredTotal,
  onJump,
  onSubmit,
  markingReminder,
}: {
  readonly session: MockSession;
  readonly parts: readonly FamilyRef[];
  readonly content: ReadonlyMap<string, ContentItem>;
  /** Taxonomy display names; the palette groups read as part names, not ids. */
  readonly names: ReadonlyMap<string, string>;
  readonly current: number;
  readonly answeredTotal: number;
  readonly onJump: (idx: number) => void;
  readonly onSubmit: () => void;
  readonly markingReminder: string;
}): JSX.Element {
  const flagged = new Set(session.flagged);
  // Group question indices by part (paper order keeps each part contiguous).
  const groups = new Map<string, number[]>();
  const order: string[] = [];
  session.order.forEach((itemId, i) => {
    const item = content.get(itemId);
    let partId = "other";
    if (item) {
      for (const fam of parts) {
        if (item.tests.some((t) => t === fam.nodeId || t.startsWith(fam.nodeId + "."))) {
          partId = fam.partId;
          break;
        }
      }
    }
    if (!groups.has(partId)) {
      groups.set(partId, []);
      order.push(partId);
    }
    groups.get(partId)!.push(i);
  });

  return (
    <aside className="mk-palette" aria-label="Question palette">
      <div className="mk-palette__head">
        <span className="mk-palette__title">Questions</span>
        <span className="mk-palette__count">
          {answeredTotal} of {session.order.length} answered
        </span>
      </div>
      <p className="mk-palette__marking" aria-label="Marking scheme">
        {markingReminder}
      </p>
      <div className="mk-palette__scroll">
        {order.map((partId) => (
          <div className="mk-psec" key={partId}>
            <p className="mk-psec__name">{topicLabel(names, partId) ?? partId}</p>
            <div className="mk-psec__grid">
              {groups.get(partId)!.map((i) => {
                const id = session.order[i]!;
                const isAnswered = session.answers[id] !== undefined;
                const isCurrent = i === current;
                const isFlagged = flagged.has(id);
                const cls =
                  `mk-pcell` +
                  (isAnswered ? " mk-pcell--answered" : "") +
                  (isCurrent ? " mk-pcell--current" : "") +
                  (isFlagged ? " mk-pcell--flagged" : "");
                return (
                  <button
                    key={id}
                    type="button"
                    className={cls}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${i + 1}, ${
                      isAnswered ? "answered" : "not answered"
                    }${isFlagged ? ", flagged" : ""}${isCurrent ? ", current" : ""}`}
                    onClick={() => onJump(i)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mk-palette__legend">
        <span className="mk-pleg mk-pleg--answered">Answered</span>
        <span className="mk-pleg mk-pleg--flagged">Flagged</span>
        <span className="mk-pleg mk-pleg--current">Current</span>
      </div>
      <button type="button" className="mk-btn mk-btn--primary mk-palette__submit" onClick={onSubmit}>
        Submit mock
      </button>
    </aside>
  );
}

function SubmitDialog({
  answered,
  flagged,
  total,
  negativePerWrong,
  markingReminder,
  onCancel,
  onConfirm,
}: {
  readonly answered: number;
  readonly flagged: number;
  readonly total: number;
  readonly negativePerWrong: number;
  readonly markingReminder: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): JSX.Element {
  const notAnswered = total - answered;
  return (
    <div className="mk-dim" onClick={onCancel}>
      <div
        className="mk-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Submit mock"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mk-sheet__eyebrow">Submit mock</p>
        <p className="mk-sheet__marking" aria-label="Marking scheme">
          {markingReminder}
        </p>
        <ul className="mk-sheet__sum">
          <li>
            <span>Answered</span>
            <span className="mk-mono">{answered}</span>
          </li>
          <li>
            <span>Not answered</span>
            <span className="mk-mono">{notAnswered}</span>
          </li>
          <li>
            <span>Flagged for review</span>
            <span className="mk-mono">{flagged}</span>
          </li>
        </ul>
        <p className="mk-sheet__body">
          Once you submit, the paper is scored net of negative marking and cannot be reopened.
          Unanswered questions cost nothing. Wrong answers cost {negativePerWrong} each.
        </p>
        <div className="mk-actions mk-actions--row">
          <button type="button" className="mk-btn mk-btn--ghost" onClick={onCancel} autoFocus>
            Keep working
          </button>
          <button type="button" className="mk-btn mk-btn--primary" onClick={onConfirm}>
            Submit and score
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreReveal({
  score,
  onSeeBreakdown,
}: {
  readonly score: MockScore;
  readonly onSeeBreakdown: () => void;
}): JSX.Element {
  return (
    <section className="mk-reveal">
      <p className="mk-reveal__eyebrow">Mock complete</p>
      <p className="mk-reveal__num">
        {score.net.toFixed(2)}
        <span className="mk-reveal__den"> / {score.maxMarks}</span>
      </p>
      <p className="mk-reveal__label">Net of negative marking</p>
      <p className="mk-reveal__verdict">
        {score.cleared ? (
          <>
            You cleared the {score.passMark} pass bar by {score.distanceToPass.toFixed(2)} marks.
          </>
        ) : (
          <>
            You fell {Math.abs(score.distanceToPass).toFixed(2)} marks short of the {score.passMark}{" "}
            pass bar. The penalty cost you {score.penalty.toFixed(2)} of those marks.
          </>
        )}
      </p>
      <div className="mk-actions">
        <button type="button" className="mk-btn mk-btn--primary" onClick={onSeeBreakdown}>
          See where the marks went
        </button>
      </div>
    </section>
  );
}

function MockBreakdown({
  score,
  marking,
  before,
  after,
  content,
  onExit,
  onReview,
}: {
  readonly score: MockScore;
  readonly marking: ScaledMarking;
  readonly before: Readiness;
  readonly after: Readiness;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly onExit: () => void;
  readonly onReview: () => void;
}): JSX.Element {
  const [topicNames, setTopicNames] = useState<ReadonlyMap<string, string> | null>(null);
  const [misNames, setMisNames] = useState<ReadonlyMap<string, string> | null>(null);

  useEffect(() => {
    void loadTopicNames().then(setTopicNames);
    void loadMisconceptionNames().then(setMisNames);
  }, []);

  const wf: WaterfallModel = waterfall(score);
  const misRows: readonly MisconceptionRow[] = misconceptionsByShare(score.wrongAnswers, marking);
  const topMisName: string | null =
    misRows.length > 0
      ? (misNames?.get(misRows[0]!.id) ?? misRows[0]!.id)
      : null;
  const insight: InsightModel = insightText(score, misRows, topMisName);

  return (
    <section className="mk-breakdown">
      <h2 className="mk-breakdown__title">Where the marks went.</h2>

      {/* Accessible tally: screen readers use this; the waterfall is supplementary */}
      <div className="mk-tally" role="group" aria-label="Outcome tally">
        <div className="mk-tally__cell">
          <span className="mk-tally__n">{score.correct}</span>
          <span className="mk-tally__k">Correct</span>
        </div>
        <div className="mk-tally__cell">
          <span className="mk-tally__n">{score.wrong}</span>
          <span className="mk-tally__k">Wrong</span>
        </div>
        <div className="mk-tally__cell">
          <span className="mk-tally__n">{score.skipped}</span>
          <span className="mk-tally__k">Skipped</span>
        </div>
        <div className="mk-tally__cell">
          <span className="mk-tally__n mk-tally__n--neg">-{score.penalty.toFixed(2)}</span>
          <span className="mk-tally__k">Penalty</span>
        </div>
      </div>

      {/* Marks waterfall: five columns showing how full marks became net */}
      <div
        className="mk-waterfall"
        role="img"
        aria-label={wf.ariaLabel}
      >
        <div className="mk-waterfall__bars">
          {wf.columns.map((col) => (
            <div
              key={col.id}
              className={`mk-waterfall__col${col.isNet ? " mk-waterfall__col--net" : ""}`}
            >
              <span className="mk-waterfall__val">{col.display}</span>
              <div
                className="mk-waterfall__bar"
                style={{ height: `${Math.round(col.heightRatio * 100)}%` }}
              />
              <span className="mk-waterfall__lbl">{col.label}</span>
            </div>
          ))}
        </div>
        {/* Pass bar: an absolutely-positioned line at the pass-mark height */}
        <div
          className="mk-waterfall__pass"
          style={{ bottom: `calc(${Math.round(wf.passBarRatio * 100)}% + 28px)` }}
          aria-hidden="true"
        >
          <span className="mk-waterfall__pass-lbl">Pass {score.passMark}</span>
        </div>
      </div>

      <section className="mk-parts" aria-label="Marks by part">
        <p className="mk-parts__eyebrow">Marks by part</p>
        <table className="mk-parttab">
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Right</th>
              <th scope="col">Wrong</th>
              <th scope="col">Blank</th>
              <th scope="col">Net</th>
            </tr>
          </thead>
          <tbody>
            {score.parts.map((p) => (
              <tr key={p.partId}>
                <td>{topicLabel(topicNames, p.partId) ?? p.partId}</td>
                <td>{p.correct}</td>
                <td>{p.wrong}</td>
                <td>{p.skipped}</td>
                <td>{p.net.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {misRows.length > 0 && (
        <section className="mk-mis" aria-label="Marks by misconception">
          <p className="mk-mis__eyebrow">By misconception</p>
          <div className="mk-misbrk">
            <div className="mk-misbrk__row mk-misbrk__row--head">
              <span className="mk-misbrk__h">Misconception</span>
              <span className="mk-misbrk__h mk-misbrk__h--r">Questions</span>
              <span className="mk-misbrk__h mk-misbrk__h--r">Lost</span>
              <span className="mk-misbrk__h">Share</span>
            </div>
            {misRows.map((row) => {
              const name = misNames?.get(row.id) ?? row.id;
              return (
                <div className="mk-misbrk__row" key={row.id}>
                  <span className="mk-misbrk__name">{name}</span>
                  <span className="mk-misbrk__num">{row.count}</span>
                  <span className="mk-misbrk__num mk-misbrk__num--neg">-{row.lostMarks.toFixed(2)}</span>
                  <span className="mk-misbrk__minibar">
                    <span style={{ width: `${Math.round(row.shareRatio * 100)}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mk-insight" role="note">
        <p className="mk-insight__text">{insight.text}</p>
      </div>

      {score.wrongAnswers.length > 0 && (
        <section className="mk-wrong" aria-label="Wrong answers">
          <p className="mk-wrong__eyebrow">The wrong answers, and why</p>
          <ul className="mk-wrong__list">
            {score.wrongAnswers.map((w) => {
              const item = content.get(w.itemId);
              const nodeName = w.nodeId !== null
                ? (topicNames?.get(w.nodeId) ?? fallbackTopicLabel(w.nodeId))
                : null;
              const misName = w.misconception !== null
                ? (misNames?.get(w.misconception) ?? w.misconception)
                : null;
              return (
                <li key={w.itemId} className="mk-wrong__row">
                  {nodeName !== null && (
                    <span className="mk-wrong__node">{nodeName}</span>
                  )}
                  <span className="mk-wrong__detail">
                    You chose option {w.chosenOption}
                    {w.correctOption !== null ? `; the answer was option ${w.correctOption}.` : "."}
                    {misName !== null && (
                      <span className="mk-wrong__mis"> Named misconception: {misName}.</span>
                    )}
                  </span>
                  {item !== undefined && <span className="mk-wrong__stem">{item.stem}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ReadinessShift before={before} after={after} />

      <div className="mk-actions">
        <button type="button" className="mk-btn mk-btn--primary" onClick={onReview}>
          Review the answers
        </button>
        <button type="button" className="mk-btn mk-btn--ghost" onClick={onExit}>
          Back to home
        </button>
      </div>
    </section>
  );
}

/** The honest before/after readiness shift: the engine anchors on mock events
 * (SPEC 6), so the estimate moves after a mock. We show both bands plainly, with
 * the engine's own note (never paraphrased). Gated bands fall back to the note. */
function ReadinessShift({
  before,
  after,
}: {
  readonly before: Readiness;
  readonly after: Readiness;
}): JSX.Element {
  const fmt = (r: Readiness): string => {
    if (r.expectedMarks === null || r.low === null || r.high === null) {
      return "not enough data yet";
    }
    return `${r.low} to ${r.high} marks (around ${r.expectedMarks})`;
  };
  const moved =
    before.expectedMarks !== null &&
    after.expectedMarks !== null &&
    before.expectedMarks !== after.expectedMarks;
  return (
    <section className="mk-shift" aria-label="Readiness after the mock">
      <p className="mk-shift__eyebrow">Readiness, anchored to this mock</p>
      <div className="mk-shift__rows">
        <p className="mk-shift__row">
          <span className="mk-shift__k">Before</span>
          <span className="mk-shift__v">{fmt(before)}</span>
        </p>
        <p className="mk-shift__row">
          <span className="mk-shift__k">After</span>
          <span className="mk-shift__v">{fmt(after)}</span>
        </p>
      </div>
      {moved && (
        <p className="mk-shift__delta">
          A real mock moves the estimate more than practice does, because the engine anchors on it.
        </p>
      )}
      <p className="mk-shift__note">{after.note}</p>
    </section>
  );
}
