/**
 * First-run flow — phone-native (W5-5 flow d, ADR 0008 + ADR 0011).
 *
 * The thin React renderer over the pure sequencing logic in machine.ts. It owns
 * only what it must: the platform probe (storage capabilities + the install
 * prompt + iOS/standalone heuristics), the requestPersistence() side effect, the
 * storage adapter (to persist the exam attempt and the completion flag), and the
 * step cursor. Every "which step shows when" decision is delegated to the tested
 * functions so nothing load-bearing lives inline in JSX.
 *
 * Layout: 360px-first (ADR 0011), 44px touch targets, visible focus rings,
 * tokens only (firstrun.css). Copy lives in copy.ts and is voice-checked there.
 *
 * Second-tab: opening storage here can throw AlreadyOpenError; we render the
 * SecondTabScreen with a takeover that reopens with { steal: true }.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlreadyOpenError,
  detectCapabilities,
  isPersisted,
  getSharedStorage, takeoverSharedStorage,
  requestPersistence,
  type StorageAdapter,
} from "../../storage/index.js";
import {
  firstRunSequence,
  installVariant,
  nextStep,
  storageState,
  type ExamAttempt,
  type FirstRunPlatform,
  type FirstRunStep,
  type StorageState,
} from "./machine.js";
import {
  hasInstallPrompt,
  isIosSafari,
  isStandalone,
  showInstallPrompt,
} from "./platform.js";
import { markFirstRunComplete, setExamAttempt } from "./meta.js";
import { SecondTabScreen } from "./SecondTabScreen.js";
import { COPY } from "./copy.js";
import "./firstrun.css";

/** Probe the live platform once at mount. Pure reads of the browser, gathered
 * into the data shape the sequencer consumes. */
function probePlatform(): FirstRunPlatform {
  const caps = detectCapabilities();
  return {
    inAppWebview: caps.inAppWebview,
    installPromptAvailable: hasInstallPrompt(),
    iosSafari: isIosSafari(),
    standalone: isStandalone(),
  };
}

export interface FirstRunFlowProps {
  /** Called once the run is complete (or skipped to the end): hand off to
   * practice. The completion flag is persisted before this fires. */
  readonly onComplete: () => void;
}

