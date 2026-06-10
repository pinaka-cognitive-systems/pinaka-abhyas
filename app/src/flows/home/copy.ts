/**
 * Home-surface copy (W5-9 honest adherence).
 *
 * Every string the home surface and the settings reminder section show, in one
 * place so the voice gate can check it (app/tests/flows/home.copy.test.ts).
 *
 * Voice rules (brand-core.md): the Fellow voice, no contractions ("do not",
 * never "don't"), no exclamation marks, no em-dashes, sentence case, second
 * person, CEFR B1. The banned-pattern list in brand-core.md is enforced by the
 * acceptance sweep: NO streak language, NO absence-day counts, NO urgency words
 * (hurry, last chance, do not lose, limited, now or never, falling behind),
 * NO "topper" / "crack" / "rank" framing.
 *
 * The two spec-exact lines are reproduced verbatim and pinned by tests:
 *   - mechanism 1 close: "Today's work is complete. More study today adds
 *     little; come back tomorrow."
 *   - mechanism 3 re-entry lead: "Welcome back. Your estimates have widened
 *     while you were away; a short session will sharpen them."
 *
 * Principle (spec): the product never manufactures motivation. A finite end is
 * the honest alternative to a streak; the reward is permission to stop.
 */

export const COPY = {
  // --- Frame ----------------------------------------------------------------
  frame: {
    title: "Today",
    settings: "Settings",
    settingsAria: "Open settings",
    diagnosis: "See your diagnosis",
    diagnosisAria: "Open your diagnosis and readiness",
  },

  // --- Today card (mechanism 1): bounded and finite. ------------------------
  today: {
    eyebrow: "Today",
    // The card title states the session size, filled from the engine plan.
    title: (count: number): string =>
      count === 1 ? "One question today" : `${count} questions today`,
    // The lead line: a finite session with a visible end.
    lead: "A short, bounded session. When it is done, today is done.",
    // The contents breakdown lines, each rendered only when the count is > 0.
    // Every number here is the engine's, never invented.
    reviews: (n: number): string =>
      n === 1 ? "1 review of something due" : `${n} reviews of things due`,
    remediation: (n: number): string =>
      n === 1
        ? "1 question on a misconception that keeps costing you marks"
        : `${n} questions on misconceptions that keep costing you marks`,
    practice: (n: number): string =>
      n === 1
        ? "1 question on a topic you are close to securing"
        : `${n} questions on topics you are close to securing`,
    coverage: (n: number): string =>
      n === 1 ? "1 question on new ground" : `${n} questions on new ground`,
    begin: "Begin",
    beginAria: "Begin today's session",

    // The completed state. The first line is the spec's exact closing line.
    doneEyebrow: "Done",
    doneTitle: "Today's work is complete. More study today adds little; come back tomorrow.",
    doneBody:
      "Nothing is lost by stopping here, and nothing runs out while you are " +
      "away. Your progress is saved on this device.",
  },

  // --- Delta line (mechanism 2): what changed since last time. --------------
  // The format is built by the pure deltaLine() function in delta.ts; the
  // static fragments it composes from live here so the voice gate covers them.
  delta: {
    // "Since {weekday}: ..." prefix. The weekday is computed from the prior
    // session day; this is the only place a day name appears, and it names a
    // calendar day, never a count of days.
    sincePrefix: (weekday: string): string => `Since ${weekday}: `,
    // Number-of-questions fragment.
    questions: (n: number): string =>
      n === 1 ? "1 question" : `${n} questions`,
    // Firmer-topics fragment (mastery rose on N nodes).
    firmer: (n: number): string =>
      n === 1 ? "one topic firmer" : `${n} topics firmer`,
    // A node still costing marks, framed in marks.
    stillCosts: (label: string, marks: number): string =>
      `${label} still costs you about ${marks} ${marks === 1 ? "mark" : "marks"}`,
    // The no-improvement, no-regression line: states what was practised, no
    // praise and no blame (spec mechanism 2).
    practisedOnly: (n: number): string =>
      n === 1
        ? "Since last time: 1 question practised, estimates holding steady."
        : `Since last time: ${n} questions practised, estimates holding steady.`,
    // Used when the prior day had history but no questions were answered since.
    nothingSince: "Since last time: nothing new practised yet.",
  },

  // --- Re-entry (mechanism 3): no shame, never the gap length. --------------
  reentry: {
    eyebrow: "Welcome back",
    // The spec's exact lead line. Literally true (deviation growth, ADR 0012).
    lead: "Welcome back. Your estimates have widened while you were away; a short session will sharpen them.",
  },

  // NOTE: the reminder (mechanism 4) copy lives in settings/copy.ts, because the
  // reminder is rendered inside Settings and the task scopes those strings to
  // the settings copy module. The reminder LOGIC and scheduler live in
  // home/reminder.ts; only the strings sit with settings.
} as const;
