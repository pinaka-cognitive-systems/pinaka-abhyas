/**
 * Router — minimal hash router with the design canvas's interaction layer.
 *
 * Route vocabulary follows the design drop (design-team/v2/App.html):
 * shell-hosted destinations (today, practice, review, diagnosis,
 * misconception/*, syllabus, mock, settings) render inside AppShell;
 * full-window flows (drill, mock/* phases, firstrun, testday) render bare to
 * preserve the focus environment. navRoutes.ts is the single registration
 * point for that mapping.
 *
 * Ported interaction contracts:
 *   - Route changes run through document.startViewTransition (180ms root
 *     crossfade, design App.html:92-105) with the reduced-motion bypass, the
 *     aborted-transition swallow, and the 250ms throttled-rendering fallback.
 *   - Global keyboard (App.html:126-138): 1-5/comma navigate between
 *     destinations (suppressed inside full-window flows and form fields),
 *     "?" toggles the shortcut sheet anywhere, Esc closes the sheet or exits
 *     a flow to Today.
 *   - Per-route document.title replaces the prototype's window-chrome title
 *     (the browser provides the window; ruling 2026-06-12).
 *
 * Default route: first visit runs first-run (welcome, paper, exam date);
 * thereafter the empty hash lands on Today, whose empty state carries the
 * "take your first mock" recommendation (the design's cold start — the
 * baseline flow was removed by the same ruling).
 *
 * Flows load lazily so their code and the pack chunk stay off the entry
 * chunk until needed.
 */

import { flushSync } from "react-dom";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { Shell } from "../Shell.js";
import { AppShell } from "../components/AppShell.js";
import { ShortcutSheet } from "../components/ui.js";
import { navIdForRoute, routeForNavId, type NavId } from "../components/navRoutes.js";
import { navigate, readRoute } from "../components/navigate.js";
import { isFirstRunComplete } from "./firstrun/meta.js";
import { AlreadyOpenError, getSharedStorage } from "../storage/index.js";
import { loadAppSnapshot } from "../state/appData.js";

const PracticeHub = lazy(() =>
  import("./practice/PracticeHub.js").then((m) => ({ default: m.PracticeHub })),
);

const PracticeFlow = lazy(() =>
  import("./practice/PracticeFlow.js").then((m) => ({ default: m.PracticeFlow })),
);

const ReviewFlow = lazy(() =>
  import("./review/ReviewFlow.js").then((m) => ({ default: m.ReviewFlow })),
);

const DiagnosisFlow = lazy(() =>
  import("./diagnosis/DiagnosisFlow.js").then((m) => ({ default: m.DiagnosisFlow })),
);

const SyllabusFlow = lazy(() =>
  import("./syllabus/SyllabusFlow.js").then((m) => ({ default: m.SyllabusFlow })),
);

