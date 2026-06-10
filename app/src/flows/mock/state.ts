/**
 * Persisted in-progress mock state + resume/timing accounting (W5-7).
 *
 * Binding to ADR 0009 ("Mock sessions survive interruption"): an in-progress
 * mock persists its id, seed, item order, answers so far, per-question time, the
 * wall-clock start, and accumulated active time. On resume the clock and the
 * rules are honest and VISIBLE: elapsed wall-clock time counts against the
 * budget. We do not silently forgive the interruption (that would let a student
 * pause an exam to think) and we do not silently punish beyond the real elapsed
 * time. The resume note states exactly that.
 *
 * All functions here are pure and DOM-free: every clock value is a parameter.
 * The state is serialized to a single storage meta key by storage.ts.
 */

/** One recorded answer within a mock, before submission scoring. The raw
 * response is retained so the submitted event carries it (ADR 0009 re-score). */
export interface MockAnswer {
  /** The selected 1-based option key for a single_best item. */
  readonly selectedOption: number;
  /** Active milliseconds the student spent on this question across all visits. */
  readonly timeMs: number;
}

/**
 * The persisted shape of an in-progress mock. Written to storage meta on every
 * answer so an interruption (call, screen lock, tab eviction) never loses more
 * than the current keystroke. Derived state (score, readiness) is NOT stored —
 * it is computed at submission from the answers and the event log (ADR 0009:
 * the event log is the source of truth).
 */
export interface MockSession {
  /** Stable id for this attempt (crypto.randomUUID at the boundary). */
  readonly id: string;
  /** The assembler seed; the paper is rebuilt deterministically from it. */
  readonly seed: number;
  /** Item ids in presentation order (the assembled paper). */
  readonly order: readonly string[];
  /** Full-paper size the mock was scaled from (marking.numQuestions). */
  readonly fullPaperSize: number;
  /** The scaled time budget for this mock, in milliseconds. */
  readonly budgetMs: number;
  /** Wall-clock epoch ms when the mock was first started. */
  readonly startedAtMs: number;
  /** Answers by item id. Absent id == not yet answered. */
  readonly answers: Readonly<Record<string, MockAnswer>>;
  /** Item ids the student flagged for review. */
  readonly flagged: readonly string[];
  /**
   * Accumulated ACTIVE time, in milliseconds: the sum of foreground time the
   * student has actually spent in the hall across all sessions of this mock.
   * Distinct from wall-clock elapsed (which includes interruptions). The
   * resume policy charges wall-clock against the budget, not this — this is
   * bookkeeping for the per-question timer and honest telemetry.
   */
  readonly activeMs: number;
  /** Form factor recorded at start (ADR 0011): "phone" | "tablet" | "desktop". */
  readonly formFactor: string;
  /** Viewport width at start (CSS px), for the device-context event field. */
  readonly viewportWidth: number;
}

/** The single storage meta key the in-progress mock is persisted under. A mock
 * is "in progress" iff this key holds a parseable MockSession. */
export const MOCK_SESSION_META_KEY = "mock_session_v1";

/** Serialize a session to its storage meta string. */
export function serializeSession(session: MockSession): string {
  return JSON.stringify(session);
}

/**
 * Parse a stored mock session, or null when the key is unset or the value is
 * corrupt/missing required fields. A corrupt value is treated as "no mock in
 * progress" rather than throwing, so a bad write can never wedge the app.
 */
export function parseSession(raw: string | null): MockSession | null {
  if (raw === null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.seed !== "number" ||
    !Array.isArray(o.order) ||
    typeof o.fullPaperSize !== "number" ||
    typeof o.budgetMs !== "number" ||
    typeof o.startedAtMs !== "number" ||
    typeof o.answers !== "object" ||
    o.answers === null ||
    !Array.isArray(o.flagged) ||
    typeof o.activeMs !== "number" ||
    typeof o.formFactor !== "string" ||
    typeof o.viewportWidth !== "number"
  ) {
    return null;
  }
  return v as MockSession;
}

/**
 * Remaining time on the mock, in milliseconds, under the honest wall-clock
 * policy: the budget minus the wall-clock elapsed since the mock first started.
 * Time lost to an interruption is GONE — the same as walking out of an exam
 * hall and coming back. Never negative.
 *
 * @param session the in-progress mock.
 * @param nowMs   the read clock (epoch ms), a parameter (SPEC 9).
 */
export function remainingMs(session: MockSession, nowMs: number): number {
  const elapsed = Math.max(0, nowMs - session.startedAtMs);
  return Math.max(0, session.budgetMs - elapsed);
}

/** True when the wall-clock budget has been fully consumed: the mock must
 * auto-submit. */
export function isTimeUp(session: MockSession, nowMs: number): boolean {
  return remainingMs(session, nowMs) <= 0;
}

/** Count of answered questions in the session. */
export function answeredCount(session: MockSession): number {
  return Object.keys(session.answers).length;
}

/**
 * The resume note shown when a mock is reopened mid-attempt. It states the
 * wall-clock policy plainly so the student is never surprised: the clock kept
 * running. Honest, in the Fellow voice (no exclamation, no contraction, no
 * em-dash). Pure: time figures are parameters.
 */
export function resumeNote(session: MockSession, nowMs: number): string {
  const remMin = Math.ceil(remainingMs(session, nowMs) / 60000);
  const answered = answeredCount(session);
  const total = session.order.length;
  return (
    `Welcome back to this mock. The clock kept running while you were away, ` +
    `the same as it would in the exam hall, so the time lost to the break is gone. ` +
    `You have answered ${answered} of ${total} questions, and about ${remMin} ` +
    `${remMin === 1 ? "minute" : "minutes"} remain. Pick up where you left off.`
  );
}

/** Apply an answer to a session immutably, returning the next session. The
 * per-question active time is accumulated (a re-answer adds the new visit's
 * time on top of any prior time on that item). */
export function withAnswer(
  session: MockSession,
  itemId: string,
  selectedOption: number,
  visitMs: number,
): MockSession {
  const prior = session.answers[itemId]?.timeMs ?? 0;
  const answers: Record<string, MockAnswer> = {
    ...session.answers,
    [itemId]: { selectedOption, timeMs: prior + Math.max(0, visitMs) },
  };
  return { ...session, answers, activeMs: session.activeMs + Math.max(0, visitMs) };
}

/** Clear a recorded answer (the hall's "clear response" affordance), keeping any
 * accumulated time (the time was still spent). */
export function withClearedAnswer(session: MockSession, itemId: string): MockSession {
  if (session.answers[itemId] === undefined) return session;
  const answers: Record<string, MockAnswer> = { ...session.answers };
  delete answers[itemId];
  return { ...session, answers };
}

/** Toggle the flag-for-review state of an item immutably. */
export function withToggledFlag(session: MockSession, itemId: string): MockSession {
  const set = new Set(session.flagged);
  if (set.has(itemId)) set.delete(itemId);
  else set.add(itemId);
  return { ...session, flagged: [...set].sort() };
}
