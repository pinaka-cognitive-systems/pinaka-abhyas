/**
 * SettingsFlow — design-parity rebuild per scr-core.jsx:230-331.
 *
 * Rail-hosted (.screen > .screen__scroll > .screen__pad maxWidth 760).
 * ScreenHead "Settings" + lede. Three design groups plus kept enhancements:
 *
 *   Privacy and data  — telemetry, export, import (kept), delete
 *   Accessibility     — reduce motion, increase contrast, text size
 *   Exam              — exam date, readiness target (app additions, design voice)
 *   About             — version, storage status, install affordance, update
 *
 * Closing Caveat (dot icon). No Back header bar — the rail handles navigation.
 * Reminder card is REMOVED per the 2026-06-12 product ruling.
 *
 * Boot-time a11y hook: call applyA11ySettings() in main.tsx BEFORE first
 * render, reading META_A11Y from the adapter. See a11y.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlreadyOpenError,
  isPersisted,
  getSharedStorage,
  takeoverSharedStorage,
  type StorageAdapter,
} from "../../storage/index.js";
import { META_KEYS } from "../../storage/index.js";
import { mockGuard as realMockGuard } from "../mock/guard.js";
import {
  createHttpPort,
  createStoragePort,
  extractErrataFromBody,
  PackUpdater,
  type MockGuard,
  type UpdaterState,
} from "../../sw/index.js";
import { isStandalone } from "../firstrun/platform.js";
import { SecondTabScreen } from "../firstrun/SecondTabScreen.js";
import { invalidateAppSnapshot } from "../../state/appData.js";
import {
  META_EXAM_DATE,
  META_TARGET,
  META_A11Y,
} from "../../engine/insights.js";
import { ScreenHead, Icon } from "../../components/ui.js";
import {
  applyA11ySettings,
  parseA11ySettings,
  type A11ySettings,
} from "./a11y.js";
import {
  canShareFile,
  exportEventCount,
  exportFilename,
  isFileError,
  parseEnvelopeText,
  previewImport,
  serializeEnvelope,
  updateView,
  type ImportFileError,
  type ImportPreview,
  type UpdateView,
} from "./logic.js";
import {
  downloadTextFile,
  readFileText,
  shareProbe,
  shareTextFile,
  type ShareResult,
} from "./io.js";
import type { ImportReport } from "../../storage/index.js";
import "./settings.css";

const PACK_LOCATION = { manifestUrl: "pack.manifest.json", packUrl: "pack.json" } as const;

declare const __APP_VERSION__: string;
const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export interface SettingsFlowProps {
  /** Unused — rail handles navigation — kept for router compatibility. */
  readonly onExit: () => void;
  /** Optional mock guard for testing. */
  readonly mockGuard?: MockGuard;
}

