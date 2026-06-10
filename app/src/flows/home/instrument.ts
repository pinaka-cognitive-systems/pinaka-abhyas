/**
 * Beta instrumentation for the return-rate gate (W5-9 "Instrumentation").
 *
 * Spec: "Locally, in storage meta only (nothing leaves the device): per-day
 * flags of which mechanism was on the screen when a session started (today
 * card, delta line, re-entry card, reminder fired). The beta's manual
 * check-ins read these from the student's export with consent. This is the
 * per-mechanism return-rate measurement the gate demands, with zero telemetry."
 *
 * Storage shape: one meta key, `adherence_log`, holding a JSON object keyed by
 * UTC calendar day (YYYY-MM-DD) -> a small flag record. A day's record is the
 * UNION of mechanisms seen that day (a session started can be recorded more
 * than once per day; the flags stay true). Nothing here ever leaves the device
 * on its own; the export reader (below) is the ONLY way a flag is surfaced, and
 * only when the student exports and shares with consent.
 *
 * Pure logic + the meta seam. No React.
 */

import type { StorageAdapter } from "../../storage/index.js";

/** The single meta key the per-day flags live under. */
export const ADHERENCE_META_KEY = "adherence_log";

/** Which mechanism was on the screen when a session started. */
export interface DayFlags {
  /** The today card was shown (always true when a session starts from home). */
  readonly todayCard: boolean;
  /** The delta line was above the today card. */
  readonly deltaLine: boolean;
  /** The re-entry card led (gap >= 7 days). */
  readonly reentry: boolean;
  /** A reminder had fired (the student's own alarm). */
  readonly reminderFired: boolean;
}

/** The on-device log: UTC day (YYYY-MM-DD) -> flags. */
export type AdherenceLog = Readonly<Record<string, DayFlags>>;

const EMPTY_FLAGS: DayFlags = {
  todayCard: false,
  deltaLine: false,
  reentry: false,
  reminderFired: false,
};

/** The UTC calendar day (YYYY-MM-DD) for an epoch-ms instant. Pure. */
export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Parse a stored log string; tolerant of absent/corrupt values (returns {}). */
export function parseLog(raw: string | null): AdherenceLog {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, DayFlags> = {};
    for (const [day, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== "object" || v === null) continue;
      const r = v as Record<string, unknown>;
      out[day] = {
        todayCard: r.todayCard === true,
        deltaLine: r.deltaLine === true,
        reentry: r.reentry === true,
        reminderFired: r.reminderFired === true,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Fold a session-start observation into the log: OR the given flags onto the
 * day's record (so a day accumulates every mechanism seen that day). Pure;
 * returns a new log.
 */
export function recordDay(
  log: AdherenceLog,
  day: string,
  flags: Partial<DayFlags>,
): AdherenceLog {
  const prev = log[day] ?? EMPTY_FLAGS;
  const next: DayFlags = {
    todayCard: prev.todayCard || flags.todayCard === true,
    deltaLine: prev.deltaLine || flags.deltaLine === true,
    reentry: prev.reentry || flags.reentry === true,
    reminderFired: prev.reminderFired || flags.reminderFired === true,
  };
  return { ...log, [day]: next };
}

/**
 * Persist a session-start observation for the UTC day of `nowMs`. Reads the
 * current log, ORs the flags on, writes it back. Idempotent within a day for
 * the same flags.
 */
export async function recordSessionStart(
  adapter: StorageAdapter,
  nowMs: number,
  flags: Partial<DayFlags>,
): Promise<void> {
  const log = parseLog(await adapter.getMeta(ADHERENCE_META_KEY));
  const next = recordDay(log, utcDay(nowMs), flags);
  await adapter.setMeta(ADHERENCE_META_KEY, JSON.stringify(next));
}

/**
 * The export reader (spec: "a tiny reader included in the export envelope
 * automatically"). Reads the per-day flags from the adapter's meta store via
 * the public getMeta surface and returns the instrumentation block, shaped so a
 * beta check-in can read return-rate per mechanism directly.
 *
 * IMPORTANT (flagged in the task report): the closed ExportEnvelope type
 * (storage/adapter.ts) carries only the five envelope meta keys plus events; it
 * does NOT carry arbitrary meta, so the adherence log does not ride out in the
 * standard export file today. Rather than silently widen the closed envelope
 * type (outside this task's touch scope), this reader is the seam: the beta
 * check-in calls readInstrumentation(adapter) on the student's device with
 * consent, OR a one-line adapter change can attach this block to the envelope
 * later. The shape below is export-ready for that.
 */
export interface InstrumentationBlock {
  /** Schema marker so a future envelope attachment is self-describing. */
  readonly kind: "adherence";
  readonly version: 1;
  readonly days: AdherenceLog;
}

/** Read the instrumentation block from a live adapter. */
export async function readInstrumentation(
  adapter: StorageAdapter,
): Promise<InstrumentationBlock> {
  const days = parseLog(await adapter.getMeta(ADHERENCE_META_KEY));
  return { kind: "adherence", version: 1, days };
}
