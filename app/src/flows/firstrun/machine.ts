/**
 * First-run sequencing logic (W5-5 flow d, ADR 0008 + ADR 0011).
 *
 * ALL of the "which step shows when" logic lives here as pure functions, so the
 * React component (FirstRunFlow.tsx) is a thin renderer and the sequencing is
 * tested DOM-free (the repo convention; see app/tests/flows/machine.test.ts).
 *
 * Value-first order (value before commitment):
 *
 *   webview   -> the in-app-browser escape (ADR 0008: open in a real browser
 *                BEFORE anything is stored; it leads, ahead of everything else).
 *   welcome   -> one screen: what this is, what to expect, two actions.
 *                Primary CTA routes into the baseline (24 questions, ~30 min).
 *                Secondary action skips the baseline entirely and goes to practice.
 *
 * The install, exam, and storage commitment steps have moved to the baseline
 * close screen, where they appear AFTER the student has seen their first map.
 * Nothing in first-run asks for a commitment before value is shown.
 *
 * The platform shapes whether the webview escape leads; install affordance
 * detection (installVariant) is still exported because the baseline close
 * screen uses it to decide whether to show the install card.
 */

/** The discrete screens the first run can show, in canonical order. */
export type FirstRunStep = "webview" | "welcome";

/** The install affordance to render, decided by platform (ADR 0008). */
export type InstallVariant =
  /** Chromium captured a beforeinstallprompt event: offer the native prompt. */
  | "prompt"
  /** iOS Safari: no programmatic install. Show the manual share-sheet path and
   * the honest seven-day eviction warning. */
  | "ios-manual"
  /** Already running installed/standalone, or no install path on this browser:
   * nothing to install, so the step is skipped from the sequence. */
  | "none";

/** Platform inputs the sequencer needs. Pure data so tests can supply any
 * combination without a browser. */
export interface FirstRunPlatform {
  /** detectCapabilities().inAppWebview — the page is inside WhatsApp/Telegram/etc. */
  readonly inAppWebview: boolean;
  /** A beforeinstallprompt event was captured (Chromium installable path). */
  readonly installPromptAvailable: boolean;
  /** The UA looks like iOS Safari (the manual share-sheet install path). */
  readonly iosSafari: boolean;
  /** The app is already running as an installed/standalone PWA. */
  readonly standalone: boolean;
}

/** The honest storage state, after requestPersistence() has been attempted. */
export type StorageState =
  /** opfs-sahpool backend AND the browser granted persistence. Safe. */
  | "persistent"
  /** opfs-sahpool backend, but persistence not (yet) granted. Survives reload;
   * the browser may still evict under pressure until installed. */
  | "not-persisted"
  /** Degraded memory backend (private browsing, webview, unsupported, or a
   * runtime failure). Export is the only durable record. */
  | "degraded";

/**
 * Decide the install affordance from the platform. iOS Safari has no
 * programmatic install, so it always takes the manual path (unless already
 * standalone); Chromium offers the captured prompt; everything else has no
 * install step to show.
 */
export function installVariant(platform: FirstRunPlatform): InstallVariant {
  if (platform.standalone) return "none";
  if (platform.installPromptAvailable) return "prompt";
  if (platform.iosSafari) return "ios-manual";
  return "none";
}

/**
 * Map the storage capabilities + persistence grant to the honest state.
 *
 * @param sahpoolViable  capabilities.sahpoolViable — the persistent primary was
 *                       selected (false in degraded memory mode).
 * @param persisted      navigator.storage.persisted() after requestPersistence().
 */
export function storageState(sahpoolViable: boolean, persisted: boolean): StorageState {
  if (!sahpoolViable) return "degraded";
  return persisted ? "persistent" : "not-persisted";
}

/**
 * Build the ordered list of steps for this run.
 *
 * Rules (ADR 0008):
 *   - A webview leads with the escape and shows NOTHING else: storage is not
 *     reliable there, so we do not pretend install or persistence mean anything
 *     until the student is in a real browser.
 *   - Otherwise the run is a single welcome screen. The install, exam, and
 *     storage commitment steps have moved to the baseline close screen so
 *     commitments are asked only after value is shown.
 */
export function firstRunSequence(platform: FirstRunPlatform): FirstRunStep[] {
  if (platform.inAppWebview) {
    return ["webview"];
  }
  return ["welcome"];
}

/** The step after `current` in the sequence, or null when `current` is last
 * (the run is complete). Skipping a step uses the same advance. */
export function nextStep(
  sequence: readonly FirstRunStep[],
  current: FirstRunStep,
): FirstRunStep | null {
  const i = sequence.indexOf(current);
  if (i < 0 || i + 1 >= sequence.length) return null;
  return sequence[i + 1] ?? null;
}

/** True when `step` is the final step in the sequence. */
export function isLastStep(sequence: readonly FirstRunStep[], step: FirstRunStep): boolean {
  return sequence.length > 0 && sequence[sequence.length - 1] === step;
}

// ---------------------------------------------------------------------------
// Exam attempt -> examMs (ADR 0008 exam-date capture; engine consumes examMs).
// ---------------------------------------------------------------------------

/** The CA Foundation attempt the student is sitting. "undecided" means the
 * engine runs without an exam horizon (the scheduler's no-examMs path). */
export type ExamAttempt = "september" | "january" | "undecided";

/**
 * The fixed exam-attempt dates the engine schedules against. The ICAI exam runs
 * over several days; the engine only needs a single horizon, so we anchor on the
 * Paper 3 (Quantitative Aptitude) date, kept here as a single source of truth.
 * Stored as epoch ms (UTC midday IST ~= 06:30 UTC, so the date is unambiguous
 * across timezones for a single-day-granularity horizon).
 *
 * These are estimates until ICAI publishes the calendar; they are recalibrated
 * when the real dates land. The values are plain UTC ms; no Date parsing at
 * read time.
 */
export const EXAM_ATTEMPT_MS: Readonly<Record<Exclude<ExamAttempt, "undecided">, number>> = {
  // September 2026 attempt, Paper 3. Estimate.
  september: Date.UTC(2026, 8, 16, 6, 30, 0),
  // January 2027 attempt, Paper 3. Estimate.
  january: Date.UTC(2027, 0, 16, 6, 30, 0),
} as const;

/** Resolve an attempt to its scheduling horizon, or undefined for "undecided"
 * (the engine's no-exam path). */
export function attemptToExamMs(attempt: ExamAttempt): number | undefined {
  if (attempt === "undecided") return undefined;
  return EXAM_ATTEMPT_MS[attempt];
}

/** Parse a stored attempt string back to a typed attempt. Unknown or absent
 * values resolve to "undecided" so a corrupt meta value never crashes the
 * engine call. */
export function parseAttempt(raw: string | null): ExamAttempt {
  if (raw === "september" || raw === "january" || raw === "undecided") return raw;
  return "undecided";
}
