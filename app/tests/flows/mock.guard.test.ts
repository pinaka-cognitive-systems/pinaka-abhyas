/**
 * Mock guard tests (W5-7, test requirement 6).
 *
 * DOM-free. Asserts the ADR 0009 contract that no pack swap happens mid-mock:
 * the guard reads false outside a mock, true while held, and false again after
 * release; and that the real PackUpdater DEFERS a staged swap while the guard is
 * held and APPLIES it once released. This is the load-bearing cross-cutting
 * state between the mock flow and the updater.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  acquireMockGuard,
  isMockInProgress,
  mockGuard,
  releaseMockGuard,
} from "../../src/flows/mock/guard.js";
import { PackUpdater } from "../../src/sw/updater.js";
import type { PackManifest } from "../../src/sw/manifest.js";
import type { PackNetworkPort, PackStagingPort, StagedPack } from "../../src/sw/port.js";

afterEach(() => {
  releaseMockGuard(); // never leak guard state across tests
});

describe("mock guard flag", () => {
  it("is false outside a mock, true while held, false after release", () => {
    expect(isMockInProgress()).toBe(false);
    acquireMockGuard();
    expect(isMockInProgress()).toBe(true);
    expect(mockGuard.isMockInProgress()).toBe(true);
    releaseMockGuard();
    expect(isMockInProgress()).toBe(false);
    expect(mockGuard.isMockInProgress()).toBe(false);
  });

  it("is idempotent on repeated acquire/release", () => {
    acquireMockGuard();
    acquireMockGuard();
    expect(isMockInProgress()).toBe(true);
    releaseMockGuard();
    releaseMockGuard();
    expect(isMockInProgress()).toBe(false);
  });
});

// --- A fake updater rig: a newer compatible pack is available to download. ---
const CANDIDATE: PackManifest = {
  pack_id: "ca-foundation-qa",
  version: "1.1.0",
  taxonomy_version: 4,
  item_count: 82,
  content_hashes: {},
  created_at: "2026-06-10T00:00:00Z",
  min_app_version: "0.0.0",
};

function rig(): { updater: PackUpdater; staging: FakeStaging } {
  const network: PackNetworkPort = {
    fetchManifest: async () => CANDIDATE,
    fetchPackBody: async () => '{"items":[]}',
  };
  const staging = new FakeStaging();
  const updater = new PackUpdater({
    network,
    staging,
    appVersion: "1.0.0",
    mockGuard, // the real shared guard
  });
  return { updater, staging };
}

class FakeStaging implements PackStagingPort {
  live: PackManifest | null = { ...CANDIDATE, version: "1.0.0", item_count: 81 };
  staged: StagedPack | null = null;
  committed = false;
  async readLiveManifest(): Promise<PackManifest | null> {
    return this.live;
  }
  async readStaging(): Promise<StagedPack | null> {
    return this.staged;
  }
  async writeStaging(s: StagedPack): Promise<void> {
    this.staged = s;
  }
  async commitStaging(): Promise<void> {
    this.committed = true;
    if (this.staged) this.live = this.staged.manifest;
    this.staged = null;
  }
  async clearStaging(): Promise<void> {
    this.staged = null;
  }
}

describe("PackUpdater honors the mock guard", () => {
  it("defers a swap while a mock is in progress, then applies it after release", async () => {
    const { updater, staging } = rig();
    acquireMockGuard();

    const deferred = await updater.checkForUpdate();
    expect(deferred.phase).toBe("deferred");
    expect(staging.committed).toBe(false); // the live pack did not change mid-mock

    // The mock ends: release the guard and flush the deferred swap.
    releaseMockGuard();
    const applied = await updater.applyPending();
    expect(applied.phase).toBe("applied");
    expect(staging.committed).toBe(true);
    expect(staging.live?.version).toBe("1.1.0");
  });

  it("applies immediately when no mock is in progress", async () => {
    const { updater, staging } = rig();
    const result = await updater.checkForUpdate();
    expect(result.phase).toBe("applied");
    expect(staging.committed).toBe(true);
  });
});
