/**
 * HTTP network port and the errata extractor for the pack update flow (W5-4).
 *
 * The real PackNetworkPort: fetch the manifest and pack body over HTTP from the
 * deployed pack location. These are network-only fetches with cache: "no-store"
 * so a version check always hits the network when online (the service worker's
 * runtime cache serves the bytes offline; the manifest check is the freshness
 * probe, ADR 0009 "When online, the service worker fetches the pack manifest").
 */

import type { PackNetworkPort, StagedPack } from "./port.js";

/** Where the deployed pack and its manifest live, relative to the app origin. */
export interface PackLocation {
  /** URL of pack.manifest.json (the ADR 0009 distribution manifest). */
  readonly manifestUrl: string;
  /** URL of pack.json (the pack body the engine loads). */
  readonly packUrl: string;
}

/** Build the HTTP network port for a given deployed pack location. */
export function createHttpPort(location: PackLocation): PackNetworkPort {
  return {
    async fetchManifest(): Promise<unknown> {
      const res = await fetch(location.manifestUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
      return (await res.json()) as unknown;
    },
    async fetchPackBody(): Promise<string> {
      const res = await fetch(location.packUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`pack fetch failed: ${res.status}`);
      return await res.text();
    },
  };
}

/**
 * Extract the top errata lines a staged pack ships, for the student-visible
 * update note (ADR 0009: "errata notes name what was wrong"). The pack body may
 * carry an `errata` array (top ERRATA.md entries, embedded at build/serve time);
 * we pass through the first `max` entries. Defensive: any shape but a string
 * array yields no notes rather than throwing — a missing changelog must never
 * break a swap.
 *
 * The pack build does not yet embed errata into pack.json; until it does this
 * yields []. The mechanism is in place per the task; W5-5 renders it and a
 * later pack-build change can populate the `errata` field.
 */
export function extractErrataFromBody(staged: StagedPack, max = 5): readonly string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(staged.packJson);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const errata = (parsed as Record<string, unknown>).errata;
  if (!Array.isArray(errata)) return [];
  return errata.filter((line): line is string => typeof line === "string").slice(0, max);
}
