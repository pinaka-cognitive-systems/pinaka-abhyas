/**
 * createPackSource tests (ADR 0027).
 *
 * DOM-free. Runs over a real storage-backed PackStagingPort (MemoryAdapter,
 * the same fake the pack-update tests use) and a fake PackNetworkPort, so the
 * storage read/write path is exercised for real, not mocked away.
 */

import { describe, expect, it } from "vitest";

import { MemoryAdapter } from "../../src/storage/memory.js";
import { META_KEYS } from "../../src/storage/index.js";
import { createStoragePort } from "../../src/sw/storagePort.js";
import type { PackNetworkPort } from "../../src/sw/port.js";
import type { PackManifest } from "../../src/sw/manifest.js";
import { createPackSource, PackLoadError } from "../../src/pack/source.js";

function manifest(overrides: Partial<PackManifest> = {}): PackManifest {
  return {
    pack_id: "ca-foundation-qa",
    version: "1.0.0",
    taxonomy_version: 4,
    item_count: 2,
    min_app_version: "0.1.0",
    created_at: "2026-06-10T00:00:00Z",
    content_hashes: {},
    ...overrides,
  };
}

function openStorage(): Promise<MemoryAdapter> {
  return MemoryAdapter.open({ snapshot: false });
}

interface FakeNetwork extends PackNetworkPort {
  manifestCalls: number;
  bodyCalls: number;
}

/** A fake network port with call counters and a failure toggle per fetch. */
function fakeNetwork(opts: {
  manifestValue?: unknown;
  body?: string;
  failManifest?: boolean;
  failBody?: boolean;
}): FakeNetwork {
  const port: FakeNetwork = {
    manifestCalls: 0,
    bodyCalls: 0,
    fetchManifest(): Promise<unknown> {
      port.manifestCalls += 1;
      if (opts.failManifest === true) return Promise.reject(new Error("manifest fetch failed"));
      return Promise.resolve(opts.manifestValue ?? manifest());
    },
    fetchPackBody(): Promise<string> {
      port.bodyCalls += 1;
      if (opts.failBody === true) return Promise.reject(new Error("body fetch failed"));
      return Promise.resolve(opts.body ?? '{"items":["b"]}');
    },
  };
  return port;
}

describe("createPackSource — live body present", () => {
  it("returns the parsed live body and makes no network call", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    await storage.writeStaging({ manifest: manifest(), packJson: '{"items":["a"]}' });
    await storage.commitStaging();

    const network = fakeNetwork({});
    const source = createPackSource({ storage, network, isDev: true });

    const result = await source.load();
    expect(result).toEqual({ items: ["a"] });
    expect(network.manifestCalls).toBe(0);
    expect(network.bodyCalls).toBe(0);
  });
});

describe("createPackSource — first load over the network", () => {
  it("fetches, validates, stages and commits, and stamps packId meta", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({ manifestValue: manifest(), body: '{"items":["b"]}' });
    const source = createPackSource({ storage, network, isDev: true });

    const result = await source.load();

    expect(result).toEqual({ items: ["b"] });
    expect(await adapter.getMeta(META_KEYS.packId)).toBe("ca-foundation-qa");
    expect(await storage.readLiveManifest()).not.toBeNull();
    expect(await storage.readLiveBody()).toBe('{"items":["b"]}');
  });
});

describe("createPackSource — network failure", () => {
  it("throws a missing PackLoadError when the manifest fetch rejects", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({ failManifest: true });
    const source = createPackSource({ storage, network, isDev: true });

    await expect(source.load()).rejects.toMatchObject({ kind: "missing" });
  });

  it("throws a missing PackLoadError when the pack body fetch rejects", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({ failBody: true });
    const source = createPackSource({ storage, network, isDev: true });

    await expect(source.load()).rejects.toMatchObject({ kind: "missing" });
  });
});

describe("createPackSource — invalid pack", () => {
  it("throws an invalid PackLoadError when the manifest fails validation", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({ manifestValue: { pack_id: "" } });
    const source = createPackSource({ storage, network, isDev: true });

    await expect(source.load()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("throws an invalid PackLoadError when the pack body does not parse", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({ body: "not json" });
    const source = createPackSource({ storage, network, isDev: true });

    await expect(source.load()).rejects.toMatchObject({ kind: "invalid" });
  });
});

describe("createPackSource — memoization", () => {
  it("shares one network call across two concurrent load() calls", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    const network = fakeNetwork({});
    const source = createPackSource({ storage, network, isDev: true });

    const [a, b] = await Promise.all([source.load(), source.load()]);

    expect(a).toEqual(b);
    expect(network.manifestCalls).toBe(1);
    expect(network.bodyCalls).toBe(1);
  });

  it("retries on the next call after a rejection", async () => {
    const adapter = await openStorage();
    const storage = createStoragePort(adapter);
    let fail = true;
    let calls = 0;
    const network: PackNetworkPort = {
      fetchManifest(): Promise<unknown> {
        calls += 1;
        if (fail) return Promise.reject(new Error("offline"));
        return Promise.resolve(manifest());
      },
      fetchPackBody(): Promise<string> {
        return Promise.resolve('{"items":["c"]}');
      },
    };
    const source = createPackSource({ storage, network, isDev: true });

    await expect(source.load()).rejects.toBeInstanceOf(PackLoadError);

    fail = false;
    const result = await source.load();

    expect(result).toEqual({ items: ["c"] });
    expect(calls).toBe(2);
  });
});
