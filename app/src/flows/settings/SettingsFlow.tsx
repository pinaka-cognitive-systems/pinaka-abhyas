/**
 * Settings flow — import/export, status, telemetry, update, danger zone
 * (W5-5 flow e; ADR 0008, ADR 0009, ADR 0014).
 *
 * The thin React renderer over the pure logic in logic.ts and the side-effects
 * in io.ts. It owns only what it must: the storage adapter (read meta, export,
 * import, clearAll), the PackUpdater instance (W5-4), and the local UI cursors
 * (import preview, share/download results, the danger-zone confirm text). Every
 * decision — status mapping, import preview math, update-state mapping, the
 * delete confirmation — is delegated to tested functions so nothing load-bearing
 * lives inline in JSX.
 *
 * Layout: 360px-first (ADR 0011), 44px touch targets, visible focus rings,
 * tokens only (settings.css). Copy lives in copy.ts and is voice-checked there.
 *
 * Second-tab: opening storage here can throw AlreadyOpenError; we render the
 * shared SecondTabScreen with a takeover that reopens with { steal: true }.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlreadyOpenError,
  isPersisted,
  openStorage,
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
import { getExamAttempt } from "../firstrun/meta.js";
import { isStandalone } from "../firstrun/platform.js";
import { SecondTabScreen } from "../firstrun/SecondTabScreen.js";
import {
  readReminder,
  reminderAvailability,
  writeReminder,
  type ReminderAvailability,
  type ReminderSetting,
} from "../home/reminder.js";
import { COPY } from "./copy.js";
import {
  canShareFile,
  exportEventCount,
  exportFilename,
  isDeleteConfirmed,
  isFileError,
  parseEnvelopeText,
  previewImport,
  serializeEnvelope,
  settingsStatus,
  updateView,
  type ImportFileError,
  type ImportPreview,
  type StatusView,
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

/** Where the deployed pack manifest and body live, relative to the app origin
 * (ADR 0009 "the service worker fetches the pack manifest"). Offline or in dev
 * these 404/fail, which the updater treats as "no update right now". */
const PACK_LOCATION = { manifestUrl: "pack.manifest.json", packUrl: "pack.json" } as const;

// Compile-time app version, injected by Vite's `define` from package.json
// (same source as main.tsx; ADR 0009 version stamping / min-app-version handshake).
declare const __APP_VERSION__: string;
const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

export interface SettingsFlowProps {
  /** Return to the previous screen (the practice loop / hub). */
  readonly onExit: () => void;
  /**
   * Optional mock guard. When a mock is in progress it holds this, so a staged
   * update defers rather than swapping under the student (ADR 0009). Defaults to
   * never-block. Injected so a test can hold the guard and assert the deferred
   * state without a running mock.
   */
  readonly mockGuard?: MockGuard;
}

