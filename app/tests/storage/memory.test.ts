/**
 * Memory backend: run the full shared adapter contract against it (W5-2).
 *
 * Node environment: there is no IndexedDB here, so snapshotting is disabled and
 * the backend stays purely in-memory. The contract suite (contract.ts) is the
 * single source of behavioural truth; this file just wires the memory adapter
 * into it and adds a couple of memory-specific capability assertions.
 */

import { describe, expect, it } from "vitest";
import { MemoryAdapter } from "../../src/storage/memory.js";
import { runAdapterContract } from "./contract.js";

runAdapterContract("MemoryAdapter", (meta) =>
  MemoryAdapter.open({ snapshot: false, ...(meta ? { meta } : {}) }),
);

describe("MemoryAdapter capability flags", () => {
  it("reports the memory backend and never persistent", async () => {
    const a = await MemoryAdapter.open({ snapshot: false });
    expect(a.backend).toBe("memory");
    expect(a.persistent).toBe(false);
    expect(await a.persisted()).toBe(false);
    await a.close();
  });

  it("close is safe to call more than once", async () => {
    const a = await MemoryAdapter.open({ snapshot: false });
    await a.close();
    await expect(a.close()).resolves.toBeUndefined();
  });
});
