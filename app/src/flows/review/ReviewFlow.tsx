/**
 * ReviewFlow — the review queue (design scr-core.jsx:179-224, verbatim).
 *
 * Shell-hosted under the Practice rail item (RAIL_FOR review -> practice).
 * Each resurfaced mistake states why it is back, in the design vocabulary
 * ("Missed 6 days ago · interval 6d"). The box badge shows the current
 * interval ("6d") — the engine schedules fractional FSRS intervals, not
 * Leitner boxes, and the badge shows what is true (ruling 2026-06-12).
 *
 * Mock mistakes land here directly: every answered question advances its
 * spaced schedule, mock included (ADR 0020), so a missed mock question
 * resurfaces as a lapse like any other.
 *
 * Empty state: "you are clear" framing, never guilt (Handout section 08).
 */

import { useEffect, useState } from "react";

import { Icon, ScreenHead } from "../../components/ui.js";
import { navigate } from "../../components/navigate.js";
import { loadAppSnapshot } from "../../state/appData.js";
import type { ReviewQueueView } from "../../engine/insights.js";

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly queue: ReviewQueueView };

export function ReviewFlow(): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (!cancelled) setPhase({ kind: "ready", queue: snap.queue });
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading") {
    return (
      <main className="screen" aria-busy="true">
        <div className="screen__scroll"><div className="screen__pad">
          <p className="screen__lede">Loading review</p>
        </div></div>
      </main>
    );
  }

  if (phase.kind === "error") {
    return (
      <main className="screen">
        <div className="screen__scroll"><div className="screen__pad">
          <ScreenHead
            title="The queue could not load"
            lede="Your data is on this device and nothing was lost. Reload the page to try again."
          />
        </div></div>
      </main>
    );
  }

  const { due, upcoming } = phase.queue;

  if (due.length === 0 && upcoming.length === 0) {
    return (
      <main className="screen"><div className="screen__scroll"><div className="screen__pad">
        <ScreenHead
          title="Nothing resurfaced yet"
          lede="Past mistakes come back here on a spaced schedule, hardest-remembered first. Take a mock or drill to start building the queue."
        />
        <div className="empty-note">
          <div className="empty-note__icon"><Icon name="repeat" size={20} /></div>
          <div className="empty-note__text">
            A mistake reappears one day after you make it, then at widening
            intervals as you get it right. Nothing is here because nothing is due.
          </div>
        </div>
      </div></div></main>
    );
  }

  const headTitle = due.length > 0 ? `${due.length} due today` : "Nothing due today";
  const headLede =
    due.length > 0
      ? "Past mistakes, resurfaced on a spaced schedule. Each one tells you why it is back. Clearing these is the cheapest set of marks available to you."
      : "Past mistakes, resurfaced on a spaced schedule. Each one tells you why it is back.";

  return (
    <main className="screen"><div className="screen__scroll"><div className="screen__pad">
      <ScreenHead
        title={headTitle}
        lede={headLede}
        right={
          due.length > 0 ? (
            <button className="sa-btn sa-btn--primary" type="button" onClick={() => navigate("drill")}>
              Start review<Icon name="arrow-right" size={15} />
            </button>
          ) : undefined
        }
      />
      {due.length === 0 && (
        <div className="empty-note" style={{ marginBottom: "var(--space-6)" }}>
          <div className="empty-note__icon"><Icon name="check" size={20} /></div>
          <div className="empty-note__text">
            You are clear. Past mistakes return here when they are due, not before.
          </div>
        </div>
      )}

      {due.length > 0 && (
        <div className="rev">
          {due.map((r) => (
            <button
              className="rev-item"
              key={r.itemId}
              type="button"
              onClick={() => navigate("drill")}
              style={{ font: "inherit", textAlign: "left", cursor: "pointer" }}
            >
              <div className="rev-box" title={`Returns every ${r.intervalLabel.replace("d", "")} days`}>{r.intervalLabel}</div>
              <div>
                <div className="rev-item__topic">{r.topic}</div>
                {r.mis !== null && <div className="rev-item__mis">{r.mis}</div>}
                <div className="rev-item__why"><Icon name="repeat" size={11} />{r.reason}</div>
              </div>
              <Icon name="chevron-right" size={18} style={{ color: "var(--color-text-subtle)" }} />
            </button>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: "var(--space-8)" }}>Coming up</h3>
          <div className="rev">
            {upcoming.map((r) => (
              <div className="rev-item" key={r.itemId} style={{ opacity: 0.62 }}>
                <div className="rev-box">{r.intervalLabel}</div>
                <div>
                  <div className="rev-item__topic">{r.topic}</div>
                  {r.mis !== null && <div className="rev-item__mis">{r.mis}</div>}
                  <div className="rev-item__why"><Icon name="clock" size={11} />{r.reason}</div>
                </div>
                <span className="rev-due">{r.due}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div></div></main>
  );
}
