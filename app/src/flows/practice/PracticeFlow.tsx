/**
 * Practice loop — phone-native screen (W5-5 flow a).
 *
 * The thin React renderer over the pure flow logic in machine.ts and event.ts.
 * It owns only what it must: the storage adapter, the rebuilt engine state, the
 * clock (Date.now at the boundary), the event id (crypto.randomUUID), the
 * viewport width, and the per-question timer. Every decision (what to serve, how
 * to score, what the feedback says, when the session ends) is delegated to the
 * tested logic functions so nothing load-bearing lives inline in JSX.
 *
 * Layout: 360px-first (ADR 0011), 44px touch targets, visible focus rings,
 * tokens only (theme/tokens.css via practice.css). Notation is plain text plus
 * unicode glyphs (ADR 0015): no HTML in any stem, option, or explanation.
 *
 * States implemented (Component & State Inventory): loading, empty bank, error
 * (with recovery action), the question (options) phase, the split feedback
 * (correct why-right / wrong named-misconception + working steps + next action),
 * and the end-of-session summary with the engine's honest readiness line.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildEngineState,
  readiness as computeReadinessSelector,
  type LoadedPack,
} from "../../engine/index.js";
import type { EngineState, Readiness } from "@pinaka/engine";
import {
  openStorage,
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
  SESSION_LENGTH,
  type FeedbackView,
  type ServedQuestion,
  type SessionProgress,
} from "./machine.js";
import { getExamMs } from "../firstrun/meta.js";
import { loadCaContent } from "./content.js";
import type { ContentItem } from "./types.js";
import "./practice.css";

/** Read the live viewport width at the app boundary; falls back to the phone
 * floor (360, ADR 0011) when window is absent (it never is in the browser). */
function viewportWidth(): number {
  return typeof window === "undefined" ? 360 : window.innerWidth;
}

/** A loaded session: the pack, the screen content, and the open adapter. */
interface Loaded {
  readonly pack: LoadedPack;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly adapter: StorageAdapter;
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "empty" }
  | { readonly kind: "question"; readonly q: ServedQuestion; readonly picked: number | null }
  | {
      readonly kind: "feedback";
      readonly q: ServedQuestion;
      readonly view: FeedbackView;
    }
  | { readonly kind: "summary"; readonly readiness: Readiness };

export interface PracticeFlowProps {
  /** Exit back to the hub/home. */
  readonly onExit: () => void;
}

