import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // @vitejs/plugin-react: enables React fast-refresh in dev and handles
    // JSX transform without requiring React in scope (new JSX transform).
    react(),
  ],
  build: {
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