export function FirstRunFlow({ onComplete }: FirstRunFlowProps): JSX.Element {
  // Platform is fixed for the life of the run (a beforeinstallprompt that
  // arrives mid-run is rare; the captured stash still serves it on the install
  // step via showInstallPrompt()).
  const platform = useMemo(probePlatform, []);
  const sequence = useMemo(() => firstRunSequence(platform), [platform]);
  const variant = useMemo(() => installVariant(platform), [platform]);

  const [step, setStep] = useState<FirstRunStep>(() => sequence[0] ?? "storage");
  const [secondTab, setSecondTab] = useState(false);
  const [takingOver, setTakingOver] = useState(false);

  // Storage state for the honest readout, resolved when the storage step shows.
  const [storage, setStorage] = useState<StorageState | null>(null);

  const adapterRef = useRef<StorageAdapter | null>(null);
  const attemptRef = useRef<ExamAttempt>("undecided");

  // Open storage lazily: the welcome and webview steps need no storage, so we
  // defer the (wasm-loading) open until the run actually advances toward the
  // exam/storage steps. A webview run never opens storage at all (ADR 0008).
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
      // Any other failure degrades to no-storage; the honest readout will say so.
      return null;
    }
  }, []);

  // Release the connection on unmount.
  useEffect(() => {
    return () => {
      // Shared page-level connection stays open for the page lifetime.
    };
  }, []);

  // ---- Step transitions. ---------------------------------------------------

  const finish = useCallback(async (): Promise<void> => {
    const adapter = await ensureAdapter();
    if (secondTab) return; // a takeover decision is pending; do not complete
    if (adapter !== null) {
      await setExamAttempt(adapter, attemptRef.current);
      await markFirstRunComplete(adapter);
    }
    onComplete();
  }, [ensureAdapter, onComplete, secondTab]);

  const advance = useCallback(
    (from: FirstRunStep): void => {
      const next = nextStep(sequence, from);
      if (next === null) {
        void finish();
        return;
      }
      setStep(next);
    },
    [sequence, finish],
  );

  // When the storage step is reached, request persistence and resolve the
  // honest state (ADR 0008: requestPersistence is a courtesy; we report truth).
  useEffect(() => {
    if (step !== "storage") return;
    let cancelled = false;
    void (async () => {
      const adapter = await ensureAdapter();
      if (cancelled) return;
      if (adapter === null) {
        // Could not open (degraded or second-tab). Second-tab renders its own
        // screen; otherwise report degraded.
        if (!secondTab) setStorage("degraded");
        return;
      }
      const caps = detectCapabilities();
      await requestPersistence();
      const persisted = await isPersisted();
      if (cancelled) return;
      setStorage(storageState(caps.sahpoolViable, persisted));
    })();
    return () => {
      cancelled = true;
    };
  }, [step, ensureAdapter, secondTab]);

  // Takeover from the second-tab screen: reopen with steal, then resume the
  // step we were on.
  const onTakeover = useCallback((): void => {
    setTakingOver(true);
    void (async () => {
      adapterRef.current = null;
      const adapter = await ensureAdapter(true);
      setTakingOver(false);
      if (adapter !== null) setSecondTab(false);
    })();
  }, [ensureAdapter]);

  // ---- Render. -------------------------------------------------------------

  if (secondTab) {
    return <SecondTabScreen onTakeover={onTakeover} takingOver={takingOver} />;
  }

  switch (step) {
    case "webview":
      return <WebviewStep />;
    case "welcome":
      return <WelcomeStep onNext={() => advance("welcome")} />;
    case "install":
      return (
        <InstallStep
          variant={variant === "none" ? "ios-manual" : variant}
          onNext={() => advance("install")}
        />
      );
    case "exam":
      return (
        <ExamStep
          onChoose={(a) => {
            attemptRef.current = a;
            advance("exam");
          }}
          onSkip={() => advance("exam")}
        />
      );
    case "storage":
      return <StorageStep state={storage} onDone={() => void finish()} />;
  }
}

// ---------------------------------------------------------------------------
// Step views. Each is a pure function of its props (no storage, no logic).
// ---------------------------------------------------------------------------

/** Shared card frame. */
function Frame({ children }: { readonly children: React.ReactNode }): JSX.Element {
  return (
    <div className="fr-screen">
      <main className="fr-body">
        <section className="fr-card">{children}</section>
      </main>
    </div>
  );
}

function WebviewStep(): JSX.Element {
  const c = COPY.webview;
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
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{c.title}</h1>
      <p className="fr-text">{c.body}</p>
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
    </Frame>
  );
}

function WelcomeStep({ onNext }: { readonly onNext: () => void }): JSX.Element {
  const c = COPY.welcome;
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{c.title}</h1>
      <ul className="fr-points">
        {c.points.map((p) => (
          <li key={p} className="fr-points__item">
            {p}
          </li>
        ))}
      </ul>
      <p className="fr-text">{c.body}</p>
      <div className="fr-actions">
        <button type="button" className="fr-btn fr-btn--primary" onClick={onNext}>
          {c.cta}
        </button>
      </div>
    </Frame>
  );
}

