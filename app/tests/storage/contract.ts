/**
 * Shared storage-adapter contract suite (W5-2).
 *
 * Any StorageAdapter implementation must pass this suite. It is run against the
 * memory backend here (node environment; OPFS does not exist in node, so the
 * sahpool backend gets a separate thin integration test asserting module shape
 * and lazy-load behaviour only — see sahpool.test.ts).
 *
 * The suite is a function so a future jsdom/browser harness can run the very
 * same assertions against a real sahpool adapter without copying anything.
 */

import { describe, expect, it } from "vitest";
import type { StorageAdapter, StoredEvent } from "../../src/storage/adapter.js";
import { META_KEYS } from "../../src/storage/adapter.js";

/** A minimal valid stored event for tests. */
export function makeEvent(overrides: Partial<StoredEvent> & Pick<StoredEvent, "event_id">): StoredEvent {
  return {
    occurredAtMs: 1_700_000_000_000,
    item_id: "arn_caf_qa_000001",
    item_content_hash: "hash-abc",
    taxonomy_version: 2,
    tests: ["qa.ratio.basic"],
    difficulty_label: "L2",
    item_type: "single_best",
    mode: "practice",
    correct: true,
    selected_misconception: null,
    time_ms: 42_000,
    resurfaced: false,
    ...overrides,
  };
}

const SEED_META = {
  [META_KEYS.appVersion]: "0.1.0",
  [META_KEYS.packId]: "ca-foundation-qa",
  [META_KEYS.packVersion]: "1.0.0",
  [META_KEYS.taxonomyVersion]: "2",
  [META_KEYS.installId]: "install-test-0001",
};

/**
 * Run the full contract against a freshly-opened adapter. `open` returns a new,
 * empty adapter each call (the memory backend with snapshotting disabled so
 * cases never bleed into each other).
 */
