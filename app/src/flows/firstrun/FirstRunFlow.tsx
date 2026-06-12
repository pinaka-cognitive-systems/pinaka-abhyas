/**
 * FirstRunFlow — design-parity rebuild per scr-core.jsx:8-41.
 *
 * Single dark-themed centered screen: chevron mark, promise headline,
 * three-step how-strip, paper picker chip, optional exam-date field,
 * primary Start button, local-first footer caveat.
 *
 * The webview escape still leads when inside an in-app browser. The
 * second-tab screen still fires on AlreadyOpenError. The multi-step
 * machine/install walkthrough is removed — install moves to Settings.
 *
 * Storage honesty: when the storage backend is non-persistent (degraded),
 * one Caveat line appears below the footer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "../../components/ui.js";
import {
  AlreadyOpenError,
  detectCapabilities,
  getSharedStorage,
  isPersisted,
  takeoverSharedStorage,
  type StorageAdapter,
} from "../../storage/index.js";
import { invalidateAppSnapshot } from "../../state/appData.js";
import {
  installVariant,
  storageState,
  type FirstRunPlatform,
} from "./machine.js";
import {
  hasInstallPrompt,
  isIosSafari,
  isStandalone,
} from "./platform.js";
import { markFirstRunComplete } from "./meta.js";
import { META_EXAM_DATE } from "../../engine/insights.js";
import { SecondTabScreen } from "./SecondTabScreen.js";
import { COPY } from "./copy.js";
import "./firstrun.css";

/** Probe the live platform once at mount. Pure reads of the browser. */
function probePlatform(): FirstRunPlatform {
  const caps = detectCapabilities();
  return {
    inAppWebview: caps.inAppWebview,
    installPromptAvailable: hasInstallPrompt(),
    iosSafari: isIosSafari(),
    standalone: isStandalone(),
  };
}

/**
 * Parse a free-text exam date entry ("Sep 2026", "September 2026", "2026-09",
 * etc.) to an ISO "YYYY-MM" string the engine stores, or null when blank/unparseable.
 */
function parseExamDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Already "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  // "2026-09-16" or similar — take the first two parts
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // Month name + year: "Sep 2026", "September 2026"
  const MONTHS: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const textMatch = trimmed.match(/([a-z]+)\s+(\d{4})/i);
  if (textMatch) {
    const mon = MONTHS[textMatch[1]!.toLowerCase().slice(0, 3)];
    if (mon) return `${textMatch[2]}-${mon}`;
  }
  return null;
}

export interface FirstRunFlowProps {
  /** Called once the first-run completes: hand off to Today. */
  readonly onComplete: () => void;
  /** Kept in the signature for router compatibility; may be unused. */
  readonly onSkipToPractice: () => void;
}

export function FirstRunFlow({ onComplete }: FirstRunFlowProps): JSX.Element {
  const platform = useMemo(probePlatform, []);

  // installVariant is kept here in case the install card needs it later (Settings).
  const _variant = useMemo(() => installVariant(platform), [platform]);
  void _variant;

  const [secondTab, setSecondTab] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const adapterRef = useRef<StorageAdapter | null>(null);

  const ensureAdapter = useCallback(async (steal = false): Promise<StorageAdapter | null> => {
    if (adapterRef.current !== null) return adapterRef.current;
    try {
      const { adapter } = await (steal ? takeoverSharedStorage() : getSharedStorage());
      adapterRef.current = adapter;
      return adapter;
    } catch (err) {
      if (err instanceof AlreadyOpenError) {
        setSecondTab(true);
        return null;
      }
      return null;
    }
  }, []);

  // Check storage honesty on mount: show the caveat when storage is degraded.
  useEffect(() => {
    const caps = detectCapabilities();
    void (async () => {
      const adapter = await ensureAdapter();
      if (adapter === null) return;
      const persisted = await isPersisted();
      const state = storageState(caps.sahpoolViable, persisted);
      setDegraded(state === "degraded");
    })();
  }, [ensureAdapter]);

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

  if (platform.inAppWebview) {
    return <WebviewEscape />;
  }

  return <WelcomeScreen ensureAdapter={ensureAdapter} degraded={degraded} onComplete={onComplete} />;
}

// ---------------------------------------------------------------------------
// Webview escape (in-app browser path; no storage opened)
// ---------------------------------------------------------------------------

