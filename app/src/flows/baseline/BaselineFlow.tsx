/**
 * Cold-start baseline flow (W5-8).
 *
 * The thin React renderer over the baseline's pure logic (machine.ts, plan.ts)
 * and the SHARED practice machinery. It REUSES, not duplicates (requirement 2):
 *   - the event builder and Response type (practice/event.ts: buildEvent),
 *   - the feedback derivation (practice/machine.ts: buildFeedback / FeedbackView),
 *   - the readiness selector (engine/selectors.ts: readiness),
 *   - the practice CSS class system (practice/practice.css) for the question and
 *     feedback panels, so the baseline looks and behaves exactly like practice.
 *
 * It differs from practice in exactly three places (requirement 2):
 *   1. a one-screen intro framing the session as an honest map, not a test;
 *   2. progression through a FIXED plan (buildBaselinePlan) instead of the
 *      engine's per-question selection — the engine still receives EVERY event in
 *      mode "practice", so the closing diagnosis is real;
 *   3. a closing screen that links into the first diagnosis map (#/diagnosis),
 *      showing the engine's readiness band with its OWN honesty wording — 24
 *      events clears the 20-event gate, so the band may render with low /
 *      insufficient confidence exactly as the engine emits it.
 *
 * On completion OR skip, the baseline flag is set so it never reappears
 * (meta.ts). The component owns only the unavoidable side effects: the storage
 * adapter, the rebuilt engine state, the clock (Date.now at the boundary), the
 * event id (crypto.randomUUID), and the per-question timer.
 *
 * Layout: 360px-first (ADR 0011), 44px touch targets, visible focus rings,
 * tokens only. Plain text plus unicode glyphs (ADR 0015): no HTML in any stem.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { BrandMark } from "../../components/BrandMark.js";
import { buildEngineState, readiness as computeReadiness, type LoadedPack } from "../../engine/index.js";
import type { EngineState, Readiness } from "@pinaka/engine";
import { getSharedStorage, type StorageAdapter, type StoredEvent } from "../../storage/index.js";
import { buildEvent, type Response } from "../practice/event.js";
import { buildFeedback, type FeedbackView } from "../practice/machine.js";
import { RevealSection } from "../practice/reveals.js";
import { loadCaContent } from "../practice/content.js";
import type { ContentItem } from "../practice/types.js";
import { getExamMs } from "../firstrun/meta.js";
import { loadTopicNames, topicLabel } from "../../engine/topics.js";
import { buildBaselinePlan, type BaselinePlan } from "./plan.js";
import {
  advanceCursor,
  isBaselineComplete,
  serveAt,
  type ServedBaselineQuestion,
} from "./machine.js";
import { markBaselineDone } from "./meta.js";
import { COPY } from "./copy.js";
import "../practice/practice.css";

/** Read the live viewport width at the app boundary (ADR 0011 phone floor). */
function viewportWidth(): number {
  return typeof window === "undefined" ? 360 : window.innerWidth;
}

/** A loaded baseline session: the pack, the screen content, the open adapter,
 * and the fixed plan computed once from the bank + blueprint. */
interface Loaded {
  readonly pack: LoadedPack;
  readonly content: ReadonlyMap<string, ContentItem>;
  readonly adapter: StorageAdapter;
  readonly plan: BaselinePlan;
  /** Taxonomy node id to display name ("Simple interest"), engine/topics.ts. */
  readonly names: ReadonlyMap<string, string>;
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "intro" }
  | { readonly kind: "question"; readonly q: ServedBaselineQuestion; readonly picked: number | null }
  | { readonly kind: "feedback"; readonly q: ServedBaselineQuestion; readonly view: FeedbackView }
  | { readonly kind: "close"; readonly readiness: Readiness; readonly answered: number };

export interface BaselineFlowProps {
  /** Leave the baseline for ordinary practice (skip, or finish-into-practice). */
  readonly onExitToPractice: () => void;
  /** Leave the baseline for the diagnosis map (#/diagnosis). */
  readonly onSeeDiagnosis: () => void;
}

