/**
 * TestDayFlow — the calm peak screen (design scr-core.jsx:336-354, verbatim).
 *
 * Receipts only: mocks sat, the settled readiness band, the steadiest topic,
 * the one costliest habit. No CTA, no follow-up, nothing to do here — that is
 * the design (Signature Screens: the brand's designed peak).
 */

import { useEffect, useState } from "react";

import { loadAppSnapshot } from "../../state/appData.js";

interface Receipts {
  readonly examDate: string | null;
  readonly mocksTaken: number;
  readonly lo: number | null;
  readonly hi: number | null;
  readonly cleared: boolean;
  readonly steadiest: string | null;
  readonly habit: { readonly name: string; readonly topics: string } | null;
}

export function TestDayFlow(): JSX.Element {
  const [r, setR] = useState<Receipts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (cancelled) return;
        // Steadiest ground: the covered chapter with the fewest marks lost —
        // derived from what the misconception costs do NOT touch.
        const costly = new Set(snap.costs.flatMap((c) => [...c.families]));
        const steadyNode = [...snap.engineState.skills.entries()]
          .filter(([, s]) => s.attempts >= 6)
          .sort((a, b) => b[1].rating - a[1].rating)
          .map(([id]) => id)
          .find((id) => ![...costly].some((f) => id === f || id.startsWith(`${f}.`)));
        const top = snap.costs[0] ?? null;
        setR({
          examDate: snap.examDate?.display ?? null,
          mocksTaken: snap.mockCount,
          lo: snap.readinessView?.lo ?? null,
          hi: snap.readinessView?.hi ?? null,
          cleared: (snap.readinessView?.lo ?? 0) >= 40,
          steadiest: steadyNode !== undefined
            ? (snap.topicNames.get(steadyNode) ?? null)
            : null,
          habit: top !== null ? { name: top.name, topics: top.topics } : null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setR({ examDate: null, mocksTaken: 0, lo: null, hi: null, cleared: false, steadiest: null, habit: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (r === null) {
    return (
      <main className="screen" aria-busy="true">
        <div className="screen__scroll"><div className="screen__pad">
          <p className="screen__lede">Loading</p>
        </div></div>
      </main>
    );
  }

  return (
    <main className="screen"><div className="screen__scroll">
      <div className="testday">
        <div className="testday__eyebrow">{r.examDate ?? "Today"} · your exam</div>
        <h1 className="testday__title">Your exam. Today.</h1>
        <div className="testday__receipts">
          <p>
            You sat <b>{r.mocksTaken} {r.mocksTaken === 1 ? "mock" : "mocks"}</b>.
            {r.lo !== null && r.hi !== null && (
              <>
                {" "}Your readiness settled at <span className="mono">{r.lo}–{r.hi}</span>, net of
                negative marking{r.cleared ? ", the whole band clear of the 40 bar" : ""}.
              </>
            )}
          </p>
          <p>
            Your steadiest ground is <b>{r.steadiest ?? "your strongest topics"}</b>. Open
            there, bank the marks, then move.
          </p>
          {r.habit !== null && (
            <p>
              The one habit that has cost you most: {r.habit.name.toLowerCase()} ({r.habit.topics}).
              Name it before you commit an answer. That is the whole reminder.
            </p>
          )}
        </div>
        <div className="testday__close">Walk in knowing what you know. There is nothing left to do here.</div>
      </div>
    </div></main>
  );
}
