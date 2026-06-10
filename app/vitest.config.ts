import { defineConfig } from "vitest/config";

// No React plugin needed: the smoke test (tests/shell.test.tsx) tests the
// engine function directly, not the DOM. DOM rendering is validated via
// `npm run build` succeeding and the Vite dev server. Adding @testing-library
// would require jsdom and bloat deps; the task spec explicitly permits testing
// the engine-consuming function directly instead.
export default defineConfig({
  test: {
    // environment defaults to "node" — correct for pure-logic tests.
    // If a future test needs DOM, override with /** @vitest-environment jsdom */
    // at the top of that specific file; add jsdom as a dev dep at that point.
    globals: false,
  },
});
