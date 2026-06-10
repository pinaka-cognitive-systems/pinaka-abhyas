/**
 * Primary storage backend (W5-2, ADR 0008): @sqlite.org/sqlite-wasm on the
 * opfs-sahpool VFS.
 *
 * opfs-sahpool needs no COOP/COEP headers (it does not use SharedArrayBuffer),
 * so it runs on any static host including GitHub Pages (ADR 0008 rationale).
 * Its trade-off is a single connection: only one tab may hold the database.
 * We enforce that with the Web Locks API, surfacing AlreadyOpenError when a
 * second tab tries to open, with a clean takeover path.
 *
 * BYTE BUDGET (ADR 0008): the sqlite3 wasm (~865 KB raw) must not land in the
 * initial chunk. sqlite-wasm is imported dynamically inside open(), so Vite
 * emits it as a separate lazy chunk that only loads when storage initialises.
 * First paint stays small; see app/scripts/check-size.mjs and the chunk report.
 */

import type {
  ExportEnvelope,
  ImportReport,
  StorageAdapter,
  StoredEvent,
} from "./adapter.js";
import { AlreadyOpenError, META_KEYS } from "./adapter.js";
import { buildEnvelope, compareEvents, planMerge, validateEnvelope } from "./envelope.js";

/**
 * The single-connection lock name. Held for the lifetime of an open adapter via
 * a never-resolving promise inside requestLock; releasing it lets a waiting tab
 * (or a takeover) acquire it. (ADR 0008: "Single connection handled with the
 * Web Locks API".)
 */
const LOCK_NAME = "pinaka-db-connection";

/** OPFS directory the VFS owns. Distinct so other origins/engines never collide. */
const VFS_DIRECTORY = ".pinaka-abhyas";
const DB_FILENAME = "pinaka.sqlite3";

/**
 * Minimal structural view of the bits of @sqlite.org/sqlite-wasm we use. The
 * package ships full .d.mts types; we narrow to what the adapter touches so the
 * dynamic import stays decoupled and the rest of the app never references the
 * heavy module's types directly.
 */
interface SahDb {
  exec(opts: {
    sql: string;
    bind?: unknown[];
    rowMode?: "array" | "object";
    returnValue?: "resultRows";
  }): unknown[];
  close(): void;
}
interface SahPoolUtil {
  OpfsSAHPoolDb: new (filename: string) => SahDb;
}
interface Sqlite3Static {
  installOpfsSAHPoolVfs(opts: {
    directory?: string;
    initialCapacity?: number;
    name?: string;
  }): Promise<SahPoolUtil>;
}

export interface SahpoolAdapterOptions {
  /** Seed meta values written when their key is not already present. */
  readonly meta?: Record<string, string>;
  /**
   * Take over the connection from another tab: steal the Web Lock instead of
   * failing with AlreadyOpenError. The UI's "open in another tab" screen calls
   * open with this set when the student chooses takeover.
   */
  readonly steal?: boolean;
}

/**
 * Acquire the single-connection Web Lock, or signal that another tab holds it.
 *
 * Without `steal`, we request the lock with `ifAvailable: true`: if it is held
 * the callback receives null and we reject with AlreadyOpenError, never
 * blocking. With `steal`, we request `{ steal: true }`, which forcibly breaks
 * any existing hold (the prior holder's lock promise rejects, and it should
 * close). On success we keep the lock by returning a promise that resolves only
 * when `release()` is called, and hand that releaser back to the caller.
 */
