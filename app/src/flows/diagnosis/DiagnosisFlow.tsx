/**
 * Diagnosis + readiness — the signature view (W5-5 flow c).
 *
 * The thin React renderer over the pure logic in diagnosis.ts and the typed
 * engine selectors (app/src/engine/selectors.ts). It owns only the side effects
 * it cannot avoid: the storage adapter, the rebuilt engine state, and the clock
 * (Date.now read once at the boundary). Every decision — band formatting, the
 * honesty gate, mastery grouping, the too-few-attempts heuristic, the
 * misconception ranking, and the screen-state choice — is delegated to the
 * tested logic functions so nothing load-bearing lives inline in JSX.
 *
 * Layout (ADR 0011): 360px-first, 44px touch targets, one visible focus ring on
 * every interactive element, tokens only (diagnosis.css via theme/tokens.css).
 * The desktop enhancement is a two-column layout at min-width 900px (readiness +
 * next-step beside the diagnosis map); everything is fully usable on the phone.
 *
 * States (Component & State Inventory): loading, error (with recovery), empty
 * (no events — route to practice, no fake zeros), early (provisional, band
 * withheld), ready (full band + map).
 *
 * Honesty: the band is a low-to-high range, never a bare number; the words
 * "predicted score" never appear; no number renders below the data threshold;
 * confidence is only low / medium / insufficient.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildEngineState,
  masteryByNode,
  readiness as computeReadinessSelector,
  type LoadedPack,
  type NodeMastery,
} from "../../engine/index.js";
import { NUM_QUESTIONS, type EngineState, type Readiness } from "@pinaka/engine";
import { getSharedStorage, type StorageAdapter } from "../../storage/index.js";
import {
  groupByBlueprint,
  readinessView,
  recurringMisconceptions,
  selectDiagnosisState,
  type MisconceptionView,
  type NodeMasteryView,
  type PartGroup,
  type ReadinessView,
} from "./diagnosis.js";
import "./diagnosis.css";

/** Navigate into the practice loop (hash route). */
function goPractice(): void {
  if (typeof window === "undefined") return;
  window.location.hash = "/practice";
}

/** A loaded diagnosis snapshot: everything the views read, computed once per
 * load from the event log so the render is a pure function of this. */
interface Snapshot {
  readonly state: EngineState;
  readonly pack: LoadedPack;
  readonly readiness: Readiness;
  readonly mastery: readonly NodeMastery[];
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly snap: Snapshot };

export interface DiagnosisFlowProps {
  /** Exit back to the hub/home. */
  readonly onExit: () => void;
}