export function SettingsFlow({ onExit: _onExit, mockGuard }: SettingsFlowProps): JSX.Element {
  void _onExit; // rail owns navigation; kept in props for router compatibility

  const adapterRef = useRef<StorageAdapter | null>(null);
  const updaterRef = useRef<PackUpdater | null>(null);

  const [secondTab, setSecondTab] = useState(false);
  const [takingOver, setTakingOver] = useState(false);

  // Privacy and data
  const [telemetry, setTelemetry] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [importError, setImportError] = useState<ImportFileError | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const showShare = canShareFile(shareProbe());

  // Accessibility
  const [a11y, setA11y] = useState<A11ySettings>({
    reduceMotion: false,
    contrast: false,
    textSize: "regular",
  });

  // Exam
  const [examDate, setExamDate] = useState("");
  const [target, setTarget] = useState("");

  // About / status
  const [storageStatus, setStorageStatus] = useState<"persistent" | "not-persisted" | "degraded" | null>(null);
  const [installed, setInstalled] = useState(false);
  const [packVersion, setPackVersion] = useState<string | null>(null);

  // Update surface
  const [updaterState, setUpdaterState] = useState<UpdaterState>({ phase: "idle" });
  const [hasChecked, setHasChecked] = useState(false);

  // --- Storage setup -------------------------------------------------------

  const ensureAdapter = useCallback(async (steal = false): Promise<StorageAdapter | null> => {
    if (adapterRef.current !== null) return adapterRef.current;
    try {
      const { adapter } = await (steal ? takeoverSharedStorage() : getSharedStorage());
      adapterRef.current = adapter;
      updaterRef.current = new PackUpdater({
        network: createHttpPort(PACK_LOCATION),
        staging: createStoragePort(adapter),
        appVersion: APP_VERSION,
        mockGuard: mockGuard ?? realMockGuard,
        extractErrata: extractErrataFromBody,
      });
      return adapter;
    } catch (err) {
      if (err instanceof AlreadyOpenError) {
        setSecondTab(true);
        return null;
      }
      return null;
    }
  }, [mockGuard]);

  // --- Mount: read all stored values ---------------------------------------

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const adapter = await ensureAdapter();
      if (cancelled || adapter === null) return;

      // Subscribe to updater state.
      const updater = updaterRef.current;
      if (updater !== null) {
        setUpdaterState(updater.getState());
        updater.subscribe((s) => { if (!cancelled) setUpdaterState(s); });
      }

      const [
        persisted,
        a11yRaw,
        examDateRaw,
        targetRaw,
        pv,
        telRaw,
      ] = await Promise.all([
        isPersisted(),
        adapter.getMeta(META_A11Y),
        adapter.getMeta(META_EXAM_DATE),
        adapter.getMeta(META_TARGET),
        adapter.getMeta(META_KEYS.packVersion),
        adapter.getMeta("telemetry_v1"),
      ]);

      if (cancelled) return;

      // Storage status
      const backend = adapter.backend;
      const status =
        backend === "memory" ? "degraded" : persisted ? "persistent" : "not-persisted";
      setStorageStatus(status);
      setInstalled(isStandalone());
      setPackVersion(pv);

      // A11y
      const parsed = parseA11ySettings(a11yRaw);
      setA11y(parsed);
      applyA11ySettings(parsed);

      // Exam date (stored as "YYYY-MM")
      setExamDate(examDateRaw ?? "");

      // Target (stored as number string or empty)
      setTarget(targetRaw ?? "");

      // Telemetry
      setTelemetry(telRaw === "true");
    })();
    return () => { cancelled = true; };
  }, [ensureAdapter]);

  // --- A11y toggling: apply to body + persist ------------------------------

  const updateA11y = useCallback(async (next: A11ySettings): Promise<void> => {
    setA11y(next);
    applyA11ySettings(next);
    const adapter = adapterRef.current;
    if (adapter !== null) {
      await adapter.setMeta(META_A11Y, JSON.stringify(next));
    }
  }, []);

  // --- Telemetry -----------------------------------------------------------

  const onToggleTelemetry = useCallback(async (): Promise<void> => {
    const next = !telemetry;
    setTelemetry(next);
    const adapter = adapterRef.current;
    if (adapter !== null) {
      await adapter.setMeta("telemetry_v1", next ? "true" : "false");
    }
  }, [telemetry]);

  // --- Export --------------------------------------------------------------

  const onExport = useCallback(async (share: boolean): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null) return;
    const env = await adapter.exportEnvelope();
    if (exportEventCount(env) === 0) {
      setExportNote("You have nothing to back up yet. Practise a few questions, then export.");
      return;
    }
    const text = serializeEnvelope(env);
    const name = exportFilename(env.exported_at);
    if (share) {
      const result: ShareResult = await shareTextFile(text, name);
      if (result === "shared") setExportNote("Shared. Keep the file somewhere safe.");
      else if (result === "cancelled") setExportNote(null);
      else {
        setExportNote(downloadTextFile(text, name)
          ? "Your progress file is ready."
          : "The export could not be saved. Try again, or use Share if it is shown.");
      }
      return;
    }
    setExportNote(downloadTextFile(text, name)
      ? "Your progress file is ready."
      : "The export could not be saved. Try again.");
  }, []);

  // --- Import --------------------------------------------------------------

  const importInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = useCallback(async (file: File): Promise<void> => {
    setImportError(null);
    setReport(null);
    const adapter = adapterRef.current;
    if (adapter === null) return;
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setImportError({ reason: "This file could not be read as a progress file. Check that you chose the right file, then try again." });
      return;
    }
    const parsed = parseEnvelopeText(text);
    if (isFileError(parsed)) {
      setImportError({ reason: "This file could not be read as a progress file. Check that you chose the right file, then try again." });
      return;
    }
    const existing = await adapter.readAllEvents();
    setPreview(previewImport(parsed, new Set(existing.map((e) => e.event_id))));
  }, []);

  const onConfirmImport = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null || preview === null) return;
    const result = await adapter.importEnvelope(preview.envelope);
    setReport(result);
    setPreview(null);
    invalidateAppSnapshot();
  }, [preview]);

  const onCancelImport = useCallback((): void => { setPreview(null); }, []);

  // --- Exam date -----------------------------------------------------------

  const onExamDateChange = useCallback(async (val: string): Promise<void> => {
    setExamDate(val);
    const adapter = adapterRef.current;
    if (adapter === null) return;
    if (val.trim() === "") {
      await adapter.setMeta(META_EXAM_DATE, "");
    } else {
      await adapter.setMeta(META_EXAM_DATE, val.trim());
    }
    invalidateAppSnapshot();
  }, []);

  // --- Readiness target ----------------------------------------------------

  const onTargetChange = useCallback(async (val: string): Promise<void> => {
    setTarget(val);
    const adapter = adapterRef.current;
    if (adapter === null) return;
    if (val.trim() === "") {
      await adapter.setMeta(META_TARGET, "");
    } else {
      const n = Number(val);
      if (!Number.isNaN(n) && n >= 40 && n <= 100) {
        await adapter.setMeta(META_TARGET, String(n));
        invalidateAppSnapshot();
      }
    }
  }, []);

  // --- Update --------------------------------------------------------------

  const onCheckUpdate = useCallback((): void => {
    const updater = updaterRef.current;
    if (updater === null) return;
    setHasChecked(true);
    void updater.checkForUpdate();
  }, []);

  // --- Delete all ----------------------------------------------------------

  const onDeleteAll = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null) return;
    await adapter.clearAll();
    setDeleted(true);
    setConfirmDelete(false);
    invalidateAppSnapshot();
    // Navigate to empty hash so the router restarts first-run.
    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
  }, []);

  // --- Second-tab takeover -------------------------------------------------

  const onTakeover = useCallback((): void => {
    setTakingOver(true);
    void (async () => {
      adapterRef.current = null;
      const adapter = await ensureAdapter(true);
      setTakingOver(false);
      if (adapter !== null) setSecondTab(false);
    })();
  }, [ensureAdapter]);

  if (secondTab) {
    return <SecondTabScreen onTakeover={onTakeover} takingOver={takingOver} />;
  }

  const update: UpdateView = updateView(updaterState, hasChecked);

  return (
    <main className="screen">
      <div className="screen__scroll">
        <div className="screen__pad" style={{ maxWidth: 760 }}>
          <ScreenHead
            title="Settings"
            lede="Pinaka runs entirely on this device. There is little to configure, by design."
          />

          {/* ---- Privacy and data ---- */}
          <h3 className="set-group">Privacy and data</h3>
          <div className="sa-card">
            {/* Telemetry */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Anonymous telemetry</div>
                <div className="set-row__detail">
                  Off by default. If you turn this on, Pinaka may send anonymised, aggregate
                  usage counts to improve question quality. Never your answers, never anything
                  that identifies you. You can read exactly what would be sent before it is.
                </div>
              </div>
              <button
                type="button"
                className={`toggle${telemetry ? " is-on" : ""}`}
                role="switch"
                aria-checked={telemetry}
                aria-label="Anonymous telemetry"
                onClick={() => void onToggleTelemetry()}
              >
                <span className="toggle__thumb" />
              </button>
            </div>

            {/* Export */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Export my data</div>
                <div className="set-row__detail">
                  Download everything on this device as a single anonymised file: your
                  attempts, diagnosis, and review schedule. Yours to keep or move.
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="sa-btn sa-btn--secondary"
                  onClick={() => void onExport(false)}
                >
                  <Icon name="download" size={15} />
                  Export
                </button>
                {showShare && (
                  <button
                    type="button"
                    className="sa-btn sa-btn--secondary"
                    onClick={() => void onExport(true)}
                  >
                    Share
                  </button>
                )}
              </div>
            </div>
            {exportNote !== null && (
              <p className="set-row__detail" role="status" style={{ paddingBottom: "var(--space-3)" }}>
                {exportNote}
              </p>
            )}

            {/* Import (app enhancement kept with design voice) */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Import a progress file</div>
                <div className="set-row__detail">
                  Choose a file you exported before. Importing only adds attempts you do not
                  already have, so it is safe to repeat.
                </div>
              </div>
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                onClick={() => importInputRef.current?.click()}
              >
                Choose a file
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
              aria-label="Choose a progress file to import"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPickFile(file);
                e.target.value = "";
              }}
            />
            {importError !== null && (
              <p className="set-row__detail" role="alert" style={{ color: "var(--color-danger-text)", paddingBottom: "var(--space-3)" }}>
                {importError.reason}
              </p>
            )}
            {preview !== null && (
              <div style={{ paddingBottom: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <p className="set-row__detail" style={{ fontWeight: "var(--font-weight-medium)" }}>
                  Here is what this file will add
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  <li className="set-row__detail">{preview.total === 1 ? "1 event found in the file" : `${preview.total} events found in the file`}</li>
                  <li className="set-row__detail">{preview.added === 1 ? "1 event is new and will be added" : `${preview.added} events are new and will be added`}</li>
                  {preview.duplicate > 0 && (
                    <li className="set-row__detail">{preview.duplicate === 1 ? "1 event already here, will be skipped" : `${preview.duplicate} events already here, will be skipped`}</li>
                  )}
                </ul>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button type="button" className="sa-btn sa-btn--primary" onClick={() => void onConfirmImport()}>
                    Add these events
                  </button>
                  <button type="button" className="sa-btn sa-btn--secondary" onClick={onCancelImport}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {report !== null && (
              <p className="set-row__detail" role="status" style={{ paddingBottom: "var(--space-3)" }}>
                Import finished.{" "}
                {report.added === 1 ? "1 event added." : `${report.added} events added.`}{" "}
                {report.duplicate === 1 ? "1 already here, skipped." : `${report.duplicate} already here, skipped.`}
              </p>
            )}

            {/* Delete all */}
            <div className="set-row" style={{ borderBottom: "none" }}>
              <div>
                <div className="set-row__title" style={{ color: "var(--color-danger-text)" }}>
                  Delete all data
                </div>
                <div className="set-row__detail">
                  Erase everything from this device. There is no cloud copy and no undo.
                  You would start from an empty app.
                </div>
              </div>
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                style={{ borderColor: "var(--color-danger-border)", color: "var(--color-danger-text)" }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            </div>
            {deleted && (
              <p className="set-row__detail" role="status" style={{ paddingBottom: "var(--space-3)" }}>
                Everything on this device has been deleted.
              </p>
            )}
          </div>

          {/* ---- Accessibility ---- */}
          <h3 className="set-group">Accessibility</h3>
          <div className="sa-card">
            {/* Reduce motion */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Reduce motion</div>
                <div className="set-row__detail">
                  Turn off the score-reveal fade and other transitions. Follows your system
                  setting by default.
                </div>
              </div>
              <button
                type="button"
                className={`toggle${a11y.reduceMotion ? " is-on" : ""}`}
                role="switch"
                aria-checked={a11y.reduceMotion}
                aria-label="Reduce motion"
                onClick={() => void updateA11y({ ...a11y, reduceMotion: !a11y.reduceMotion })}
              >
                <span className="toggle__thumb" />
              </button>
            </div>

            {/* Increase contrast */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Increase contrast</div>
                <div className="set-row__detail">
                  Darken borders and dividers for a sharper read.
                </div>
              </div>
              <button
                type="button"
                className={`toggle${a11y.contrast ? " is-on" : ""}`}
                role="switch"
                aria-checked={a11y.contrast}
                aria-label="Increase contrast"
                onClick={() => void updateA11y({ ...a11y, contrast: !a11y.contrast })}
              >
                <span className="toggle__thumb" />
              </button>
            </div>

            {/* Text size */}
            <div className="set-row" style={{ borderBottom: "none" }}>
              <div>
                <div className="set-row__title">Text size</div>
                <div className="set-row__detail">Scale question and explanation text.</div>
              </div>
              <div className="seg">
                {(
                  [
                    ["small", 13],
                    ["regular", 15],
                    ["large", 18],
                  ] as const
                ).map(([id, sz]) => (
                  <button
                    key={id}
                    type="button"
                    className={a11y.textSize === id ? "is-on" : ""}
                    aria-label={`${id} text`}
                    style={{ fontSize: sz }}
                    onClick={() => void updateA11y({ ...a11y, textSize: id })}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Exam (app addition, design voice) ---- */}
          <h3 className="set-group">Exam</h3>
          <div className="sa-card">
            <div className="set-row">
              <div>
                <div className="set-row__title">Exam date</div>
                <div className="set-row__detail">
                  Sets the countdown on Today and caps the review schedule before the paper.
                </div>
              </div>
              <input
                type="month"
                className="fr__date-input mono"
                value={examDate}
                onChange={(e) => void onExamDateChange(e.target.value)}
                aria-label="Exam date"
              />
            </div>
            <div className="set-row" style={{ borderBottom: "none" }}>
              <div>
                <div className="set-row__title">Readiness target</div>
                <div className="set-row__detail">
                  A second marker on the readiness band. The pass bar stays at 40 either
                  way. Enter a number between 40 and 100, or leave blank to clear.
                </div>
              </div>
              <input
                type="number"
                className="fr__date-input mono"
                min={40}
                max={100}
                value={target}
                placeholder="—"
                onChange={(e) => void onTargetChange(e.target.value)}
                aria-label="Readiness target, 40 to 100"
                style={{ width: 64 }}
              />
            </div>
          </div>

          {/* ---- About ---- */}
          <h3 className="set-group">About</h3>
          <div className="sa-card">
            <div className="set-row">
              <div>
                <div className="set-row__title">Pinaka abhyas</div>
                <div className="set-row__detail">
                  Local build · CA Foundation Paper 3 (Quantitative Aptitude). Taxonomy v1,
                  misconception canon v2. An exam analytics tool, not a course.
                </div>
              </div>
              <span className="mono subtle" style={{ fontSize: 12 }}>{APP_VERSION}</span>
            </div>

            {/* Storage status */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Storage</div>
                <div className="set-row__detail">
                  {storageStatus === null
                    ? "Reading storage status."
                    : storageStatus === "persistent"
                    ? "Saved on this device, with lasting storage granted."
                    : storageStatus === "not-persisted"
                    ? "Saved in this browser. Adding the app to your home screen makes it lasting."
                    : "Limited. This browser cannot store your progress between sessions. Export often."}
                </div>
              </div>
              <span className="mono subtle" style={{ fontSize: 12 }}>
                {storageStatus ?? ""}
              </span>
            </div>

            {/* Install status */}
            <div className="set-row">
              <div>
                <div className="set-row__title">Install</div>
                <div className="set-row__detail">
                  {installed
                    ? "Running from your home screen. Progress is protected."
                    : "Running in the browser. Add to home screen for lasting storage."}
                </div>
              </div>
              <span className="mono subtle" style={{ fontSize: 12 }}>
                {installed ? "installed" : "browser"}
              </span>
            </div>

            {/* Update */}
            <div className="set-row" style={{ borderBottom: "none" }}>
              <div>
                <div className="set-row__title">Update</div>
                <div className="set-row__detail">
                  {packVersion !== null && packVersion.length > 0
                    ? `Question pack ${packVersion} installed.`
                    : "No question pack installed yet."}{" "}
                  Updates add new questions and fix any that were wrong.
                  {update.kind === "up-to-date" && " Your questions are up to date."}
                  {update.kind === "offline" && " Could not check right now — try when online."}
                  {update.kind === "deferred" && " An update is ready and will apply when your mock ends."}
                  {update.kind === "applied" && ` Updated to pack ${(update as { kind: "applied"; note: { toVersion: string } }).note.toVersion}.`}
                </div>
              </div>
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                disabled={update.kind === "checking" || update.kind === "downloading"}
                onClick={onCheckUpdate}
              >
                {update.kind === "checking" ? "Checking" : "Check"}
              </button>
            </div>
          </div>

          {/* ---- Closing caveat ---- */}
          <p className="caveat" style={{ marginTop: "var(--space-5)" }}>
            <Icon name="dot" size={10} />
            No login, no sync, no notifications. Closing the app loses nothing; it is all
            on disk here.
          </p>

        </div>
      </div>

      {/* ---- Delete confirm sheet ---- */}
      {confirmDelete && (
        <div
          className="sheet-dim"
          onClick={() => setConfirmDelete(false)}
          role="presentation"
        >
          <div
            className="sheet"
            style={{ width: 440 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Delete all data"
            aria-modal="true"
          >
            <div className="sheet__head">
              <span className="eyebrow" style={{ color: "var(--color-danger-text)" }}>
                <Icon name="alert" size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                Delete all data
              </span>
              <button
                type="button"
                className="sheet__close"
                aria-label="Close"
                onClick={() => setConfirmDelete(false)}
              >
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="sheet__body">
              <p style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: "var(--color-muted-foreground)", margin: "0 0 var(--space-5)" }}>
                This erases every attempt, your diagnosis, and your review schedule from
                this device. It cannot be undone, and there is no cloud copy. You will
                start from an empty app.
              </p>
              <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                {/* autoFocus on the safe action per design */}
                <button
                  type="button"
                  className="sa-btn sa-btn--ghost"
                    autoFocus
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep my data
                </button>
                <button
                  type="button"
                  className="sa-btn"
                  style={{ background: "var(--color-danger)", color: "var(--color-danger-foreground)" }}
                  onClick={() => void onDeleteAll()}
                >
                  Delete everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