function acquireConnectionLock(steal: boolean): Promise<() => void> {
  const locks = navigator.locks;
  if (!locks) {
    // No Web Locks API: single-tab safety cannot be guaranteed, but the floor
    // browsers (ADR 0008) all ship it. Treat absence as "lock granted" rather
    // than blocking storage entirely; index.ts gates on OPFS+sahpool viability.
    return Promise.resolve(() => {});
  }

  return new Promise((resolve, reject) => {
    const options: LockOptions = steal ? { steal: true } : { ifAvailable: true };
    let released = false;
    locks
      .request(LOCK_NAME, options, (lock) => {
        if (lock === null) {
          // ifAvailable and the lock was held: another tab owns the connection.
          reject(new AlreadyOpenError());
          return; // resolving here releases nothing because we never held it.
        }
        // Hold the lock until release() is invoked.
        return new Promise<void>((releaseResolve) => {
          resolve(() => {
            if (!released) {
              released = true;
              releaseResolve();
            }
          });
        });
      })
      .catch((err: unknown) => {
        // A steal causes the *previous* holder's request promise to reject; for
        // our own request, a genuine error should surface.
        if (!released) reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

export class SahpoolAdapter implements StorageAdapter {
  readonly backend = "opfs-sahpool" as const;
  readonly persistent = true;

  private readonly db: SahDb;
  private readonly releaseLock: () => void;
  private closed = false;

  private constructor(db: SahDb, releaseLock: () => void) {
    this.db = db;
    this.releaseLock = releaseLock;
  }

  /**
   * Open the primary backend. Acquires the single-connection lock (throwing
   * AlreadyOpenError if held and not stealing), lazily loads sqlite-wasm,
   * installs the opfs-sahpool VFS, creates the schema, and seeds meta.
   */
  static async open(options: SahpoolAdapterOptions = {}): Promise<SahpoolAdapter> {
    const releaseLock = await acquireConnectionLock(options.steal ?? false);

    let db: SahDb | undefined;
    try {
      // LAZY LOAD: this dynamic import is the boundary that keeps the wasm out
      // of the initial chunk. Vite code-splits the awaited module.
      const sqlite3Module = await import("@sqlite.org/sqlite-wasm");
      const init = sqlite3Module.default as () => Promise<Sqlite3Static>;
      const sqlite3 = await init();

      const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
        directory: VFS_DIRECTORY,
        // Capacity must exceed twice the number of db files (journal/temp).
        // One database file is plenty; 6 gives headroom for journals/temp.
        initialCapacity: 6,
      });

      db = new poolUtil.OpfsSAHPoolDb(DB_FILENAME);
      SahpoolAdapter.createSchema(db);

      const adapter = new SahpoolAdapter(db, releaseLock);
      if (options.meta) adapter.seedMeta(options.meta);
      return adapter;
    } catch (err) {
      // Anything past lock acquisition failed: release the lock and the db so a
      // retry or takeover is not blocked by our partial open.
      if (db) {
        try {
          db.close();
        } catch {
          /* ignore */
        }
      }
      releaseLock();
      throw err;
    }
  }

  async persisted(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.storage?.persisted) return false;
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async appendEvents(events: readonly StoredEvent[]): Promise<void> {
    this.assertOpen();
    if (events.length === 0) return;
    this.db.exec({ sql: "BEGIN" });
    try {
      for (const ev of events) {
        // INSERT OR IGNORE makes the append append-only and idempotent: a row
        // whose event_id already exists is left untouched (PRIMARY KEY).
        this.db.exec({
          sql: "INSERT OR IGNORE INTO events (event_id, occurred_at_ms, payload) VALUES (?, ?, ?)",
          bind: [ev.event_id, ev.occurredAtMs, JSON.stringify(ev)],
        });
      }
      this.db.exec({ sql: "COMMIT" });
    } catch (err) {
      this.db.exec({ sql: "ROLLBACK" });
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async readAllEvents(): Promise<StoredEvent[]> {
    this.assertOpen();
    // ORDER BY the indexed column first, then the primary key, matching the
    // engine's (occurredAtMs, event_id) contract (SPEC 2.1). We re-sort in JS
    // with compareEvents as the single source of ordering truth.
    const rows = this.db.exec({
      sql: "SELECT payload FROM events ORDER BY occurred_at_ms ASC, event_id ASC",
      rowMode: "array",
      returnValue: "resultRows",
    }) as unknown[][];
    const events = rows.map((row) => JSON.parse(row[0] as string) as StoredEvent);
    return events.sort(compareEvents);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMeta(key: string): Promise<string | null> {
    this.assertOpen();
    const rows = this.db.exec({
      sql: "SELECT value FROM meta WHERE key = ?",
      bind: [key],
      rowMode: "array",
      returnValue: "resultRows",
    }) as unknown[][];
    const first = rows[0];
    return first ? (first[0] as string) : null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async setMeta(key: string, value: string): Promise<void> {
    this.assertOpen();
    this.db.exec({
      sql: "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      bind: [key, value],
    });
  }

  async exportEnvelope(): Promise<ExportEnvelope> {
    this.assertOpen();
    const events = await this.readAllEvents();
    return buildEnvelope(await this.envelopeMeta(), events, new Date().toISOString());
  }

  async importEnvelope(env: ExportEnvelope): Promise<ImportReport> {
    this.assertOpen();
    const shapeError = validateEnvelope(env);
    if (shapeError !== null) {
      return {
        added: 0,
        duplicate: 0,
        invalid: 1,
        total: 0,
        invalidReasons: [{ index: -1, reason: shapeError }],
      };
    }
    const existing = await this.readAllEvents();
    const plan = planMerge(env.events, new Set(existing.map((e) => e.event_id)));
    await this.appendEvents(plan.toAdd);
    return {
      added: plan.added,
      duplicate: plan.duplicate,
      invalid: plan.invalid,
      total: plan.total,
      invalidReasons: plan.invalidReasons,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      this.db.close();
    } finally {
      // Release the Web Lock so a waiting tab (or a fresh open) can connect.
      this.releaseLock();
    }
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("SahpoolAdapter is closed.");
  }

  private static createSchema(db: SahDb): void {
    // events: append-only log (ADR 0009). payload is the full uqs-event-2 JSON;
    // event_id and occurred_at_ms are mirrored for the key and the index.
    db.exec({
      sql: `CREATE TABLE IF NOT EXISTS events (
              event_id TEXT PRIMARY KEY,
              occurred_at_ms INTEGER NOT NULL,
              payload TEXT NOT NULL
            )`,
    });
    db.exec({
      sql: "CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at_ms)",
    });
    db.exec({
      sql: `CREATE TABLE IF NOT EXISTS meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )`,
    });
  }

  private seedMeta(meta: Record<string, string>): void {
    for (const [key, value] of Object.entries(meta)) {
      // Seed only when absent so a re-open never clobbers an existing install_id.
      this.db.exec({
        sql: "INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)",
        bind: [key, value],
      });
    }
  }

  private async envelopeMeta(): Promise<{
    app_version: string;
    pack_id: string;
    pack_version: string;
    taxonomy_version: number;
    install_id: string;
  }> {
    const taxRaw = await this.getMeta(META_KEYS.taxonomyVersion);
    return {
      app_version: (await this.getMeta(META_KEYS.appVersion)) ?? "",
      pack_id: (await this.getMeta(META_KEYS.packId)) ?? "",
      pack_version: (await this.getMeta(META_KEYS.packVersion)) ?? "",
      taxonomy_version: taxRaw === null ? 0 : Number(taxRaw),
      install_id: (await this.getMeta(META_KEYS.installId)) ?? "",
    };
  }
}