export function PracticeFlow({ onExit }: PracticeFlowProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  // Mutable session state that does not drive rendering directly. Held in refs
  // so the answer handler reads the latest without stale-closure bugs.
  const loadedRef = useRef<Loaded | null>(null);
  const examMsRef = useRef<number | undefined>(undefined);
  const stateRef = useRef<EngineState | null>(null);
  const sessionRef = useRef<SessionProgress>(EMPTY_SESSION);
  const answeredRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);

  // ---- Load: pack + content + storage, then serve the first question. ----
  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      // Pack content and engine inputs load lazily (own chunk; ADR 0008).
      const [{ loadCaPack }, content] = await Promise.all([
        import("../../engine/caPack.js"),
        loadCaContent(),
      ]);
      const pack = await loadCaPack();
      const { adapter } = await openStorage();
      if (cancelled) {
        await adapter.close();
        return;
      }
      loadedRef.current = { pack, content, adapter };

      const nowMs = Date.now();
      // Exam horizon from first-run capture: switches on exam-aware scheduling
      // (engine SPEC 4); undefined means the undecided path, no capping.
      const examMs = await getExamMs(adapter);
      examMsRef.current = examMs;
      const events = await adapter.readAllEvents();
      const state = buildEngineState(events, pack.bank, nowMs, examMs);
      stateRef.current = state;

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
      // Release the single connection when the flow unmounts.
      void loadedRef.current?.adapter.close();
    };
  }, []);

  /** Serve the next question, or end the session. `nowMs` is the read clock. */
  const serveNext = useCallback((nowMs: number): void => {
    const loaded = loadedRef.current;
    const state = stateRef.current;
    if (loaded === null || state === null) return;

    if (isSessionComplete(answeredRef.current, SESSION_LENGTH)) {
      endSession(nowMs);
      return;
    }

    const q = selectQuestion(
      state,
      loaded.pack,
      loaded.content,
      nowMs,
      sessionRef.current,
      SESSION_LENGTH,
    );
    if (q === null) {
      // Nothing left to serve: close the session honestly.
      endSession(nowMs);
      return;
    }
    questionStartRef.current = nowMs;
    setPhase({ kind: "question", q, picked: null });
  }, []);

  /** Compute readiness and move to the summary. */
  const endSession = useCallback((nowMs: number): void => {
    const loaded = loadedRef.current;
    const state = stateRef.current;
    if (loaded === null || state === null) {
      setPhase({ kind: "empty" });
      return;
    }
    void loaded.adapter.readAllEvents().then((events) => {
      const r = computeReadinessSelector(state, events, loaded.pack, nowMs);
      setPhase({ kind: "summary", readiness: r });
    });
  }, []);

  /** Confirm the picked option: build a complete event, persist it, rebuild
   * engine state, and show feedback. */
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

    // Rebuild engine state from the full log (event log is the source of truth,
    // ADR 0009). Advance the session bookkeeping and the answered count.
    const events = await loaded.adapter.readAllEvents();
    stateRef.current = buildEngineState(events, loaded.pack.bank, occurredAtMs, examMsRef.current);
    sessionRef.current = advanceSession(sessionRef.current, q);
    answeredRef.current += 1;

    const view = buildFeedback(q.content, {
      correct: event.correct,
      chosenKey: phase.picked,
    });
    setPhase({ kind: "feedback", q, view });
  }, [phase]);

  // ---- Render per phase. ----
  if (phase.kind === "loading") {
    return (
      <FlowFrame onExit={onExit}>
        <section className="pr-status" aria-busy="true">
          <p className="pr-status__label">Loading practice</p>
          <p className="pr-status__body">Fetching the question bank for this session.</p>
        </section>
      </FlowFrame>
    );
  }

  if (phase.kind === "error") {
    return (
      <FlowFrame onExit={onExit}>
        <section className="pr-status pr-status--error" role="alert">
          <p className="pr-status__label">Practice could not start</p>
          <p className="pr-status__body">{phase.message}</p>
          <button
            type="button"
            className="pr-btn pr-btn--primary"
            onClick={() => {
              answeredRef.current = 0;
              sessionRef.current = EMPTY_SESSION;
              setPhase({ kind: "loading" });
              // Re-run boot by forcing a remount-equivalent: reload state.
              const loaded = loadedRef.current;
              if (loaded !== null) {
                const nowMs = Date.now();
                loaded.adapter
                  .readAllEvents()
                  .then((events) => {
                    stateRef.current = buildEngineState(events, loaded.pack.bank, nowMs);
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
                // Nothing loaded yet: fall back to exit so the student is not stuck.
                onExit();
              }
            }}
          >
            Try again
          </button>
        </section>
      </FlowFrame>
    );
  }

  if (phase.kind === "empty") {
    return (
      <FlowFrame onExit={onExit}>
        <section className="pr-status">
          <p className="pr-status__label">No questions to practise</p>
          <p className="pr-status__body">
            This pack has no questions available right now. Check for an update, or come back
            after the next pack drop.
          </p>
          <button type="button" className="pr-btn pr-btn--primary" onClick={onExit}>
            Back to home
          </button>
        </section>
      </FlowFrame>
    );
  }

  if (phase.kind === "summary") {
    return (
      <FlowFrame onExit={onExit}>
        <SessionSummary answered={answeredRef.current} readiness={phase.readiness} onExit={onExit} />
      </FlowFrame>
    );
  }

  if (phase.kind === "question") {
    return (
      <FlowFrame onExit={onExit}>
        <QuestionScreen
          q={phase.q}
          picked={phase.picked}
          start={questionStartRef.current}
          onPick={(key) => setPhase({ kind: "question", q: phase.q, picked: key })}
          onConfirm={() => void confirm()}
        />
      </FlowFrame>
    );
  }

  // feedback
  return (
    <FlowFrame onExit={onExit}>
      <FeedbackScreen
        q={phase.q}
        view={phase.view}
        onNext={() => serveNext(Date.now())}
      />
    </FlowFrame>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces. Each is a pure function of its props.
// ---------------------------------------------------------------------------

/** The persistent flow frame: a header with progress context and a close
 * affordance, plus the scrollable body. */
function FlowFrame({
  children,
  onExit,
}: {
  readonly children: React.ReactNode;
  readonly onExit: () => void;
}): JSX.Element {
  return (
    <div className="pr-screen">
      <header className="pr-bar">
        <span className="pr-bar__title">Practice</span>
        <button
          type="button"
          className="pr-bar__close"
          aria-label="Close practice and return home"
          onClick={onExit}
        >
          Close
        </button>
      </header>
      <main className="pr-body">{children}</main>
    </div>
  );
}

/** A live elapsed-time display (practice shows elapsed, never a countdown).
 * Ticks once a second; collapses to a static read under reduced motion is not
 * needed since it is a number, not an animation. */
function ElapsedTimer({ start }: { readonly start: number }): JSX.Element {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - start) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;
  return (
    <span className="pr-timer" aria-label={`Time on this question: ${label}`}>
      {label}
    </span>
  );
}

function QuestionScreen({
  q,
  picked,
  start,
  onPick,
  onConfirm,
}: {
  readonly q: ServedQuestion;
  readonly picked: number | null;
  readonly start: number;
  readonly onPick: (key: number) => void;
  readonly onConfirm: () => void;
}): JSX.Element {
  const item = q.content;
  return (
    <>
      <div className="pr-context">
        <span className="pr-context__node">{item.tests[0] ?? "practice"}</span>
        <span className="pr-context__meta">
          <span className="pr-chip">{item.difficulty_label}</span>
          <ElapsedTimer start={start} />
        </span>
      </div>
      <p className="pr-progress">Question {q.ordinal} of {SESSION_LENGTH}</p>
      <p className="pr-stem">{item.stem}</p>
      <div className="pr-options" role="radiogroup" aria-label="Answer options">
        {item.options.map((o) => {
          const selected = picked === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`pr-opt${selected ? " pr-opt--picked" : ""}`}
              onClick={() => onPick(o.key)}
            >
              <span className="pr-opt__key">{o.key}</span>
              <span className="pr-opt__text">{o.text}</span>
            </button>
          );
        })}
      </div>
      <div className="pr-actions">
        <button
          type="button"
          className="pr-btn pr-btn--primary"
          disabled={picked === null}
          onClick={onConfirm}
        >
          Confirm answer
        </button>
      </div>
    </>
  );
}