export function BaselineFlow({ onExitToPractice, onSeeDiagnosis }: BaselineFlowProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const loadedRef = useRef<Loaded | null>(null);
  const examMsRef = useRef<number | undefined>(undefined);
  const stateRef = useRef<EngineState | null>(null);
  const cursorRef = useRef<number>(0);
  const answeredRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);

  // ---- Load: pack + content + storage, build the fixed plan, show the intro. ----
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
      // The plan only names ids we have content for and that are selectable.
      const plan = buildBaselinePlan(pack.bank, pack.blueprint, undefined, (id) => content.has(id));
      loadedRef.current = { pack, content, adapter, plan, names };

      const nowMs = Date.now();
      const examMs = await getExamMs(adapter);
      examMsRef.current = examMs;
      const events = await adapter.readAllEvents();
      stateRef.current = buildEngineState(events, pack.bank, nowMs, examMs);
      if (cancelled) return;
      setPhase({ kind: "intro" });
    }
    boot().catch((err: unknown) => {
      if (cancelled) return;
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "The first session could not start.",
      });
    });
    return () => {
      cancelled = true;
      // Shared page-level connection stays open for the page lifetime.
    };
  }, []);

  /** Serve the question at the current cursor, or close the session. */
  const serveNext = useCallback((nowMs: number): void => {
    const loaded = loadedRef.current;
    if (loaded === null) return;
    if (isBaselineComplete(loaded.plan, cursorRef.current)) {
      endSession(nowMs);
      return;
    }
    const q = serveAt(loaded.plan, loaded.content, cursorRef.current);
    if (q === null) {
      endSession(nowMs);
      return;
    }
    questionStartRef.current = nowMs;
    setPhase({ kind: "question", q, picked: null });
  }, []);

  /** Compute readiness over the full log and move to the closing map. */
  const endSession = useCallback((nowMs: number): void => {
    const loaded = loadedRef.current;
    const state = stateRef.current;
    if (loaded === null || state === null) {
      // Nothing loaded: still mark done so the baseline does not reappear.
      if (loaded !== null) void markBaselineDone(loaded.adapter);
      onExitToPractice();
      return;
    }
    void loaded.adapter.readAllEvents().then(async (events) => {
      const r = computeReadiness(state, events, loaded.pack, nowMs);
      await markBaselineDone(loaded.adapter);
      setPhase({ kind: "close", readiness: r, answered: answeredRef.current });
    });
  }, [onExitToPractice]);

  /** Confirm the picked option: build a complete event (mode "practice",
   * resurfaced false), persist it, rebuild engine state, show feedback. */
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
      resurfaced: false, // a baseline item is always fresh (requirement 2)
      mode: "practice", // the engine receives every event in practice mode
    });

    await loaded.adapter.appendEvents([event]);
    const events = await loaded.adapter.readAllEvents();
    stateRef.current = buildEngineState(events, loaded.pack.bank, occurredAtMs, examMsRef.current);
    cursorRef.current = advanceCursor(cursorRef.current);
    answeredRef.current += 1;

    const view = buildFeedback(q.content, { correct: event.correct, chosenKey: phase.picked });
    setPhase({ kind: "feedback", q, view });
  }, [phase]);

  /** Skip the whole baseline ("I would rather just practise"): mark done so it
   * never reappears, then hand off to practice. */
  const skip = useCallback((): void => {
    const adapter = loadedRef.current?.adapter;
    if (adapter !== undefined) void markBaselineDone(adapter);
    onExitToPractice();
  }, [onExitToPractice]);

  // ---- Render per phase. ----
  if (phase.kind === "loading") {
    return (
      <Frame>
        <section className="pr-status" aria-busy="true">
          <p className="pr-status__label">Loading your first session</p>
          <p className="pr-status__body">Setting up a spread of questions across the paper.</p>
        </section>
      </Frame>
    );
  }

  if (phase.kind === "error") {
    return (
      <Frame>
        <section className="pr-status pr-status--error" role="alert">
          <p className="pr-status__label">The first session could not start</p>
          <p className="pr-status__body">{phase.message}</p>
          <button type="button" className="pr-btn pr-btn--primary" onClick={skip}>
            Go to practice
          </button>
        </section>
      </Frame>
    );
  }

  if (phase.kind === "intro") {
    return (
      <Frame>
        <IntroScreen onStart={() => serveNext(Date.now())} onSkip={skip} />
      </Frame>
    );
  }

  if (phase.kind === "close") {
    return (
      <Frame>
        <CloseScreen
          answered={phase.answered}
          readiness={phase.readiness}
          onSeeDiagnosis={onSeeDiagnosis}
          onPractise={onExitToPractice}
        />
      </Frame>
    );
  }

  if (phase.kind === "question") {
    return (
      <Frame
        dock={
          <div className="pr-dock__inner">
            <button
              type="button"
              className="pr-btn pr-btn--primary"
              disabled={phase.picked === null}
              onClick={() => void confirm()}
            >
              Confirm answer
            </button>
          </div>
        }
      >
        <QuestionScreen
          q={phase.q}
          topic={topicLabel(loadedRef.current?.names ?? null, phase.q.content.tests[0] ?? null) ?? "First session"}
          picked={phase.picked}
          onPick={(key) => setPhase({ kind: "question", q: phase.q, picked: key })}
        />
      </Frame>
    );
  }

  // feedback
  return (
    <Frame
      dock={
        <div className="pr-dock__inner">
          <button
            type="button"
            className="pr-btn pr-btn--primary"
            onClick={() => serveNext(Date.now())}
          >
            Next question
          </button>
        </div>
      }
    >
      <FeedbackScreen
        q={phase.q}
        topic={topicLabel(loadedRef.current?.names ?? null, phase.q.content.tests[0] ?? null) ?? "First session"}
        view={phase.view}
      />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces. Thin functions over props, reusing practice CSS.
// ---------------------------------------------------------------------------

/** The persistent baseline frame. No close affordance mid-session — the only
 * exits are the intro skip and the closing screen — so a student cannot abandon
 * a half-finished map by accident. When `dock` is provided it renders as
 * .pr-dock at the viewport bottom; absent for intro and close screens. */
function Frame({
  children,
  dock,
}: {
  readonly children: ReactNode;
  readonly dock?: ReactNode;
}): JSX.Element {
  return (
    <div className="pr-screen">
      <header className="pr-bar">
        <span className="pr-bar__title">{COPY.header}</span>
      </header>
      <main className="pr-body">{children}</main>
      {dock !== undefined && (
        <div className="pr-dock" role="group" aria-label="Question actions">
          {dock}
        </div>
      )}
    </div>
  );
}

function IntroScreen({
  onStart,
  onSkip,
}: {
  readonly onStart: () => void;
  readonly onSkip: () => void;
}): JSX.Element {
  const c = COPY.intro;
  return (
    <section className="pr-summary">
      <BrandMark lead />
      <p className="pr-summary__eyebrow">{c.eyebrow}</p>
      <h2 className="pr-summary__title">{c.title}</h2>
      <p className="pr-summary__note">{c.body}</p>
      <p className="pr-summary__note">{c.reassure}</p>
      <div className="pr-actions">
        <button type="button" className="pr-btn pr-btn--primary" onClick={onStart}>
          {c.cta}
        </button>
        <button type="button" className="pr-bar__close" onClick={onSkip}>
          {c.skip}
        </button>
      </div>
    </section>
  );
}

function QuestionScreen({
  q,
  topic,
  picked,
  onPick,
}: {
  readonly q: ServedBaselineQuestion;
  /** Display name of the node under test ("Simple interest"), never a raw id. */
  readonly topic: string;
  readonly picked: number | null;
  readonly onPick: (key: number) => void;
}): JSX.Element {
  const item = q.content;
  return (
    <div className="pr-2col">
      <div className="pr-2col__left">
        <div className="pr-context">
          <span className="pr-context__node">{topic}</span>
          <span className="pr-chip">{item.difficulty_label}</span>
        </div>
        <p className="pr-progress">
          Question {q.ordinal} of {q.total}
        </p>
        <p className="pr-stem">{item.stem}</p>
      </div>
      <div className="pr-2col__right">
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
      </div>
    </div>
  );
}

function FeedbackScreen({
  q,
  topic,
  view,
}: {
  readonly q: ServedBaselineQuestion;
  /** Display name of the node under test ("Simple interest"), never a raw id. */
  readonly topic: string;
  readonly view: FeedbackView;
}): JSX.Element {
  const item = q.content;
  const hasSections = view.sections !== undefined;

  // Build reviewed options list for use inside reveal 01 or the plain fallback.
  const reviewedOptions = item.options.map((o) => {
    const isCorrect = o.key === view.correctKey;
    const isChosenWrong = o.key === view.chosenKey && !view.correct;
    const cls = isCorrect
      ? "pr-opt pr-opt--correct"
      : isChosenWrong
        ? "pr-opt pr-opt--wrong"
        : "pr-opt pr-opt--neutral";
    const entry = view.optionEntries.find((e) => e.optionKey === o.key);
    return { o, isCorrect, isChosenWrong, cls, rationale: entry?.rationale ?? null };
  });

  return (
    <div className="pr-2col">
      <div className="pr-2col__left">
        <div className="pr-context">
          <span className="pr-context__node">{topic}</span>
          <span className="pr-chip">{item.difficulty_label}</span>
        </div>
        <p className="pr-progress">
          Question {q.ordinal} of {q.total}
        </p>
        <p className="pr-stem">{item.stem}</p>
      </div>

      <div className="pr-2col__right">
        {/* aria-live="polite": announces the verdict to screen readers when
            feedback replaces the question panel (same pattern as PracticeFlow;
            W5-6). */}
        <div
          className={`pr-verdict${view.correct ? " pr-verdict--correct" : " pr-verdict--wrong"}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="pr-verdict__line">{view.outcomeLine}</p>
        </div>

        {/* Punchline: always visible when sections are present. */}
        {hasSections && (
          <p className="pr-punchline">{view.sections.punchline}</p>
        )}

        {/* Wrong-answer misconception line stays visible, never inside a reveal. */}
        {!view.correct && view.misconceptionLine !== null && (
          <section className="pr-mis" aria-live="polite" aria-atomic="true">
            <p className="pr-mis__eyebrow">What happened</p>
            <p className="pr-mis__line">{view.misconceptionLine}</p>
          </section>
        )}

        {/* Numbered reveals when sections are present. */}
        {hasSections ? (
          <div className="pr-reveals">
            <RevealSection num="01" label="Why each option">
              <div aria-label="Reviewed options">
                {reviewedOptions.map(({ o, isCorrect, isChosenWrong, cls, rationale }) => (
                  <div key={o.key} className="pr-reveal-row">
                    <div className={cls}>
                      <span className="pr-opt__key">{o.key}</span>
                      <span className="pr-opt__text">{o.text}</span>
                      {isCorrect && <span className="pr-opt__tag">Correct</span>}
                      {isChosenWrong && <span className="pr-opt__tag">Your answer</span>}
                    </div>
                    {rationale !== null && (
                      <p className="pr-reveal-row__rationale">{rationale}</p>
                    )}
                  </div>
                ))}
              </div>
            </RevealSection>

            {view.steps.length > 0 && (
              <RevealSection num="02" label="The working">
                <ol className="pr-work__steps">
                  {view.steps.map((s, i) => (
                    <li key={i} className="pr-work__step">
                      <span className="pr-work__n">{i + 1}</span>
                      <span className="pr-work__body">{s}</span>
                    </li>
                  ))}
                </ol>
              </RevealSection>
            )}

            <RevealSection num="03" label="How to approach this">
              <p className="pr-reveal__prose">{view.sections.approach}</p>
            </RevealSection>

            <RevealSection num="04" label="Take-home lesson">
              <p className="pr-reveal__prose">{view.sections.lesson}</p>
            </RevealSection>

            <RevealSection num="05" label="Timing">
              <p className="pr-reveal__prose">{view.sections.timing}</p>
            </RevealSection>
          </div>
        ) : (
          /* Graceful fallback: pre-sections layout for items without sections. */
          <>
            <div className="pr-options" aria-label="Reviewed options">
              {reviewedOptions.map(({ o, isCorrect, isChosenWrong, cls }) => (
                <div key={o.key} className={cls}>
                  <span className="pr-opt__key">{o.key}</span>
                  <span className="pr-opt__text">{o.text}</span>
                  {isCorrect && <span className="pr-opt__tag">Correct</span>}
                  {isChosenWrong && <span className="pr-opt__tag">Your answer</span>}
                </div>
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}

function CloseScreen({
  answered,
  readiness,
  onSeeDiagnosis,
  onPractise,
}: {
  readonly answered: number;
  readonly readiness: Readiness;
  readonly onSeeDiagnosis: () => void;
  readonly onPractise: () => void;
}): JSX.Element {
  const c = COPY.close;
  // The engine's honest readiness line: show the band only above the data gate;
  // 24 events clears the 20-event gate, but the engine may still emit low /
  // insufficient confidence (thin blueprint coverage) — render its wording as-is.
  const gated = readiness.confidence === "insufficient_data" || readiness.expectedMarks === null;
  return (
    <section className="pr-summary">
      <p className="pr-summary__eyebrow">{c.eyebrow}</p>
      <h2 className="pr-summary__title">{c.title}</h2>
      <p className="pr-summary__note">
        You answered {answered} {answered === 1 ? "question" : "questions"}. {c.body}
      </p>
      <div className="pr-summary__readiness">
        {gated ? (
          <p className="pr-summary__note">{readiness.note}</p>
        ) : (
          <>
            <p className="pr-summary__band">
              Estimated net marks {readiness.low} to {readiness.high}, around {readiness.expectedMarks} of
              100.
            </p>
            <p className="pr-summary__note">{readiness.note}</p>
          </>
        )}
      </div>
      <div className="pr-actions">
        <button type="button" className="pr-btn pr-btn--primary" onClick={onSeeDiagnosis}>
          {c.cta}
        </button>
        <button type="button" className="pr-bar__close" onClick={onPractise}>
          {c.practiceCta}
        </button>
      </div>
    </section>
  );
}
