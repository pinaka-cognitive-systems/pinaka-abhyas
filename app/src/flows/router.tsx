/**
 * Minimal hash router (W5-5 flow a + flow d).
 *
 * No dependency: the app is a static PWA and other flows land alongside this
 * one. A hash route (`#/practice`) keeps deep links working on GitHub/Cloudflare
 * Pages with no server rewrite, and survives offline reloads. Other agents add
 * their routes here as their flows land; the map is the single registration
 * point.
 *
 * Default route (flow d / W5-9): the FIRST visit on a device runs the first-run
 * flow (welcome, install, persistence honesty, exam capture); a zero-history
 * student then gets the cold-start baseline once; thereafter the default sends
 * the returning student to the HOME surface (the honest-adherence today card,
 * delta, and re-entry, W5-9), not straight into practice. "First visit" is the
 * storage meta flag `firstrun_completed`, read once at boot — so it survives
 * reloads and is not a fragile guess. While that read is in flight the router
 * shows a neutral boot screen, never a flash of the wrong flow. The home surface
 * also has an explicit `#/home` route; the old engine-demo Shell now lives at
 * the explicit `#/demo` route.
 *
 * The flows are loaded lazily so their code and the pack content chunk stay off
 * the entry chunk until needed.
 */

import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { Shell } from "../Shell.js";
import { isFirstRunComplete } from "./firstrun/meta.js";
import { isBaselineDone, shouldShowBaseline } from "./baseline/meta.js";
import { AlreadyOpenError, getSharedStorage } from "../storage/index.js";

const PracticeFlow = lazy(() =>
  import("./practice/PracticeFlow.js").then((m) => ({ default: m.PracticeFlow })),
);

const BaselineFlow = lazy(() =>
  import("./baseline/BaselineFlow.js").then((m) => ({ default: m.BaselineFlow })),
);

const DiagnosisFlow = lazy(() =>
  import("./diagnosis/DiagnosisFlow.js").then((m) => ({ default: m.DiagnosisFlow })),
);

const FirstRunFlow = lazy(() =>
  import("./firstrun/FirstRunFlow.js").then((m) => ({ default: m.FirstRunFlow })),
);

const SettingsFlow = lazy(() =>
  import("./settings/SettingsFlow.js").then((m) => ({ default: m.SettingsFlow })),
);

const MockFlow = lazy(() =>
  import("./mock/MockFlow.js").then((m) => ({ default: m.MockFlow })),
);

const HomeFlow = lazy(() =>
  import("./home/HomeFlow.js").then((m) => ({ default: m.HomeFlow })),
);

/** Read the current route from the URL hash. The empty hash is the default
 * route, which the router resolves to first-run or practice at boot. */
function readRoute(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#\/?/, "");
}

/** Navigate by setting the hash (records a history entry, so Back works). */
function navigate(route: string): void {
  if (typeof window === "undefined") return;
  window.location.hash = route === "" ? "" : `/${route}`;
}

/** The default-route decision: first-run for a new device, then the cold-start
 * baseline for a student with no history who has not done it, the HOME surface
 * for a returning student otherwise (W5-9). null while the meta read is in
 * flight. */
type DefaultTarget = "firstrun" | "baseline" | "home" | null;

