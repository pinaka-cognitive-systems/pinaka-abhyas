/**
 * Shell: the app chrome plus a real engine demo (W5-3).
 *
 * Replaces the W5-1 placeholder probe with a real end-to-end flow:
 *   1. Lazily load the REAL CA Foundation QA pack (own chunk, not the entry).
 *   2. Build fresh-student engine state from an empty event log (a brand-new
 *      student has no history; the event log is the source of truth, ADR 0009).
 *   3. Compute the first next action and the readiness estimate.
 *   4. Render both, with the engine's own honesty note.
 *
 * This is a demo of the integration layer, not a real screen: the practice
 * loop, mock hall, diagnosis, onboarding, and settings flows land in W5-5 with
 * the W6-2 design tokens. The pack still loads lazily here so the bundle split
 * the screens depend on is proven from the start.
 */

import { useEffect, useState } from "react";

import { buildEngineState, nextAction, readiness, type LoadedPack } from "./engine/index.js";
import type { NextAction, Readiness } from "@pinaka/engine";

interface DemoResult {
  readonly action: NextAction;
  readonly readiness: Readiness;
}

/**
 * Run the fresh-student flow over a loaded pack. Pure given the pack and clock:
 * an empty event log replays to the prior state, and the engine does the rest.
 */
function freshStudentDemo(pack: LoadedPack, nowMs: number): DemoResult {
  const state = buildEngineState([], pack.bank, nowMs);
  return {
    action: nextAction(state, pack, nowMs),
    readiness: readiness(state, [], pack, nowMs),
  };
}

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly result: DemoResult }
  | { readonly status: "error"; readonly message: string };

export function Shell(): JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // Dynamic import keeps the pack off the entry chunk (W5-3 / ADR 0008).
    import("./engine/caPack.js")
      .then(({ loadCaPack }) => loadCaPack())
      .then((pack) => {
        if (cancelled) return;
        // The read clock is the app's responsibility; the engine stays pure.
        setState({ status: "ready", result: freshStudentDemo(pack, Date.now()) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load the pack.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="shell-wordmark">Pinaka Abhyas</span>
      </header>
      <main className="shell-main">
        {state.status === "loading" && (
          <section className="engine-probe" aria-busy="true">
            <p className="engine-probe-label">Loading pack</p>
            <p className="engine-probe-band">Fetching the CA Foundation QA pack…</p>
          </section>
        )}

        {state.status === "error" && (
          <section className="engine-probe" role="alert">
            <p className="engine-probe-label">Could not load the pack</p>
            <p className="engine-probe-band">{state.message}</p>
          </section>
        )}

        {state.status === "ready" && (
          <>
            <section className="engine-probe" aria-label="First next action">
              <p className="engine-probe-label">Start here</p>
              <p className="engine-probe-value" data-testid="action-kind">
                {state.result.action.kind}
              </p>
              <p className="engine-probe-band" data-testid="action-reason">
                {state.result.action.reason}
              </p>
            </section>

            <section className="engine-probe" aria-label="Readiness estimate">
              <p className="engine-probe-label">Readiness</p>
              <p className="engine-probe-value" data-testid="readiness-marks">
                {state.result.readiness.expectedMarks === null
                  ? "—"
                  : `${state.result.readiness.expectedMarks} / 100`}
              </p>
              <p className="engine-probe-band" data-testid="readiness-note">
                {state.result.readiness.note}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
