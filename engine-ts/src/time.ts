/**
 * Time normalization (SPEC 2.1, W1-2).
 *
 * ISO-8601 inputs parse to epoch milliseconds once, at the boundary. The
 * binding contract: a string WITHOUT an offset is treated as UTC. Events are
 * ordered by (occurredAtMs ascending, event_id ascending), never by string
 * comparison — string sorting reorders mixed-offset instants wrongly, which is
 * one of the audited prototype defects this module exists to prevent.
 */

import type { Event } from "./types.js";

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Parse an ISO-8601 datetime to epoch milliseconds. Naive strings (no offset
 * and no trailing Z) are interpreted as UTC by contract. Returns an integer
 * number of milliseconds. Throws on malformed input rather than silently
 * producing NaN (the prototype crashed on naive datetimes; we parse them).
 */
export function parseIsoToMs(iso: string): number {
  const s = iso.trim();
  const m = ISO_RE.exec(s);
  if (m === null) {
    throw new Error(`time: not an ISO-8601 datetime: ${JSON.stringify(iso)}`);
  }
  const [, yy, mo, dd, hh, mi, ss, frac, off] = m;
  const year = Number(yy);
  const month = Number(mo);
  const day = Number(dd);
  const hour = Number(hh);
  const minute = Number(mi);
  const second = ss === undefined ? 0 : Number(ss);
  // Fractional seconds to milliseconds (pad/truncate to 3 digits).
  const ms = frac === undefined ? 0 : Number((frac + "000").slice(0, 3));

  // Compute the UTC epoch ms for the wall-clock components, then subtract the
  // offset. A naive string (off undefined) means offset 0, i.e. UTC.
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offsetMinutes = off === undefined || off === "Z" ? 0 : parseOffsetMinutes(off);
  return wall - offsetMinutes * 60_000;
}

function parseOffsetMinutes(off: string): number {
  // off is like "+05:30", "-0800", "+0530".
  const sign = off[0] === "-" ? -1 : 1;
  const body = off.slice(1).replace(":", "");
  const h = Number(body.slice(0, 2));
  const mm = Number(body.slice(2, 4) || "0");
  return sign * (h * 60 + mm);
}

/**
 * Event ordering comparator: (occurredAtMs ascending, event_id ascending).
 * Stable and total. This is the only ordering the engine uses; no string-time
 * comparison appears anywhere else.
 */
export function compareEvents(a: Event, b: Event): number {
  if (a.occurredAtMs !== b.occurredAtMs) return a.occurredAtMs - b.occurredAtMs;
  return a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0;
}

/** Return a new array of events in canonical order. Does not mutate the input. */
export function orderEvents(events: readonly Event[]): Event[] {
  return [...events].sort(compareEvents);
}

export const MS_PER_DAY = 86_400_000;
