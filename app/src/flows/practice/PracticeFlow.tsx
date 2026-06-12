/**
 * PracticeFlow — the full-window drill at #/drill (design scr-practice.jsx:125-232).
 *
 * Rendering is rebuilt to match the locked design anatomy. The pure logic in
 * machine.ts and event.ts is unchanged. Key design decisions:
 *
 * - Question phase: .fb-context bar (48px), .drill__body > .drill__inner (760px),
 *   .opt.opt--interactive rows with .opt__letter A-D and .kbd 1-4, .drill__foot.
 * - Feedback phase: .fb-split split-annotated (1fr / 380px). Left pane: stem +
 *   reviewed option rows (FbOptionRow anatomy). Right aside (.fb-split__diag):
 *   misconception or success heading, always-visible working steps, cost button,
 *   Next / Finish drill actions.
 * - DrillClose: shown at session end — confidence question, then score + calibration.
 * - Keyboard: 1-4 pick, Enter commit/next, Space scrolls working into view; all
 *   suppressed when a dialog is open. Esc is handled at the router level (not here).
 * - Confidence check: one question per session at DrillClose, not per question.
 * - No visible per-question timer. Timing is recorded silently in the event.
 * - Topic/difficulty filter: serving runs on a bank narrowed by filterPack
 *   (engine/insights.ts) when the student picked a topic or a fixed level;
 *   replay always rebuilds state on the FULL bank, so engine math is intact.
 *   An emptied pool ends the session through the selector's "none".
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildEngineState,
  type LoadedPack,
} from "../../engine/index.js";
import type { EngineState } from "@pinaka/engine";
import {
  getSharedStorage,
  type StorageAdapter,
  type StoredEvent,
} from "../../storage/index.js";
import { buildEvent, type Response } from "./event.js";
import {
  advanceSession,
  buildFeedback,
  EMPTY_SESSION,
  isResurfaced,
  isSessionComplete,
  selectQuestion,
  type FeedbackView,
  type ServedQuestion,
  type SessionProgress,
} from "./machine.js";
import { getExamMs } from "../firstrun/meta.js";
import { loadTopicNames, topicLabel, loadMisconceptionNames } from "../../engine/topics.js";
import { loadCaContent } from "./content.js";
import {
  calibration,
  fallbackName,
  filterPack,
  type SessionConfidence,
} from "../../engine/insights.js";
import { loadAppSnapshot, invalidateAppSnapshot } from "../../state/appData.js";
import { Icon, Chip } from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { DRILL_SETUP_KEY, type DrillSetup } from "./PracticeHub.js";
import type { ContentItem } from "./types.js";
import "./practice.css";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function viewportWidth(): number {
  return typeof window === "undefined" ? 360 : window.innerWidth;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

function letterFor(key: number): string {
  return OPTION_LETTERS[key - 1] ?? String(key);
}

function readDrillSetup(): DrillSetup {
  try {
    const raw = sessionStorage.getItem(DRILL_SETUP_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<DrillSetup>;
      return {
        topic: typeof v.topic === "string" ? v.topic : "weakest",
        difficulty: (["adaptive", "L1", "L2", "L3"] as const).includes(
          v.difficulty as "adaptive" | "L1" | "L2" | "L3",
        )
          ? (v.difficulty as "adaptive" | "L1" | "L2" | "L3")
          : "adaptive",
        count: ([5, 10, 20] as const).includes(v.count as 5 | 10 | 20)
          ? (v.count as 5 | 10 | 20)
          : 10,
        solveFirst: typeof v.solveFirst === "boolean" ? v.solveFirst : false,
        confidence: typeof v.confidence === "boolean" ? v.confidence : true,
      };
    }
  } catch {
    // sessionStorage unavailable or malformed.
  }
  return {
    topic: "weakest",
    difficulty: "adaptive",
    count: 10,
    solveFirst: false,
    confidence: true,
  };
}

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

interface Loaded {
  readonly pack: LoadedPack;
  /** The serving pool: the pack narrowed by the drill setup (topic/level).
   * Replay always uses the FULL pack.bank; only selection reads this. */
  readonly servePack: LoadedPack;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly adapter: StorageAdapter;
  readonly names: ReadonlyMap<string, string>;
  readonly misNames: ReadonlyMap<string, string>;
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "empty" }
  | {
      readonly kind: "question";
      readonly q: ServedQuestion;
      readonly picked: number | null;
    }
  | {
      readonly kind: "feedback";
      readonly q: ServedQuestion;
      readonly view: FeedbackView;
    }
  | {
      readonly kind: "close";
      readonly correct: number;
      readonly total: number;
      readonly topicName: string;
      readonly insightLine: string;
      readonly confidence: boolean;
    };

