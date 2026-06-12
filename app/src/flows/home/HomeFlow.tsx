/**
 * HomeFlow — the Today screen, rebuilt to pixel parity with the design prototype.
 *
 * Ground truth: design-team/v2/scr-core.jsx:43-173 (Today component) and
 * design-team/v2/data.jsx:173-283 (PROFILES). All JSX structure, class names, copy,
 * and inline styles are transcribed verbatim from those sources. Data comes from
 * loadAppSnapshot() and the insights selectors; no math lives here.
 *
 * The six design data states (empty / early / returning / progressing / plateau /
 * error-recovery) are expressed entirely through the snapshot fields, matching the
 * PROFILES shape one-to-one.
 *
 * Props (onBegin/onSettings/onDiagnosis/onMock) are kept optional so the router
 * compiles unchanged; navigation is done via navigate() from the shared layer.
 */

import { useEffect, useState } from "react";

import {
  Icon,
  ReadinessBand,
  ScreenHead,
  Toast,
  UNDO_TOAST_MS,
} from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { loadAppSnapshot, invalidateAppSnapshot } from "../../state/appData.js";
import { PLATEAU_BELIEF, META_DISCARDED_SESSION } from "../../engine/insights.js";
import { MOCK_SESSION_META_KEY } from "../mock/state.js";
import type { AppSnapshot } from "../../state/appData.js";
import type { Recommendation } from "../../engine/insights.js";
import "./home.css";

/* ------------------------------------------------------------------ */
/* Props — kept for router compat; navigation uses navigate() directly  */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Phase type                                                            */
/* ------------------------------------------------------------------ */

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly snap: AppSnapshot };

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function zeroPad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The fallback recommendation used when the interrupted session is discarded
 * and the primary recommendation was "resume" (verbatim from scr-core.jsx:55-59). */
