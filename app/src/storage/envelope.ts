/**
 * Envelope validation and merge logic, shared by both backends (W5-2).
 *
 * Implemented once here so the sahpool and memory adapters agree exactly on
 * what a valid event is, how the envelope is shaped, and how a merge resolves.
 * The contract suite tests this through both adapters.
 */

import type { Event } from "@pinaka/engine";
import type { ExportEnvelope, StoredEvent } from "./adapter.js";

/**
 * Validate one record as a StoredEvent (the engine's runtime Event). Returns
 * null when valid, or a human reason when not. We check the fields the engine
 * reads and that the storage layer relies on for keying and ordering; opaque
 * extra fields are allowed (forward-compatibility with later event versions).
 */
export function validateEvent(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "not an object";
  const e = value as Record<string, unknown>;

  if (typeof e.event_id !== "string" || e.event_id.length === 0) {
    return "event_id must be a non-empty string";
  }
  if (typeof e.occurredAtMs !== "number" || !Number.isFinite(e.occurredAtMs)) {
    return "occurredAtMs must be a finite number";
  }
  if (typeof e.item_id !== "string" || e.item_id.length === 0) {
    return "item_id must be a non-empty string";
  }
  if (typeof e.item_content_hash !== "string") {
    return "item_content_hash must be a string";
  }
  if (typeof e.taxonomy_version !== "number" || !Number.isInteger(e.taxonomy_version)) {
    return "taxonomy_version must be an integer";
  }
  if (!Array.isArray(e.tests) || !e.tests.every((t) => typeof t === "string")) {
    return "tests must be an array of strings";
  }
  if (typeof e.correct !== "boolean") {
    return "correct must be a boolean";
  }
  if (typeof e.time_ms !== "number" || !Number.isFinite(e.time_ms)) {
    return "time_ms must be a finite number";
  }
  return null;
}

/**
 * Stable comparator: ascending by occurredAtMs, then by event_id string
 * (SPEC 2.1). Never compares by wall clock or insertion order.
 */
export function compareEvents(a: StoredEvent, b: StoredEvent): number {
  if (a.occurredAtMs !== b.occurredAtMs) return a.occurredAtMs - b.occurredAtMs;
  return a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0;
}

/** Shape of an export envelope (structural check before merge). */
export function validateEnvelope(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "envelope is not an object";
  const env = value as Record<string, unknown>;
  if (env.format_version !== 1) return "unsupported format_version (expected 1)";
  if (typeof env.exported_at !== "string") return "exported_at must be a string";
  if (typeof env.app_version !== "string") return "app_version must be a string";
  if (typeof env.pack_id !== "string") return "pack_id must be a string";
  if (typeof env.pack_version !== "string") return "pack_version must be a string";
  if (typeof env.taxonomy_version !== "number") return "taxonomy_version must be a number";
  if (typeof env.install_id !== "string") return "install_id must be a string";
  if (!Array.isArray(env.events)) return "events must be an array";
  return null;
}

/**
 * Compute a merge plan against an existing set of event ids. Pure: does no I/O.
 * Each adapter applies the plan to its own store, then returns the report.
 *
 * @param incoming the envelope's events
 * @param existingIds the set of event_ids already in the log
 */
export function planMerge(
  incoming: readonly unknown[],
  existingIds: ReadonlySet<string>,
): {
  toAdd: StoredEvent[];
  added: number;
  duplicate: number;
  invalid: number;
  total: number;
  invalidReasons: { index: number; reason: string }[];
} {
  const toAdd: StoredEvent[] = [];
  const invalidReasons: { index: number; reason: string }[] = [];
  let duplicate = 0;
  // Track ids added within this same envelope so an envelope that lists the
  // same event_id twice counts the second as a duplicate, not a second add.
  const seen = new Set<string>(existingIds);

  incoming.forEach((record, index) => {
    const reason = validateEvent(record);
    if (reason !== null) {
      invalidReasons.push({ index, reason });
      return;
    }
    const event = record as Event;
    if (seen.has(event.event_id)) {
      duplicate += 1;
      return;
    }
    seen.add(event.event_id);
    toAdd.push(event);
  });

  return {
    toAdd,
    added: toAdd.length,
    duplicate,
    invalid: invalidReasons.length,
    total: incoming.length,
    invalidReasons,
  };
}

/** Assemble an envelope from a meta lookup and the full, ordered event list. */
export function buildEnvelope(
  meta: {
    app_version: string;
    pack_id: string;
    pack_version: string;
    taxonomy_version: number;
    install_id: string;
  },
  events: readonly StoredEvent[],
  nowIso: string,
): ExportEnvelope {
  return {
    format_version: 1,
    exported_at: nowIso,
    app_version: meta.app_version,
    pack_id: meta.pack_id,
    pack_version: meta.pack_version,
    taxonomy_version: meta.taxonomy_version,
    install_id: meta.install_id,
    events: [...events].sort(compareEvents),
  };
}
