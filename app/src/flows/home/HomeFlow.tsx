/**
 * Home surface — the default route for a returning student (W5-9).
 *
 * The thin React renderer over the pure logic in logic.ts, delta.ts, reminder.ts,
 * and instrument.ts. It owns only the side effects it cannot avoid: the storage
 * adapter, the rebuilt engine state, the clock (Date.now read once at the
 * boundary), and the reminder scheduler's browser env. Every decision — what
 * today holds, whether to lead with re-entry, what the delta says, the done
 * state — is delegated to tested functions so nothing load-bearing lives in JSX.
 *
 * Spec (docs/design/adherence-spec.md):
 *   - Mechanism 1: a single decision-bearing today card, sized to the engine's
 *     session, with what it contains drawn from the engine's selection tiers,
 *     one begin action into #/practice, and the DONE close.
 *   - Mechanism 2: the delta line above the card, on a new calendar day with
 *     prior history.
 *   - Mechanism 3: the re-entry lead past the 7-day gap; never the gap length.
 *   - Instrumentation: per-day mechanism-on-screen flags recorded into meta on
 *     session start; the reminder is armed on open.
 *
 * Layout (ADR 0011): 360px-first, 44px touch targets, one visible focus ring,
 * tokens only (home.css). Copy lives in copy.ts and is voice-checked there.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildEngineState,
  DEFAULT_SESSION_LENGTH,
  type LoadedPack,
} from "../../engine/index.js";
import type { EngineState } from "@pinaka/engine";
import { getSharedStorage, type StorageAdapter, type StoredEvent } from "../../storage/index.js";
import { MOCK_SESSION_META_KEY, parseSession } from "../mock/state.js";
import { getExamMs } from "../firstrun/meta.js";
import {
  deriveTodayCard,
  eventsBefore,
  eventsSince,
  isReentry,
  isTodayDone,
  priorDayBoundaryMs,
  type TodayCard,
} from "./logic.js";
import { buildDelta, deltaLine, type Delta } from "./delta.js";
import { armReminder, readReminder, type ReminderEnv } from "./reminder.js";
import { recordSessionStart } from "./instrument.js";
import { COPY } from "./copy.js";
import "./home.css";

/** A loaded home snapshot: everything the views read, computed once per load. */
interface Snapshot {
  readonly card: TodayCard;
  /** The delta view model and the prior-day weekday label, or null when there
   * is no prior-day history to compare against. */
  readonly delta: { readonly model: Delta; readonly weekday: string } | null;
  readonly reentry: boolean;
  readonly done: boolean;
  /** True when a parseable in-progress mock session exists in meta. */
  readonly mockInProgress: boolean;
}

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly snap: Snapshot };

export interface HomeFlowProps {
  /** Begin today's session (the router navigates to #/practice). */
  readonly onBegin: () => void;
  /** Open settings. */
  readonly onSettings: () => void;
  /** Open the diagnosis + readiness surface. */
  readonly onDiagnosis: () => void;
  /** Navigate to the mock flow (start or resume). */
  readonly onMock: () => void;
}

/** The local weekday name of an epoch-ms instant, e.g. "Tuesday". Uses the
 * device locale; it names a calendar day, never a count of days. */
function weekdayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "long" });
}

/** Build the reminder's browser env from the live Notification API. Isolated
 * here so the pure scheduler in reminder.ts stays DOM-free and testable.
 * `onFired` records the per-day "reminder fired" instrumentation flag. */
function browserReminderEnv(onFired: () => void): ReminderEnv {
  return {
    caps() {
      const hasNotificationApi =
        typeof window !== "undefined" && "Notification" in window;
      return {
        hasNotificationApi,
        permission: hasNotificationApi ? Notification.permission : null,
      };
    },
    async requestPermission() {
      if (typeof window === "undefined" || !("Notification" in window)) return "denied";
      return Notification.requestPermission();
    },
    schedule(delayMs, fire) {
      const id = window.setTimeout(fire, delayMs);
      return () => window.clearTimeout(id);
    },
    notify(title, body) {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      // Construct the notification for its side effect (showing the alarm).
      void new Notification(title, { body });
      onFired();
    },
    localNow() {
      const now = new Date();
      const localMsIntoDay =
        ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 +
        now.getMilliseconds();
      return { nowMs: now.getTime(), localMsIntoDay };
    },
  };
}

