/**
 * First-run meta persistence (W5-5 flow d).
 *
 * The first run records two facts in the storage meta key/value store
 * (adapter.getMeta/setMeta): whether the run has been completed (so the router
 * sends a returning student straight to practice), and the chosen exam attempt
 * (which the engine consumes as examMs).
 *
 * These keys are first-run-owned and live ALONGSIDE the envelope META_KEYS in
 * storage/adapter.ts; they are intentionally not part of the export envelope
 * (an exam attempt is a per-device preference, not study history).
 *
 * `getExamMs` is the one exported seam the practice flow uses to feed the engine
 * its exam horizon. The practice flow must NOT read meta itself; it calls this
 * helper. See the reviewer flag in the report.
 */

import type { StorageAdapter } from "../../storage/index.js";
import { attemptToExamMs, parseAttempt, type ExamAttempt } from "./machine.js";

/** First-run-owned meta keys. Plain strings; values are plain strings. */
export const FIRSTRUN_META_KEYS = {
  /** "true" once the welcome -> storage sequence has been seen (or skipped). */
  completed: "firstrun_completed",
  /** The chosen attempt: "september" | "january" | "undecided". */
  examAttempt: "exam_attempt",
} as const;

/** Record that the first run is complete. Idempotent. */
export async function markFirstRunComplete(adapter: StorageAdapter): Promise<void> {
  await adapter.setMeta(FIRSTRUN_META_KEYS.completed, "true");
}

/** Whether the first run has been completed on this device. */
export async function isFirstRunComplete(adapter: StorageAdapter): Promise<boolean> {
  return (await adapter.getMeta(FIRSTRUN_META_KEYS.completed)) === "true";
}

/** Persist the chosen exam attempt. */
export async function setExamAttempt(
  adapter: StorageAdapter,
  attempt: ExamAttempt,
): Promise<void> {
  await adapter.setMeta(FIRSTRUN_META_KEYS.examAttempt, attempt);
}

/** Read the stored exam attempt, defaulting to "undecided" when unset/corrupt. */
export async function getExamAttempt(adapter: StorageAdapter): Promise<ExamAttempt> {
  return parseAttempt(await adapter.getMeta(FIRSTRUN_META_KEYS.examAttempt));
}

/**
 * The engine seam: read the stored exam attempt and resolve it to the engine's
 * `examMs` (epoch ms), or undefined for the "undecided" / unset path.
 *
 * The practice flow calls this and threads the result into its
 * buildEngineState(events, bank, nowMs, examMs) calls, so the scheduler caps
 * due dates against the real exam horizon (engine SPEC 4). This is the ONLY
 * supported way for a flow to obtain examMs from storage.
 */
export async function getExamMs(adapter: StorageAdapter): Promise<number | undefined> {
  return attemptToExamMs(await getExamAttempt(adapter));
}
