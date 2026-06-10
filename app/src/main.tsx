import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./Shell.js";
import { detectCapabilities, openStorage } from "./storage/index.js";
import "./base.css";

// Boot-time storage capability probe (W5-2, ADR 0008). Pure feature detection:
// no I/O, and crucially no sqlite-wasm. Surfacing the selection at boot lets the
// first-run flow lead with install-to-home and warn honestly in degraded mode.
const storageCapabilities = detectCapabilities();
console.info("[storage]", storageCapabilities.reason);

// mount point is guaranteed present by index.html; non-null assertion is safe.
const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(root).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);

// Open the local database AFTER first paint, not before it. This is the lazy
// boundary that keeps sqlite-wasm (~865 KB) out of the initial chunk (ADR 0008
// byte budget): openStorage() -> SahpoolAdapter.open() -> dynamic
// import("@sqlite.org/sqlite-wasm"), so Vite code-splits the wasm into its own
// chunk fetched only here. Real flows (W5-5) take ownership of the returned
// adapter; for now we open and immediately release to exercise the path and
// keep the graph honest. The AlreadyOpenError second-tab screen is wired in W5-5.
requestAnimationFrame(() => {
  void openStorage()
    .then(({ adapter }) => adapter.close())
    .catch((err: unknown) => {
      console.warn("[storage] deferred open failed", err);
    });
});