export function runAdapterContract(
  label: string,
  open: (meta?: Record<string, string>) => Promise<StorageAdapter>,
): void {
  describe(`StorageAdapter contract: ${label}`, () => {
    it("starts empty and reports capability flags", async () => {
      const a = await open();
      expect(await a.readAllEvents()).toEqual([]);
      expect(typeof a.backend).toBe("string");
      expect(typeof a.persistent).toBe("boolean");
      expect(typeof (await a.persisted())).toBe("boolean");
      await a.close();
    });

    it("appends events and reads them back", async () => {
      const a = await open();
      await a.appendEvents([makeEvent({ event_id: "e1" }), makeEvent({ event_id: "e2" })]);
      const all = await a.readAllEvents();
      expect(all.map((e) => e.event_id)).toEqual(["e1", "e2"]);
      await a.close();
    });

    it("is append-only and idempotent on event_id", async () => {
      const a = await open();
      await a.appendEvents([makeEvent({ event_id: "e1", correct: true })]);
      // Re-appending the same id is a no-op: the first write wins, never updated.
      await a.appendEvents([makeEvent({ event_id: "e1", correct: false })]);
      const all = await a.readAllEvents();
      expect(all).toHaveLength(1);
      expect(all[0]?.correct).toBe(true);
      await a.close();
    });

    it("preserves (occurredAtMs, event_id) ordering regardless of insert order", async () => {
      const a = await open();
      await a.appendEvents([
        makeEvent({ event_id: "z", occurredAtMs: 200 }),
        makeEvent({ event_id: "a", occurredAtMs: 100 }),
        makeEvent({ event_id: "b", occurredAtMs: 100 }), // tie -> event_id breaks it
        makeEvent({ event_id: "m", occurredAtMs: 300 }),
      ]);
      const order = (await a.readAllEvents()).map((e) => `${e.occurredAtMs}:${e.event_id}`);
      expect(order).toEqual(["100:a", "100:b", "200:z", "300:m"]);
      await a.close();
    });

    it("stores and retrieves meta, upserting", async () => {
      const a = await open();
      expect(await a.getMeta("k")).toBeNull();
      await a.setMeta("k", "v1");
      expect(await a.getMeta("k")).toBe("v1");
      await a.setMeta("k", "v2");
      expect(await a.getMeta("k")).toBe("v2");
      await a.close();
    });

    it("retains the raw response field round-trip (ADR 0009 re-score input)", async () => {
      const a = await open();
      const response = { selected_option_id: "B", entered: null };
      await a.appendEvents([makeEvent({ event_id: "e1", response })]);
      const back = (await a.readAllEvents())[0];
      expect(back?.response).toEqual(response);
      await a.close();
    });

    it("exports an envelope with the exact ADR 0009 shape", async () => {
      const a = await open(SEED_META);
      await a.appendEvents([makeEvent({ event_id: "e1" })]);
      const env = await a.exportEnvelope();
      expect(env.format_version).toBe(1);
      expect(typeof env.exported_at).toBe("string");
      expect(env.app_version).toBe("0.1.0");
      expect(env.pack_id).toBe("ca-foundation-qa");
      expect(env.pack_version).toBe("1.0.0");
      expect(env.taxonomy_version).toBe(2);
      expect(env.install_id).toBe("install-test-0001");
      expect(env.events.map((e) => e.event_id)).toEqual(["e1"]);
      // No stray keys: the envelope is exactly the eight documented fields.
      expect(Object.keys(env).sort()).toEqual(
        [
          "app_version",
          "events",
          "exported_at",
          "format_version",
          "install_id",
          "pack_id",
          "pack_version",
          "taxonomy_version",
        ].sort(),
      );
      await a.close();
    });

    it("round-trips export then import into a fresh adapter", async () => {
      const a = await open(SEED_META);
      await a.appendEvents([makeEvent({ event_id: "e1" }), makeEvent({ event_id: "e2" })]);
      const env = await a.exportEnvelope();
      await a.close();

      const b = await open(SEED_META);
      const report = await b.importEnvelope(env);
      expect(report.added).toBe(2);
      expect(report.duplicate).toBe(0);
      expect(report.invalid).toBe(0);
      expect(report.total).toBe(2);
      expect((await b.readAllEvents()).map((e) => e.event_id)).toEqual(["e1", "e2"]);
      await b.close();
    });

    it("re-import of the same envelope is idempotent (never destructive)", async () => {
      const a = await open(SEED_META);
      await a.appendEvents([makeEvent({ event_id: "e1" })]);
      const env = await a.exportEnvelope();

      const first = await a.importEnvelope(env);
      expect(first.added).toBe(0); // already present
      expect(first.duplicate).toBe(1);
      const second = await a.importEnvelope(env);
      expect(second.added).toBe(0);
      expect(second.duplicate).toBe(1);
      expect(await a.readAllEvents()).toHaveLength(1);
      await a.close();
    });

    it("merges two device histories with overlapping events", async () => {
      // Device A: e1, e2. Device B: e2, e3. Merge B into A -> e1, e2, e3.
      const a = await open(SEED_META);
      await a.appendEvents([makeEvent({ event_id: "e1", occurredAtMs: 100 }), makeEvent({ event_id: "e2", occurredAtMs: 200 })]);

      const b = await open(SEED_META);
      await b.appendEvents([makeEvent({ event_id: "e2", occurredAtMs: 200 }), makeEvent({ event_id: "e3", occurredAtMs: 300 })]);
      const envB = await b.exportEnvelope();
      await b.close();

      const report = await a.importEnvelope(envB);
      expect(report.added).toBe(1); // only e3 is new
      expect(report.duplicate).toBe(1); // e2 overlaps
      expect((await a.readAllEvents()).map((e) => e.event_id)).toEqual(["e1", "e2", "e3"]);
      await a.close();
    });

    it("counts invalid records without writing them and never aborts valid ones", async () => {
      const a = await open(SEED_META);
      const env = await a.exportEnvelope();
      const dirty = {
        ...env,
        events: [
          makeEvent({ event_id: "good1" }),
          { event_id: "", occurredAtMs: 1 } as unknown as StoredEvent, // empty id
          { nonsense: true } as unknown as StoredEvent, // missing everything
          makeEvent({ event_id: "good2" }),
        ],
      };
      const report = await a.importEnvelope(dirty);
      expect(report.added).toBe(2);
      expect(report.invalid).toBe(2);
      expect(report.total).toBe(4);
      expect(report.invalidReasons).toHaveLength(2);
      expect((await a.readAllEvents()).map((e) => e.event_id)).toEqual(["good1", "good2"]);
      await a.close();
    });

    it("rejects a structurally invalid envelope as one invalid record", async () => {
      const a = await open(SEED_META);
      const report = await a.importEnvelope({ format_version: 9 } as never);
      expect(report.added).toBe(0);
      expect(report.invalid).toBe(1);
      expect(report.invalidReasons[0]?.reason).toContain("format_version");
      await a.close();
    });

    it("counts a within-envelope duplicate id only once", async () => {
      const a = await open(SEED_META);
      const env = await a.exportEnvelope();
      const dup = {
        ...env,
        events: [makeEvent({ event_id: "x" }), makeEvent({ event_id: "x" })],
      };
      const report = await a.importEnvelope(dup);
      expect(report.added).toBe(1);
      expect(report.duplicate).toBe(1);
      await a.close();
    });

    it("clearAll wipes events and meta and leaves the adapter reusable", async () => {
      const a = await open(SEED_META);
      await a.appendEvents([makeEvent({ event_id: "e1" }), makeEvent({ event_id: "e2" })]);
      await a.setMeta("k", "v");
      await a.clearAll();
      // Everything is gone.
      expect(await a.readAllEvents()).toEqual([]);
      expect(await a.getMeta("k")).toBeNull();
      expect(await a.getMeta(META_KEYS.installId)).toBeNull();
      // Still open: a fresh write works against the empty log.
      await a.appendEvents([makeEvent({ event_id: "e3" })]);
      expect((await a.readAllEvents()).map((e) => e.event_id)).toEqual(["e3"]);
      await a.close();
    });

    it("rejects operations after close", async () => {
      const a = await open();
      await a.close();
      await expect(a.readAllEvents()).rejects.toThrow();
    });
  });
}
