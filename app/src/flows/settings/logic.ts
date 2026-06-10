/**
 * Settings flow logic (W5-5 flow e), DOM-free.
 *
 * ALL of the flow's decisions live here as pure functions so the React view
 * (SettingsFlow.tsx) is a thin renderer and everything load-bearing is tested
 * without a DOM (the repo convention; see app/tests/flows/settings.test.ts).
 *
 * This module covers:
 *   - the storage-status / install / version selectors (settingsStatus),
 *   - the import preview math (a dry-run merge: new vs duplicate vs invalid),
 *     reusing the storage layer's own validation so the preview can never
 *     disagree with the real merge,
 *   - the update-surface state mapping from the W5-4 updater's UpdaterState,
 *   - the danger-zone type-to-confirm check,
 *   - the export filename and the Web-Share decision.
 *
 * It imports the storage layer's pure helpers (validateEnvelope, validateEvent,
 * planMerge) so the preview is computed by the SAME code the adapter's
 * importEnvelope runs — the preview is a promise the commit keeps.
 */

import type { ExportEnvelope, ImportReport, StorageAdapter } from "../../storage/index.js";
import { planMerge, validateEnvelope } from "../../storage/envelope.js";
import type { UpdaterState } from "../../sw/updater.js";
import type { UpdateNote } from "../../sw/updater.js";
import type { ExamAttempt } from "../firstrun/machine.js";

// ---------------------------------------------------------------------------
// Status selectors.
// ---------------------------------------------------------------------------

/** The honest storage state, mirroring the first-run StorageState (machine.ts). */
export type StorageStatus = "persistent" | "not-persisted" | "degraded";

/**
 * The settings status readout, derived purely from adapter capability flags and
 * meta values the caller has already read. No I/O here: the component reads
 * storage and passes the values in, so this stays testable.
 *
 * @param backend   adapter.backend ("opfs-sahpool" | "memory").
 * @param persisted navigator.storage.persisted() (already awaited by the caller).
 * @param standalone whether the app runs installed/standalone.
 * @param meta      the version/exam meta values, already read.
 */
export interface StatusView {
  readonly storage: StorageStatus;
  readonly installed: boolean;
  readonly appVersion: string | null;
  readonly packVersion: string | null;
  readonly examAttempt: ExamAttempt;
}

export function settingsStatus(input: {
  readonly backend: "opfs-sahpool" | "memory";
  readonly persisted: boolean;
  readonly standalone: boolean;
  readonly appVersion: string | null;
  readonly packVersion: string | null;
  readonly examAttempt: ExamAttempt;
}): StatusView {
  // The memory backend is never durable (ADR 0008), so it is always degraded
  // here regardless of persisted(); a sahpool backend is persistent-by-design
  // and the persisted() grant decides persistent vs not-persisted.
  const storage: StorageStatus =
    input.backend === "memory" ? "degraded" : input.persisted ? "persistent" : "not-persisted";
  return {
    storage,
    installed: input.standalone,
    // A blank meta value (the seed placeholder before any stamp) reads as "unknown".
    appVersion: input.appVersion && input.appVersion.length > 0 ? input.appVersion : null,
    packVersion: input.packVersion && input.packVersion.length > 0 ? input.packVersion : null,
    examAttempt: input.examAttempt,
  };
}

// ---------------------------------------------------------------------------
// Export.
// ---------------------------------------------------------------------------

/**
 * The export filename: `pinaka-abhyas-progress-<date>.json`, date as YYYY-MM-DD
 * in UTC so it is stable and never leaks a local timezone. Derived from the
 * envelope's exported_at (an RFC3339 UTC string) so the filename and the file
 * content agree.
 */
export function exportFilename(exportedAtIso: string): string {
  // exported_at is `YYYY-MM-DDTHH:MM:SS.sssZ`; take the date part. Fall back to
  // a parse if the string is unexpected, then to a fixed label so a filename is
  // always produced.
  const datePart = exportedAtIso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return `pinaka-abhyas-progress-${datePart}.json`;
  const d = new Date(exportedAtIso);
  if (!Number.isNaN(d.getTime())) {
    return `pinaka-abhyas-progress-${d.toISOString().slice(0, 10)}.json`;
  }
  return "pinaka-abhyas-progress.json";
}

/** Pretty-print an envelope for the downloaded file (stable 2-space JSON). */
export function serializeEnvelope(env: ExportEnvelope): string {
  return JSON.stringify(env, null, 2);
}

/** The event count an export carries (shown beside the export button). */
export function exportEventCount(env: ExportEnvelope): number {
  return env.events.length;
}

/**
 * Whether to offer the phone-friendly Web-Share path. True only when the
 * platform can share files (navigator.canShare over a File). The component
 * passes the probe result in so this stays DOM-free and testable.
 */
export function canShareFile(probe: { readonly hasShare: boolean; readonly hasCanShare: boolean }): boolean {
  // We require both navigator.share and navigator.canShare: share without
  // canShare cannot promise file support, so we keep the download as the path.
  return probe.hasShare && probe.hasCanShare;
}

