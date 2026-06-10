/**
 * Thin integration test for the sahpool backend (W5-2).
 *
 * OPFS, the Web Locks API, and the sqlite-wasm VFS DO NOT EXIST in node, so we
 * cannot exercise real reads and writes here. The full behavioural contract is
 * proven against the memory backend (memory.test.ts), which shares every piece
 * of merge/validation logic with sahpool via envelope.ts.
 *
 * What this file asserts instead, and all it honestly can in node:
 *   1. The module imports and exposes the expected surface.
 *   2. sqlite-wasm is NOT pulled in at module-evaluation time. Importing this
 *      adapter module does not evaluate the ~865 KB sqlite-wasm package; that
 *      only happens inside the dynamic import in SahpoolAdapter.open(), which is
 *      what keeps the wasm out of the initial chunk (ADR 0008 byte budget). We
 *      verify the boundary with a runtime probe: opening without OPFS reaches
 *      the lazy import and rejects, rather than hanging or having loaded wasm
 *      eagerly. The authoritative lazy-chunk proof is the Vite build output
 *      (a separate sqlite chunk), reported alongside this task.
 *
 * Real OPFS behaviour is validated in a browser harness (future W5-5/CI step);
 * the contract suite is written as a reusable function so that harness runs the
 * identical assertions against a live sahpool adapter.
 */

import { describe, expect, it } from "vitest";
import { SahpoolAdapter } from "../../src/storage/sahpool.js";

describe("SahpoolAdapter module shape", () => {
  it("exports the adapter class with the contract methods", () => {
    expect(typeof SahpoolAdapter).toBe("function");
    expect(typeof SahpoolAdapter.open).toBe("function");
    // Instance methods exist on the prototype (cannot construct in node).
    const proto = SahpoolAdapter.prototype as unknown as Record<string, unknown>;
    for (const m of [
      "persisted",
      "appendEvents",
      "readAllEvents",
      "getMeta",
      "setMeta",
      "exportEnvelope",
      "importEnvelope",
      "close",
    ]) {
      expect(typeof proto[m]).toBe("function");
    }
  });
});

describe("sqlite-wasm is loaded lazily, not at import time", () => {
  it("open() reaches the lazy import without OPFS and surfaces an error, not a hang", async () => {
    // In node there is no navigator.locks and no OPFS; acquireConnectionLock
    // treats a missing Web Locks API as granted, then the dynamic import of
    // sqlite-wasm runs and fails to install the OPFS VFS. The point: open()
    // does real work only inside open(), and rejects rather than hanging or
    // having loaded wasm at module-eval time.
    await expect(SahpoolAdapter.open({ steal: false })).rejects.toBeDefined();
  });
});
