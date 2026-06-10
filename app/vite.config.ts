import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error — .mjs build helper, no .d.ts; typed loosely on purpose.
import { swPlugin } from "./vite-plugin-sw.mjs";

// App version is the single source of truth for version stamping (ADR 0009) and
// the pack update min-app-version check (ADR 0009). Read it from package.json at
// config time and inject it as a compile-time constant so no runtime JSON import
// (and no Node API in app code) is needed. main.tsx declares the global.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// https://vitejs.dev/config/
export default defineConfig({
  // sqlite-wasm must not be pre-bundled: Vite's dep optimizer rewrites the
  // module URL and the .wasm asset then resolves to index.html in dev (the
  // browser sees "<!do" where the wasm magic word belongs). Production
  // chunking is unaffected. Found by driving the dev server.
  optimizeDeps: { exclude: ["@sqlite.org/sqlite-wasm"] },
  plugins: [
    // @vitejs/plugin-react: enables React fast-refresh in dev and handles
    // JSX transform without requiring React in scope (new JSX transform).
    react(),
    // Hand-rolled service worker: builds dist/sw.js with a precache manifest of
    // the app shell after the main bundle is written (W5-4, ADR 0001/0008).
    swPlugin(),
  ],
  define: {
    // Compile-time app version, consumed by main.tsx for version stamping and
    // the pack update min-app-version handshake (ADR 0009).
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Emit Vite's build manifest so tooling can resolve hashed filenames; the
    // SW plugin derives its precache list from the written dist/ either way.
    manifest: true,
    // rollupOptions is intentionally minimal for W5-1; byte-budget enforcement
    // lives in scripts/check-size.mjs so it works regardless of chunk strategy.
    outDir: "dist",
  },
  server: {
    fs: {
      // Allow the dev server to read the repo root: the demo lazily imports the
      // real pack (packs/ca-foundation-qa/pack.json) and profile JSON, which
      // live above app/. The import is code-split into its own chunk (W5-3).
      allow: [".."],
    },
  },
  // resolve.alias would go here when real token CSS is ported (W6-2).
});