function FeedbackScreen({
  q,
  view,
  onNext,
}: {
  readonly q: ServedQuestion;
  readonly view: FeedbackView;
  readonly onNext: () => void;
}): JSX.Element {
  const item = q.content;
  return (
    <>
      <div className="pr-context">
        <span className="pr-context__node">{item.tests[0] ?? "practice"}</span>
        <span className="pr-chip">{item.difficulty_label}</span>
      </div>
      <p className="pr-progress">Question {q.ordinal} of {SESSION_LENGTH}</p>
      <p className="pr-stem">{item.stem}</p>

      <div className="pr-options" aria-label="Reviewed options">
        {item.options.map((o) => {
          const isCorrect = o.key === view.correctKey;
          const isChosenWrong = o.key === view.chosenKey && !view.correct;
          const cls = isCorrect
            ? "pr-opt pr-opt--correct"
            : isChosenWrong
              ? "pr-opt pr-opt--wrong"
              : "pr-opt pr-opt--neutral";
          return (
            <div key={o.key} className={cls}>
              <span className="pr-opt__key">{o.key}</span>
              <span className="pr-opt__text">{o.text}</span>
              {isCorrect && <span className="pr-opt__tag">Correct</span>}
              {isChosenWrong && <span className="pr-opt__tag">Your answer</span>}
            </div>
          );
        })}
      </div>

      {/* aria-live="polite": announces the verdict and misconception to screen
          readers when feedback replaces the question panel. role="status" alone
          does not guarantee announcement on all browsers; the explicit aria-live
          makes it unambiguous (WCAG 4.1.3, W5-6). */}
      <div
        className={`pr-verdict${view.correct ? " pr-verdict--correct" : " pr-verdict--wrong"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="pr-verdict__line">{view.outcomeLine}</p>
      </div>

      {!view.correct && view.misconceptionLine !== null && (
        <section className="pr-mis" aria-live="polite" aria-atomic="true">
          <p className="pr-mis__eyebrow">What happened</p>
          <p className="pr-mis__line">{view.misconceptionLine}</p>
        </section>
      )}

      {view.steps.length > 0 && (
        <section className="pr-work">
          <p className="pr-work__eyebrow">The working</p>
          <ol className="pr-work__steps">
            {view.steps.map((s, i) => (
              <li key={i} className="pr-work__step">
                <span className="pr-work__n">{i + 1}</span>
                <span className="pr-work__body">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="pr-next">
        <p className="pr-next__reason">{q.action.reason}</p>
        <div className="pr-actions">
          <button type="button" className="pr-btn pr-btn--primary" onClick={onNext}>
            Next question
          </button>
        </div>
      </section>
    </>
  );
}

function SessionSummary({
  answered,
  readiness,
  onExit,
}: {
  readonly answered: number;
  readonly readiness: Readiness;
  readonly onExit: () => void;
}): JSX.Element {
  // The honest readiness one-liner: show the band only above the data gate;
  // otherwise the engine's insufficient-data wording (engine `note`).
  const gated = readiness.confidence === "insufficient_data" || readiness.expectedMarks === null;
  return (
    <section className="pr-summary">
      <p className="pr-summary__eyebrow">Session complete</p>
      <h2 className="pr-summary__title">
        You practised {answered} {answered === 1 ? "question" : "questions"}.
      </h2>
      <div className="pr-summary__readiness">
        {gated ? (
          <p className="pr-summary__note">{readiness.note}</p>
        ) : (
          <>
            <p className="pr-summary__band">
              Estimated net marks {readiness.low} to {readiness.high}, around{" "}
              {readiness.expectedMarks} of 100.
            </p>
            <p className="pr-summary__note">{readiness.note}</p>
          </>
        )}
      </div>
      <div className="pr-actions">
        <button type="button" className="pr-btn pr-btn--primary" onClick={onExit}>
          Back to home
        </button>
      </div>
    </section>
  );
}
