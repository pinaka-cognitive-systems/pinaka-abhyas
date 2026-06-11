/**
 * First-run flow — phone-native (W5-5 flow d, ADR 0008 + ADR 0011).
 *
 * Value-first order: one screen before the first question. Commitments
 * (install, exam-date) are asked on the baseline close screen, after the
 * student has seen their first map.
 *
 * The thin React renderer over the pure sequencing logic in machine.ts. It
 * owns only what it must: the platform probe (storage capabilities + the
 * install prompt + iOS/standalone heuristics), the storage adapter (to
 * persist the completion flag), and the step cursor. Every "which step shows
 * when" decision is delegated to the tested functions so nothing load-bearing
 * lives inline in JSX.
 *
 * Layout: 360px-first (ADR 0011), 44px touch targets, visible focus rings,
 * tokens only (firstrun.css). Copy lives in copy.ts and is voice-checked there.
 *
 * Second-tab: opening storage here can throw AlreadyOpenError; we render the
 * SecondTabScreen with a takeover that reopens with { steal: true }.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "../../components/BrandMark.js";
import {
  AlreadyOpenError,
  detectCapabilities,
  getSharedStorage, takeoverSharedStorage,
  type StorageAdapter,
} from "../../storage/index.js";
import {
  firstRunSequence,
  installVariant,
  nextStep,
  type FirstRunPlatform,
  type FirstRunStep,
} from "./machine.js";
import {
  hasInstallPrompt,
  isIosSafari,
  isStandalone,
} from "./platform.js";
import { markFirstRunComplete, setExamAttempt } from "./meta.js";
import { markBaselineDone } from "../baseline/meta.js";
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
   * the baseline. The completion flag is persisted before this fires. */
  readonly onComplete: () => void;
  /** Called when the student chooses "I would rather just practise": marks
   * both first-run and baseline done, then hands off to practice. */
  readonly onSkipToPractice: () => void;
}

export function FirstRunFlow({ onComplete, onSkipToPractice }: FirstRunFlowProps): JSX.Element {
  const platform = useMemo(probePlatform, []);
  const sequence = useMemo(() => firstRunSequence(platform), [platform]);

  // installVariant is exported so the baseline close screen can use it.
  // We compute it here and make it available via a ref so the closure is stable.
  const _variant = useMemo(() => installVariant(platform), [platform]);
  void _variant; // consumed by the baseline close; not used directly here

  const [step, setStep] = useState<FirstRunStep>(() => sequence[0] ?? "welcome");
  const [secondTab, setSecondTab] = useState(false);
  const [takingOver, setTakingOver] = useState(false);

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

  useEffect(() => {
    return () => {
      // Shared page-level connection stays open for the page lifetime.
    };
  }, []);

  // Finish the first-run sequence: mark complete and hand off to the baseline.
  const finish = useCallback(async (): Promise<void> => {
    const adapter = await ensureAdapter();
    if (secondTab) return;
    if (adapter !== null) {
      await markFirstRunComplete(adapter);
    }
    onComplete();
  }, [ensureAdapter, onComplete, secondTab]);

  // Skip baseline entirely: mark first-run done, mark baseline done, go to practice.
  const skipToBaseline = useCallback(async (): Promise<void> => {
    const adapter = await ensureAdapter();
    if (secondTab) return;
    if (adapter !== null) {
      await markFirstRunComplete(adapter);
      await setExamAttempt(adapter, "undecided");
      await markBaselineDone(adapter);
    }
    onSkipToPractice();
  }, [ensureAdapter, onSkipToPractice, secondTab]);

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

  switch (step) {
    case "webview":
      return <WebviewStep />;
    case "welcome":
      return (
        <WelcomeStep
          onNext={() => advance("welcome")}
          onSkip={() => void skipToBaseline()}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Step views.
// ---------------------------------------------------------------------------

/** Shared card frame. The lockup leads every step. */
function Frame({ children }: { readonly children: React.ReactNode }): JSX.Element {
  return (
    <div className="fr-screen">
      <main className="fr-body">
        <section className="fr-card">
          <BrandMark />
          {children}
        </section>
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

function WelcomeStep({
  onNext,
  onSkip,
}: {
  readonly onNext: () => void;
  readonly onSkip: () => void;
}): JSX.Element {
  const c = COPY.welcome;
  return (
    <Frame>
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <h1 className="fr-title">{c.title}</h1>
      <p className="fr-text fr-text--muted">{c.assurance}</p>
      <div className="fr-actions fr-actions--stack">
        <button type="button" className="fr-btn fr-btn--primary" onClick={onNext}>
          {c.cta}
        </button>
        <button type="button" className="fr-btn fr-btn--ghost" onClick={onSkip}>
          {c.skip}
        </button>
      </div>
    </Frame>
  );
}