export function DiagnosisFlow({ onExit }: DiagnosisFlowProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const adapterRef = useRef<StorageAdapter | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [{ loadCaPack }] = await Promise.all([import("../../engine/caPack.js")]);
    const pack = await loadCaPack();
    const { adapter } = await getSharedStorage();
    adapterRef.current = adapter;

    const nowMs = Date.now();
    const events = await adapter.readAllEvents();
    const state = buildEngineState(events, pack.bank, nowMs);
    const r = computeReadinessSelector(state, events, pack, nowMs);
    const mastery = masteryByNode(state, nowMs);
    setPhase({ kind: "loaded", snap: { state, pack, readiness: r, mastery } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().catch((err: unknown) => {
      if (cancelled) return;
      setPhase({
        kind: "error",
        message:
          err instanceof Error ? err.message : "The diagnosis could not be loaded.",
      });
    });
    return () => {
      cancelled = true;
      // Shared page-level connection stays open for the page lifetime.
    };
  }, [load]);

  if (phase.kind === "loading") {
    return (
      <Frame onExit={onExit}>
        <section className="dg-status" aria-busy="true">
          <p className="dg-status__label">Loading your diagnosis</p>
          <p className="dg-status__body">Reading your practice history.</p>
        </section>
      </Frame>
    );
  }

  if (phase.kind === "error") {
    return (
      <Frame onExit={onExit}>
        <section className="dg-status dg-status--error" role="alert">
          <p className="dg-status__label">Diagnosis could not load</p>
          <p className="dg-status__body">{phase.message}</p>
          <button
            type="button"
            className="dg-btn dg-btn--primary"
            onClick={() => {
              setPhase({ kind: "loading" });
              load().catch((err: unknown) =>
                setPhase({
                  kind: "error",
                  message:
                    err instanceof Error ? err.message : "Recovery failed. Reopen the app.",
                }),
              );
            }}
          >
            Try again
          </button>
        </section>
      </Frame>
    );
  }

  const { snap } = phase;
  const screen = selectDiagnosisState(snap.state.eventCount, snap.readiness.confidence);

  if (screen === "empty") {
    return (
      <Frame onExit={onExit}>
        <section className="dg-status">
          <p className="dg-status__eyebrow">Diagnosis</p>
          <h2 className="dg-status__label">Nothing to diagnose yet</h2>
          <p className="dg-status__body">
            The diagnosis reads your answers and names where you are losing marks. It needs
            some practice first — there is no number to show until there is evidence behind it.
          </p>
          <button type="button" className="dg-btn dg-btn--primary" onClick={goPractice}>
            Start practising
          </button>
        </section>
      </Frame>
    );
  }

  // early or ready: render the full view. The readiness band self-gates: in the
  // early state the band is withheld and the engine note carries the honesty
  // wording; the map and misconceptions render with whatever signal exists.
  const view = readinessView(snap.readiness, NUM_QUESTIONS);
  const parts = groupByBlueprint(snap.mastery, snap.pack.blueprint);
  const misconceptions = recurringMisconceptions(snap.state);

  return (
    <Frame onExit={onExit}>
      <div className="dg-grid">
        <div className="dg-aside">
          <ReadinessPanel view={view} provisional={screen === "early"} />
          <NextStepStrip
            reason={snap.readiness.note}
            gated={view.gated}
          />
        </div>
        <div className="dg-main">
          <DiagnosisMap parts={parts} provisional={screen === "early"} />
          <MisconceptionList misconceptions={misconceptions} />
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces. Each is a pure function of its props.
// ---------------------------------------------------------------------------

function Frame({
  children,
  onExit,
}: {
  readonly children: React.ReactNode;
  readonly onExit: () => void;
}): JSX.Element {
  return (
    <div className="dg-screen">
      <header className="dg-bar">
        <span className="dg-bar__title">Diagnosis</span>
        <button
          type="button"
          className="dg-bar__close"
          aria-label="Close diagnosis and return home"
          onClick={onExit}
        >
          Close
        </button>
      </header>
      <main className="dg-body">{children}</main>
    </div>
  );
}

/** The readiness band panel. Renders a band (a range), never a single score; the
 * pass mark and the band sit on a shared marks axis. When gated, the band is
 * withheld and only the engine note shows. */
function ReadinessPanel({
  view,
  provisional,
}: {
  readonly view: ReadinessView;
  readonly provisional: boolean;
}): JSX.Element {
  return (
    <section className="dg-rb" aria-label="Readiness estimate">
      <div className="dg-rb__head">
        <p className="dg-rb__eyebrow">How close to ready</p>
        {provisional && <span className="dg-flag">Provisional</span>}
      </div>

      {view.gated ? (
        <p className="dg-rb__withheld">{view.note}</p>
      ) : (
        <>
          <p className="dg-rb__band">{view.band}</p>
          {view.distanceToPass !== null && (
            <p className="dg-rb__distance">{view.distanceToPass}</p>
          )}
          <p
            className={`dg-rb__confidence dg-rb__confidence--${view.confidence}`}
          >
            {view.confidenceLabel}
          </p>
          {view.timeLine !== null && <p className="dg-rb__time">{view.timeLine}</p>}
          <p className="dg-rb__note">{view.note}</p>
        </>
      )}
    </section>
  );
}

/** The next-step strip: the engine's note (which carries its guidance verbatim)
 * with a link into practice. When gated, the strip nudges toward practice; once
 * the band is live, the same evidence-backed link still leads to practice. */
function NextStepStrip({
  reason,
  gated,
}: {
  readonly reason: string;
  readonly gated: boolean;
}): JSX.Element {
  return (
    <section className="dg-next" aria-label="Recommended next step">
      <p className="dg-next__eyebrow">Next step</p>
      <p className="dg-next__reason">
        {gated
          ? "Keep practising — the diagnosis sharpens with every answer, and the band appears once there is enough evidence behind it."
          : reason}
      </p>
      <a className="dg-btn dg-btn--primary dg-next__cta" href="#/practice">
        Practise now
      </a>
    </section>
  );
}

/** The mastery-by-node map, grouped by blueprint part and section. Each node is
 * a bar (the probability) with an uncertainty whisker (the 90% interval), or the
 * "too few attempts" state below the per-node threshold. */
function DiagnosisMap({
  parts,
  provisional,
}: {
  readonly parts: readonly PartGroup[];
  readonly provisional: boolean;
}): JSX.Element {
  return (
    <section className="dg-map" aria-label="Mastery by topic">
      <div className="dg-map__head">
        <h2 className="dg-map__title">Where you stand, topic by topic</h2>
        {provisional && (
          <p className="dg-map__hint">
            Provisional after a little practice — it deepens as you attempt more.
          </p>
        )}
      </div>
      {parts.length === 0 ? (
        <p className="dg-map__empty">
          No topic has enough attempts to read yet. Each one needs a few answers
          before its mastery can be shown without guessing.
        </p>
      ) : (
        parts.map((part) => (
          <section className="dg-part" key={part.partId}>
            <div className="dg-part__head">
              <span className="dg-part__name">{part.partId}</span>
              <span className="dg-part__marks">{part.marks} marks</span>
            </div>
            {part.sections.map((section) => (
              <div className="dg-section" key={section.sectionId}>
                <p className="dg-section__id">Section {section.sectionId}</p>
                {section.nodes.map((node) => (
                  <NodeBar key={node.nodeId} node={node} />
                ))}
              </div>
            ))}
          </section>
        ))
      )}
    </section>
  );
}

/** One node row: a bar with an uncertainty whisker, or the too-few state. */
function NodeBar({ node }: { readonly node: NodeMasteryView }): JSX.Element {
  if (node.tooFew) {
    return (
      <div className="dg-node dg-node--toofew">
        <span className="dg-node__name">{node.label}</span>
        <span className="dg-node__toofew">Too few attempts</span>
      </div>
    );
  }
  const pct = (x: number): string => `${(x * 100).toFixed(0)}%`;
  const lowPct = node.low * 100;
  const highPct = node.high * 100;
  return (
    <div className="dg-node">
      <span className="dg-node__name">{node.label}</span>
      <div
        className="dg-node__track"
        role="img"
        aria-label={`${node.label}: about ${pct(node.p)}, between ${pct(node.low)} and ${pct(node.high)}`}
      >
        {/* The fill: the point estimate. */}
        <span className="dg-node__fill" style={{ width: pct(node.p) }} />
        {/* The uncertainty whisker: the 90% interval span. */}
        <span
          className="dg-node__whisker"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
      </div>
      <span className="dg-node__pct mono">{pct(node.p)}</span>
    </div>
  );
}

/** The recurring-misconceptions list, ranked by marks lost, with marks framing. */
function MisconceptionList({
  misconceptions,
}: {
  readonly misconceptions: readonly MisconceptionView[];
}): JSX.Element {
  if (misconceptions.length === 0) {
    return (
      <section className="dg-mis" aria-label="Recurring misconceptions">
        <h2 className="dg-mis__title">Recurring misconceptions</h2>
        <p className="dg-mis__empty">
          No error has recurred yet. A pattern shows here once the same
          misconception has cost you marks more than once.
        </p>
      </section>
    );
  }
  return (
    <section className="dg-mis" aria-label="Recurring misconceptions">
      <h2 className="dg-mis__title">Recurring misconceptions, costliest first</h2>
      <ul className="dg-mis__list">
        {misconceptions.map((m) => (
          <li className="dg-mis__row" key={m.id}>
            <span className="dg-mis__name">{m.label}</span>
            <span className="dg-mis__meta">
              {m.count} time{m.count === 1 ? "" : "s"}
            </span>
            <span className="dg-mis__cost mono">
              &minus;{m.marks.toFixed(2)} marks
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
