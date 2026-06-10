/**
 * Service worker: offline app shell (W5-4, ADR 0001/0008).
 *
 * Hand-rolled, no workbox. Justification against the byte budget (ADR 0008,
 * 2.0 MB ceiling / 1.5 MB target): workbox-window + workbox-routing + a
 * precaching runtime add ~10–15 KB gzipped of third-party code and a build
 * dependency, to solve a problem this file solves in ~1 KB. We control the
 * exact caching behaviour, the cache names, and the cleanup, so a hand-rolled
 * worker is both smaller and clearer. See the size report in the W5-4 task.
 *
 * Strategy:
 *   - PRECACHE (install): the build's app-shell assets — index.html, the entry
 *     JS/CSS, the web manifest, icons. The exact hashed filenames are injected
 *     at build time by the vite-plugin-precache-manifest (vite.config.ts), which
 *     reads Vite's own build manifest. This is the offline floor: the app boots
 *     with no network after first load.
 *   - RUNTIME cache-first (fetch): same-origin GET requests that miss the
 *     precache — the lazy chunks (sqlite-wasm, the pack chunk) and pack data.
 *     Cache-first because these assets are content-hashed and immutable; a new
 *     build ships new filenames, so a stale cached chunk is never wrong, just
 *     superseded. We populate the runtime cache on first fetch and serve from it
 *     forever after, which is what makes the lazily-loaded engine and pack work
 *     offline on the second visit.
 *   - NETWORK-ONLY: nothing student-facing. The pack *manifest* freshness probe
 *     (network.ts) uses cache:"no-store" and bypasses the SW cache by design, so
 *     a version check always reaches the network when online; offline it simply
 *     fails and the updater returns to idle. No student-facing route is
 *     network-only — the app must fully work offline.
 *
 * Versioning: CACHE_VERSION is bumped per deploy (the plugin stamps the build
 * hash). On `activate` we delete caches from older versions so a new app build
 * cannot be served stale shell bytes.
 */

/// <reference lib="webworker" />

// The precache list and version are injected at build time by the Vite plugin,
// which replaces these two tokens. In dev (no build) they fall back to empty /
// "dev", and the SW is not registered anyway (registerSW guards on PROD).
declare const __PRECACHE_ASSETS__: string[];
declare const __CACHE_VERSION__: string;

const PRECACHE_ASSETS: string[] =
  typeof __PRECACHE_ASSETS__ !== "undefined" ? __PRECACHE_ASSETS__ : [];
const CACHE_VERSION: string =
  typeof __CACHE_VERSION__ !== "undefined" ? __CACHE_VERSION__ : "dev";

const PRECACHE_NAME = `pinaka-precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `pinaka-runtime-${CACHE_VERSION}`;

// Service-worker globals are not in the DOM lib; narrow `self` once here.
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event) => {
  // Precache the shell, then take over immediately so the first load is covered.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME);
      // addAll is atomic-ish: if any asset 404s the whole install fails, which
      // is the honest outcome — a broken shell must not silently "succeed".
      await cache.addAll(PRECACHE_ASSETS);
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from prior versions so a new deploy never serves stale shell.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("pinaka-") && k !== PRECACHE_NAME && k !== RUNTIME_NAME)
          .map((k) => caches.delete(k)),
      );
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only same-origin GETs are cacheable. Cross-origin (e.g. analytics) and
  // non-GET fall through to the network untouched.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== sw.location.origin) return;

  event.respondWith(handleFetch(req));
});

/**
 * Cache-first for same-origin GETs. Precache hits return immediately; everything
 * else (lazy chunks, pack data) is served from the runtime cache once seen, and
 * fetched-then-cached on first miss. A navigation request that is offline and
 * uncached falls back to the precached index.html (SPA shell), so a deep link
 * still boots the app offline.
 */
async function handleFetch(req: Request): Promise<Response> {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    // Only cache successful, basic (same-origin) responses. Opaque/erroring
    // responses are passed through but not stored.
    if (res.ok && res.type === "basic") {
      const cache = await caches.open(RUNTIME_NAME);
      // Clone before the body is consumed by the caller.
      void cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Offline and uncached. For a navigation, serve the app shell so the SPA
    // can route client-side. For anything else, there is nothing to give.
    if (req.mode === "navigate") {
      const shell = await caches.match("/index.html");
      if (shell) return shell;
    }
    throw err;
  }
}