export function SettingsFlow({ onExit, mockGuard }: SettingsFlowProps): JSX.Element {
  const adapterRef = useRef<StorageAdapter | null>(null);
  const updaterRef = useRef<PackUpdater | null>(null);

  const [secondTab, setSecondTab] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [status, setStatus] = useState<StatusView | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);

  // Export feedback.
  const [exportNote, setExportNote] = useState<string | null>(null);
  const showShare = canShareFile(shareProbe());

  // Import: file error, preview, and the committed report.
  const [importError, setImportError] = useState<ImportFileError | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  // Update surface.
  const [updaterState, setUpdaterState] = useState<UpdaterState>({ phase: "idle" });
  const [hasChecked, setHasChecked] = useState(false);

  // Reminder (W5-9 mechanism 4). Off by default; availability read at mount.
  const [reminder, setReminder] = useState<ReminderSetting | null>(null);
  const [reminderAvail, setReminderAvail] = useState<ReminderAvailability>("unavailable");

  // Danger zone.
  const [dangerOpen, setDangerOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleted, setDeleted] = useState(false);

  // --- Open storage + build the updater + read status, once at mount. -------
  const ensureAdapter = useCallback(async (steal = false): Promise<StorageAdapter | null> => {
    if (adapterRef.current !== null) return adapterRef.current;
    try {
      const { adapter } = await openStorage(steal ? { steal: true } : {});
      adapterRef.current = adapter;
      // Build the updater over the live ports the moment we have an adapter.
      updaterRef.current = new PackUpdater({
        network: createHttpPort(PACK_LOCATION),
        staging: createStoragePort(adapter),
        appVersion: APP_VERSION,
        // Production default: the real mock guard, so an update can never swap
        // the pack mid-mock (ADR 0009). Tests inject their own guard via props.
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

  const refreshStatus = useCallback(async (adapter: StorageAdapter): Promise<void> => {
    const [persisted, appVersion, packVersion, examAttempt, events] = await Promise.all([
      isPersisted(),
      adapter.getMeta(META_KEYS.appVersion),
      adapter.getMeta(META_KEYS.packVersion),
      getExamAttempt(adapter),
      adapter.readAllEvents(),
    ]);
    setStatus(
      settingsStatus({
        backend: adapter.backend,
        persisted,
        standalone: isStandalone(),
        appVersion,
        packVersion,
        examAttempt,
      }),
    );
    setEventCount(events.length);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const adapter = await ensureAdapter();
      if (cancelled || adapter === null) return;
      // Subscribe to updater state so the surface re-renders as it progresses.
      const updater = updaterRef.current;
      if (updater !== null) {
        setUpdaterState(updater.getState());
        updater.subscribe((s) => {
          if (!cancelled) setUpdaterState(s);
        });
      }
      await refreshStatus(adapter);
      // Reminder (W5-9): read the persisted setting and the current availability.
      const setting = await readReminder(adapter);
      if (!cancelled) {
        setReminder(setting);
        const hasApi = typeof window !== "undefined" && "Notification" in window;
        setReminderAvail(
          reminderAvailability({
            hasNotificationApi: hasApi,
            permission: hasApi ? Notification.permission : null,
          }),
        );
      }
    })();
    return () => {
      cancelled = true;
      void adapterRef.current?.close();
    };
  }, [ensureAdapter, refreshStatus]);

  // --- Reminder handlers (W5-9 mechanism 4). --------------------------------
  const onToggleReminder = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null || reminder === null) return;
    if (reminder.enabled) {
      const next = { ...reminder, enabled: false };
      await writeReminder(adapter, next);
      setReminder(next);
      return;
    }
    // Turning on: request permission first (the permission flow). Only persist
    // enabled when granted, so the setting never lies about being on.
    const hasApi = typeof window !== "undefined" && "Notification" in window;
    if (!hasApi) {
      setReminderAvail("unavailable");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setReminderAvail(reminderAvailability({ hasNotificationApi: true, permission }));
      return;
    }
    const next = { ...reminder, enabled: true };
    await writeReminder(adapter, next);
    setReminder(next);
    setReminderAvail("available");
  }, [reminder]);

  const onChangeReminderTime = useCallback(async (time: string): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null || reminder === null) return;
    const next = { ...reminder, time };
    await writeReminder(adapter, next);
    setReminder(next);
  }, [reminder]);

  // --- Export ---------------------------------------------------------------
  const onExport = useCallback(async (share: boolean): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null) return;
    const env = await adapter.exportEnvelope();
    if (exportEventCount(env) === 0) {
      setExportNote(COPY.export.empty);
      return;
    }
    const text = serializeEnvelope(env);
    const name = exportFilename(env.exported_at);
    if (share) {
      const result: ShareResult = await shareTextFile(text, name);
      if (result === "shared") setExportNote(COPY.export.shared);
      else if (result === "cancelled") setExportNote(null);
      else if (result === "unsupported") {
        // Fall back to download if the platform cannot share files.
        setExportNote(downloadTextFile(text, name) ? COPY.export.done : COPY.export.failed);
      } else setExportNote(COPY.export.failed);
      return;
    }
    setExportNote(downloadTextFile(text, name) ? COPY.export.done : COPY.export.failed);
  }, []);

  // --- Import ---------------------------------------------------------------
  const onPickFile = useCallback(async (file: File): Promise<void> => {
    setImportError(null);
    setReport(null);
    const adapter = adapterRef.current;
    if (adapter === null) return;
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setImportError({ reason: COPY.import.badFile });
      return;
    }
    const parsed = parseEnvelopeText(text);
    if (isFileError(parsed)) {
      setImportError({ reason: COPY.import.badFile });
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
    await refreshStatus(adapter);
  }, [preview, refreshStatus]);

  const onCancelImport = useCallback((): void => {
    setPreview(null);
  }, []);

  // --- Update ---------------------------------------------------------------
  const onCheckUpdate = useCallback((): void => {
    const updater = updaterRef.current;
    if (updater === null) return;
    setHasChecked(true);
    void updater.checkForUpdate().then(() => {
      const adapter = adapterRef.current;
      if (adapter !== null) void refreshStatus(adapter);
    });
  }, [refreshStatus]);

  // --- Danger zone ----------------------------------------------------------
  const onDelete = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (adapter === null) return;
    if (!isDeleteConfirmed(confirmText, COPY.danger.confirmWord)) return;
    await adapter.clearAll();
    setDeleted(true);
    setDangerOpen(false);
    setConfirmText("");
    await refreshStatus(adapter);
  }, [confirmText, refreshStatus]);

  // --- Second-tab takeover --------------------------------------------------
  const onTakeover = useCallback((): void => {
    setTakingOver(true);
    void (async () => {
      adapterRef.current = null;
      const adapter = await ensureAdapter(true);
      setTakingOver(false);
      if (adapter !== null) {
        setSecondTab(false);
        await refreshStatus(adapter);
      }
    })();
  }, [ensureAdapter, refreshStatus]);

  if (secondTab) {
    return <SecondTabScreen onTakeover={onTakeover} takingOver={takingOver} />;
  }

  const update: UpdateView = updateView(updaterState, hasChecked);

  return (
    <div className="st-screen">
      <header className="st-bar">
        <button
          type="button"
          className="st-bar__back"
          aria-label={COPY.frame.closeAria}
          onClick={onExit}
        >
          {COPY.frame.close}
        </button>
        <span className="st-bar__title">{COPY.frame.title}</span>
      </header>

      <main className="st-body">
        <ExportSection
          eventCount={eventCount}
          showShare={showShare}
          note={exportNote}
          onExport={(share) => void onExport(share)}
        />

        <ImportSection
          error={importError}
          preview={preview}
          report={report}
          onPick={(f) => void onPickFile(f)}
          onConfirm={() => void onConfirmImport()}
          onCancel={onCancelImport}
        />

        <StatusSection status={status} deleted={deleted} />

        <UpdateSection
          view={update}
          onCheck={onCheckUpdate}
        />

        <TelemetrySection />

        <ReminderSection
          setting={reminder}
          availability={reminderAvail}
          onToggle={() => void onToggleReminder()}
          onChangeTime={(t) => void onChangeReminderTime(t)}
        />

        <DangerSection
          open={dangerOpen}
          confirmText={confirmText}
          deleted={deleted}
          onOpen={() => setDangerOpen(true)}
          onCancel={() => {
            setDangerOpen(false);
            setConfirmText("");
          }}
          onConfirmTextChange={setConfirmText}
          onExportFirst={() => void onExport(false)}
          onDelete={() => void onDelete()}
        />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections. Each is a pure function of its props (no storage, no logic).
// ---------------------------------------------------------------------------

function Card({
  eyebrow,
  title,
  children,
  tone,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly tone?: "danger";
}): JSX.Element {
  return (
    <section className={`st-card${tone === "danger" ? " st-card--danger" : ""}`}>
      <p className="st-eyebrow">{eyebrow}</p>
      <h2 className="st-card__title">{title}</h2>
      {children}
    </section>
  );
}

function ExportSection({
  eventCount,
  showShare,
  note,
  onExport,
}: {
  readonly eventCount: number | null;
  readonly showShare: boolean;
  readonly note: string | null;
  readonly onExport: (share: boolean) => void;
}): JSX.Element {
  const c = COPY.export;
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      <p className="st-text">{c.body}</p>
      <p className="st-text st-text--muted">{c.explain}</p>
      {eventCount !== null && (
        <p className="st-metric" aria-live="polite">
          {c.countLabel(eventCount)}
        </p>
      )}
      <div className="st-actions">
        <button type="button" className="st-btn st-btn--primary" onClick={() => onExport(false)}>
          {c.cta}
        </button>
        {showShare && (
          <button type="button" className="st-btn st-btn--ghost" onClick={() => onExport(true)}>
            {c.shareCta}
          </button>
        )}
      </div>
      {note !== null && (
        <p className="st-note" role="status">
          {note}
        </p>
      )}
    </Card>
  );
}

