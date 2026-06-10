/**
 * Storage detection and selection (W5-2, ADR 0008).
 *
 * Feature-detects OPFS + opfs-sahpool viability, applies the in-app-webview
 * heuristic (ADR 0008: WhatsApp/Telegram webviews are guided to a real browser
 * before anything is stored), and selects the right adapter:
 *
 *   viable  -> SahpoolAdapter (primary, persistent)
 *   not     -> MemoryAdapter  (degraded fallback; UI warns, promotes export)
 *
 * Also exposes the navigator.storage.persist()/persisted() surface so the UI
 * can show an honest storage-status indicator and lead with install-to-home
 * (ADR 0008: install is the mechanism, persist() is a courtesy).
 */

import type { StorageAdapter } from "./adapter.js";
import { AlreadyOpenError } from "./adapter.js";
import { MemoryAdapter } from "./memory.js";
import { SahpoolAdapter } from "./sahpool.js";

export type {
  ExportEnvelope,
  ImportReport,
  StorageAdapter,
  StorageBackend,
  StoredEvent,
} from "./adapter.js";
export { AlreadyOpenError, META_KEYS } from "./adapter.js";

/** Why a given backend was chosen, for the honest storage-status indicator. */
export interface StorageCapabilities {
  /** OPFS (navigator.storage.getDirectory) is present. */
  readonly opfs: boolean;
  /** Web Locks API is present (single-connection guard). */
  readonly webLocks: boolean;
  /** A cross-origin-isolated context (only relevant to the rejected default VFS). */
  readonly crossOriginIsolated: boolean;
  /** The page looks like it is running inside an in-app webview. */
  readonly inAppWebview: boolean;
  /** The backend selection resolves to the persistent primary. */
  readonly sahpoolViable: boolean;
  /** Human, single-line reason for the selection (for diagnostics/UI copy). */
  readonly reason: string;
}

/**
 * Detect storage capabilities. Pure feature detection plus a UA heuristic; does
 * no I/O and constructs no adapter, so the UI can call it during first paint to
 * decide what to warn about before the (lazy) wasm even loads.
 */
export function detectCapabilities(): StorageCapabilities {
  const hasOpfs =
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function";
  const hasWebLocks = typeof navigator !== "undefined" && typeof navigator.locks === "object";
  // WebAssembly is required for sqlite-wasm; absence forces the fallback.
  const hasWasm = typeof WebAssembly === "object";
  const coi = typeof globalThis.crossOriginIsolated === "boolean" && globalThis.crossOriginIsolated;
  const inApp = isInAppWebview();

  // sahpool viability: OPFS present, WebAssembly present, and not inside an
  // in-app webview (those frequently break OPFS persistence and the seven-day
  // eviction story is worse there; ADR 0008 routes them out first).
  const sahpoolViable = hasOpfs && hasWasm && !inApp;

  let reason: string;
  if (sahpoolViable) {
    reason = "OPFS available; using persistent opfs-sahpool backend.";
  } else if (inApp) {
    reason = "In-app browser detected; running in degraded memory mode until opened in a real browser.";
  } else if (!hasOpfs) {
    reason = "OPFS unavailable (private browsing or unsupported browser); degraded memory mode.";
  } else {
    reason = "WebAssembly unavailable; degraded memory mode.";
  }

  return {
    opfs: hasOpfs,
    webLocks: hasWebLocks,
    crossOriginIsolated: coi,
    inAppWebview: inApp,
    sahpoolViable,
    reason,
  };
}

/**
 * Heuristic detection of in-app webviews (WhatsApp, Telegram, Instagram, FB,
 * Line) where OPFS is unreliable. UA-string based: this is a heuristic, not a
 * guarantee, used to route the student to a real browser (ADR 0008). False
 * negatives fall through to the runtime OPFS check; false positives only cost a
 * degraded-mode session the student can fix by opening in a real browser.
 */
export function isInAppWebview(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // WhatsApp and Telegram are the audience's primary sharing channels (ADR 0008
  // names them explicitly); the rest are common Indian-market in-app browsers.
  const markers = [
    "WhatsApp",
    "Telegram",
    "Instagram",
    "FBAN",
    "FBAV",
    "FB_IAB",
    "Line/",
    "MicroMessenger", // WeChat
  ];
  return markers.some((m) => ua.includes(m));
}

