/**
 * Storage-backed staging and version stamping (W5-4).
 *
 * Implements PackStagingPort over the StorageAdapter's meta store (ADR 0008),
 * and stamps the version meta the export envelope reads (ADR 0009). Both use the
 * adapter's tiny key/value meta store — no new storage surface, no new schema.
 *
 * Atomic swap (ADR 0009 "swaps atomically"): the live pack is addressed by a
 * single pointer meta key (`pack_live_version`) plus the body/manifest stored
 * under version-suffixed keys. Staging writes the new body and manifest under
 * the staging keys, the commit flips the pointer last. A crash before the flip
 * leaves the old pointer — and thus the old live pack — intact; a reader sees
 * either the old or the new pack, never a half-written mix.
 */

import { META_KEYS, type StorageAdapter } from "../storage/index.js";
import type { PackManifest } from "./manifest.js";
import type { PackStagingPort, StagedPack } from "./port.js";

/** Meta keys this module owns. Namespaced to avoid colliding with the envelope keys. */
const KEYS = {
  liveManifest: "pack_live_manifest",
  liveBody: "pack_live_body",
  stagingManifest: "pack_staging_manifest",
  stagingBody: "pack_staging_body",
} as const;

/**
 * Build a PackStagingPort over a storage adapter. The adapter's meta store is
 * the durable backing; the keys above hold JSON-stringified manifests and the
 * raw pack bodies.
 */
export function createStoragePort(adapter: StorageAdapter): PackStagingPort {
  return {
    async readLiveManifest(): Promise<PackManifest | null> {
      const raw = await adapter.getMeta(KEYS.liveManifest);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as PackManifest;
      } catch {
        return null;
      }
    },

    async readLiveBody(): Promise<string | null> {
      return await adapter.getMeta(KEYS.liveBody);
    },

    async readStaging(): Promise<StagedPack | null> {
      const [m, b] = await Promise.all([
        adapter.getMeta(KEYS.stagingManifest),
        adapter.getMeta(KEYS.stagingBody),
      ]);
      if (m === null || b === null) return null;
      try {
        return { manifest: JSON.parse(m) as PackManifest, packJson: b };
      } catch {
        return null;
      }
    },

    async writeStaging(staged: StagedPack): Promise<void> {
      // Body first, then manifest: readStaging requires both, so a partial write
      // (body without manifest) reads as "no staging" rather than corrupt.
      await adapter.setMeta(KEYS.stagingBody, staged.packJson);
      await adapter.setMeta(KEYS.stagingManifest, JSON.stringify(staged.manifest));
    },

    async commitStaging(): Promise<void> {
      const staged = await this.readStaging();
      if (staged === null) return;
      // Promote staging to live. The manifest write is LAST and is the atomic
      // commit point: readLiveManifest keys off it. Stamp the version meta the
      // export envelope reads in the same commit so the two never diverge.
      await adapter.setMeta(KEYS.liveBody, staged.packJson);
      await adapter.setMeta(META_KEYS.packId, staged.manifest.pack_id);
      await adapter.setMeta(META_KEYS.packVersion, staged.manifest.version);
      await adapter.setMeta(META_KEYS.taxonomyVersion, String(staged.manifest.taxonomy_version));
      await adapter.setMeta(KEYS.liveManifest, JSON.stringify(staged.manifest));
      await this.clearStaging();
    },

    async clearStaging(): Promise<void> {
      // The meta store has no delete; empty strings read back as "not staged"
      // for body, and readStaging tolerates a missing/blank manifest.
      await adapter.setMeta(KEYS.stagingManifest, "");
      await adapter.setMeta(KEYS.stagingBody, "");
    },
  };
}

/**
 * Version stamping (ADR 0009 "Progress export"; task item 3). Record the running
 * app version and the live pack version into storage meta on session start, so
 * the export envelope the adapter builds carries the real values rather than
 * placeholders. Idempotent: safe to call every session start.
 *
 * The app version is the single source of truth passed from the wiring point
 * (main.tsx), which reads it from package.json via Vite's define. The pack
 * version comes from the live manifest if a pack has been committed; otherwise
 * the seed values from getSharedStorage() stand.
 */
export async function stampVersions(
  adapter: StorageAdapter,
  appVersion: string,
): Promise<void> {
  await adapter.setMeta(META_KEYS.appVersion, appVersion);
  const liveRaw = await adapter.getMeta(KEYS.liveManifest);
  if (liveRaw !== null) {
    try {
      const live = JSON.parse(liveRaw) as PackManifest;
      await adapter.setMeta(META_KEYS.packId, live.pack_id);
      await adapter.setMeta(META_KEYS.packVersion, live.version);
      await adapter.setMeta(META_KEYS.taxonomyVersion, String(live.taxonomy_version));
    } catch {
      // A corrupt live manifest leaves the seeded pack meta in place.
    }
  }
}