function InstallStep({
  variant,
  onNext,
}: {
  readonly variant: "prompt" | "ios-manual";
  readonly onNext: () => void;
}): JSX.Element {
  const [note, setNote] = useState<string | null>(null);

  if (variant === "prompt") {
    const c = COPY.installPrompt;
    const onInstall = (): void => {
      void showInstallPrompt().then((outcome) => {
        if (outcome === "accepted") {
          setNote(c.installedNote);
        } else if (outcome === "dismissed") {
          setNote(c.dismissedNote);
        } else {
          // Nothing to prompt (already gone): just move on.
          onNext();
        }
      });
    };
    return (
      <Frame>
        <p className="fr-eyebrow">{c.eyebrow}</p>
        <h1 className="fr-title">{c.title}</h1>
        <p className="fr-text">{c.body}</p>
        {note !== null && (
          <p className="fr-note" role="status">
            {note}
          </p>
        )}
        <div className="fr-actions fr-actions--stack">
          <button type="button" className="fr-btn fr-btn--primary" onClick={onInstall}>
            {c.cta}
          </button>
          <button type="button" className="fr-btn fr-btn--ghost" onClick={onNext}>
            {c.skip}
          </button>
        </div>
      </Frame>
    );
  }

  // ios-manual
  const c = COPY.installIos;
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{c.title}</h1>
      <p className="fr-text">{c.body}</p>
      <ol className="fr-steps">
        {c.steps.map((s, i) => (
          <li key={s} className="fr-steps__item">
            <span className="fr-steps__n">{i + 1}</span>
            <span className="fr-steps__body">{s}</span>
          </li>
        ))}
      </ol>
      <div className="fr-warning" role="note">
        <p className="fr-warning__body">{c.eviction}</p>
      </div>
      <div className="fr-actions">
        <button type="button" className="fr-btn fr-btn--ghost" onClick={onNext}>
          {c.skip}
        </button>
      </div>
    </Frame>
  );
}

function ExamStep({
  onChoose,
  onSkip,
}: {
  readonly onChoose: (attempt: ExamAttempt) => void;
  readonly onSkip: () => void;
}): JSX.Element {
  const c = COPY.exam;
  const [picked, setPicked] = useState<ExamAttempt | null>(null);
  const choices: readonly { readonly value: ExamAttempt; readonly label: string }[] = [
    { value: "september", label: c.options.september },
    { value: "january", label: c.options.january },
    { value: "undecided", label: c.options.undecided },
  ];
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{c.title}</h1>
      <p className="fr-text">{c.body}</p>
      <div className="fr-choices" role="radiogroup" aria-label={c.title}>
        {choices.map((ch) => {
          const selected = picked === ch.value;
          return (
            <button
              key={ch.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`fr-choice${selected ? " fr-choice--picked" : ""}`}
              onClick={() => setPicked(ch.value)}
            >
              {ch.label}
            </button>
          );
        })}
      </div>
      <div className="fr-actions fr-actions--stack">
        <button
          type="button"
          className="fr-btn fr-btn--primary"
          disabled={picked === null}
          onClick={() => picked !== null && onChoose(picked)}
        >
          {c.cta}
        </button>
        <button type="button" className="fr-btn fr-btn--ghost" onClick={onSkip}>
          {c.skip}
        </button>
      </div>
    </Frame>
  );
}

function StorageStep({
  state,
  onDone,
}: {
  readonly state: StorageState | null;
  readonly onDone: () => void;
}): JSX.Element {
  const c = COPY.storage;
  if (state === null) {
    return (
      <Frame>
        <section className="fr-status" aria-busy="true">
          <p className="fr-eyebrow">{c.eyebrow}</p>
          <p className="fr-text">Checking how your progress is stored.</p>
        </section>
      </Frame>
    );
  }
  const title =
    state === "persistent"
      ? c.titlePersistent
      : state === "not-persisted"
        ? c.titleNotPersisted
        : c.titleDegraded;
  const body =
    state === "persistent"
      ? c.bodyPersistent
      : state === "not-persisted"
        ? c.bodyNotPersisted
        : c.bodyDegraded;
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{title}</h1>
      <p className="fr-text">{body}</p>
      {state === "degraded" && (
        <div className="fr-warning" role="note">
          <p className="fr-warning__body">{c.exportPromote}</p>
        </div>
      )}
      <div className="fr-actions">
        <button type="button" className="fr-btn fr-btn--primary" onClick={onDone}>
          {c.cta}
        </button>
      </div>
    </Frame>
  );
}
