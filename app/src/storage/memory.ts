/**
 * Degraded fallback storage backend (W5-2, ADR 0008 fallback chain).
 *
 * In-memory event log and meta store, with best-effort IndexedDB snapshot
 * persistence where available (private-browsing and some in-app webviews block
 * IndexedDB too, so it is strictly best-effort). The capability flags are
 * honest: `persistent` is always false here, so the UI warns and promotes the
 * export flow (ADR 0008: "the export flow promoted prominently").
 *
 * Snapshots are whole-log writes debounced after each append/import. They are a
 * convenience to survive a refresh, never a durability guarantee. The event log
 * remains the source of truth (ADR 0009); the snapshot is just a serialised
 * copy of it.
 */

import type {
  ExportEnvelope,
  ImportReport,
  StorageAdapter,
  StoredEvent,
} from "./adapter.js";
import { META_KEYS } from "./adapter.js";
import { buildEnvelope, compareEvents, planMerge, validateEnvelope } from "./envelope.js";

const DB_NAME = "pinaka-fallback";
const STORE_NAME = "snapshot";
const SNAPSHOT_KEY = "v1";

interface Snapshot {
  readonly events: StoredEvent[];
  readonly meta: Record<string, string>;
}

/** Open the fallback IndexedDB, or resolve null if IndexedDB is unavailable. */
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb get failed"));
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb put aborted"));
  });
}

export interface MemoryAdapterOptions {
  /** Seed meta values (app_version, pack_id, etc.), written if not already set. */
  readonly meta?: Record<string, string>;
  /**
   * Attempt IndexedDB snapshotting. Default true. Tests pass false to stay
   * purely in-memory (node has no IndexedDB anyway, so it no-ops there).
   */
  readonly snapshot?: boolean;
}

export class MemoryAdapter implements StorageAdapter {
  readonly backend = "memory" as const;
  readonly persistent = false;

  private readonly events = new Map<string, StoredEvent>();
  private readonly meta = new Map<string, string>();
  private idb: IDBDatabase | null = null;
  private readonly wantSnapshot: boolean;
  private snapshotChain: Promise<void> = Promise.resolve();
  private closed = false;

  private constructor(wantSnapshot: boolean) {
    this.wantSnapshot = wantSnapshot;
  }

  /**
   * Open the memory adapter, restoring any prior IndexedDB snapshot, then
   * applying seed meta for keys not already present.
   */
  static async open(options: MemoryAdapterOptions = {}): Promise<MemoryAdapter> {
    const wantSnapshot = options.snapshot ?? true;
    const adapter = new MemoryAdapter(wantSnapshot);

    if (wantSnapshot) {
      adapter.idb = await openIdb();
      if (adapter.idb) {
        try {
          const snap = (await idbGet(adapter.idb, SNAPSHOT_KEY)) as Snapshot | undefined;
          if (snap && Array.isArray(snap.events)) {
            for (const ev of snap.events) adapter.events.set(ev.event_id, ev);
            for (const [k, v] of Object.entries(snap.meta ?? {})) adapter.meta.set(k, v);
          }
        } catch {
          // Corrupt or unreadable snapshot: start clean. Export remains the
          // real backstop, so a lost snapshot is degraded, not data loss in the
          // ADR 0009 sense (it was never durable to begin with).
        }
      }
    }

    // Seed meta for keys not already restored from a snapshot.
    if (options.meta) {
      for (const [k, v] of Object.entries(options.meta)) {
        if (!adapter.meta.has(k)) adapter.meta.set(k, v);
      }
      await adapter.scheduleSnapshot();
    }

    return adapter;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async persisted(): Promise<boolean> {
    // The memory backend is never on persistent storage by design.
    return false;
  }

  async appendEvents(events: readonly StoredEvent[]): Promise<void> {
    this.assertOpen();
    for (const ev of events) {
      // Append-only and idempotent: an existing id is left untouched.
      if (!this.events.has(ev.event_id)) this.events.set(ev.event_id, ev);
    }
    await this.scheduleSnapshot();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async readAllEvents(): Promise<StoredEvent[]> {
    this.assertOpen();
    return [...this.events.values()].sort(compareEvents);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMeta(key: string): Promise<string | null> {
    this.assertOpen();
    return this.meta.get(key) ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    this.assertOpen();
    this.meta.set(key, value);
    await this.scheduleSnapshot();
  }

  async exportEnvelope(): Promise<ExportEnvelope> {
    this.assertOpen();
    const events = await this.readAllEvents();
    return buildEnvelope(this.envelopeMeta(), events, new Date().toISOString());
  }

  async importEnvelope(env: ExportEnvelope): Promise<ImportReport> {
    this.assertOpen();
    const shapeError = validateEnvelope(env);
    if (shapeError !== null) {
      // A structurally invalid envelope adds nothing; report the whole thing as
      // a single invalid record so the UI can surface a clear message.
      return {
        added: 0,
        duplicate: 0,
        invalid: 1,
        total: 0,
        invalidReasons: [{ index: -1, reason: shapeError }],
      };
    }
    const plan = planMerge(env.events, new Set(this.events.keys()));
    for (const ev of plan.toAdd) this.events.set(ev.event_id, ev);
    if (plan.toAdd.length > 0) await this.scheduleSnapshot();
    return {
      added: plan.added,
      duplicate: plan.duplicate,
      invalid: plan.invalid,
      total: plan.total,
      invalidReasons: plan.invalidReasons,
    };
  }

  async clearAll(): Promise<void> {
    this.assertOpen();
    // Wipe the in-memory store, then overwrite the snapshot so a reload does not
    // restore the deleted data. The adapter stays open and reusable.
    this.events.clear();
    this.meta.clear();
    await this.scheduleSnapshot();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.snapshotChain;
    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("MemoryAdapter is closed.");
  }

  private envelopeMeta(): {
    app_version: string;
    pack_id: string;
    pack_version: string;
    taxonomy_version: number;
    install_id: string;
  } {
    const taxRaw = this.meta.get(META_KEYS.taxonomyVersion);
    return {
      app_version: this.meta.get(META_KEYS.appVersion) ?? "",
      pack_id: this.meta.get(META_KEYS.packId) ?? "",
      pack_version: this.meta.get(META_KEYS.packVersion) ?? "",
      taxonomy_version: taxRaw === undefined ? 0 : Number(taxRaw),
      install_id: this.meta.get(META_KEYS.installId) ?? "",
    };
  }

  /**
   * Serialise the whole store to IndexedDB. Best-effort: failures are swallowed
   * because the snapshot is never the source of truth. Chained so concurrent
   * appends do not race a half-written snapshot.
   */
  private scheduleSnapshot(): Promise<void> {
    if (!this.wantSnapshot || !this.idb) return Promise.resolve();
    const snapshot: Snapshot = {
      events: [...this.events.values()],
      meta: Object.fromEntries(this.meta),
    };
    this.snapshotChain = this.snapshotChain
      .then(() => (this.idb ? idbPut(this.idb, SNAPSHOT_KEY, snapshot) : undefined))
      .catch(() => {
        // Best-effort: a failed snapshot must not reject an append.
      });
    return this.snapshotChain;
  }
}
