/**
 * Mock guard holder (W5-7), binding to ADR 0009 ("No update ever happens
 * mid-mock") and the MockGuard interface in app/src/sw/port.ts.
 *
 * The pack updater (app/src/sw/updater.ts) asks a MockGuard before committing an
 * atomic pack swap; while a mock is live the swap is deferred, not cancelled, so
 * the student's clock and item bank cannot change under them. This module is the
 * one shared piece of state the mock flow holds during a mock and the updater
 * reads: a module-level boolean behind the MockGuard shape.
 *
 * It is a tiny, deliberate exception to the pure-functions discipline: a mock
 * being in progress is genuinely cross-cutting app state (the mock flow lives in
 * one place, the updater in another, and they must agree), so it is a single
 * module-level flag rather than threaded through every call. The flag is set on
 * mock start and cleared on submit OR abandon OR unmount, so a swap can never be
 * blocked forever by a flow that went away.
 */

import type { MockGuard } from "../../sw/port.js";

let mockInProgress = false;

/** Mark a mock as in progress. The updater will defer any pack swap until it is
 * released. Idempotent. */
export function acquireMockGuard(): void {
  mockInProgress = true;
}

/** Release the mock guard (on submit, abandon, or unmount). The updater's
 * applyPending() should be called after release to flush any deferred swap.
 * Idempotent. */
export function releaseMockGuard(): void {
  mockInProgress = false;
}

/** True while a mock is in progress. Read by the updater before a swap. */
export function isMockInProgress(): boolean {
  return mockInProgress;
}

/** The MockGuard the updater holds (app/src/sw/index.ts wires this in). A live
 * view over the module flag, so the updater always sees the current value. */
export const mockGuard: MockGuard = { isMockInProgress };
