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
 *
 * Storage versioning: the key is MOCK_SESSION_META_KEY ("mock_session_v1").
 * The shape is forward-compatible: new optional fields added here are absent in
 * sessions written by older builds, and parseSession fills defaults so the
 * session is still usable. The key does not change for additive fields because
 * the session is ephemeral (one paper, one sitting); a breaking reshape would
 * require a new key, at which point the old key is simply ignored and the
 * student starts fresh.
 *
 * v1 (initial): id, seed, order, fullPaperSize, budgetMs, startedAtMs,
 *   answers, flagged, activeMs, formFactor, viewportWidth.
 * v1 + strike addendum: adds `struck` (Record<itemId, number[]>): option keys
 *   the student ruled out per item. Absent on sessions written before this
 *   addendum; parseSession defaults to {}.
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
   * Ruled-out option keys per item id. A student may mark options they have
   * eliminated without changing their selection. Absent in sessions written
   * before the strike addendum; parseSession defaults to {}. A struck option
   * that is subsequently selected is automatically un-struck (the selection
   * implies reconsideration). Striking the currently selected option clears the
   * selection first (handled in the Hall component, not here).
   */
  readonly struck: Readonly<Record<string, readonly number[]>>;
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
  // Strike addendum: sessions written before this field existed lack `struck`.
  // Default to an empty record so older sessions resume without any struck state.
  const struck: Readonly<Record<string, readonly number[]>> =
    typeof o.struck === "object" && o.struck !== null && !Array.isArray(o.struck)
      ? (o.struck as Readonly<Record<string, readonly number[]>>)
      : {};
  return { ...(v as Omit<MockSession, "struck">), struck };
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

/**
 * Toggle a struck (ruled-out) option key on an item, returning the next session.
 *
 * Rules (per spec):
 *   - Striking does not clear or block selection.
 *   - If `optionKey` is the currently selected option, the selection is cleared
 *     first (pass `currentSelected` as the currently picked key, or null).
 *   - Selecting a struck option un-strikes it automatically: that is handled
 *     in withAnswerAndUnstrike; callers should use that function when recording
 *     a pick rather than the bare withAnswer.
 */
export function withToggledStrike(
  session: MockSession,
  itemId: string,
  optionKey: number,
  currentSelected: number | null,
): MockSession {
  const existing = session.struck[itemId] ?? [];
  const set = new Set(existing);
  let next: MockSession = session;
  if (set.has(optionKey)) {
    // Un-striking: just remove.
    set.delete(optionKey);
  } else {
    // Striking: if the option is currently selected, clear the selection first.
    if (currentSelected === optionKey) {
      next = withClearedAnswer(session, itemId);
    }
    set.add(optionKey);
  }
  const struckForItem = [...set].sort((a, b) => a - b);
  const struck: Record<string, readonly number[]> = { ...next.struck };
  if (struckForItem.length === 0) {
    delete struck[itemId];
  } else {
    struck[itemId] = struckForItem;
  }
  return { ...next, struck };
}

/**
 * Record an answer and automatically un-strike the chosen option if it was
 * struck. Combines withAnswer + strike cleanup in one immutable step.
 */
export function withAnswerAndUnstrike(
  session: MockSession,
  itemId: string,
  selectedOption: number,
  visitMs: number,
): MockSession {
  const next = withAnswer(session, itemId, selectedOption, visitMs);
  const existing = next.struck[itemId];
  if (existing === undefined || !existing.includes(selectedOption)) return next;
  const filtered = existing.filter((k) => k !== selectedOption);
  const struck: Record<string, readonly number[]> = { ...next.struck };
  if (filtered.length === 0) {
    delete struck[itemId];
  } else {
    struck[itemId] = filtered;
  }
  return { ...next, struck };
}
