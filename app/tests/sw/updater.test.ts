/**
 * Update state machine + staging swap semantics + mid-mock guard (W5-4).
 *
 * Runs in node: the I/O is behind the PackNetworkPort (a fake here) and the
 * PackStagingPort (the real storage-backed port over the in-memory adapter), so
 * the orchestration logic is exercised end-to-end without a browser or a
 * service worker. This is the "logic tests run in node, SW parts behind an
 * interface" requirement.
 */

import { describe, expect, it } from "vitest";
import { MemoryAdapter } from "../../src/storage/memory.js";
import { META_KEYS } from "../../src/storage/index.js";
import type { StorageAdapter } from "../../src/storage/index.js";
import type { PackManifest } from "../../src/sw/manifest.js";
import type { MockGuard, PackNetworkPort } from "../../src/sw/port.js";
import { createStoragePort, stampVersions } from "../../src/sw/storagePort.js";
import { PackUpdater, type UpdaterState } from "../../src/sw/updater.js";
import { extractErrataFromBody } from "../../src/sw/network.js";

function manifest(version: string, overrides: Partial<PackManifest> = {}): PackManifest {
  return {
    pack_id: "ca-foundation-qa",
    version,
    taxonomy_version: 4,
    item_count: 82,
    min_app_version: "0.1.0",
    created_at: "2026-06-10T00:00:00Z",
    content_hashes: {},
    ...overrides,
  };
}

/** A fake network port serving a fixed manifest and body, with failure toggles. */
function fakeNetwork(opts: {
  manifestValue: unknown;
  body?: string;
  failManifest?: boolean;
  failBody?: boolean;
}): PackNetworkPort {
  return {
    fetchManifest: () =>
      opts.failManifest ? Promise.reject(new Error("offline")) : Promise.resolve(opts.manifestValue),
    fetchPackBody: () =>
      opts.failBody ? Promise.reject(new Error("offline")) : Promise.resolve(opts.body ?? "{}"),
  };
}

async function newAdapter(): Promise<StorageAdapter> {
  return MemoryAdapter.open({ snapshot: false, meta: { pack_id: "ca-foundation-qa" } });
}

describe("PackUpdater: fresh install", () => {
  it("downloads, stages, commits, and surfaces an applied note", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    const cand = manifest("1.0.0");
    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: cand, body: JSON.stringify({ items: [], errata: ["fixed X"] }) }),
      staging,
      appVersion: "0.1.0",
      extractErrata: extractErrataFromBody,
    });

    const states: UpdaterState[] = [];
    updater.subscribe((s) => states.push(s));

    const end = await updater.checkForUpdate();
    expect(end.phase).toBe("applied");
    if (end.phase === "applied") {
      expect(end.note.fromVersion).toBeNull();
      expect(end.note.toVersion).toBe("1.0.0");
      expect(end.note.errata).toEqual(["fixed X"]);
    }
    // Observed the full progression.
    expect(states.map((s) => s.phase)).toEqual(["checking", "downloading", "applied"]);

    // Live pack meta was stamped by the commit (atomic swap promoted staging).
    expect(await adapter.getMeta(META_KEYS.packVersion)).toBe("1.0.0");
    await adapter.close();
  });
});

describe("PackUpdater: version handshake outcomes", () => {
  it("reports up-to-date and never swaps when the candidate is not newer", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    // Seed a live pack at 1.0.0.
    await staging.writeStaging({ manifest: manifest("1.0.0"), packJson: "{}" });
    await staging.commitStaging();

    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: manifest("1.0.0") }),
      staging,
      appVersion: "0.1.0",
    });
    const end = await updater.checkForUpdate();
    expect(end.phase).toBe("noop");
    if (end.phase === "noop") expect(end.decision.kind).toBe("up-to-date");
    await adapter.close();
  });

  it("returns silently to idle when offline (manifest fetch fails)", async () => {
    const adapter = await newAdapter();
    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: null, failManifest: true }),
      staging: createStoragePort(adapter),
      appVersion: "0.1.0",
    });
    expect((await updater.checkForUpdate()).phase).toBe("idle");
    await adapter.close();
  });

  it("rejects an invalid downloaded manifest", async () => {
    const adapter = await newAdapter();
    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: { pack_id: "x", version: "bad" } }),
      staging: createStoragePort(adapter),
      appVersion: "0.1.0",
    });
    const end = await updater.checkForUpdate();
    expect(end.phase).toBe("noop");
    if (end.phase === "noop") expect(end.decision.kind).toBe("invalid");
    await adapter.close();
  });

  it("does not commit when the pack body download fails", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: manifest("1.0.0"), failBody: true }),
      staging,
      appVersion: "0.1.0",
    });
    expect((await updater.checkForUpdate()).phase).toBe("idle");
    // No live pack was committed.
    expect(await staging.readLiveManifest()).toBeNull();
    await adapter.close();
  });
});

