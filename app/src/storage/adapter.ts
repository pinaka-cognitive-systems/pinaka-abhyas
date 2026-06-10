/**
 * Storage adapter contract (W5-2, binding to ADR 0008 and ADR 0009).
 *
 * The event log is the single source of truth for student state (ADR 0009):
 * derived state (mastery, schedules, readiness) is rebuilt by the engine on
 * load and is NEVER stored as truth. The adapter therefore exposes append-only
 * event writes, a full-log read, a tiny key/value meta store, and the
 * versioned export/import envelope.
 *
 * Two implementations satisfy this contract (ADR 0008):
 *   - sahpool.ts: the primary, on @sqlite.org/sqlite-wasm with the
 *     opfs-sahpool VFS. Persistent, single-connection (Web Locks guarded).
 *   - memory.ts: the degraded fallback. In-memory, with best-effort IndexedDB
 *     snapshotting. Honest capability flags let the UI warn and promote export.
 *
 * Both are exercised by the shared contract suite in app/tests/storage/.
 */

import type { Event } from "@pinaka/engine";

/** Which backend an adapter instance is running on (ADR 0008 fallback chain). */
export type StorageBackend = "opfs-sahpool" | "memory";

/**
 * The append shape. The engine's runtime `Event` carries `occurredAtMs` (the
 * parsed epoch-ms time) plus derived fields the engine reads. Persistence keeps
 * the raw record: an `event_id`, an `occurred_at_ms` sort key, and the full
 * JSON payload. The payload is the complete uqs-event-2 record (ADR 0009),
 * including the raw response needed to re-score after a pack re-key.
 *
 * We store the whole engine `Event` as the payload so a load reconstructs it
 * verbatim. `event_id` and `occurredAtMs` are mirrored into columns for the
 * primary key and the index; the payload remains the source of every field.
 */
export type StoredEvent = Event;

/**
 * The progress-export envelope (ADR 0009, "Progress export"). One file, one
 * envelope. Events only; derived state is rebuilt on import. Versioned from day
 * one so no backup is ever stranded.
 */
export interface ExportEnvelope {
  /** Envelope schema version. ADR 0009 fixes this at 1 for the first release. */
  readonly format_version: 1;
  /** RFC3339 UTC timestamp of when the export was produced. */
  readonly exported_at: string;
  /** App version that produced the file (semver string). */
  readonly app_version: string;
  /** Pack the events were recorded against. */
  readonly pack_id: string;
  readonly pack_version: string;
  /** Taxonomy bundle version (ADR 0009 taxonomy migration). */
  readonly taxonomy_version: number;
  /** Stable per-install id (used only to recognise the originating device). */
  readonly install_id: string;
  /** The full event list, ascending by (occurred_at_ms, event_id). */
  readonly events: readonly StoredEvent[];
}

/**
 * Outcome of importing an envelope. Import merges by `event_id`, is idempotent,
 * and is never destructive (ADR 0009): re-importing the same file changes
 * nothing, and merging a second device's history only adds events the local log
 * does not already have. The report lets the UI tell the student exactly what
 * happened.
 */
export interface ImportReport {
  /** Events not previously present, now persisted. */
  readonly added: number;
  /** Events skipped because an event with the same id already existed. */
  readonly duplicate: number;
  /** Records that failed validation and were rejected (never partially written). */
  readonly invalid: number;
  /** Total events seen in the envelope (added + duplicate + invalid). */
  readonly total: number;
  /** Per-record reasons for any invalid entries (index into envelope.events). */
  readonly invalidReasons: readonly { readonly index: number; readonly reason: string }[];
}

/**
 * The capability-flagged storage contract. A caller selects an adapter via
 * `openStorage()` (index.ts), inspects the flags to decide what to warn about,
 * then reads and writes events.
 */
export interface StorageAdapter {
  /** Which backend this instance runs on. */
  readonly backend: StorageBackend;
  /**
   * True when writes survive a reload by design (opfs-sahpool). False for the
   * memory backend even when IndexedDB snapshotting is available: snapshots are
   * best-effort, not a durability guarantee, so the UI must promote export.
   */
  readonly persistent: boolean;
  /**
   * Reports `navigator.storage.persisted()` — whether the browser has granted
   * persistent storage (eviction protection). Distinct from `persistent`: a
   * sahpool backend is `persistent: true` by design, but `persisted()` may
   * still be false until the user installs to home screen (ADR 0008 posture:
   * install is the mechanism, persist() is a courtesy). Returns false where the
   * API is unavailable.
   */
  persisted(): Promise<boolean>;

  /**
   * Append events to the log. Append-only: events are never updated or deleted
   * (event sourcing, ADR 0009). Appending an event whose id already exists is a
   * no-op for that event (idempotent), so a retried write cannot duplicate.
   */
  appendEvents(events: readonly StoredEvent[]): Promise<void>;

  /**
   * Read the entire event log, ascending by (occurred_at_ms, event_id). The
   * engine replays this to rebuild all derived state. Ordering is the engine's
   * contract (SPEC 2.1), so the adapter guarantees it here.
   */
  readAllEvents(): Promise<StoredEvent[]>;

  /** Read a meta value, or null if the key is unset. */
  getMeta(key: string): Promise<string | null>;
  /** Write a meta value (upsert). */
  setMeta(key: string, value: string): Promise<void>;

  /**
   * Produce the export envelope for the current log. Envelope metadata
   * (app_version, pack_*, taxonomy_version, install_id) comes from the meta
   * store, seeded at open time.
   */
  exportEnvelope(): Promise<ExportEnvelope>;

  /**
   * Merge an imported envelope into the log by event_id. Idempotent and never
   * destructive. Invalid records are counted and reported, never written, and
   * never abort the valid ones.
   */
  importEnvelope(env: ExportEnvelope): Promise<ImportReport>;

  /** Release the connection and any held lock. Safe to call more than once. */
  close(): Promise<void>;
}

/**
 * Raised by the sahpool backend when another tab already holds the single
 * connection (ADR 0008: "Single connection handled with the Web Locks API").
 * The UI renders the second-tab screen and may offer a takeover, which calls
 * `openStorage({ steal: true })` to break the existing lock cleanly.
 */
export class AlreadyOpenError extends Error {
  override readonly name = "AlreadyOpenError";
  constructor(message = "The local database is already open in another tab.") {
    super(message);
    // Restore the prototype chain across the TS-to-ES target downlevel.
    Object.setPrototypeOf(this, AlreadyOpenError.prototype);
  }
}

/** The meta keys the envelope is built from. Seeded at open time (index.ts). */
export const META_KEYS = {
  appVersion: "app_version",
  packId: "pack_id",
  packVersion: "pack_version",
  taxonomyVersion: "taxonomy_version",
  installId: "install_id",
} as const;