function WebviewEscape(): JSX.Element {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : window.location.href;
  const onCopy = useCallback((): void => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    }
  }, [link]);
  const c = COPY.webview;
  return (
    <div className="fr-screen">
      <main className="fr-body">
        <section className="fr-card">
          <p className="fr-eyebrow">{c.eyebrow}</p>
          <h1 className="fr-title">{c.title}</h1>
          <p className="fr-text fr-text--muted">{c.body}</p>
          <p className="fr-text fr-text--muted">{c.how}</p>
          <div className="fr-actions">
            <button type="button" className="fr-btn fr-btn--primary" onClick={onCopy}>
              {c.copyButton}
            </button>
          </div>
          {copied && (
            <p className="fr-note" role="status">
              {c.copiedNote}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome screen (the design's FirstRun: .flow-screen > .fr)
// ---------------------------------------------------------------------------

function WelcomeScreen({
  ensureAdapter,
  degraded,
  onComplete,
}: {
  readonly ensureAdapter: (steal?: boolean) => Promise<StorageAdapter | null>;
  readonly degraded: boolean;
  readonly onComplete: () => void;
}): JSX.Element {
  const [paper, setPaper] = useState<"qa">("qa");
  const [date, setDate] = useState("");
  const [starting, setStarting] = useState(false);

  const onStart = useCallback((): void => {
    if (starting) return;
    setStarting(true);
    void (async () => {
      const adapter = await ensureAdapter();
      if (adapter !== null) {
        await markFirstRunComplete(adapter);
        const parsed = parseExamDate(date);
        if (parsed !== null) {
          await adapter.setMeta(META_EXAM_DATE, parsed);
        }
      }
      invalidateAppSnapshot();
      onComplete();
    })();
  }, [starting, ensureAdapter, date, onComplete]);

  void paper; // only qa for now; state kept for future multi-paper

  return (
    <div className="flow-screen">
      <div className="fr">
        <div className="fr__mark">
          <Icon name="chevron-mark" size={40} />
        </div>
        <h1 className="fr__promise">Taught by testing.</h1>
        <p className="fr__sub">
          Pinaka does not teach the syllabus. It reads your mocks, names the exact errors
          costing you marks, and tells you what to fix. Everything runs on this device.
        </p>

        <div className="fr__how">
          <div className="fr__step">
            <div className="fr__step-n">01</div>
            <div className="fr__step-title">Sit a mock</div>
            <div className="fr__step-text">A full paper under real timing. The data starts there.</div>
          </div>
          <div className="fr__step">
            <div className="fr__step-n">02</div>
            <div className="fr__step-title">Read the diagnosis</div>
            <div className="fr__step-text">Your weakest topics and the misconceptions behind them, named.</div>
          </div>
          <div className="fr__step">
            <div className="fr__step-n">03</div>
            <div className="fr__step-title">Drill what matters</div>
            <div className="fr__step-text">Resurfaced on a schedule until the error stops returning.</div>
          </div>
        </div>

        <div className="fr__pick">
          <button
            type="button"
            className="fr-chip is-sel"
            onClick={() => setPaper("qa")}
          >
            CA Foundation · Paper 3 QA
          </button>
          <button type="button" className="fr-chip is-disabled" disabled>
            More papers soon
          </button>
        </div>

        <div className="fr__date">
          <Icon name="clock" size={14} />
          Exam date (optional)
          <input
            className="fr__date-input"
            type="text"
            placeholder="Sep 2026"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Exam date, optional, for example Sep 2026"
          />
        </div>

        <button
          type="button"
          className="btn-dark btn-dark--primary"
          style={{ padding: "12px 28px", fontSize: "var(--text-base)" }}
          onClick={onStart}
          disabled={starting}
        >
          Start <Icon name="arrow-right" size={16} />
        </button>

        <div className="fr__local">
          <Icon name="dot" size={10} />
          No account. No cloud. Nothing leaves this device.
        </div>

        {degraded && (
          <span className="caveat" style={{ marginTop: "var(--space-3)", justifyContent: "center" }}>
            <Icon name="dot" size={10} />
            This browser cannot store progress between sessions. Export often, or install the app.
          </span>
        )}
      </div>
    </div>
  );
}
