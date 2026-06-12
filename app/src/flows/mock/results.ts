/**
 * Completed mock result persistence (results.ts).
 *
 * A finished mock result is stored alongside the engine event log so the
 * breakdown and review are reachable after the student leaves the page and
 * returns. The record bundles the scored session plus the before/after readiness
 * snapshots, because the "before" state cannot be reconstructed cheaply from the
 * log after the fact (all events are now post-mock).
 *
 * Storage: a single meta key holds a JSON array, newest-first, capped at 3.
 * The cap keeps storage bounded; older results are pruned when a new one is
 * appended. Three records cover any realistic review window. (Note: the current
 * cap of 3 is intentionally conservative — the design shows all past results,
 * but until the store is backed by sqlite-wasm/OPFS rather than a meta-value
 * the 3-record cap avoids unbounded growth. Raise it when the storage layer
 * switches to an indexed table.)
 *
 * Schema versioning (additive):
 *   schema 1 (initial): id, seed, order, answers, flagged, struck, etc.
 *   schema 2 (additive): adds summary { net, correct, wrong, skipped, penalty,
 *     denominator, type }. Records written by v1 builds lack this field; parse
 *     skips them gracefully (never guessed at).
 *
 * Serialization style follows state.ts exactly: serialize returns a JSON string,
 * parse returns a typed array or [] on any malformed input. A bad write can never
 * wedge the app.
 *
 * Pure and DOM-free. All boundary values (timestamps) are parameters.
 */

import type { Readiness } from "@pinaka/engine";
import type { MockType } from "../../engine/insights.js";
import type { MockSession } from "./state.js";

/** The storage meta key for the completed-results list. */
export const MOCK_RESULTS_META_KEY = "mock_results_v1";

/** Schema version embedded in each record to allow forward-compatible migration. */
const SCHEMA_VERSION = 2 as const;

/**
 * Score summary added in schema 2. Stored inline so the hub and breakdown can
 * render without re-running scoreMock on every page load.
 */
export interface MockSummary {
  readonly net: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly penalty: number;
  /** Marks possible on the paper (numQuestions * marksPerCorrect). */
  readonly denominator: number;
  readonly type: MockType;
}

/** One persisted completed mock result. */
export interface MockResultRecord {
  /** Schema version. Currently 2. */
  readonly schema: 2;
  /** Wall-clock epoch ms when the mock was submitted. */
  readonly finishedAtMs: number;
  /** The full submitted session (answers, order, seed, etc.). */
  readonly session: MockSession;
  /** Readiness estimate before the mock events were appended. */
  readonly before: Readiness;
  /** Readiness estimate after the mock events were appended. */
  readonly after: Readiness;
  /** Score summary (schema 2). Absent on records written before schema 2. */
  readonly summary: MockSummary;
}

/** Maximum number of results stored. Oldest are pruned first. */
const MAX_RESULTS = 3;

/** Serialize the results list to its storage meta string. */
export function serializeResults(list: readonly MockResultRecord[]): string {
  return JSON.stringify(list);
}

/**
 * Parse a stored results list, or [] when the value is absent, malformed, or
 * the wrong schema. Records written before schema 2 (missing `summary`) are
 * skipped — we never guess at a summary that was not stored. A bad value is
 * treated as an empty list so a corrupt write never blocks the app.
 */
export function parseResults(raw: string | null): MockResultRecord[] {
  if (raw === null || raw === "") return [];
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(v)) return [];
  const out: MockResultRecord[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    // Accept schema 2 only; skip (with grace) older schema-1 records.
    if (
      o.schema !== SCHEMA_VERSION ||
      typeof o.finishedAtMs !== "number" ||
      typeof o.session !== "object" || o.session === null ||
      typeof o.before !== "object" || o.before === null ||
      typeof o.after !== "object" || o.after === null ||
      typeof o.summary !== "object" || o.summary === null
    ) {
      continue;
    }
    out.push(item as MockResultRecord);
  }
  return out;
}

/**
 * Append a new result to the front of the list (newest-first) and cap the list
 * at MAX_RESULTS. Pure: returns a new array; does not mutate the input.
 */
export function appendResult(
  list: readonly MockResultRecord[],
  record: MockResultRecord,
): MockResultRecord[] {
  return [record, ...list].slice(0, MAX_RESULTS);
}

/**
 * Format a finishedAtMs timestamp as a human-readable date string in the style
 * "11 Jun 2026". Pure; relies on Intl when available and a simple fallback
 * otherwise. No locale dependency beyond the month abbreviation table.
 *
 * @deprecated Prefer relativeDate from engine/insights.ts for the hub display.
 * This function is kept for any callers that need an absolute date string.
 */
export function formatResultDate(finishedAtMs: number): string {
  const d = new Date(finishedAtMs);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