const TestDayFlow = lazy(() =>
  import("./testday/TestDayFlow.js").then((m) => ({ default: m.TestDayFlow })),
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

const TodayFlow = lazy(() =>
  import("./home/HomeFlow.js").then((m) => ({ default: m.HomeFlow })),
);

/** Per-route document titles (design App.html WINDOW_TITLE). */
const WINDOW_TITLE: Record<string, string> = {
  "today": "Today", "practice": "Practice", "drill": "Practice",
  "review": "Review", "diagnosis": "Diagnosis", "misconception": "Diagnosis",
  "syllabus": "Syllabus", "mock": "Mocks", "mock/hall": "Mock in progress",
  "mock/reveal": "Mock complete", "mock/breakdown": "Mock breakdown",
  "mock/review": "Mock review", "settings": "Settings",
  "firstrun": "Welcome", "testday": "Test day",
};

function titleFor(route: string): string {
  const exact = WINDOW_TITLE[route];
  if (exact !== undefined) return exact;
  const head = route.split("/")[0] ?? "";
  return WINDOW_TITLE[head] ?? "Pinaka";
}

/** Swap routes through the View Transitions API where supported: a 180ms
 * crossfade (design.css ::view-transition rules). Skipped under reduced
 * motion; aborted transitions are swallowed; throttled rendering falls back
 * to a direct apply after 250ms (design App.html:92-105). */
function applyRouteTransition(apply: () => void): void {
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (
    document as Document & {
      startViewTransition?: (cb: () => void) => {
        finished: Promise<void>;
        ready: Promise<void>;
        updateCallbackDone: Promise<void>;
      };
    }
  ).startViewTransition;
  if (typeof start !== "function" || reduced) {
    apply();
    return;
  }
  let applied = false;
  const applyOnce = (): void => {
    if (applied) return;
    applied = true;
    flushSync(apply);
  };
  try {
    const t = start.call(document, applyOnce);
    // Aborted transitions (rapid navigation) reject these promises — expected.
    for (const p of [t.finished, t.ready, t.updateCallbackDone]) {
      void p.catch(() => undefined);
    }
    // Throttled rendering (background tab) can stall the callback.
    setTimeout(applyOnce, 250);
  } catch {
    applyOnce();
  }
}

type DefaultTarget = "firstrun" | "today" | null;

export function Router(): JSX.Element {
  const [route, setRoute] = useState<string>(readRoute);
  const [defaultTarget, setDefaultTarget] = useState<DefaultTarget>(null);
  const [sheet, setSheet] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  // Hash navigation, wrapped in the route crossfade.
  useEffect(() => {
    const onHash = (): void => applyRouteTransition(() => setRoute(readRoute()));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Legacy alias: #/home was the pre-parity name for Today.
  useEffect(() => {
    if (route === "home" || route.startsWith("home/")) navigate("today");
  }, [route]);

  // Per-route document title (replaces the prototype's window chrome).
  useEffect(() => {
    document.title = `${titleFor(route)} · Pinaka abhyas`;
  }, [route]);

  // Resolve the default target once: first-run for a new device, else Today.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { adapter } = await getSharedStorage();
        const firstRunDone = await isFirstRunComplete(adapter);
        if (!cancelled) setDefaultTarget(firstRunDone ? "today" : "firstrun");
      } catch (err) {
        if (cancelled) return;
        setDefaultTarget(err instanceof AlreadyOpenError ? "today" : "firstrun");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reviews-due badge: refresh from the shared snapshot on shell routes.
  useEffect(() => {
    if (navIdForRoute(route) === null) return;
    let cancelled = false;
    void loadAppSnapshot()
      .then((snap) => {
        if (!cancelled) setReviewCount(snap.reviewsDue);
      })
      .catch(() => undefined); // badge is best-effort; flows surface errors
    return () => {
      cancelled = true;
    };
  }, [route]);

  // Global keyboard: nav keys on destinations, "?" sheet, Esc exits a flow.
  useEffect(() => {
    const NAV_KEYS: Record<string, NavId> = {
      "1": "today", "2": "practice", "3": "diagnosis",
      "4": "mock", "5": "syllabus", ",": "settings",
    };
    const h = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const inFlow = navIdForRoute(readRoute()) === null;
      if (e.key === "?") {
        setSheet((s) => !s);
        return;
      }
      if (e.key === "Escape") {
        setSheet((s) => {
          if (s) return false;
          if (inFlow) navigate("today");
          return s;
        });
        return;
      }
      if (inFlow) return; // flow screens own their number keys
      const id = NAV_KEYS[e.key];
      if (id !== undefined) navigate(routeForNavId(id));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const goToday = useCallback(() => navigate("today"), []);
  const openSheet = useCallback(() => setSheet(true), []);
  const closeSheet = useCallback(() => setSheet(false), []);

  function shell(content: JSX.Element, activeRoute: string = route): JSX.Element {
    return (
      <>
        <AppShell route={activeRoute} reviewCount={reviewCount} onShortcuts={openSheet}>
          {content}
        </AppShell>
        <ShortcutSheet open={sheet} onClose={closeSheet} />
      </>
    );
  }

  function fullBleed(content: JSX.Element): JSX.Element {
    return (
      <>
        {content}
        <ShortcutSheet open={sheet} onClose={closeSheet} />
      </>
    );
  }

  // ---- Full-window flows (rail hidden) ----

  if (route === "drill") {
    return fullBleed(
      <Suspense fallback={<BootScreen label="Loading practice" />}>
        <PracticeFlow onExit={goToday} />
      </Suspense>,
    );
  }

  if (route.startsWith("mock/")) {
    return fullBleed(
      <Suspense fallback={<BootScreen label="Loading mock" />}>
        <MockFlow onExit={goToday} />
      </Suspense>,
    );
  }

  if (route === "firstrun") {
    return fullBleed(
      <Suspense fallback={<BootScreen label="Loading" />}>
        <FirstRunFlow onComplete={goToday} onSkipToPractice={goToday} />
      </Suspense>,
    );
  }

  if (route === "testday") {
    return fullBleed(
      <Suspense fallback={<BootScreen label="Loading" />}>
        <TestDayFlow />
      </Suspense>,
    );
  }

  // The old engine-demo Shell, kept at an explicit route.
  if (route === "demo") {
    return (
      <div>
        <Shell />
      </div>
    );
  }

  // ---- Shell-hosted destinations ----

  if (route === "today" || route === "home") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading" />}>
        <TodayFlow />
      </Suspense>,
      "today",
    );
  }

  if (route === "practice") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading practice" />}>
        <PracticeHub />
      </Suspense>,
    );
  }

  if (route === "review") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading review" />}>
        <ReviewFlow />
      </Suspense>,
    );
  }

  if (route === "diagnosis" || route === "misconception" || route.startsWith("misconception/")) {
    return shell(
      <Suspense fallback={<BootScreen label="Loading your diagnosis" />}>
        <DiagnosisFlow onExit={goToday} />
      </Suspense>,
    );
  }

  if (route === "syllabus") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading syllabus" />}>
        <SyllabusFlow />
      </Suspense>,
    );
  }

  if (route === "mock") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading mock" />}>
        <MockFlow onExit={goToday} />
      </Suspense>,
    );
  }

  if (route === "settings") {
    return shell(
      <Suspense fallback={<BootScreen label="Loading settings" />}>
        <SettingsFlow onExit={goToday} />
      </Suspense>,
    );
  }

  // ---- Default route (empty hash) ----

  if (defaultTarget === null) {
    return <BootScreen label="Loading" />;
  }
  if (defaultTarget === "firstrun") {
    return fullBleed(
      <Suspense fallback={<BootScreen label="Loading" />}>
        <FirstRunFlow onComplete={goToday} onSkipToPractice={goToday} />
      </Suspense>,
    );
  }
  return shell(
    <Suspense fallback={<BootScreen label="Loading" />}>
      <TodayFlow />
    </Suspense>,
    "today",
  );
}

/** Neutral boot screen: never a flash of the wrong flow. */
function BootScreen({ label }: { readonly label: string }): JSX.Element {
  return (
    <main className="screen" aria-busy="true">
      <div className="screen__scroll">
        <div className="screen__pad">
          <p className="screen__lede">{label}</p>
        </div>
      </div>
    </main>
  );
}