// ---------------------------------------------------------------------------
// Import preview (dry-run merge).
// ---------------------------------------------------------------------------

/** The preview shown before the student confirms an import. */
export interface ImportPreview {
  /** The parsed, structurally valid envelope, kept so confirm reuses it verbatim. */
  readonly envelope: ExportEnvelope;
  /** Total event records the file contains. */
  readonly total: number;
  /** Records that are new and will be added. */
  readonly added: number;
  /** Records already on this device that will be skipped. */
  readonly duplicate: number;
  /** Records that failed validation and will be skipped. */
  readonly invalid: number;
}

/** A parse/validate failure for the chosen file (not a per-record problem). */
export interface ImportFileError {
  readonly reason: string;
}

/**
 * Parse a file's text into an envelope, or report why it is not one. Pure: takes
 * the raw text the picker read, returns either a valid envelope or an error.
 */
export function parseEnvelopeText(text: string): ExportEnvelope | ImportFileError {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { reason: "The file is not valid JSON." };
  }
  const shapeError = validateEnvelope(value);
  if (shapeError !== null) return { reason: shapeError };
  return value as ExportEnvelope;
}

/** Type guard distinguishing a parse result from a file error. */
export function isFileError(value: ExportEnvelope | ImportFileError): value is ImportFileError {
  return (value as ImportFileError).reason !== undefined;
}

/**
 * Compute the import preview against the current log's event ids, using the
 * EXACT same planMerge the adapter runs at commit time. `existingIds` is the set
 * of event_ids already stored, which the caller reads via readAllEvents(). The
 * preview therefore equals the report (added/duplicate/invalid) the commit will
 * produce, barring a concurrent write between preview and confirm.
 */
export function previewImport(
  env: ExportEnvelope,
  existingIds: ReadonlySet<string>,
): ImportPreview {
  const plan = planMerge(env.events, existingIds);
  return {
    envelope: env,
    total: plan.total,
    added: plan.added,
    duplicate: plan.duplicate,
    invalid: plan.invalid,
  };
}

// ---------------------------------------------------------------------------
// Update surface mapping (from the W5-4 updater state).
// ---------------------------------------------------------------------------

/**
 * What the update section should show, mapped from the updater's UpdaterState.
 * The updater carries the mechanism (state machine + UpdateNote); this maps each
 * state to one of the screen's display kinds so the rendering is a pure lookup.
 */
export type UpdateView =
  | { readonly kind: "idle" }
  | { readonly kind: "checking" }
  | { readonly kind: "downloading"; readonly toVersion: string }
  | { readonly kind: "up-to-date" }
  | { readonly kind: "incompatible-app" }
  | { readonly kind: "offline" }
  | { readonly kind: "deferred"; readonly toVersion: string }
  | { readonly kind: "applied"; readonly note: UpdateNote };

/**
 * Map the updater's state to the settings display kind.
 *
 * `hasChecked` distinguishes the initial idle (show only the button) from a
 * post-check idle, which the updater uses for the offline/unreachable path
 * (checkForUpdate returns to idle silently when the network fails). After a
 * check, an idle state means "could not reach the server", which the screen
 * surfaces as the honest offline note.
 */
export function updateView(state: UpdaterState, hasChecked: boolean): UpdateView {
  switch (state.phase) {
    case "idle":
      return hasChecked ? { kind: "offline" } : { kind: "idle" };
    case "checking":
      return { kind: "checking" };
    case "downloading":
      return { kind: "downloading", toVersion: state.toVersion };
    case "deferred":
      return { kind: "deferred", toVersion: state.toVersion };
    case "applied":
      return { kind: "applied", note: state.note };
    case "noop":
      // The decision the updater reached without downloading.
      if (state.decision.kind === "incompatible-app") return { kind: "incompatible-app" };
      // up-to-date, incompatible-pack, and invalid all read to the student as
      // "nothing to update": a pack for another product or a malformed manifest
      // is not actionable and not their problem, so it is the up-to-date note.
      return { kind: "up-to-date" };
  }
}

// ---------------------------------------------------------------------------
// Danger zone.
// ---------------------------------------------------------------------------

/**
 * Whether the typed confirmation matches the required word exactly (case- and
 * whitespace-sensitive after trimming surrounding spaces). The required word is
 * COPY.danger.confirmWord ("DELETE"); kept as a parameter so the gate and the
 * copy never drift.
 */
export function isDeleteConfirmed(typed: string, required: string): boolean {
  return typed.trim() === required;
}

// ---------------------------------------------------------------------------
// Commit helpers (thin async wrappers the component calls; they touch the
// adapter, so they are exercised by the round-trip test rather than unit-pure).
// ---------------------------------------------------------------------------

/** Commit a previewed import. Reuses the adapter's importEnvelope, so the
 * report matches the preview the student approved. */
export async function commitImport(
  adapter: StorageAdapter,
  env: ExportEnvelope,
): Promise<ImportReport> {
  return adapter.importEnvelope(env);
}