function buildFallbackRec(reviewsDue: number): Recommendation {
  return {
    kind: "review",
    title: `${reviewsDue} reviews are due`,
    icon: "repeat",
    detail:
      "Past mistakes have resurfaced on schedule. Clear these first; they are the cheapest marks you will find today.",
    cta: "Start review",
    dest: "review",
    evidence: "review",
  };
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

export function HomeFlow(): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [discarded, setDiscarded] = useState(false);
  const [savedMeta, setSavedMeta] = useState<string>("");
  const [showUndo, setShowUndo] = useState(false);

  // Auto-hide undo toast after UNDO_TOAST_MS (6 s), verbatim from scr-core.jsx:50-53.
  useEffect(() => {
    if (!showUndo) return;
    const t = setTimeout(() => setShowUndo(false), UNDO_TOAST_MS);
    return () => clearTimeout(t);
  }, [showUndo]);

  // Load the snapshot once on mount.
  useEffect(() => {
    loadAppSnapshot()
      .then((snap) => setPhase({ kind: "loaded", snap }))
      .catch((err: unknown) => {
        setPhase({
          kind: "error",
          message: err instanceof Error ? err.message : "The home screen could not load.",
        });
      });
  }, []);

  /* ---- loading ---- */
  if (phase.kind === "loading") {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <ScreenHead
              eyebrow="CA Foundation · Paper 3 QA"
              title="One thing, first."
              lede="Loading"
            />
          </div>
        </div>
      </main>
    );
  }

  /* ---- error ---- */
  if (phase.kind === "error") {
    return (
      <main className="screen">
        <div className="screen__scroll">
          <div className="screen__pad">
            <ScreenHead
              eyebrow="CA Foundation · Paper 3 QA"
              title="One thing, first."
              lede="Your data is on this device and nothing was lost. Reload the page to try again."
            />
          </div>
        </div>
      </main>
    );
  }

  /* ---- loaded ---- */
  const { snap } = phase;
  const isEmpty = snap.dataState === "empty";
  const isEarly = snap.dataState === "early";
  const isPlateau = snap.dataState === "plateau";

  // Exam date eyebrow (verbatim scr-core.jsx:81).
  const eyebrow = snap.examDate != null
    ? `${snap.examDate.display} · ${snap.examDate.daysLeft} days out`
    : "CA Foundation · Paper 3 QA";

  // Recommendation: if the interrupted session was just discarded, fall back
  // to the design's reviews-due card (scr-core.jsx:60) while the fresh
  // snapshot loads — but only when reviews are actually due; an honest "0
  // reviews are due" card is a contradiction. The discard handler reloads the
  // snapshot, which recomputes the recommendation without the session.
  const rec: Recommendation =
    snap.recommendation.kind === "resume" && discarded && snap.reviewsDue > 0
      ? buildFallbackRec(snap.reviewsDue)
      : snap.recommendation;

  // Interrupted session metadata for the banner.
  const session = snap.interrupted;
  const mockCountForBanner = snap.mockCount + 1;
  const answeredCount = session != null ? Object.keys(session.answers).length : 0;
  const totalCount = session != null ? session.order.length : 0;

  // Diagnosis card: number of distinct families across all misconception costs.
  const diagnosedFamilySet = new Set(snap.costs.flatMap((c) => c.families));
  const diagnosedCount = diagnosedFamilySet.size;

  // Discard handler: moves session meta to META_DISCARDED_SESSION, clears the key,
  // invalidates snapshot, shows undo toast.
  async function handleDiscard(): Promise<void> {
    const raw = await snap.adapter.getMeta(MOCK_SESSION_META_KEY);
    const saved = raw ?? "";
    setSavedMeta(saved);
    await snap.adapter.setMeta(META_DISCARDED_SESSION, saved);
    await snap.adapter.setMeta(MOCK_SESSION_META_KEY, "");
    invalidateAppSnapshot();
    setDiscarded(true);
    setShowUndo(true);
    // Recompute the recommendation without the interrupted session.
    loadAppSnapshot()
      .then((s) => setPhase({ kind: "loaded", snap: s }))
      .catch(() => undefined);
  }

  // Undo discard: restores the meta value and invalidates.
  async function handleUndo(): Promise<void> {
    await snap.adapter.setMeta(MOCK_SESSION_META_KEY, savedMeta);
    await snap.adapter.setMeta(META_DISCARDED_SESSION, "");
    invalidateAppSnapshot();
    setDiscarded(false);
    setShowUndo(false);
    // Reload the snapshot to reflect restored session.
    loadAppSnapshot()
      .then((s) => setPhase({ kind: "loaded", snap: s }))
      .catch(() => {});
  }

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad">

          {/* Recovery banner (verbatim scr-core.jsx:66-78, banner copy from design data.jsx:277-281). */}
          {session !== null && !discarded && (
            <div className="banner" role="alert">
              <Icon name="alert" size={20} className="banner__icon" />
              <div>
                <div className="banner__title">
                  Mock {zeroPad(mockCountForBanner)} did not finish saving
                </div>
                <div className="banner__detail">
                  The app closed with {answeredCount} of {totalCount} answers written to this
                  device. Nothing was sent anywhere. You can resume the mock or discard it.
                </div>
              </div>
              <div className="banner__actions">
                <button
                  type="button"
                  className="sa-btn sa-btn--secondary"
                  onClick={() => navigate("mock/hall")}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="sa-btn sa-btn--ghost"
                  onClick={() => { void handleDiscard(); }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* ScreenHead (verbatim scr-core.jsx:80-84). */}
          <ScreenHead
            eyebrow={eyebrow}
            title={isEmpty ? "Welcome. Start with one mock." : "One thing, first."}
            lede={
              isEmpty
                ? "There is nothing to recommend until there is data. A full mock under real timing is where the diagnosis begins."
                : "The single most useful thing you can do right now, chosen from your own data."
            }
          />

          {/* Plateau belief callout (scr-core.jsx:86-91). */}
          {isPlateau && (
            <div className="belief">
              <Icon name="trend-down" size={18} className="belief__icon" />
              <p className="belief__text">{PLATEAU_BELIEF}</p>
            </div>
          )}

          {/* Recommended card (scr-core.jsx:93-106). */}
          <div
            className="next next--accent"
            style={
              rec.kind === "resume"
                ? { borderColor: "var(--color-warning-border)", background: "var(--color-warning-soft)" }
                : {}
            }
          >
            <div className="next__eyebrow">
              <Icon name="dot" size={9} />
              Recommended now
            </div>
            <div className="next__row">
              <div
                className="next__icon"
                style={
                  rec.kind === "resume"
                    ? { background: "var(--color-warning)", color: "var(--color-warning-foreground)" }
                    : {}
                }
              >
                <Icon name={rec.icon} size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="next__title">{rec.title}</h2>
                <p className="next__detail">{rec.detail}</p>
                <div className="next__actions">
                  <button
                    type="button"
                    className="sa-btn sa-btn--primary"
                    onClick={() => navigate(rec.dest)}
                  >
                    {rec.cta}
                    <Icon name="arrow-right" size={15} />
                  </button>
                  {!isEmpty && rec.kind !== "resume" && rec.evidence !== null && (
                    <button
                      type="button"
                      className="sa-btn sa-btn--ghost"
                      onClick={() => navigate(rec.evidence!)}
                    >
                      See the evidence
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Today grid: left = ReadinessBand + recent mocks; right = .today-side (scr-core.jsx:108-162). */}
          <div className="today-grid" style={{ marginTop: "var(--space-6)" }}>
            {/* Left column */}
            <div className="stack-6">
              <ReadinessBand readiness={snap.readinessView} />

              {!isEmpty && (
                <div>
                  <div
                    className="row"
                    style={{ justifyContent: "space-between", marginBottom: "var(--space-3)" }}
                  >
                    <h3 className="section-title" style={{ margin: 0 }}>Recent mocks</h3>
                    {snap.history.length > 0 && (
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        style={{ fontSize: 13 }}
                        onClick={() => navigate("mock")}
                      >
                        Take another
                      </button>
                    )}
                  </div>
                  {snap.history.length > 0 && (
                    <div className="sa-card minihist">
                      {snap.history.map((m, i) => (
                        <button
                          key={m.name}
                          type="button"
                          className="minihist__row"
                          style={{
                            width: "100%",
                            font: "inherit",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            borderBottom: "1px solid var(--color-border-hairline)",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            navigate(i === 0 ? "mock/review" : `mock/review/${i}`)
                          }
                        >
                          <div>
                            <div className="minihist__name">
                              {m.name}{" "}
                              <span className="minihist__type">{m.type}</span>
                            </div>
                            <div className="minihist__date">{m.date}</div>
                          </div>
                          <div className="minihist__net">{m.net.toFixed(2)}</div>
                          <Icon
                            name="chevron-right"
                            size={16}
                            style={{ color: "var(--color-text-subtle)" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column (.today-side) */}
            <div className="today-side">
              {isEmpty ? (
                <div className="empty-note">
                  <div className="empty-note__icon">
                    <Icon name="layers" size={20} />
                  </div>
                  <div className="empty-note__text">
                    Your diagnosis, review queue, and readiness estimate all unlock after your
                    first mock.
                  </div>
                </div>
              ) : (
                <>
                  {snap.reviewsDue > 0 && rec.kind !== "review" && (
                    <button
                      type="button"
                      className="sa-card row"
                      style={{
                        justifyContent: "space-between",
                        cursor: "pointer",
                        font: "inherit",
                        textAlign: "left",
                        width: "100%",
                      }}
                      onClick={() => navigate("review")}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        Reviews due
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: "var(--text-lg)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {snap.reviewsDue}
                      </span>
                    </button>
                  )}

                  {isEarly && (
                    <div
                      className="empty-note"
                      style={{ borderColor: "var(--color-warning-border)" }}
                    >
                      <div
                        className="empty-note__icon"
                        style={{
                          background: "var(--color-warning-soft)",
                          color: "var(--color-warning-text)",
                        }}
                      >
                        <Icon name="alert" size={20} />
                      </div>
                      <div className="empty-note__text">
                        One mock is thin evidence. The diagnosis below is provisional and will
                        firm up after your second mock.
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="sa-card"
                    style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
                    onClick={() => navigate("diagnosis")}
                  >
                    <div
                      className="next__eyebrow"
                      style={{ marginBottom: "var(--space-2)" }}
                    >
                      <Icon name="layers" size={13} />
                      Diagnosis
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--text-sm)",
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {diagnosedCount} topics diagnosed. Weakest:{" "}
                      <b
                        style={{
                          color: "var(--color-foreground)",
                          fontWeight: 600,
                        }}
                      >
                        {snap.weakest?.name ?? "none yet"}
                      </b>
                      .
                    </p>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Undo toast (scr-core.jsx:163-168). */}
          {showUndo && (
            <Toast
              actionLabel="Undo"
              onAction={() => { void handleUndo(); }}
            >
              Mock {zeroPad(mockCountForBanner)} discarded.
            </Toast>
          )}
        </div>
      </div>
    </main>
  );
}
