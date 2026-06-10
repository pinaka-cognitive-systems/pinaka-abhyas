/**
 * dataStates.ts — Typed constants for the six app data states and Fellow-voice
 * copy strings.
 *
 * Source: design-team/v2/data.jsx (PROFILES constant and copy strings).
 * Intake record: docs/design/intake-v2.md.
 *
 * Copy text is reproduced exactly as written in the v2 source; it passed brand
 * review. Structural data is typed against the engine's honest vocabulary.
 *
 * Exclusions from the v2 source (see intake record for full list with reasons):
 *   - PROFILES.progressing: confidence tier 'good' replaced with 'medium'
 *     (engine truth: only 'low' and 'medium' exist; 'good' is not a valid tier).
 *   - PROFILES.returning: confidence tier 'moderate' replaced with 'medium'
 *     (same reason; 'moderate' is not in the engine vocabulary).
 *   - PROFILES.plateau: confidence tier 'moderate' replaced with 'medium'.
 *   - PROFILES.error: confidence tier 'moderate' replaced with 'medium'.
 *   - REVIEWS: ease ratings 'again' | 'hard' | 'good' and box numbers are
 *     excluded. The engine scheduler is binary (correct/wrong); there are no
 *     SM-2 grade buttons. The review reason strings are kept as display copy
 *     because they express the correct/incorrect history in plain language.
 *   - The seating-arrangement question (Q14 in REVIEW_MOCK): the source marks
 *     option B "720 × 6 = 4,320" as correct and option A "720" as wrong. The
 *     correct answer is 720 (5 units × 5! = 120, times 3! = 6 internal orders
 *     = 720). The worked steps in the source even derive 720 and then "recheck"
 *     into 4,320 by double-counting the block. This fixture carries the fixed
 *     answer per v3-brief.md constraint 4 and the audit finding DES-04.
 *   - MOCK_TYPES: no changes. Mock type definitions are engine-agnostic display
 *     data.
 *   - SYLLABUS, TOPICS, MISCONCEPTIONS, DRILL_Q, MIS_DETAIL, MOCK_RESULT are
 *     ported intact as illustrative data. They are demo/fixture data only; the
 *     live app reads from the local database.
 */

/* ------------------------------------------------------------------ */
/* TYPES                                                                */
/* ------------------------------------------------------------------ */

/** Confidence tiers the engine can express. 'good' does not exist. */
export type ConfidenceTier = "low" | "medium";

/** The six behavioural states of the app. */
export type DataStateId =
  | "empty"
  | "early"
  | "returning"
  | "progressing"
  | "plateau"
  | "error";

/** A readiness band as the engine expresses it. */
export interface ReadinessBand {
  /** Point estimate (net marks). */
  net: number;
  /** Low end of the band. */
  lo: number;
  /** High end of the band. */
  hi: number;
  /**
   * Confidence tier. Capped at 'medium' by engine policy.
   * The engine never claims high confidence.
   */
  confidence: ConfidenceTier;
  /** Student-set target (net marks). */
  target: number;
}

export interface MockSummary {
  id: string;
  name: string;
  type: string;
  net: number;
  date: string;
}

export interface RecommendedAction {
  kind: string;
  title: string;
  icon: string;
  detail: string;
  cta: string;
  dest: string;
  evidence?: string;
}

export interface DataProfile {
  id: DataStateId;
  label: string;
  mocksTaken: number;
  questionsAnswered: number;
  reviewsDue: number;
  hasDiagnosis: boolean | "partial";
  readiness: ReadinessBand | null;
  delta: number | null;
  examDateSet: boolean;
  examDate?: string;
  daysLeft?: number;
  recommended: RecommendedAction;
  mocks: MockSummary[];
  error: ErrorState | null;
  /** Plateau signal; only present on the plateau state. */
  plateau?: true;
  /** Fellow-voice belief callout for the plateau state. */
  belief?: string;
}

