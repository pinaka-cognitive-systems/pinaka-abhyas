/**
 * Settings flow logic (W5-5 flow e, test requirement 5). DOM-free.
 *
 * Pins the pure decisions and the storage round-trip:
 *   - export envelope round-trip through a real MemoryAdapter,
 *   - import preview math (new/dup/invalid) via the SAME planMerge the commit
 *     runs, so preview == report,
 *   - idempotency: a re-import previews and commits zero added,
 *   - settings status selectors (storage / install / version / exam),
 *   - the export filename and Web-Share decision,
 *   - update-surface state mapping from the updater's UpdaterState, including
 *     the deferred state a held mock guard produces.
 *
 * No jsdom: the storage layer runs in node (memory backend, snapshot disabled),
 * and the updater is driven with fakes (the W5-4 port pattern).
 */

import { describe, expect, it } from "vitest";

import { MemoryAdapter } from "../../src/storage/memory.js";
import { META_KEYS } from "../../src/storage/adapter.js";
import { makeEvent } from "../storage/contract.js";
import {
  canShareFile,
  exportEventCount,
  exportFilename,
  isDeleteConfirmed,
  isFileError,
  parseEnvelopeText,
  previewImport,
  serializeEnvelope,
  settingsStatus,
  updateView,
} from "../../src/flows/settings/logic.js";
import { PackUpdater } from "../../src/sw/updater.js";
import type { PackManifest } from "../../src/sw/manifest.js";
import type { PackNetworkPort, PackStagingPort, StagedPack } from "../../src/sw/port.js";
import type { ExportEnvelope } from "../../src/storage/adapter.js";

const SEED_META = {
  [META_KEYS.appVersion]: "0.1.0",
  [META_KEYS.packId]: "ca-foundation-qa",
  [META_KEYS.packVersion]: "1.0.0",
  [META_KEYS.taxonomyVersion]: "2",
  [META_KEYS.installId]: "install-test-0001",
};

const open = (meta?: Record<string, string>): Promise<MemoryAdapter> =>
  MemoryAdapter.open({ snapshot: false, ...(meta ? { meta } : {}) });

// ---------------------------------------------------------------------------
// Export round-trip + filename + share decision.
// ---------------------------------------------------------------------------

describe("export round-trip through a real MemoryAdapter", () => {
  it("exports the events, counts them, and re-imports into a fresh adapter", async () => {
    const a = await open(SEED_META);
    await a.appendEvents([makeEvent({ event_id: "e1" }), makeEvent({ event_id: "e2" })]);
    const env = await a.exportEnvelope();
    expect(exportEventCount(env)).toBe(2);

    // The serialised file parses back to a valid envelope.
    const text = serializeEnvelope(env);
    const parsed = parseEnvelopeText(text);
    expect(isFileError(parsed)).toBe(false);

    const b = await open(SEED_META);
    const report = await b.importEnvelope(env);
    expect(report.added).toBe(2);
    expect((await b.readAllEvents()).map((e) => e.event_id)).toEqual(["e1", "e2"]);
  });
});

describe("exportFilename", () => {
  it("uses pinaka-abhyas-progress-<date>.json from the UTC date", () => {
    expect(exportFilename("2026-06-10T08:30:00.000Z")).toBe("pinaka-abhyas-progress-2026-06-10.json");
  });
  it("falls back to a parse when the prefix is not a plain date", () => {
    expect(exportFilename("not-a-date")).toBe("pinaka-abhyas-progress.json");
  });
});