describe("PackUpdater: mid-mock guard (ADR 0009 'no update mid-mock')", () => {
  it("defers the swap while a mock is in progress, then applies it after", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    let mockRunning = true;
    const guard: MockGuard = { isMockInProgress: () => mockRunning };

    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: manifest("1.0.0"), body: "{}" }),
      staging,
      appVersion: "0.1.0",
      mockGuard: guard,
    });

    const deferred = await updater.checkForUpdate();
    expect(deferred.phase).toBe("deferred");
    // Crucially: nothing swapped while the mock is live.
    expect(await staging.readLiveManifest()).toBeNull();
    // But the candidate is durably staged, ready to apply.
    expect(await staging.readStaging()).not.toBeNull();

    // Mock ends; flushing applies the staged swap.
    mockRunning = false;
    const applied = await updater.applyPending();
    expect(applied.phase).toBe("applied");
    expect((await staging.readLiveManifest())?.version).toBe("1.0.0");
    await adapter.close();
  });

  it("applyPending is a no-op when nothing is staged", async () => {
    const adapter = await newAdapter();
    const updater = new PackUpdater({
      network: fakeNetwork({ manifestValue: manifest("1.0.0") }),
      staging: createStoragePort(adapter),
      appVersion: "0.1.0",
    });
    expect((await updater.applyPending()).phase).toBe("idle");
    await adapter.close();
  });
});

describe("staging swap is atomic at the manifest-pointer level", () => {
  it("a body write without a committed manifest does not change the live pack", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    // Commit a real live pack at 1.0.0.
    await staging.writeStaging({ manifest: manifest("1.0.0"), packJson: '{"v":1}' });
    await staging.commitStaging();
    expect((await staging.readLiveManifest())?.version).toBe("1.0.0");

    // Begin staging 2.0.0 but DO NOT commit (simulates a crash mid-download).
    await staging.writeStaging({ manifest: manifest("2.0.0"), packJson: '{"v":2}' });
    // Live pointer still names the old version: a reader sees 1.0.0, never a mix.
    expect((await staging.readLiveManifest())?.version).toBe("1.0.0");
    await adapter.close();
  });
});

describe("stampVersions records app + live pack version (ADR 0009)", () => {
  it("writes the app version and mirrors the live pack version into meta", async () => {
    const adapter = await newAdapter();
    const staging = createStoragePort(adapter);
    await staging.writeStaging({ manifest: manifest("3.1.4"), packJson: "{}" });
    await staging.commitStaging();

    await stampVersions(adapter, "0.2.0");
    expect(await adapter.getMeta(META_KEYS.appVersion)).toBe("0.2.0");
    expect(await adapter.getMeta(META_KEYS.packVersion)).toBe("3.1.4");
    expect(await adapter.getMeta(META_KEYS.taxonomyVersion)).toBe("4");

    // The export envelope now carries the real values, not placeholders.
    const env = await adapter.exportEnvelope();
    expect(env.app_version).toBe("0.2.0");
    expect(env.pack_version).toBe("3.1.4");
    await adapter.close();
  });
});

describe("extractErrataFromBody", () => {
  it("returns top errata strings from the pack body", () => {
    const body = JSON.stringify({ items: [], errata: ["a", "b", "c", "d", "e", "f"] });
    expect(extractErrataFromBody({ manifest: manifest("1.0.0"), packJson: body }, 3)).toEqual(["a", "b", "c"]);
  });
  it("tolerates a missing or malformed errata field", () => {
    expect(extractErrataFromBody({ manifest: manifest("1.0.0"), packJson: "{}" })).toEqual([]);
    expect(extractErrataFromBody({ manifest: manifest("1.0.0"), packJson: "not json" })).toEqual([]);
  });
});