function ImportSection({
  error,
  preview,
  report,
  onPick,
  onConfirm,
  onCancel,
}: {
  readonly error: ImportFileError | null;
  readonly preview: ImportPreview | null;
  readonly report: ImportReport | null;
  readonly onPick: (file: File) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): JSX.Element {
  const c = COPY.import;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      <p className="st-text">{c.body}</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="st-file"
        aria-label={c.pick}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // Reset so picking the same file again re-fires onChange.
          e.target.value = "";
        }}
      />
      <div className="st-actions">
        <button
          type="button"
          className="st-btn st-btn--ghost"
          onClick={() => inputRef.current?.click()}
        >
          {c.pick}
        </button>
      </div>

      {error !== null && (
        <p className="st-note st-note--danger" role="alert">
          {c.badFile}
        </p>
      )}

      {preview !== null && (
        <div className="st-preview" role="group" aria-label={c.previewTitle}>
          <p className="st-preview__title">{c.previewTitle}</p>
          <ul className="st-preview__list">
            <li className="st-preview__item">{c.previewFound(preview.total)}</li>
            <li className="st-preview__item">{c.previewNew(preview.added)}</li>
            {preview.duplicate > 0 && (
              <li className="st-preview__item">{c.previewDup(preview.duplicate)}</li>
            )}
            {preview.invalid > 0 && (
              <li className="st-preview__item">{c.previewInvalid(preview.invalid)}</li>
            )}
          </ul>
          {preview.added === 0 && <p className="st-text st-text--muted">{c.previewNothing}</p>}
          <div className="st-actions">
            <button type="button" className="st-btn st-btn--primary" onClick={onConfirm}>
              {c.confirm}
            </button>
            <button type="button" className="st-btn st-btn--ghost" onClick={onCancel}>
              {c.cancel}
            </button>
          </div>
        </div>
      )}

      {report !== null && (
        /* aria-live="polite" + aria-atomic: announces the import report in full
           when it appears after the student confirms import (W5-6). */
        <div className="st-report" role="status" aria-live="polite" aria-atomic="true">
          <p className="st-preview__title">{c.reportTitle}</p>
          <ul className="st-preview__list">
            <li className="st-preview__item">{c.reportAdded(report.added)}</li>
            <li className="st-preview__item">{c.reportDuplicate(report.duplicate)}</li>
            {report.invalid > 0 && (
              <li className="st-preview__item">{c.reportInvalid(report.invalid)}</li>
            )}
          </ul>
          {report.invalidReasons.length > 0 && (
            <details className="st-report__reasons">
              <summary>{c.reportReasonsTitle}</summary>
              <ul className="st-preview__list">
                {report.invalidReasons.map((r) => (
                  <li key={`${r.index}:${r.reason}`} className="st-preview__item st-text--muted">
                    {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}

function StatusSection({
  status,
  deleted,
}: {
  readonly status: StatusView | null;
  readonly deleted: boolean;
}): JSX.Element {
  const c = COPY.status;
  if (status === null) {
    return (
      <Card eyebrow={c.eyebrow} title={c.title}>
        <p className="st-text st-text--muted" aria-busy="true">
          Reading the status of this device.
        </p>
      </Card>
    );
  }
  const storageText =
    status.storage === "persistent"
      ? c.storagePersistent
      : status.storage === "not-persisted"
        ? c.storageNotPersisted
        : c.storageDegraded;
  const examText =
    status.examAttempt === "september"
      ? c.examSeptember
      : status.examAttempt === "january"
        ? c.examJanuary
        : c.examUndecided;
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      {deleted && (
        <p className="st-note" role="status">
          {COPY.danger.done}
        </p>
      )}
      <dl className="st-rows">
        <Row label={c.storageLabel} value={storageText} />
        <Row label={c.installLabel} value={status.installed ? c.installYes : c.installNo} />
        <Row label={c.appVersionLabel} value={status.appVersion ?? "—"} mono />
        <Row label={c.packVersionLabel} value={status.packVersion ?? c.packNone} mono />
        <Row label={c.examLabel} value={examText} />
      </dl>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}): JSX.Element {
  return (
    <div className="st-row">
      <dt className="st-row__label">{label}</dt>
      <dd className={`st-row__value${mono ? " st-row__value--mono" : ""}`}>{value}</dd>
    </div>
  );
}

function UpdateSection({
  view,
  onCheck,
}: {
  readonly view: UpdateView;
  readonly onCheck: () => void;
}): JSX.Element {
  const c = COPY.update;
  const busy = view.kind === "checking" || view.kind === "downloading";
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      <p className="st-text">{c.body}</p>
      <div className="st-actions">
        <button type="button" className="st-btn st-btn--primary" onClick={onCheck} disabled={busy}>
          {view.kind === "checking" ? c.checking : c.check}
        </button>
      </div>
      <div className="st-update__state" aria-live="polite">
        {view.kind === "downloading" && <p className="st-note">{c.downloading}</p>}
        {view.kind === "up-to-date" && <p className="st-note">{c.upToDate}</p>}
        {view.kind === "offline" && <p className="st-note st-note--muted">{c.offline}</p>}
        {view.kind === "incompatible-app" && (
          <p className="st-note st-note--muted">{c.incompatibleApp}</p>
        )}
        {view.kind === "deferred" && <p className="st-note">{c.deferred}</p>}
        {view.kind === "applied" && (
          <div className="st-errata" role="status">
            <p className="st-note">{c.appliedTo(view.note.toVersion)}</p>
            <p className="st-errata__title">{c.errataTitle}</p>
            {view.note.errata.length === 0 ? (
              <p className="st-text st-text--muted">{c.errataNone}</p>
            ) : (
              <ul className="st-preview__list">
                {view.note.errata.map((line) => (
                  <li key={line} className="st-preview__item">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function TelemetrySection(): JSX.Element {
  const c = COPY.telemetry;
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      <div className="st-toggle">
        {/* Inert per ADR 0014: collection does not exist yet, so the control is
            disabled and reads OFF. No state, no handler. */}
        <span className="st-toggle__track" aria-hidden="true">
          <span className="st-toggle__knob" />
        </span>
        <span className="st-toggle__state">{c.stateOff}</span>
        <input
          type="checkbox"
          className="st-toggle__input"
          checked={false}
          disabled
          readOnly
          aria-label={c.title}
        />
      </div>
      <p className="st-text st-text--muted">{c.body}</p>
    </Card>
  );
}

function ReminderSection({
  setting,
  availability,
  onToggle,
  onChangeTime,
}: {
  readonly setting: ReminderSetting | null;
  readonly availability: ReminderAvailability;
  readonly onToggle: () => void;
  readonly onChangeTime: (time: string) => void;
}): JSX.Element {
  const c = COPY.reminder;
  const on = setting?.enabled === true;
  const time = setting?.time ?? "19:00";
  // The honest unavailability path: no Notification API (e.g. iOS uninstalled).
  if (availability === "unavailable") {
    return (
      <Card eyebrow={c.eyebrow} title={c.title}>
        <p className="st-text">{c.body}</p>
        <p className="st-text st-text--muted">{c.unavailable}</p>
      </Card>
    );
  }
  return (
    <Card eyebrow={c.eyebrow} title={c.title}>
      <p className="st-text">{c.body}</p>
      <p className="st-text st-text--muted">{c.limitation}</p>

      <div className="st-toggle">
        <span className="st-toggle__track" aria-hidden="true">
          <span className="st-toggle__knob" />
        </span>
        <span className="st-toggle__state">{on ? c.stateOn(time) : c.stateOff}</span>
        <input
          type="checkbox"
          className="st-toggle__input"
          checked={on}
          onChange={onToggle}
          aria-label={on ? c.disable : c.enable}
        />
      </div>

      {on && (
        <label className="st-field">
          <span className="st-field__label">{c.timeLabel}</span>
          <input
            type="time"
            className="st-field__input"
            value={time}
            onChange={(e) => onChangeTime(e.target.value)}
          />
        </label>
      )}

      {availability === "denied" && (
        <p className="st-note st-note--muted">{c.permissionDenied}</p>
      )}
      <p className="st-note" role="status">
        {on ? c.onNote : c.offNote}
      </p>
    </Card>
  );
}

function DangerSection({
  open,
  confirmText,
  deleted,
  onOpen,
  onCancel,
  onConfirmTextChange,
  onExportFirst,
  onDelete,
}: {
  readonly open: boolean;
  readonly confirmText: string;
  readonly deleted: boolean;
  readonly onOpen: () => void;
  readonly onCancel: () => void;
  readonly onConfirmTextChange: (value: string) => void;
  readonly onExportFirst: () => void;
  readonly onDelete: () => void;
}): JSX.Element {
  const c = COPY.danger;
  const confirmed = isDeleteConfirmed(confirmText, c.confirmWord);
  return (
    <Card eyebrow={c.eyebrow} title={c.title} tone="danger">
      <p className="st-text">{c.body}</p>
      {!open ? (
        <div className="st-actions">
          <button type="button" className="st-btn st-btn--danger-ghost" onClick={onOpen}>
            {c.open}
          </button>
        </div>
      ) : (
        <div className="st-danger__confirm">
          <div className="st-warning" role="note">
            <p className="st-warning__body">{c.nudge}</p>
            <button type="button" className="st-btn st-btn--ghost" onClick={onExportFirst}>
              {c.nudgeCta}
            </button>
          </div>
          <label className="st-field">
            <span className="st-field__label">{c.confirmLabel}</span>
            <input
              type="text"
              className="st-field__input"
              value={confirmText}
              placeholder={c.confirmPlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              onChange={(e) => onConfirmTextChange(e.target.value)}
            />
          </label>
          <div className="st-actions">
            <button
              type="button"
              className="st-btn st-btn--danger"
              disabled={!confirmed}
              onClick={onDelete}
            >
              {c.cta}
            </button>
            <button type="button" className="st-btn st-btn--ghost" onClick={onCancel}>
              {c.cancel}
            </button>
          </div>
        </div>
      )}
      {deleted && (
        <p className="st-note" role="status">
          {c.done}
        </p>
      )}
    </Card>
  );
}
