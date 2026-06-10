/**
 * Pack distribution manifest: shape and version-comparison logic (W5-4).
 *
 * Binding to ADR 0009 ("Pack identity and versioning" and "Update flow").
 *
 * The offline client fetches this manifest (emitted next to pack.json by
 * packs/ca-foundation-qa/build_and_validate.py) to learn whether a newer,
 * compatible pack exists. This module is pure: no fetch, no storage, no service
 * worker. It defines the manifest shape, parses/validates a candidate, and
 * decides — given the installed manifest, a candidate manifest, and the running
 * app version — whether and how to update. Keeping the decision pure lets the
 * vitest suite exercise every branch in node, with the I/O parts (fetch, staging
 * download, atomic swap) behind the PackUpdatePort interface (port.ts).
 */

/**
 * The manifest as emitted by the pack build. Mirrors the JSON written by
 * build_and_validate.py exactly. `version` is semantic (major = schema/Profile
 * break, minor = new items, patch = errata batch). `content_hashes` maps each
 * item id to its content hash; a changed hash drives the engine's re-score of
 * history (ADR 0009 "Key fixes re-score history").
 */
export interface PackManifest {
  readonly pack_id: string;
  readonly version: string;
  readonly taxonomy_version: number;
  readonly item_count: number;
  readonly min_app_version: string;
  readonly created_at: string;
  readonly content_hashes: Readonly<Record<string, string>>;
}

/** A parsed semantic version. Pre-release/build metadata is intentionally unsupported. */
interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/**
 * Parse a strict `major.minor.patch` string. Returns null on anything else so
 * callers treat a malformed version as "do not update" rather than guessing.
 */
export function parseSemVer(value: string): SemVer | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (m === null) return null;
  // The regex guarantees three captured digit groups; assert non-null for TS.
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** Compare two semvers: negative if a < b, 0 if equal, positive if a > b. */
export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Structural validation of a candidate manifest fetched from the network. We
 * never trust a downloaded blob: a malformed manifest must not crash the update
 * flow or, worse, swap in garbage. Returns null when valid, or a human reason.
 */
export function validateManifest(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "manifest is not an object";
  const m = value as Record<string, unknown>;
  if (typeof m.pack_id !== "string" || m.pack_id.length === 0) return "pack_id must be a non-empty string";
  if (typeof m.version !== "string" || parseSemVer(m.version) === null) {
    return "version must be a semantic major.minor.patch string";
  }
  if (typeof m.taxonomy_version !== "number" || !Number.isInteger(m.taxonomy_version)) {
    return "taxonomy_version must be an integer";
  }
  if (typeof m.item_count !== "number" || !Number.isInteger(m.item_count) || m.item_count < 0) {
    return "item_count must be a non-negative integer";
  }
  if (typeof m.min_app_version !== "string" || parseSemVer(m.min_app_version) === null) {
    return "min_app_version must be a semantic version string";
  }
  if (typeof m.created_at !== "string") return "created_at must be a string";
  if (typeof m.content_hashes !== "object" || m.content_hashes === null) {
    return "content_hashes must be an object";
  }
  const hashes = m.content_hashes as Record<string, unknown>;
  for (const [id, hash] of Object.entries(hashes)) {
    if (typeof hash !== "string" || hash.length === 0) {
      return `content_hashes[${id}] must be a non-empty string`;
    }
  }
  return null;
}

/** The kinds of decision the update logic can reach. */
export type UpdateDecisionKind =
  | "up-to-date" // candidate is same-or-older than installed; nothing to do.
  | "update" // a newer, compatible candidate; download and stage it.
  | "incompatible-pack" // candidate is for a different pack_id; ignore.
  | "incompatible-app" // candidate needs a newer app than is running; cannot update.
  | "invalid"; // candidate failed validation; ignore.

/** A fully explained update decision. The `reason` is student-facing-grade prose. */
export interface UpdateDecision {
  readonly kind: UpdateDecisionKind;
  readonly reason: string;
}

/**
 * Decide what to do given the installed manifest (or null on first install),
 * a validated candidate manifest, and the running app version.
 *
 * Rules (ADR 0009 "Update flow"): only a newer, compatible version updates.
 * Compatibility means same pack_id and min_app_version <= running app version.
 * A candidate equal to or older than what is installed is up-to-date (no
 * downgrades). A candidate for a different pack is ignored. A candidate that
 * needs a newer app surfaces an honest "update the app first" outcome rather
 * than silently failing.
 */
export function decideUpdate(
  installed: PackManifest | null,
  candidate: PackManifest,
  appVersion: string,
): UpdateDecision {
  const candVer = parseSemVer(candidate.version);
  const appVer = parseSemVer(appVersion);
  const minVer = parseSemVer(candidate.min_app_version);
  if (candVer === null || minVer === null) {
    return { kind: "invalid", reason: "Candidate manifest has an unparseable version." };
  }
  if (appVer === null) {
    return { kind: "invalid", reason: `Running app version "${appVersion}" is not a semantic version.` };
  }

  if (installed !== null && candidate.pack_id !== installed.pack_id) {
    return {
      kind: "incompatible-pack",
      reason: `Candidate is for pack "${candidate.pack_id}", but "${installed.pack_id}" is installed.`,
    };
  }

  if (installed !== null) {
    const instVer = parseSemVer(installed.version);
    // A corrupt installed version should not block a clean update; treat it as
    // "older than anything valid" so a valid candidate can heal it.
    if (instVer !== null && compareSemVer(candVer, instVer) <= 0) {
      return {
        kind: "up-to-date",
        reason: `Installed pack v${installed.version} is already current (candidate v${candidate.version}).`,
      };
    }
  }

  if (compareSemVer(minVer, appVer) > 0) {
    return {
      kind: "incompatible-app",
      reason: `Pack v${candidate.version} needs app v${candidate.min_app_version}+, but the app is v${appVersion}. Update the app first.`,
    };
  }

  return {
    kind: "update",
    reason:
      installed === null
        ? `Installing pack v${candidate.version}.`
        : `Updating pack v${installed.version} → v${candidate.version}.`,
  };
}