export function Router(): JSX.Element {
  const [route, setRoute] = useState<string>(readRoute);
  const [defaultTarget, setDefaultTarget] = useState<DefaultTarget>(null);

  useEffect(() => {
    const onHash = (): void => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Resolve the default target once, by reading the first-run completion flag
  // from storage. Done lazily off the entry path. A failure (or second-tab)
  // falls back sensibly: an AlreadyOpenError means another tab already holds
  // the connection, so the device is not new (go to practice, which renders the
  // second-tab screen itself); any other failure treats the device as fresh and
  // runs first-run. We open and release immediately so the flows own their own
  // connection.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { adapter } = await getSharedStorage();
        const firstRunDone = await isFirstRunComplete(adapter);
        if (!firstRunDone) {
          // Shared page-level connection: flows never close it (storage/index.ts).
          if (!cancelled) setDefaultTarget("firstrun");
          return;
        }
        // First run is done: a student with no history who has not seen the
        // baseline gets it once; the returning student lands on the home surface.
        const baselineDone = await isBaselineDone(adapter);
        const eventCount = (await adapter.readAllEvents()).length;
        // Shared page-level connection: flows never close it (storage/index.ts).
        if (!cancelled) {
          setDefaultTarget(shouldShowBaseline({ baselineDone, eventCount }) ? "baseline" : "home");
        }
      } catch (err) {
        if (cancelled) return;
        setDefaultTarget(err instanceof AlreadyOpenError ? "home" : "firstrun");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goDefault = useCallback(() => navigate(""), []);
  const goPractice = useCallback(() => navigate("practice"), []);
  const goBaseline = useCallback(() => navigate("baseline"), []);
  const goDiagnosis = useCallback(() => navigate("diagnosis"), []);
  const goSettings = useCallback(() => navigate("settings"), []);

  if (route === "practice") {
    return (
      <Suspense fallback={<BootScreen label="Loading practice" />}>
        <PracticeFlow onExit={goDefault} />
      </Suspense>
    );
  }

  // Cold-start baseline (flow / W5-8): the guided first session. First-run
  // finishes here for a zero-event student; the flow marks itself done so it
  // never reappears, then hands off to practice or the diagnosis map.
  if (route === "baseline") {
    return (
      <Suspense fallback={<BootScreen label="Loading your first session" />}>
        <BaselineFlow onExitToPractice={goPractice} onSeeDiagnosis={goDiagnosis} />
      </Suspense>
    );
  }

  if (route === "diagnosis") {
    return (
      <Suspense
        fallback={
          <div className="dg-screen">
            <main className="dg-body">
              <section className="dg-status" aria-busy="true">
                <p className="dg-status__label">Loading your diagnosis</p>
              </section>
            </main>
          </div>
        }
      >
        <DiagnosisFlow onExit={goDefault} />
      </Suspense>
    );
  }

  // Mock (flow b / W5-7): blueprint-assembled timed mock, hall, resume,
  // negative-marking score reveal, breakdown, readiness anchoring.
  if (route === "mock") {
    return (
      <Suspense fallback={<BootScreen label="Loading mock" />}>
        <MockFlow onExit={goDefault} />
      </Suspense>
    );
  }

  // Settings (flow e): import/export, status, telemetry, update, danger zone.
  if (route === "settings") {
    return (
      <Suspense fallback={<BootScreen label="Loading settings" />}>
        <SettingsFlow onExit={goDefault} />
      </Suspense>
    );
  }

  // Explicit first-run route (a student can revisit it via #/firstrun).
  if (route === "firstrun") {
    return (
      <Suspense fallback={<BootScreen label="Loading" />}>
        <FirstRunFlow onComplete={goBaseline} />
      </Suspense>
    );
  }

  // The home surface (W5-9), also reachable at the explicit #/home route. Begin
  // goes into practice; the settings and diagnosis links route accordingly.
  if (route === "home") {
    return (
      <Suspense fallback={<BootScreen label="Loading" />}>
        <HomeFlow onBegin={goPractice} onSettings={goSettings} onDiagnosis={goDiagnosis} />
      </Suspense>
    );
  }

  // The old engine-demo Shell, kept at an explicit route.
  if (route === "demo") {
    return (
      <div>
        <Shell />
        <div style={{ padding: "var(--gutter)" }}>
          <button
            type="button"
            onClick={() => navigate("practice")}
            style={{
              minHeight: "var(--touch-target)",
              padding: "0 var(--space-5)",
              borderRadius: "var(--radius-md)",
              border: "1px solid transparent",
              background: "var(--color-brand-primary)",
              color: "var(--color-brand-text)",
              font: "inherit",
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
            }}
          >
            Start practice
          </button>
        </div>
      </div>
    );
  }

  // Default route (empty hash): resolve first-run, baseline, or practice from
  // the meta flags and the event count.
  if (defaultTarget === null) {
    return <BootScreen label="Loading" />;
  }
  if (defaultTarget === "firstrun") {
    return (
      <Suspense fallback={<BootScreen label="Loading" />}>
        <FirstRunFlow onComplete={goBaseline} />
      </Suspense>
    );
  }
  if (defaultTarget === "baseline") {
    return (
      <Suspense fallback={<BootScreen label="Loading your first session" />}>
        <BaselineFlow onExitToPractice={goPractice} onSeeDiagnosis={goDiagnosis} />
      </Suspense>
    );
  }
  // Returning student: the home surface (W5-9).
  return (
    <Suspense fallback={<BootScreen label="Loading" />}>
      <HomeFlow onBegin={goPractice} onSettings={goSettings} onDiagnosis={goDiagnosis} />
    </Suspense>
  );
}

/** Neutral boot screen, reusing the practice status shell tokens. */
function BootScreen({ label }: { readonly label: string }): JSX.Element {
  return (
    <div className="pr-screen">
      <main className="pr-body">
        <section className="pr-status" aria-busy="true">
          <p className="pr-status__label">{label}</p>
        </section>
      </main>
    </div>
  );
}