export interface ErrorState {
  kind: string;
  title: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* FELLOW-VOICE HONESTY NOTE                                            */
/* Copy exactly as approved in brand review.                            */
/* ------------------------------------------------------------------ */

export const READINESS_NOTE =
  "An estimate, not a predicted score. It widens when you have done less, and narrows as attempts accumulate. It is never a promise.";

/* ------------------------------------------------------------------ */
/* DATA PROFILES                                                        */
/* ------------------------------------------------------------------ */

const EMPTY_PROFILE: DataProfile = {
  id: "empty",
  label: "Empty · no history",
  mocksTaken: 0,
  questionsAnswered: 0,
  reviewsDue: 0,
  hasDiagnosis: false,
  readiness: null,
  delta: null,
  examDateSet: false,
  recommended: {
    kind: "mock",
    title: "Take your first mock",
    icon: "clipboard",
    detail:
      "A full standard mock under real timing. There is nothing to recommend until the data exists. This is where the diagnosis starts.",
    cta: "Start standard mock",
    dest: "mock",
  },
  mocks: [],
  error: null,
};

const EARLY_PROFILE: DataProfile = {
  id: "early",
  label: "Early · one mock in",
  mocksTaken: 1,
  questionsAnswered: 100,
  reviewsDue: 3,
  hasDiagnosis: "partial",
  readiness: { net: 38, lo: 28, hi: 48, confidence: "low", target: 50 },
  delta: null,
  examDateSet: true,
  examDate: "Sep 2026",
  daysLeft: 112,
  recommended: {
    kind: "review",
    title: "Drill Mathematics of Finance",
    icon: "crosshair",
    detail:
      "Your first mock points here, but one mock is thin evidence. Drill this, then take a second mock to firm up the diagnosis.",
    cta: "Start drill",
    dest: "practice",
    evidence: "diagnosis",
  },
  mocks: [{ id: "m1", name: "Mock 01", type: "standard", net: 38.0, date: "4 days ago" }],
  error: null,
};

const RETURNING_PROFILE: DataProfile = {
  id: "returning",
  label: "Returning · established",
  mocksTaken: 3,
  questionsAnswered: 274,
  reviewsDue: 5,
  hasDiagnosis: true,
  /*
   * Confidence: v2 source says 'moderate'. Engine vocabulary is 'low' | 'medium'.
   * 'moderate' maps to 'medium'. See intake-v2.md exclusion E-3.
   */
  readiness: { net: 43, lo: 39, hi: 47, confidence: "medium", target: 50 },
  delta: 2.25,
  examDateSet: true,
  examDate: "Sep 2026",
  daysLeft: 112,
  recommended: {
    kind: "review",
    title: "5 reviews are due",
    icon: "repeat",
    detail:
      "Past mistakes have resurfaced on schedule. Clear these first; they are the cheapest marks you will find today.",
    cta: "Start review",
    dest: "review",
    evidence: "review",
  },
  mocks: [
    { id: "m3", name: "Mock 03", type: "standard", net: 43.25, date: "2 days ago" },
    { id: "m2", name: "Mock 02", type: "standard", net: 41.0, date: "11 days ago" },
    { id: "m1", name: "Mock 01", type: "standard", net: 36.5, date: "24 days ago" },
  ],
  error: null,
};

const PROGRESSING_PROFILE: DataProfile = {
  id: "progressing",
  label: "Progressing · momentum",
  mocksTaken: 5,
  questionsAnswered: 512,
  reviewsDue: 4,
  hasDiagnosis: true,
  /*
   * Confidence: v2 source says 'good'. Engine vocabulary is 'low' | 'medium'.
   * 'good' does not exist; the engine never claims high confidence (design brief
   * constraint 3, intake-v2.md exclusion E-1). Replaced with 'medium'.
   */
  readiness: { net: 49, lo: 46, hi: 52, confidence: "medium", target: 55 },
  delta: 3.75,
  examDateSet: true,
  examDate: "Sep 2026",
  daysLeft: 98,
  recommended: {
    kind: "mock",
    title: "Take a hard mock",
    icon: "trend-up",
    detail:
      "You have cleared the bar on your last two standard mocks. A hard mock will surface what still breaks under pressure, before the real paper does.",
    cta: "Start hard mock",
    dest: "mock",
    evidence: "diagnosis",
  },
  mocks: [
    { id: "m5", name: "Mock 05", type: "standard", net: 49.0, date: "3 days ago" },
    { id: "m4", name: "Mock 04", type: "hard", net: 41.5, date: "9 days ago" },
    { id: "m3", name: "Mock 03", type: "standard", net: 45.25, date: "17 days ago" },
  ],
  error: null,
};

const PLATEAU_PROFILE: DataProfile = {
  id: "plateau",
  label: "Plateau · stalled",
  mocksTaken: 4,
  questionsAnswered: 388,
  reviewsDue: 5,
  hasDiagnosis: true,
  /*
   * Confidence: v2 source says 'moderate'. Replaced with 'medium'. See E-3.
   */
  readiness: { net: 43, lo: 40, hi: 46, confidence: "medium", target: 50 },
  delta: 0.25,
  plateau: true,
  belief:
    "Three mocks at the same score is not a ceiling. It is one or two unfixed errors repeating. The work now is narrow, not more of everything.",
  examDateSet: true,
  examDate: "Sep 2026",
  daysLeft: 64,
  recommended: {
    kind: "review",
    title: "Attack one error, not everything",
    icon: "crosshair",
    detail:
      "Your score has held flat across three mocks because the same misconception keeps costing the same marks. Simple vs compound interest alone is 7 of them. Fix that one thing and the plateau moves.",
    cta: "Drill compound interest",
    dest: "practice",
    evidence: "misconception",
  },
  mocks: [
    { id: "m4", name: "Mock 04", type: "standard", net: 43.5, date: "3 days ago" },
    { id: "m3", name: "Mock 03", type: "standard", net: 43.25, date: "12 days ago" },
    { id: "m2", name: "Mock 02", type: "standard", net: 42.75, date: "21 days ago" },
  ],
  error: null,
};

const ERROR_PROFILE: DataProfile = {
  id: "error",
  label: "Error · interrupted session",
  mocksTaken: 3,
  questionsAnswered: 274,
  reviewsDue: 5,
  hasDiagnosis: true,
  /*
   * Confidence: v2 source says 'moderate'. Replaced with 'medium'. See E-3.
   */
  readiness: { net: 43, lo: 39, hi: 47, confidence: "medium", target: 50 },
  delta: 2.25,
  examDateSet: true,
  examDate: "Sep 2026",
  daysLeft: 112,
  recommended: {
    kind: "resume",
    title: "A mock was interrupted",
    icon: "alert",
    detail:
      "The app closed during Mock 04 with 62 of 100 answered. Your answers up to that point are saved on this device. Resume where you left off, or discard and start over.",
    cta: "Resume Mock 04",
    dest: "exam-hall",
  },
  mocks: [
    { id: "m3", name: "Mock 03", type: "standard", net: 43.25, date: "2 days ago" },
    { id: "m2", name: "Mock 02", type: "standard", net: 41.0, date: "11 days ago" },
  ],
  error: {
    kind: "recovery",
    title: "Mock 04 did not finish saving",
    detail:
      "The app closed unexpectedly 2 hours ago. 62 of 100 answers were written to this device before it stopped. Nothing was sent anywhere. You can resume the mock or discard it.",
  },
};

/** All six data profiles, keyed by state id. */
export const DATA_PROFILES: Record<DataStateId, DataProfile> = {
  empty: EMPTY_PROFILE,
  early: EARLY_PROFILE,
  returning: RETURNING_PROFILE,
  progressing: PROGRESSING_PROFILE,
  plateau: PLATEAU_PROFILE,
  error: ERROR_PROFILE,
};