export interface OpenStorageOptions {
  /** Seed meta values (app_version, pack_id, pack_version, taxonomy_version, install_id). */
  readonly meta?: Record<string, string>;
  /** Take over the single connection from another tab (Web Lock steal). */
  readonly steal?: boolean;
  /**
   * Force a backend, bypassing detection. For tests and for a UI "use memory
   * mode anyway" escape hatch. Omit in normal use.
   */
  readonly force?: "opfs-sahpool" | "memory";
}

export interface OpenStorageResult {
  readonly adapter: StorageAdapter;
  readonly capabilities: StorageCapabilities;
}

/**
 * Select and open the right backend. Throws AlreadyOpenError if the primary's
 * single connection is held by another tab and `steal` is not set — the caller
 * renders the second-tab screen and may retry with `steal: true`.
 *
 * If the primary is viable but fails to initialise for a reason OTHER than
 * AlreadyOpenError (e.g. an OPFS quota error or a webview that passed the UA
 * heuristic but breaks at runtime), we fall back to the memory backend rather
 * than leaving the student with no storage at all. AlreadyOpenError is NOT
 * swallowed: a second tab must see the honest takeover screen.
 */
export async function openStorage(
  options: OpenStorageOptions = {},
): Promise<OpenStorageResult> {
  const capabilities = detectCapabilities();
  const wantPrimary = options.force ? options.force === "opfs-sahpool" : capabilities.sahpoolViable;

  if (wantPrimary) {
    try {
      const adapter = await SahpoolAdapter.open({
        ...(options.meta ? { meta: options.meta } : {}),
        ...(options.steal ? { steal: options.steal } : {}),
      });
      return { adapter, capabilities };
    } catch (err) {
      if (err instanceof AlreadyOpenError) throw err; // honest second-tab path
      // Primary failed at runtime: degrade rather than deny storage. The
      // capabilities still report sahpoolViable so the UI can explain that the
      // primary was attempted; we override the reason for the fallback.
      const adapter = await MemoryAdapter.open(options.meta ? { meta: options.meta } : {});
      return {
        adapter,
        capabilities: {
          ...capabilities,
          sahpoolViable: false,
          reason: `Persistent storage failed to initialise (${err instanceof Error ? err.message : "unknown"}); degraded memory mode.`,
        },
      };
    }
  }

  const adapter = await MemoryAdapter.open(options.meta ? { meta: options.meta } : {});
  return { adapter, capabilities };
}

/**
 * Request persistent storage (eviction protection). A courtesy, not the
 * mechanism (ADR 0008): the UI still leads with install-to-home-screen. Returns
 * the resulting persisted() state, or false where the API is unavailable.
 */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.storage?.persist !== "function") {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Current persisted() status for the honest storage-status indicator. */
export async function isPersisted(): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.storage?.persisted !== "function") {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * The page-level shared connection. The sahpool backend is single-connection
 * (one Web Lock per origin), so the PAGE owns exactly one adapter: opened on
 * first use, shared by every flow and the boot path, closed only on pagehide.
 * Per-flow open/close caused the page to collide with itself ("already open
 * in another tab" within one tab), found by driving the real dev server.
 * A genuine second tab still surfaces AlreadyOpenError from the first open.
 */
let sharedStorage: Promise<OpenStorageResult> | null = null;

export function getSharedStorage(options: OpenStorageOptions = {}): Promise<OpenStorageResult> {
  if (sharedStorage === null) {
    sharedStorage = openStorage(options).catch((err: unknown) => {
      // A failed open must not poison the singleton: the next caller retries
      // (e.g. after a takeover or when the lock holder goes away).
      sharedStorage = null;
      throw err;
    });
    if (typeof window !== "undefined") {
      window.addEventListener(
        "pagehide",
        () => {
          void sharedStorage?.then((r) => r.adapter.close()).catch(() => {});
          sharedStorage = null;
        },
        { once: true },
      );
    }
  }
  return sharedStorage;
}

/** Reopen the shared connection with a lock takeover (the second-tab screen's
 * action): closes nothing locally (we hold no lock), steals, and replaces the
 * singleton. */
export function takeoverSharedStorage(): Promise<OpenStorageResult> {
  sharedStorage = null;
  return getSharedStorage({ steal: true });
}
