/**
 * Service-worker registration (W5-4). Thin glue, smoke-tested.
 *
 * Registers the built service worker (sw.ts → /sw.js) for offline support. Only
 * in production: a service worker in dev fights Vite's HMR. Guards on feature
 * support and never throws into the boot path — a failed registration degrades
 * to "online-only", which is honest, not fatal.
 */

/** Options so the smoke test can inject a fake navigator/registration. */
export interface RegisterSWOptions {
  /** The serviceWorker container to register against. Defaults to navigator's. */
  readonly container?: ServiceWorkerContainer;
  /** Whether this is a production build. Registration is a no-op when false. */
  readonly isProduction: boolean;
  /** URL of the built worker. Defaults to "/sw.js". */
  readonly scriptUrl?: string;
}

/** Outcome of a registration attempt, for logging and the smoke test. */
export type RegisterResult =
  | { readonly status: "registered" }
  | { readonly status: "skipped"; readonly reason: string }
  | { readonly status: "failed"; readonly error: unknown };

/**
 * Register the service worker. Returns a result rather than throwing so callers
 * (main.tsx) can log without a try/catch around the boot path.
 */
export async function registerSW(options: RegisterSWOptions): Promise<RegisterResult> {
  if (!options.isProduction) {
    return { status: "skipped", reason: "not a production build" };
  }
  const container =
    options.container ??
    (typeof navigator !== "undefined" ? navigator.serviceWorker : undefined);
  if (container === undefined) {
    return { status: "skipped", reason: "serviceWorker API unavailable" };
  }
  try {
    await container.register(options.scriptUrl ?? "/sw.js", { type: "module" });
    return { status: "registered" };
  } catch (error) {
    return { status: "failed", error };
  }
}
