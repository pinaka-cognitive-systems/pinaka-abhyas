/**
 * The one pack loader (ADR 0027).
 *
 * The question pack is a static data file, not a bundled module. This module
 * reads it through the same ports the pack update flow uses
 * (app/src/sw/port.ts): a PackStagingPort backed by storage, and a
 * PackNetworkPort backed by HTTP. Both the engine loader (engine/caPack.ts)
 * and the practice-content loader (flows/practice/content.ts) call
 * loadRawPack(), so there is exactly one place that decides where the pack
 * comes from.
 *
 * On first load, no pack is staged yet, so this fetches the manifest and the
 * pack body over HTTP, validates the manifest, commits both to storage as the
 * live pack, and returns the parsed body. On every later load, the live body
 * already in storage is read and parsed; no network call is made. This is the
 * same commit the settings "check for updates" flow uses, so the two never
 * disagree about where the pack lives.
 */

import { getSharedStorage } from "../storage/index.js";
import { createHttpPort, DEFAULT_PACK_LOCATION } from "../sw/network.js";
import { createStoragePort } from "../sw/storagePort.js";
import { validateManifest, type PackManifest } from "../sw/manifest.js";
import type { PackNetworkPort, PackStagingPort } from "../sw/port.js";

/** Why a pack load failed. "missing" means no pack could be found or fetched.
 * "invalid" means a pack was found but its content does not parse or does not
 * pass validation. */
export type PackLoadErrorKind = "missing" | "invalid";

/** Thrown when the pack cannot be loaded. `kind` names the failure class;
 * `message` is the text a screen can show the student. */
export class PackLoadError extends Error {
  readonly kind: PackLoadErrorKind;

  constructor(kind: PackLoadErrorKind, message: string) {
    super(message);
    this.name = "PackLoadError";
    this.kind = kind;
  }
}

function missingMessage(isDev: boolean): string {
  return isDev
    ? "No question pack was found. Run bash tools/dev.sh from the repository root, then reload."
    : "The question pack could not be loaded. Check your connection and reload.";
}

function invalidMessage(reason: string): string {
  return `The question pack is not valid: ${reason}.`;
}

/** What createPackSource needs to do its job. */
export interface PackSourceDeps {
  readonly storage: PackStagingPort;
  readonly network: PackNetworkPort;
  /** True in the dev server, false in a production build. Only changes the
   * wording of the "missing" message. */
  readonly isDev: boolean;
}

/** A pack source: one method, `load()`, that returns the parsed pack. */
export interface PackSource {
  load(): Promise<unknown>;
}

/**
 * Build a pack source over a staging port and a network port.
 *
 * `load()` is memoized on the in-flight promise: two concurrent calls make
 * one network call (or one storage read) and share the result. A rejection
 * clears the memo, so the next call after a failure tries again from scratch
 * rather than replaying the same rejection forever.
 */
export function createPackSource(deps: PackSourceDeps): PackSource {
  let inFlight: Promise<unknown> | null = null;

  async function run(): Promise<unknown> {
    const liveBody = await deps.storage.readLiveBody();
    if (liveBody !== null) {
      try {
        return JSON.parse(liveBody) as unknown;
      } catch (err) {
        throw new PackLoadError(
          "invalid",
          invalidMessage(err instanceof Error ? err.message : "the stored pack is not valid JSON"),
        );
      }
    }

    let manifest: unknown;
    try {
      manifest = await deps.network.fetchManifest();
    } catch {
      throw new PackLoadError("missing", missingMessage(deps.isDev));
    }

    const manifestError = validateManifest(manifest);
    if (manifestError !== null) {
      throw new PackLoadError("invalid", invalidMessage(manifestError));
    }

    let body: string;
    try {
      body = await deps.network.fetchPackBody();
    } catch {
      throw new PackLoadError("missing", missingMessage(deps.isDev));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      throw new PackLoadError(
        "invalid",
        invalidMessage(err instanceof Error ? err.message : "the pack body is not valid JSON"),
      );
    }

    // The manifest passed validateManifest above, so this cast is safe.
    await deps.storage.writeStaging({ manifest: manifest as PackManifest, packJson: body });
    await deps.storage.commitStaging();
    return parsed;
  }

  return {
    load(): Promise<unknown> {
      if (inFlight === null) {
        inFlight = run().catch((err: unknown) => {
          inFlight = null;
          throw err;
        });
      }
      return inFlight;
    },
  };
}

let cached: Promise<unknown> | null = null;

async function buildDefault(): Promise<unknown> {
  const { adapter } = await getSharedStorage();
  const source = createPackSource({
    storage: createStoragePort(adapter),
    network: createHttpPort(DEFAULT_PACK_LOCATION),
    isDev: import.meta.env.DEV,
  });
  return source.load();
}

/**
 * Load the pack through the default, real ports: shared storage and HTTP at
 * DEFAULT_PACK_LOCATION. Memoized at module level; a rejection clears the
 * memo so the next call retries (the same pattern as loadAppSnapshot in
 * state/appData.ts).
 */
export function loadRawPack(): Promise<unknown> {
  if (cached === null) {
    cached = buildDefault().catch((err: unknown) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