export interface PracticeFlowProps {
  readonly onExit: () => void;
}

export function PracticeFlow({ onExit }: PracticeFlowProps): JSX.Element {
  const setup = useRef<DrillSetup>(readDrillSetup());
  const sessionLength = setup.current.count;

  // One-shot hand-off: consume the setup on mount (an effect, never a render
  // side effect) so a later plain #/drill visit cannot replay a stale list.
  useEffect(() => {
    try {
      sessionStorage.removeItem(DRILL_SETUP_KEY);
    } catch {
      // sessionStorage unavailable; nothing to consume.
    }
  }, []);

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  // Misconception cost stats for the currently-displayed feedback, or null.
  const [misStats, setMisStats] = useState<{ marks: number; count: number } | null>(null);

  const loadedRef = useRef<Loaded | null>(null);
  const examMsRef = useRef<number | undefined>(undefined);
  const stateRef = useRef<EngineState | null>(null);
  const sessionRef = useRef<SessionProgress>(EMPTY_SESSION);
  const answeredRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);
  // Track correct/wrong counts for DrillClose
  const correctCountRef = useRef<number>(0);
  // Track the dominant misconception for the insight line
  const misCountRef = useRef<Map<string, number>>(new Map());
  // Track the first topic served
  const firstTopicRef = useRef<string | null>(null);

  // ---- Load ----
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
      const su = setup.current;
      const servePack = filterPack(pack, {
        ...(su.topic !== "weakest" ? { familyId: su.topic } : {}),
        ...(su.difficulty !== "adaptive" ? { difficulty: su.difficulty } : {}),
      });
      loadedRef.current = { pack, servePack, content, adapter, names, misNames };

      const nowMs = Date.now();
      const examMs = await getExamMs(adapter);
      examMsRef.current = examMs;
      const events = await adapter.readAllEvents();
      stateRef.current = buildEngineState(events, pack.bank, nowMs, examMs);

      if (cancelled) return;
      serveNext(nowMs);
    }

    boot().catch((err: unknown) => {
      if (cancelled) return;
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "The practice session could not start.",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const serveNext = useCallback(
    (nowMs: number): void => {
      const loaded = loadedRef.current;
      const state = stateRef.current;
      if (loaded === null || state === null) return;

      if (isSessionComplete(answeredRef.current, sessionLength)) {
        endSession();
        return;
      }

      const q = selectQuestion(
        state,
        loaded.servePack,
        loaded.content,
        nowMs,
        sessionRef.current,
        sessionLength,
      );
      if (q === null) {
        endSession();
        return;
      }
      questionStartRef.current = nowMs;
      // Track first topic for the DrillClose label.
      if (firstTopicRef.current === null && q.content.tests[0]) {
        const loaded2 = loadedRef.current;
        firstTopicRef.current =
          loaded2?.names.get(q.content.tests[0]) ??
          fallbackName(q.content.tests[0]);
      }
      setPhase({ kind: "question", q, picked: null });
    },
    [sessionLength],
  );

  const endSession = useCallback((): void => {
    const loaded = loadedRef.current;
    const su = setup.current;
    if (loaded === null) {
      setPhase({ kind: "empty" });
      return;
    }
    // Build insight line from dominant misconception this session.
    const misMap = misCountRef.current;
    let dominantMis: string | null = null;
    let dominantCount = 0;
    for (const [id, n] of misMap) {
      if (n > dominantCount) {
        dominantCount = n;
        dominantMis = id;
      }
    }
    let insightLine: string;
    if (dominantMis !== null && dominantCount >= 2) {
      const name =
        loaded.misNames.get(dominantMis) ?? fallbackName(dominantMis);
      insightLine = `Of the ${answeredRef.current - correctCountRef.current} you missed, ${dominantCount} involved the same error: ${name}. Fix that one pattern to see the biggest jump.`;
    } else if (answeredRef.current - correctCountRef.current === 0) {
      insightLine = "No errors in this session. A clean drill.";
    } else {
      insightLine = "No recurring misconception in this session.";
    }
    // Derive topic name.
    const topicId = su.topic;
    let topicName: string;
    if (topicId === "weakest") {
      topicName = firstTopicRef.current ?? "Practice";
    } else {
      topicName = loaded.names.get(topicId) ?? fallbackName(topicId);
    }
    setPhase({
      kind: "close",
      correct: correctCountRef.current,
      total: answeredRef.current,
      topicName,
      insightLine,
      confidence: su.confidence,
    });
  }, []);

  const confirm = useCallback(async (): Promise<void> => {
    const loaded = loadedRef.current;
    if (loaded === null) return;
    if (phase.kind !== "question" || phase.picked === null) return;
    const q = phase.q;

    const occurredAtMs = Date.now();
    const timeMs = Math.max(0, occurredAtMs - questionStartRef.current);
    const response: Response = { kind: "single_best", selected_option: phase.picked };

    const event: StoredEvent = buildEvent(q.content, response, {
      eventId: crypto.randomUUID(),
      occurredAtMs,
      timeMs,
      viewportWidth: viewportWidth(),
      resurfaced: isResurfaced(q),
      mode: "practice",
    });

    await loaded.adapter.appendEvents([event]);
    invalidateAppSnapshot();

    const events = await loaded.adapter.readAllEvents();
    stateRef.current = buildEngineState(
      events,
      loaded.pack.bank,
      occurredAtMs,
      examMsRef.current,
    );
    sessionRef.current = advanceSession(sessionRef.current, q);
    answeredRef.current += 1;

    if (event.correct) {
      correctCountRef.current += 1;
    } else if (event.selected_misconception !== null) {
      const id = event.selected_misconception;
      misCountRef.current.set(id, (misCountRef.current.get(id) ?? 0) + 1);
    }

    const view = buildFeedback(q.content, {
      correct: event.correct,
      chosenKey: phase.picked,
    });
    setPhase({ kind: "feedback", q, view });
  }, [phase]);

  // ---- Keyboard handler ----
  useEffect(() => {
    // Only active during question or feedback phases.
    if (phase.kind !== "question" && phase.kind !== "feedback") return;

    const h = (e: KeyboardEvent): void => {
      // Suppress if a dialog is open.
      if (document.querySelector('[role="dialog"]') !== null) return;
      if (phase.kind === "question") {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1) {
          const opt = phase.q.content.options[idx];
          if (opt !== undefined) {
            setPhase({ kind: "question", q: phase.q, picked: opt.key });
          }
          return;
        }
        if (e.key === "Enter" && phase.picked !== null) {
          void confirm();
        }
      } else if (phase.kind === "feedback") {
        if (e.key === " ") {
          e.preventDefault();
          const diag = document.querySelector(".fb-split__diag");
          if (diag !== null) {
            (diag as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        if (e.key === "Enter") {
          if (isSessionComplete(answeredRef.current, sessionLength)) {
            endSession();
          } else {
            serveNext(Date.now());
          }
        }
      }
    };

    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, confirm, serveNext, endSession, sessionLength]);

  // Load misconception cost stats whenever feedback shows a new misconception.
  useEffect(() => {
    if (phase.kind !== "feedback") { setMisStats(null); return; }
    const chosenEntry = phase.view.optionEntries.find(
      (e) => e.optionKey === phase.view.chosenKey,
    );
    const misId = chosenEntry?.misconception ?? null;
    if (misId === null) { setMisStats(null); return; }
    void loadAppSnapshot().then((snap) => {
      const cost = snap.costs.find((c) => c.id === misId);
      setMisStats(cost !== undefined ? { marks: cost.marksLost, count: cost.count } : null);
    });
  }, [phase]);

  // ---- Render ----

  if (phase.kind === "loading") {
    return (
      <main className="screen drill" aria-busy="true">
        <div className="fb-context">
          <div className="fb-context__left">
            <span className="eyebrow">Practice</span>
          </div>
          <div className="fb-context__right">
            <button
              type="button"
              className="win__ctrl"
              aria-label="Close practice and return home"
              onClick={onExit}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        <div className="drill__body">
          <div className="drill__inner">
            <p className="screen__lede">Loading practice</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="screen drill">
        <div className="fb-context">
          <div className="fb-context__left">
            <span className="eyebrow">Practice</span>
          </div>
          <div className="fb-context__right">
            <button
              type="button"
              className="win__ctrl"
              aria-label="Close"
              onClick={onExit}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        <div className="drill__body">
          <div className="drill__inner">
            <p className="screen__lede">Practice could not start</p>
            <p style={{ color: "var(--color-muted-foreground)", marginTop: "var(--space-2)" }}>
              {phase.message}
            </p>
            <div className="btn-row" style={{ marginTop: "var(--space-5)" }}>
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                onClick={() => {
                  answeredRef.current = 0;
                  sessionRef.current = EMPTY_SESSION;
                  setPhase({ kind: "loading" });
                  const loaded = loadedRef.current;
                  if (loaded !== null) {
                    const nowMs = Date.now();
                    loaded.adapter
                      .readAllEvents()
                      .then((events) => {
                        stateRef.current = buildEngineState(
                          events,
                          loaded.pack.bank,
                          nowMs,
                        );
                        serveNext(nowMs);
                      })
                      .catch((err: unknown) =>
                        setPhase({
                          kind: "error",
                          message:
                            err instanceof Error ? err.message : "Recovery failed. Reopen the app.",
                        }),
                      );
                  } else {
                    onExit();
                  }
                }}
              >
                Try again
              </button>
              <button type="button" className="sa-btn sa-btn--ghost" onClick={onExit}>
                Back to Today
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "empty") {
    return (
      <main className="screen drill">
        <div className="fb-context">
          <div className="fb-context__left">
            <span className="eyebrow">Practice</span>
          </div>
          <div className="fb-context__right">
            <button
              type="button"
              className="win__ctrl"
              aria-label="Close"
              onClick={onExit}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        <div className="drill__body">
          <div className="drill__inner">
            <p className="screen__lede">No questions to practise</p>
            <p style={{ color: "var(--color-muted-foreground)", marginTop: "var(--space-2)" }}>
              This pack has no questions available right now. Check for an update, or come back
              after the next pack drop.
            </p>
            <div className="btn-row" style={{ marginTop: "var(--space-5)" }}>
              <button type="button" className="sa-btn sa-btn--primary" onClick={onExit}>
                Back to Today<Icon name="arrow-right" size={15} />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "close") {
    return (
      <DrillClose
        correct={phase.correct}
        total={phase.total}
        topicName={phase.topicName}
        insightLine={phase.insightLine}
        confidenceEnabled={phase.confidence}
      />
    );
  }

  if (phase.kind === "question") {
    const q = phase.q;
    const item = q.content;
    const loaded = loadedRef.current;
    const topicName =
      topicLabel(loaded?.names ?? null, item.tests[0] ?? null) ?? "Practice";
    const n = q.ordinal;
    const N = sessionLength;

    return (
      <main className="screen drill">
        <div className="fb-context">
          <div className="fb-context__left">
            <span className="eyebrow">Practice · {topicName}</span>
            <Chip kind="low">
              {item.tests[0]
                ? (loaded?.names.get(item.tests[0]) ?? fallbackName(item.tests[0]))
                : topicName}{" "}
              · {item.difficulty_label}
            </Chip>
          </div>
          <div className="fb-context__right">
            <span className="fb-context__progress">
              Q {n} / {N}
            </span>
            <button
              type="button"
              className="win__ctrl"
              aria-label="Close practice and return home"
              onClick={onExit}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        <div className="drill__body">
          <div className="drill__inner">
            <div className="q-num">
              Q {n} / {N}
            </div>
            <p className="q-stem">{item.stem}</p>
            <div>
              {item.options.map((o, i) => (
                <button
                  key={o.key}
                  type="button"
                  className={`opt opt--interactive${phase.picked === o.key ? " is-picked" : ""}`}
                  onClick={() => setPhase({ kind: "question", q, picked: o.key })}
                  style={{ width: "100%", textAlign: "left", font: "inherit" }}
                >
                  <span className="opt__letter">{letterFor(o.key)}</span>
                  <span className="opt__body">{o.text}</span>
                  <span className="opt__spacer" />
                  <kbd className="kbd">{i + 1}</kbd>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="drill__foot">
          <span className="solve-toggle">
            <Icon name="keyboard" size={14} />
            Press <kbd className="kbd">1</kbd>–<kbd className="kbd">4</kbd> to choose,{" "}
            <kbd className="kbd">Enter</kbd> to commit
          </span>
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            disabled={phase.picked === null}
            style={{ opacity: phase.picked !== null ? 1 : 0.5 }}
            onClick={() => void confirm()}
          >
            Commit answer<Icon name="arrow-right" size={15} />
          </button>
        </div>
      </main>
    );
  }

  // feedback phase
  const { q, view } = phase;
  const item = q.content;
  const loaded = loadedRef.current;
  const topicName =
    topicLabel(loaded?.names ?? null, item.tests[0] ?? null) ?? "Practice";
  const n = q.ordinal;
  const N = sessionLength;

  const correctLetter =
    view.correctKey !== null ? letterFor(view.correctKey) : null;
  const chosenLetter =
    view.chosenKey !== null ? letterFor(view.chosenKey) : null;

  // Resolve misconception name.
  const chosenEntry = view.optionEntries.find((e) => e.optionKey === view.chosenKey);
  const misId = chosenEntry?.misconception ?? null;
  const misName = misId !== null
    ? (loaded?.misNames.get(misId) ?? fallbackName(misId))
    : null;

  const isLast = isSessionComplete(answeredRef.current, sessionLength);

  return (
    <main className="screen" style={{ display: "flex", flexDirection: "column" }}>
      <div className="fb-context">
        <div className="fb-context__left">
          <span className="eyebrow">Practice · {topicName}</span>
          <Chip kind="low">
            {item.tests[0]
              ? (loaded?.names.get(item.tests[0]) ?? fallbackName(item.tests[0]))
              : topicName}{" "}
            · {item.difficulty_label}
          </Chip>
        </div>
        <div className="fb-context__right">
          <span className="fb-context__progress">
            Q {n} / {N}
          </span>
          <button
            type="button"
            className="win__ctrl"
            aria-label="Close practice and return home"
            onClick={onExit}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      <div className="fb-split">
        {/* Left pane: question + reviewed option rows */}
        <div className="fb-split__q">
          <div className="q-num">
            Q {n} / {N}
          </div>
          <p className="q-stem" style={{ fontSize: "var(--text-base)" }}>
            {item.stem}
          </p>
          {item.options.map((o) => {
            const isCorrect = o.key === view.correctKey;
            const isChosen = o.key === view.chosenKey;
            const isChosenWrong = isChosen && !view.correct;
            const cls = isCorrect
              ? "opt opt--correct"
              : isChosenWrong
                ? "opt opt--chosen"
                : "opt";
            return (
              <div key={o.key} className={cls}>
                <span className="opt__letter">{letterFor(o.key)}</span>
                <span className="opt__body">{o.text}</span>
                <span className="opt__spacer" />
                {isCorrect && (
                  <span className="opt__tag">
                    <Icon name="check" size={14} />
                    Correct
                  </span>
                )}
                {isChosenWrong && (
                  <span className="opt__tag">
                    <Icon name="x" size={14} />
                    Your answer
                  </span>
                )}
              </div>
            );
          })}
          {!view.correct && correctLetter !== null && chosenLetter !== null && (
            <p className="caveat" style={{ marginTop: "var(--space-5)" }}>
              Correct is {correctLetter}. You chose {chosenLetter}.
            </p>
          )}
          {view.correct && chosenLetter !== null && (
            <p className="caveat" style={{ marginTop: "var(--space-5)" }}>
              Correct. You chose {chosenLetter}.
            </p>
          )}
        </div>

        {/* Right aside: misconception / why-right, working, cost link, actions */}
        <aside className="fb-split__diag">
          {view.correct ? (
            <>
              <div
                className="mis-card__eyebrow"
                style={{ color: "var(--color-success-text)" }}
              >
                <Icon name="check" size={13} />
                Right, and here is why
              </div>
              <h3
                className="mis-card__name"
                style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}
              >
                {item.tests[0]
                  ? (loaded?.names.get(item.tests[0]) ?? fallbackName(item.tests[0]))
                  : topicName}
              </h3>
              {view.misconceptionLine !== null && (
                <p
                  className="mis-card__line"
                  style={{ marginBottom: "var(--space-6)" }}
                >
                  {view.misconceptionLine}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mis-card__eyebrow">
                <Icon name="crosshair" size={13} />
                Named misconception
              </div>
              <h3
                className="mis-card__name"
                style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}
              >
                {misName ?? (item.tests[0]
                  ? (loaded?.names.get(item.tests[0]) ?? fallbackName(item.tests[0]))
                  : topicName)}
              </h3>
              {view.misconceptionLine !== null && (
                <p
                  className="mis-card__line"
                  style={{ marginBottom: "var(--space-6)" }}
                >
                  {view.misconceptionLine}
                </p>
              )}
            </>
          )}

          <div
            className="eyebrow"
            style={{ marginBottom: "var(--space-3)" }}
          >
            The working
          </div>
          <div className="work__steps" style={{ marginTop: 0 }}>
            {view.steps.map((s, i) => (
              <div key={i} className="work__step">
                <span className="work__step-n">{i + 1}</span>
                <span className="work__step-body">{s}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "var(--space-8)",
              paddingTop: "var(--space-5)",
              borderTop: "1px solid var(--color-border-hairline)",
            }}
          >
            {!view.correct && misId !== null && misStats !== null && (
              <button
                type="button"
                onClick={() => navigate(`misconception/${misId}`)}
                style={{
                  background: "var(--color-warning-soft)",
                  border: "1px solid var(--color-warning-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  marginBottom: "var(--space-4)",
                  padding: "10px 12px",
                  font: "inherit",
                  fontSize: 12,
                  color: "var(--color-warning-text)",
                  lineHeight: "var(--leading-normal)",
                  textAlign: "left",
                  display: "block",
                  width: "100%",
                }}
              >
                This misconception has cost you {misStats.marks} marks across{" "}
                {misStats.count} questions. See the pattern →
              </button>
            )}
            <div className="btn-row">
              {!isLast && (
                <button
                  type="button"
                  className="sa-btn sa-btn--secondary"
                  onClick={() => serveNext(Date.now())}
                >
                  Next
                </button>
              )}
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                style={{ flex: 1 }}
                onClick={() => {
                  if (isLast) {
                    endSession();
                  } else {
                    endSession();
                  }
                }}
              >
                Finish drill<Icon name="arrow-right" size={15} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* DrillClose — retrospective confidence + calibration                   */
/* (design scr-practice.jsx:238-298)                                    */
/* ------------------------------------------------------------------ */

const CONF_OPTS: ReadonlyArray<{
  readonly id: SessionConfidence;
  readonly label: string;
  readonly sub: string;
}> = [
  { id: "low", label: "Not confident", sub: "I was guessing on several" },
  { id: "mid", label: "Fairly confident", sub: "A few felt shaky" },
  { id: "high", label: "Very confident", sub: "I expected to get them all" },
];

function DrillClose({
  correct,
  total,
  topicName,
  insightLine,
  confidenceEnabled,
}: {
  readonly correct: number;
  readonly total: number;
  readonly topicName: string;
  readonly insightLine: string;
  readonly confidenceEnabled: boolean;
}): JSX.Element {
  const [conf, setConf] = useState<SessionConfidence | null>(null);
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const cal = conf !== null ? calibration(conf, scorePct) : null;

  // When confidence is disabled, skip straight to the results step.
  const showResults = !confidenceEnabled || conf !== null;

  // Keyboard: Enter advances from confidence to results (if applicable).
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && showResults) {
        navigate("today");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showResults]);

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="dclose">
          <div
            className="screen__eyebrow"
            style={{ justifyContent: "center" }}
          >
            <Icon name="crosshair" size={13} />
            Drill complete · {topicName}
          </div>

          {!showResults ? (
            <>
              <h1
                className="screen__title"
                style={{ textAlign: "center", marginBottom: "var(--space-2)" }}
              >
                How confident were you?
              </h1>
              <p
                className="screen__lede"
                style={{ textAlign: "center", maxWidth: "42ch" }}
              >
                One question, asked once. Your answer is checked against how you actually did.
              </p>
              <div className="conf-scale">
                {CONF_OPTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="conf-opt"
                    onClick={() => setConf(c.id)}
                  >
                    {c.label}
                    <span className="conf-opt__sub">{c.sub}</span>
                  </button>
                ))}
              </div>
              <p className="caveat">
                You scored {correct} of {total}. You will see how that compares to your answer.
              </p>
            </>
          ) : (
            <>
              <div className="dclose__score">
                <span className="mono">{correct}</span>
                <span className="dclose__den">/ {total}</span>
              </div>
              {cal !== null && (
                <>
                  <div className={`dclose__cal dclose__cal--${cal.kind}`}>{cal.label}</div>
                  <p className="dclose__cal-text">{cal.text}</p>
                </>
              )}
              <div
                className="insight"
                style={{ maxWidth: 560, marginTop: "var(--space-8)", textAlign: "left" }}
              >
                <Icon name="lightbulb" size={20} className="insight__icon" />
                <div>
                  <div className="insight__label">From this drill</div>
                  <p className="insight__text">{insightLine}</p>
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: "var(--space-8)" }}>
                <button
                  type="button"
                  className="sa-btn sa-btn--ghost"
                  onClick={() => navigate("diagnosis")}
                >
                  See the pattern
                </button>
                <button
                  type="button"
                  className="sa-btn sa-btn--primary"
                  onClick={() => navigate("today")}
                >
                  Back to Today<Icon name="arrow-right" size={15} />
                </button>
              </div>
              <p className="caveat" style={{ marginTop: "var(--space-5)" }}>
                Nothing is queued. You decide when to drill again.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
