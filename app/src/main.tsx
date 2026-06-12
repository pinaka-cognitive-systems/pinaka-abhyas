import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "./flows/router.js";
import { detectCapabilities, getSharedStorage } from "./storage/index.js";
// Import the two boot-time helpers from their own modules (not the barrel) so
// the entry chunk does not pull in the update state machine, which is loaded by
// the (lazy) flows that drive it (W5-4 / ADR 0008 byte budget).
import { registerSW } from "./sw/register.js";
import { stampVersions } from "./sw/storagePort.js";
import "./base.css";

// Compile-time app version, injected by Vite's `define` from package.json
// (ADR 0009 version stamping + pack-update min-app-version handshake).
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

// Boot-time storage capability probe (W5-2, ADR 0008). Pure feature detection:
// no I/O, and crucially no sqlite-wasm. Surfacing the selection at boot lets the
// first-run flow lead with install-to-home and warn honestly in degraded mode.
const storageCapabilities = detectCapabilities();
console.info("[storage]", storageCapabilities.reason);

// Register the offline app-shell service worker (W5-4, ADR 0001/0008). Production
// only; never blocks boot — a failed registration degrades to online-only.
// import.meta.env.PROD is true only in `vite build` output.
void registerSW({ isProduction: import.meta.env.PROD }).then((result) => {
  if (result.status === "failed") console.warn("[sw] registration failed", result.error);
  else console.info("[sw]", result.status === "registered" ? "registered" : `skipped: ${result.reason}`);
});

// mount point is guaranteed present by index.html; non-null assertion is safe.
const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(root).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);

// Open the local database AFTER first paint, not before it. This is the lazy
// boundary that keeps sqlite-wasm (~865 KB) out of the initial chunk (ADR 0008
// byte budget): getSharedStorage() -> SahpoolAdapter.open() -> dynamic
// import("@sqlite.org/sqlite-wasm"), so Vite code-splits the wasm into its own
// chunk fetched only here. Real flows (W5-5) take ownership of the returned
// adapter; for now we open and immediately release to exercise the path and
// keep the graph honest. The AlreadyOpenError second-tab screen is wired in W5-5.
//
// W5-4 wiring point (flagged): version stamping. On every session start we record
// the real app version and live pack version into storage meta, so the export
// envelope (ADR 0009) carries real values rather than the seed placeholders.
requestAnimationFrame(() => {
  void getSharedStorage()
    .then(async ({ adapter }) => {
      await stampVersions(adapter, APP_VERSION);
      // Apply the persisted accessibility settings (reduce motion, contrast,
      // text size) as body classes as soon as storage is up. The import is
      // dynamic so the settings flow stays off the entry chunk.
      const [{ applyA11ySettings, parseA11ySettings }, raw] = await Promise.all([
        import("./flows/settings/a11y.js"),
        adapter.getMeta("a11y_v1"),
      ]);
      applyA11ySettings(parseA11ySettings(raw));
      // Shared page-level connection: not closed here.
    })
    .catch((err: unknown) => {
      console.warn("[storage] deferred open failed", err);
    });
});