export function HomeFlow({ onBegin, onSettings, onDiagnosis, onMock }: HomeFlowProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const adapterRef = useRef<StorageAdapter | null>(null);
  const cancelReminderRef = useRef<(() => void) | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [{ loadCaPack }] = await Promise.all([import("../../engine/caPack.js")]);
    const pack: LoadedPack = await loadCaPack();
    const { adapter } = await getSharedStorage();
    adapterRef.current = adapter;

    const nowMs = Date.now();
    const examMs = await getExamMs(adapter);
    const [events, mockMetaRaw]: [StoredEvent[], string | null] = await Promise.all([
      adapter.readAllEvents(),
      adapter.getMeta(MOCK_SESSION_META_KEY),
    ]);

    // "Now" state: the full log replayed at nowMs.
    const now: EngineState = buildEngineState(events, pack.bank, nowMs, examMs);

    // Mechanism 1: the today card from the engine's actual tiers.
    const card = deriveTodayCard(now, pack, nowMs);

    // Done state: traceable to engine plan + today's answered count.
    const boundary = priorDayBoundaryMs(nowMs);
    const answeredToday = eventsSince(events, boundary);
    const done = isTodayDone(card, answeredToday, DEFAULT_SESSION_LENGTH);

    // Mechanism 3: re-entry past the 7-day gap (never the gap length).
    const reentry = isReentry(now, nowMs);

    // Mechanism 2: the delta, from the "then" state replayed up to the prior
    // boundary. Built only when there IS prior-day history to compare against.
    const before = eventsBefore(events, boundary);
    let delta: Snapshot["delta"] = null;
    if (before.length > 0) {
      const then = buildEngineState(before, pack.bank, boundary, examMs);
      const since = answeredToday;
      const model = buildDelta(then, now, since, pack.marking.negativePerWrong);
      // Weekday of the prior session: the last activity before the boundary.
      const priorLast = before[before.length - 1]!.occurredAtMs;
      delta = { model, weekday: weekdayLabel(priorLast) };
    }

    // Instrumentation: record which mechanisms are on the screen as the student
    // lands on the home surface (the session-start observation; the reminder
    // flag is folded by the practice loop when it fires, not here).
    void recordSessionStart(adapter, nowMs, {
      todayCard: !done,
      deltaLine: delta !== null,
      reentry,
    });

    // Mechanism 4: arm the next reminder on open (no background sync). The
    // env's onFired records the per-day "reminder fired" instrumentation flag.
    const setting = await readReminder(adapter);
    cancelReminderRef.current?.();
    const env = browserReminderEnv(() => {
      void recordSessionStart(adapter, Date.now(), { reminderFired: true });
    });
    cancelReminderRef.current = armReminder(setting, env, {
      title: "Pinaka Abhyas",
      body: "Time to study. A short session is ready.",
    });

    const mockInProgress = parseSession(mockMetaRaw) !== null;

    setPhase({ kind: "loaded", snap: { card, delta, reentry, done, mockInProgress } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().catch((err: unknown) => {
      if (cancelled) return;
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "The home screen could not load.",
      });
    });
    return () => {
      cancelled = true;
      cancelReminderRef.current?.();
      // Shared page-level connection stays open for the page lifetime.
    };
  }, [load]);

  if (phase.kind === "loading") {
    return (
      <Frame onSettings={onSettings}>
        <section className="hm-status" aria-busy="true">
          <p className="hm-status__label">Loading</p>
        </section>
      </Frame>
    );
  }

  if (phase.kind === "error") {
    return (
      <Frame onSettings={onSettings}>
        <section className="hm-status hm-status--error" role="alert">
          <p className="hm-status__label">Home could not load</p>
          <p className="hm-status__body">{phase.message}</p>
          <div className="hm-actions">
            <button type="button" className="hm-btn hm-btn--primary" onClick={onBegin}>
              {COPY.today.begin}
            </button>
          </div>
        </section>
      </Frame>
    );
  }

  const { card, delta, reentry, done, mockInProgress } = phase.snap;
  return (
    <Frame onSettings={onSettings}>
      {reentry && (
        <section className="hm-reentry" aria-label={COPY.reentry.eyebrow}>
          <p className="hm-reentry__eyebrow">{COPY.reentry.eyebrow}</p>
          <p className="hm-reentry__lead">{COPY.reentry.lead}</p>
        </section>
      )}

      {delta !== null && (
        <p className="hm-delta" role="status">
          {deltaLine(delta.model, delta.weekday)}
        </p>
      )}

      {done ? (
        <section className="hm-card" aria-label={COPY.today.doneEyebrow}>
          <p className="hm-done__eyebrow">{COPY.today.doneEyebrow}</p>
          <h1 className="hm-done__title">{COPY.today.doneTitle}</h1>
          <p className="hm-done__body">{COPY.today.doneBody}</p>
        </section>
      ) : (
        <section className="hm-card" aria-label={COPY.today.eyebrow}>
          <p className="hm-card__eyebrow">{COPY.today.eyebrow}</p>
          <h1 className="hm-card__title">{COPY.today.title(card.total)}</h1>
          <p className="hm-card__lead">{COPY.today.lead}</p>
          <ul className="hm-card__contents">
            {card.reviews > 0 && (
              <li className="hm-card__item">{COPY.today.reviews(card.reviews)}</li>
            )}
            {card.remediation > 0 && (
              <li className="hm-card__item">{COPY.today.remediation(card.remediation)}</li>
            )}
            {card.practice > 0 && (
              <li className="hm-card__item">{COPY.today.practice(card.practice)}</li>
            )}
            {card.coverage > 0 && (
              <li className="hm-card__item">{COPY.today.coverage(card.coverage)}</li>
            )}
          </ul>
          <div className="hm-actions">
            <button
              type="button"
              className="hm-btn hm-btn--primary"
              aria-label={COPY.today.beginAria}
              onClick={onBegin}
            >
              {COPY.today.begin}
            </button>
          </div>
        </section>
      )}

      <section className="hm-block" aria-label={COPY.mock.eyebrow}>
        <div className="hm-block__head">
          <p className="hm-block__eyebrow">{COPY.mock.eyebrow}</p>
          <h2 className="hm-block__title">{COPY.mock.title}</h2>
        </div>
        <p className="hm-block__lede">
          {mockInProgress ? COPY.mock.resumeLede : COPY.mock.lede}
        </p>
        <div className="hm-actions">
          <button
            type="button"
            className="hm-btn hm-btn--secondary"
            aria-label={mockInProgress ? COPY.mock.resumeAria : COPY.mock.startAria}
            onClick={onMock}
          >
            {mockInProgress ? COPY.mock.resume : COPY.mock.start}
          </button>
        </div>
      </section>

      <section className="hm-block hm-block--diagnosis" aria-label={COPY.diagnosis.eyebrow}>
        <div className="hm-block__head">
          <p className="hm-block__eyebrow">{COPY.diagnosis.eyebrow}</p>
        </div>
        <p className="hm-block__lede">{COPY.diagnosis.lede}</p>
        <div className="hm-actions">
          <button
            type="button"
            className="hm-btn hm-btn--ghost"
            aria-label={COPY.diagnosis.actionAria}
            onClick={onDiagnosis}
          >
            {COPY.diagnosis.action}
          </button>
        </div>
      </section>
    </Frame>
  );
}

/** The persistent home frame: title bar with the settings link. */
function Frame({
  children,
  onSettings,
}: {
  readonly children: React.ReactNode;
  readonly onSettings: () => void;
}): JSX.Element {
  return (
    <div className="hm-screen">
      <header className="hm-bar">
        <span className="hm-bar__title">{COPY.frame.title}</span>
        <span className="hm-bar__actions">
          <button
            type="button"
            className="hm-bar__link"
            aria-label={COPY.frame.settingsAria}
            onClick={onSettings}
          >
            {COPY.frame.settings}
          </button>
        </span>
      </header>
      <main className="hm-body">{children}</main>
    </div>
  );
}
