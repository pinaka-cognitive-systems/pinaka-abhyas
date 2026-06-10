/**
 * Baseline meta persistence (W5-8).
 *
 * The cold-start baseline is shown at most once. After a student completes it
 * OR opts out ("I would rather just practise"), a flag is set so the baseline
 * never reappears — neither completing nor skipping should drop them back into
 * an onboarding loop on the next launch.
 *
 * The flag lives in the storage meta key/value store alongside the first-run
 * keys (firstrun/meta.ts). It is intentionally a per-device preference, not
 * study history, so — like the exam attempt — it is NOT part of the export
 * envelope: importing a progress file onto a fresh device should still let that
 * device's owner see the baseline once if they have no local events.
 */

import type { StorageAdapter } from "../../storage/index.js";

/** Baseline-owned meta key. Plain string value. */
export const BASELINE_META_KEYS = {
  /** "true" once the baseline has been completed or skipped on this device. */
  done: "baseline_done",
} as const;

/** Record that the baseline is done (completed or skipped). Idempotent. */
export async function markBaselineDone(adapter: StorageAdapter): Promise<void> {
  await adapter.setMeta(BASELINE_META_KEYS.done, "true");
}

/** Whether the baseline has already been completed or skipped on this device. */
export async function isBaselineDone(adapter: StorageAdapter): Promise<boolean> {
  return (await adapter.getMeta(BASELINE_META_KEYS.done)) === "true";
}

/**
 * The handoff decision: should this student see the baseline now?
 *
 * Pure given the two facts the router can cheaply read — whether the baseline
 * flag is set, and how many events the student already has. A student sees the
 * baseline only when it has NOT been done AND they have zero history (a returning
 * student, or one who imported progress, skips straight past it). Splitting the
 * decision out keeps the router thin and the condition unit-testable DOM-free.
 */
export function shouldShowBaseline(args: {
  readonly baselineDone: boolean;
  readonly eventCount: number;
}): boolean {
  return !args.baselineDone && args.eventCount === 0;
}