describe("canShareFile", () => {
  it("requires both share and canShare", () => {
    expect(canShareFile({ hasShare: true, hasCanShare: true })).toBe(true);
    expect(canShareFile({ hasShare: true, hasCanShare: false })).toBe(false);
    expect(canShareFile({ hasShare: false, hasCanShare: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Import preview math + idempotency.
// ---------------------------------------------------------------------------

describe("import preview math", () => {
  it("classifies new, duplicate, and invalid against the current log", async () => {
    const a = await open(SEED_META);
    await a.appendEvents([makeEvent({ event_id: "existing" })]);
    const existingIds = new Set((await a.readAllEvents()).map((e) => e.event_id));

    // Build an envelope with one new, one duplicate, one invalid record.
    const base = await a.exportEnvelope();
    const env: ExportEnvelope = {
      ...base,
      events: [
        makeEvent({ event_id: "new1" }),
        makeEvent({ event_id: "existing" }),
        { event_id: "" } as never, // invalid: empty id
      ],
    };
    const preview = previewImport(env, existingIds);
    expect(preview.total).toBe(3);
    expect(preview.added).toBe(1);
    expect(preview.duplicate).toBe(1);
    expect(preview.invalid).toBe(1);
  });

  it("preview equals the committed report", async () => {
    const a = await open(SEED_META);
    await a.appendEvents([makeEvent({ event_id: "existing" })]);
    const base = await a.exportEnvelope();
    const env: ExportEnvelope = {
      ...base,
      events: [makeEvent({ event_id: "new1" }), makeEvent({ event_id: "existing" })],
    };
    const existingIds = new Set((await a.readAllEvents()).map((e) => e.event_id));
    const preview = previewImport(env, existingIds);
    const report = await a.importEnvelope(env);
    expect(report.added).toBe(preview.added);
    expect(report.duplicate).toBe(preview.duplicate);
    expect(report.invalid).toBe(preview.invalid);
    expect(report.total).toBe(preview.total);
  });

  it("re-import is idempotent: a second preview and commit add zero", async () => {
    const a = await open(SEED_META);
    await a.appendEvents([makeEvent({ event_id: "e1" }), makeEvent({ event_id: "e2" })]);
    const env = await a.exportEnvelope();

    // First import into a fresh device adds both.
    const b = await open(SEED_META);
    const first = await b.importEnvelope(env);
    expect(first.added).toBe(2);

    // A re-import previews zero new, and committing changes nothing.
    const ids = new Set((await b.readAllEvents()).map((e) => e.event_id));
    const preview = previewImport(env, ids);
    expect(preview.added).toBe(0);
    expect(preview.duplicate).toBe(2);
    const second = await b.importEnvelope(env);
    expect(second.added).toBe(0);
    expect((await b.readAllEvents())).toHaveLength(2);
  });

  it("rejects a non-envelope file as a file error", () => {
    expect(isFileError(parseEnvelopeText("not json"))).toBe(true);
    expect(isFileError(parseEnvelopeText(JSON.stringify({ format_version: 9 })))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Status selectors.
// ---------------------------------------------------------------------------

describe("settingsStatus", () => {
  it("maps the persistent sahpool backend", () => {
    const s = settingsStatus({
      backend: "opfs-sahpool",
      persisted: true,
      standalone: true,
      appVersion: "0.1.0",
      packVersion: "1.0.0",
      examAttempt: "september",
    });
    expect(s.storage).toBe("persistent");
    expect(s.installed).toBe(true);
    expect(s.appVersion).toBe("0.1.0");
    expect(s.packVersion).toBe("1.0.0");
    expect(s.examAttempt).toBe("september");
  });

  it("maps a sahpool backend without persistence grant to not-persisted", () => {
    const s = settingsStatus({
      backend: "opfs-sahpool",
      persisted: false,
      standalone: false,
      appVersion: "0.1.0",
      packVersion: "1.0.0",
      examAttempt: "undecided",
    });
    expect(s.storage).toBe("not-persisted");
    expect(s.installed).toBe(false);
  });

  it("maps the memory backend to degraded regardless of persisted()", () => {
    const s = settingsStatus({
      backend: "memory",
      persisted: true,
      standalone: false,
      appVersion: "",
      packVersion: "",
      examAttempt: "undecided",
    });
    expect(s.storage).toBe("degraded");
    // Blank seed placeholders read as unknown (null), not as an empty version.
    expect(s.appVersion).toBeNull();
    expect(s.packVersion).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Danger-zone confirm.
// ---------------------------------------------------------------------------

describe("isDeleteConfirmed", () => {
  it("matches the exact word, trimming surrounding spaces only", () => {
    expect(isDeleteConfirmed("DELETE", "DELETE")).toBe(true);
    expect(isDeleteConfirmed("  DELETE  ", "DELETE")).toBe(true);
    expect(isDeleteConfirmed("delete", "DELETE")).toBe(false);
    expect(isDeleteConfirmed("DELETE ALL", "DELETE")).toBe(false);
    expect(isDeleteConfirmed("", "DELETE")).toBe(false);
  });
});

describe("clearAll wipes the log the export backs up", () => {
  it("export then clearAll then export shows the data gone", async () => {
    const a = await open(SEED_META);
    await a.appendEvents([makeEvent({ event_id: "e1" })]);
    expect(exportEventCount(await a.exportEnvelope())).toBe(1);
    await a.clearAll();
    expect(exportEventCount(await a.exportEnvelope())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Update-surface state mapping (driven through a real PackUpdater + fakes).
// ---------------------------------------------------------------------------

const MANIFEST_V1: PackManifest = {
  pack_id: "ca-foundation-qa",
  version: "1.0.0",
  taxonomy_version: 2,
  item_count: 24,
  min_app_version: "0.1.0",
  created_at: "2026-06-10T00:00:00.000Z",
  content_hashes: {},
};
const MANIFEST_V2: PackManifest = { ...MANIFEST_V1, version: "1.1.0" };

/** A staging port over an in-memory slot, for the update tests. */
function fakeStaging(initialLive: PackManifest | null): PackStagingPort {
  let live = initialLive;
  let staged: StagedPack | null = null;
  return {
    readLiveManifest: () => Promise.resolve(live),
    readStaging: () => Promise.resolve(staged),
    writeStaging: (s) => {
      staged = s;
      return Promise.resolve();
    },
    commitStaging: () => {
      if (staged) live = staged.manifest;
      staged = null;
      return Promise.resolve();
    },
    clearStaging: () => {
      staged = null;
      return Promise.resolve();
    },
  };
}

function fakeNetwork(manifest: unknown, body: string): PackNetworkPort {
  return {
    fetchManifest: () => Promise.resolve(manifest),
    fetchPackBody: () => Promise.resolve(body),
  };
}

describe("updateView state mapping", () => {
  it("initial idle shows just the button; a post-check idle is the offline note", () => {
    expect(updateView({ phase: "idle" }, false)).toEqual({ kind: "idle" });
    expect(updateView({ phase: "idle" }, true)).toEqual({ kind: "offline" });
  });

  it("checking and downloading map through", () => {
    expect(updateView({ phase: "checking" }, true).kind).toBe("checking");
    expect(updateView({ phase: "downloading", toVersion: "1.1.0" }, true)).toEqual({
      kind: "downloading",
      toVersion: "1.1.0",
    });
  });

  it("a no-op up-to-date decision maps to up-to-date", () => {
    expect(
      updateView({ phase: "noop", decision: { kind: "up-to-date", reason: "x" } }, true).kind,
    ).toBe("up-to-date");
  });

  it("a no-op incompatible-app decision maps to incompatible-app", () => {
    expect(
      updateView({ phase: "noop", decision: { kind: "incompatible-app", reason: "x" } }, true).kind,
    ).toBe("incompatible-app");
  });

  it("an applied state carries the errata note through", async () => {
    const updater = new PackUpdater({
      network: fakeNetwork(MANIFEST_V2, JSON.stringify({ errata: ["Fixed item 9 key."] })),
      staging: fakeStaging(MANIFEST_V1),
      appVersion: "0.1.0",
      extractErrata: (s) => {
        const parsed = JSON.parse(s.packJson) as { errata?: string[] };
        return parsed.errata ?? [];
      },
    });
    const state = await updater.checkForUpdate();
    const view = updateView(state, true);
    expect(view.kind).toBe("applied");
    if (view.kind === "applied") {
      expect(view.note.toVersion).toBe("1.1.0");
      expect(view.note.errata).toEqual(["Fixed item 9 key."]);
    }
  });

  it("a held mock guard defers the swap (the deferred display state)", async () => {
    const updater = new PackUpdater({
      network: fakeNetwork(MANIFEST_V2, "{}"),
      staging: fakeStaging(MANIFEST_V1),
      appVersion: "0.1.0",
      mockGuard: { isMockInProgress: () => true },
    });
    const state = await updater.checkForUpdate();
    const view = updateView(state, true);
    expect(view.kind).toBe("deferred");
    if (view.kind === "deferred") expect(view.toVersion).toBe("1.1.0");
  });

  it("an offline check returns to idle, which maps to the offline note", async () => {
    const updater = new PackUpdater({
      network: {
        fetchManifest: () => Promise.reject(new Error("offline")),
        fetchPackBody: () => Promise.reject(new Error("offline")),
      },
      staging: fakeStaging(MANIFEST_V1),
      appVersion: "0.1.0",
    });
    const state = await updater.checkForUpdate();
    expect(state.phase).toBe("idle");
    expect(updateView(state, true).kind).toBe("offline");
  });
});
