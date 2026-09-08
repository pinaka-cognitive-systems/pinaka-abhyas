/**
 * Ports for the pack update flow (W5-4).
 *
 * The update *logic* (updater.ts) is pure orchestration: it decides, downloads,
 * stages, and swaps. Everything that touches the outside world — the network
 * fetch, the staging store, the atomic swap, the clock — lives behind these
 * interfaces so the orchestration runs in node under vitest with fakes, while
 * the real service-worker / storage wiring (sw.ts + index.ts) supplies live
 * implementations. This is the "service-worker-specific parts behind an
 * interface" the task requires.
 */

import type { PackManifest } from "./manifest.js";

/**
 * The bytes of a staged pack: its manifest and its pack.json text. We keep the
 * pack body as a string (the raw JSON) rather than a parsed object so staging is
 * a verbatim copy and the swap is a single atomic write of known bytes.
 */
export interface StagedPack {
  readonly manifest: PackManifest;
  readonly packJson: string;
}

/**
 * Network port: fetch the candidate manifest and, once a download is decided,
 * the pack body. Returns parsed JSON for the manifest (validated by the caller)
 * and raw text for the pack body. Either may reject (offline, 404, 5xx); the
 * orchestrator treats any rejection as "no update available right now".
 */
export interface PackNetworkPort {
  /** Fetch and JSON-parse the remote manifest. Rejects on network/parse error. */
  fetchManifest(): Promise<unknown>;
  /** Fetch the remote pack body as text. Rejects on network error. */
  fetchPackBody(): Promise<string>;
}

/**
 * Staging port: durable scratch space for an in-flight update, plus the atomic
 * swap into the live slot. Backed by the storage adapter's meta store in
 * production (a "staging key" per ADR 0009 "Update flow"). The contract:
 *
 *   - writeStaging persists the candidate without touching the live pack.
 *   - readStaging returns it (for resume after an interrupted download).
 *   - commitStaging atomically promotes staging to live and clears staging.
 *   - clearStaging discards an abandoned/failed staging entry.
 *   - readLiveManifest returns the currently installed pack's manifest, or null
 *     on first install.
 *   - readLiveBody returns the currently installed pack's raw JSON text, or
 *     null on first install. The one pack loader (pack/source.ts) reads this
 *     first, so a student who already has a live pack never re-fetches it.
 *
 * "Atomic" here means: a reader either sees the old live pack or the new one,
 * never a half-written mix. The storage-backed implementation achieves this by
 * writing the new pack body and manifest, then flipping a single live-pointer
 * meta key last; a crash before the flip leaves the old pack intact.
 */
export interface PackStagingPort {
  readLiveManifest(): Promise<PackManifest | null>;
  readLiveBody(): Promise<string | null>;
  readStaging(): Promise<StagedPack | null>;
  writeStaging(staged: StagedPack): Promise<void>;
  commitStaging(): Promise<void>;
  clearStaging(): Promise<void>;
}

/**
 * Mid-mock guard (ADR 0009: "No update ever happens mid-mock"). The mock flow
 * holds this guard while a timed mock is in progress; the updater asks it before
 * committing a swap. A swap is deferred — not cancelled — while a mock is live,
 * so the student's clock and item bank cannot change under them. The mock flow
 * releases the guard on submit/abandon, and the updater retries the commit then.
 */
export interface MockGuard {
  /** True while a timed mock is in progress and a swap must not happen. */
  isMockInProgress(): boolean;
}

/** A guard that never blocks — the default outside a mock. */
export const ALWAYS_ALLOW: MockGuard = { isMockInProgress: () => false };
