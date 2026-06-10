/**
 * Minimal hash router (W5-5 flow a).
 *
 * No dependency: the app is a static PWA and other flows land alongside this
 * one. A hash route (`#/practice`) keeps deep links working on GitHub/Cloudflare
 * Pages with no server rewrite, and survives offline reloads. This router maps
 * exactly the routes flow (a) needs today: the default screen (the existing
 * Shell demo) and the practice loop. Other agents add their routes here as their
 * flows land; the map is the single registration point.
 *
 * The PracticeFlow is loaded lazily so its code and the pack content chunk stay
 * off the entry chunk until the student actually opens practice.
 */

import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { Shell } from "../Shell.js";

const PracticeFlow = lazy(() =>
  import("./practice/PracticeFlow.js").then((m) => ({ default: m.PracticeFlow })),
);

/** Read the current route from the URL hash. Unknown hashes fall to "home". */
function readRoute(): string {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.length === 0 ? "home" : hash;
}

/** Navigate by setting the hash (records a history entry, so Back works). */
function navigate(route: string): void {
  if (typeof window === "undefined") return;
  window.location.hash = route === "home" ? "" : `/${route}`;
}

export function Router(): JSX.Element {
  const [route, setRoute] = useState<string>(readRoute);

  useEffect(() => {
    const onHash = (): void => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goHome = useCallback(() => navigate("home"), []);

  if (route === "practice") {
    return (
      <Suspense
        fallback={
          <div className="pr-screen">
            <main className="pr-body">
              <section className="pr-status" aria-busy="true">
                <p className="pr-status__label">Loading practice</p>
              </section>
            </main>
          </div>
        }
      >
        <PracticeFlow onExit={goHome} />
      </Suspense>
    );
  }

  // Default: the existing engine demo Shell, with an entry into practice.
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
