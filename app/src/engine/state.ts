/**
 * Engine state assembly (W5-3).
 *
 * The single seam between the storage adapter's persisted event log and the
 * certified engine. The event log is the source of truth (ADR 0009); this
 * module rebuilds derived state by replaying it. No derived state is ever
 * persisted as authoritative — it is recomputed here on every load.
 *
 * This layer is deliberately THIN: it forwards to `replay` from @pinaka/engine
 * and adds nothing of its own to the math. The golden-vector replay suite
 * (app/tests/engine/vectors.test.ts) re-runs every committed engine vector
 * THROUGH this function, so any drift between this glue and the certified
 * engine fails CI loudly.
 */

import { replay, type Bank, type EngineState, type ReplayOptions } from "@pinaka/engine";
import type { StoredEvent } from "../storage/index.js";

/**
 * Rebuild engine state from the persisted event log.
 *
 * `events` is the storage adapter's `StoredEvent[]` — which IS the engine's
 * `Event` shape (storage stores the whole engine `Event` as the payload; see
 * storage/adapter.ts `StoredEvent = Event`). No reshaping is needed, so this
 * forwards directly. The adapter already guarantees (occurredAtMs asc,
 * event_id asc) ordering, and replay re-orders defensively regardless.
 *
 * @param events  the full event log (StoredEvent === engine Event).
 * @param bank    the current item bank (from the loaded pack).
 * @param nowMs   the read clock, epoch ms. A parameter, never Date.now (SPEC 9).
 * @param examMs  the exam date, epoch ms, or undefined for the "undecided" path.
 * @param options re-score table and/or taxonomy migration map (ADR 0009),
 *                supplied by the pack-update client when a pack re-keys or
 *                re-tags items. Omitted in the steady state.
 */
export function buildEngineState(
  events: readonly StoredEvent[],
  bank: Bank,
  nowMs: number,
  examMs?: number,
  options?: ReplayOptions,
): EngineState {
  return replay(events, bank, nowMs, examMs, options);
}
