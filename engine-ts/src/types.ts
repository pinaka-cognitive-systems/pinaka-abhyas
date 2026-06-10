/**
 * Engine vocabulary (SPEC section 2).
 *
 * The engine is pure: bank, blueprint, marking, nowMs, and examMs are all
 * parameters. There is no Date.now and no Math.random anywhere in src/
 * (SPEC section 9). All clocks enter as epoch-millisecond numbers, parsed once
 * at the boundary (time.ts), never re-derived from a wall clock.
 */

import type { DifficultyLabel, ItemType } from "./scale.js";

export type { DifficultyLabel, ItemType } from "./scale.js";

/** Practice and review advance schedules; mock is measurement only (SPEC 4). */
export type Mode = "practice" | "drill" | "review" | "mock";

/**
 * One answer event (mirrors `uqs-event-2`, ADR 0009). The engine reads the
 * fields below; any others are opaque. `occurredAtMs` is the parsed epoch-ms
 * time (see time.ts); ordering is by (occurredAtMs asc, event_id asc), never by
 * string comparison (SPEC 2.1). `response` is the raw response, retained so a
 * pack re-key can re-score history from it (ADR 0009).
 */
export interface Event {
  readonly event_id: string;
  readonly occurredAtMs: number;
  readonly item_id: string;
  readonly item_content_hash: string;
  readonly taxonomy_version: number;
  /** Skill-node ids this item exercises. */
  readonly tests: readonly string[];
  readonly difficulty_label: DifficultyLabel;
  readonly item_type: ItemType;
  readonly mode: Mode;
  readonly correct: boolean;
  readonly selected_misconception: string | null;
  /** Raw response, per ADR 0009. Used for re-scoring after a pack re-key. */
  readonly response?: unknown;
  readonly time_ms: number;
  readonly resurfaced: boolean;
  readonly device_context?: unknown;
}

/** A bank item. Tombstones (quarantined/retired) stay present for history but
 * are never selectable; a retired item may name its replacement (SPEC 2, ADR 0009). */
export interface BankItem {
  readonly id: string;
  readonly tests: readonly string[];
  readonly difficulty_label: DifficultyLabel;
  readonly item_type: ItemType;
  /** Authored expected solve time in seconds. */
  readonly expected_seconds: number;
  readonly verification_status: VerificationStatus;
  /** IRT-recalibrated difficulty (overrides label anchor) when present. */
  readonly empirical?: { readonly difficulty_b?: number; readonly avg_seconds?: number };
  /** Set on a retired/quarantined item that has a live replacement. */
  readonly superseded_by?: string;
  /** Which misconception ids this item's distractors target (selection aid). */
  readonly targets_misconceptions?: readonly string[];
}

export type VerificationStatus =
  | "verified"
  | "draft"
  | "candidate"
  | "quarantined"
  | "retired";

/** A bank keyed by item id. */
export type Bank = ReadonlyMap<string, BankItem>;

export function isTombstone(item: BankItem): boolean {
  return item.verification_status === "quarantined" || item.verification_status === "retired";
}

export function isSelectable(item: BankItem): boolean {
  return !isTombstone(item);
}

// ---------------------------------------------------------------------------
// Blueprint and marking (sourced from schema/profiles/ca-foundation-qa/)
// ---------------------------------------------------------------------------

/** A blueprint family: a node id carrying mark weight and a question quota.
 * `nodeId` matches a taxonomy family id (e.g. "qa.bmath.finance"). */
export interface BlueprintFamily {
  readonly nodeId: string;
  /** Expected questions drawn from this family on the exam. */
  readonly quota: number;
}

export interface BlueprintSection {
  readonly id: string;
  readonly families: readonly BlueprintFamily[];
}

export interface BlueprintPart {
  readonly id: string;
  /** Total marks for this part (one mark per question here). */
  readonly marks: number;
  /** Total questions for this part. */
  readonly questions: number;
  readonly sections: readonly BlueprintSection[];
}

export interface Blueprint {
  readonly parts: readonly BlueprintPart[];
}

/**
 * Marking scheme. Values are the CA Foundation Paper 3 constants below.
 * SOURCE: schema/profiles/ca-foundation-qa/marking.json (marks_per_correct 1,
 * negative_mark_per_wrong 0.25, num_questions 100, duration_minutes 120,
 * paper_min_marks 40) and blueprint.json (40/20/40 question split).
 */
export interface MarkingScheme {
  readonly marksPerCorrect: number;
  readonly negativePerWrong: number;
  readonly marksPerUnattempted: number;
  readonly numQuestions: number;
  readonly passMark: number;
  readonly durationMinutes: number;
}

/** CA Foundation Paper 3, Quantitative Aptitude. Named constants, not literals
 * scattered through the engine. SOURCE: marking.json. */
export const MARKS_PER_CORRECT = 1;
export const NEGATIVE_PER_WRONG = 0.25;
export const MARKS_PER_UNATTEMPTED = 0;
export const NUM_QUESTIONS = 100;
export const PASS_MARK = 40;
export const DURATION_MINUTES = 120;

export const CA_FOUNDATION_QA_MARKING: MarkingScheme = {
  marksPerCorrect: MARKS_PER_CORRECT,
  negativePerWrong: NEGATIVE_PER_WRONG,
  marksPerUnattempted: MARKS_PER_UNATTEMPTED,
  numQuestions: NUM_QUESTIONS,
  passMark: PASS_MARK,
  durationMinutes: DURATION_MINUTES,
};

/** Blind-guess break-even probability under +1/-0.25: p where 1.25 p - 0.25 = 0. */
export function breakEvenProbability(m: MarkingScheme): number {
  return m.negativePerWrong / (m.marksPerCorrect + m.negativePerWrong);
}

// ---------------------------------------------------------------------------
// Engine state and outputs
// ---------------------------------------------------------------------------

/** Per-item schedule entry (SPEC 4). All times are epoch ms; intervals in days. */
export interface ItemSchedule {
  readonly itemId: string;
  readonly intervalDays: number;
  readonly ease: number;
  readonly lastSeenMs: number;
  readonly dueAtMs: number;
  readonly consecutiveCorrect: number;
  /** True when the last outcome was wrong: a lapse, reviewed on the exact item. */
  readonly lapsed: boolean;
}

/** One recorded misconception occurrence. */
export interface MisconceptionHit {
  readonly occurredAtMs: number;
  readonly eventId: string;
  /** Nodes the triggering item exercised (for remediation targeting). */
  readonly nodes: readonly string[];
}

import type { SkillState } from "./mastery.js";

/** Rebuilt student state after a replay (SPEC 7). All maps are sorted-key
 * stable; nothing here depends on insertion order. */
export interface EngineState {
  /** node id -> mastery (rating, deviation). */
  readonly skills: ReadonlyMap<string, SkillState>;
  /** item id -> live schedule entry. */
  readonly schedules: ReadonlyMap<string, ItemSchedule>;
  /** misconception id -> occurrences, ascending in time. */
  readonly misconceptions: ReadonlyMap<string, readonly MisconceptionHit[]>;
  /** Total non-system events folded. */
  readonly eventCount: number;
  /** item id -> last time the student saw it (any mode), epoch ms. */
  readonly lastSeenMs: ReadonlyMap<string, number>;
}

export type ActionKind = "remediate" | "review" | "practice" | "coverage" | "none";

export interface NextAction {
  readonly kind: ActionKind;
  /** The item to serve, or null when nothing is available. */
  readonly itemId: string | null;
  /** Node the action targets, when applicable. */
  readonly nodeId: string | null;
  /** Marks-framed explanation (SPEC 5). */
  readonly reason: string;
}

export type Confidence = "insufficient_data" | "low" | "medium";

export interface Readiness {
  /** Expected net marks under the attempt policy, or null when insufficient. */
  readonly expectedMarks: number | null;
  readonly low: number | null;
  readonly high: number | null;
  /** expectedMarks - passMark, or null. */
  readonly distanceToPass: number | null;
  readonly confidence: Confidence;
  /** Estimated minutes the attempt plan takes. */
  readonly estMinutes: number | null;
  /** Questions skipped purely to fit the time budget (never an ability verdict). */
  readonly skippedForTime: number | null;
  /** True when the full attempt-everything plan fits 120 minutes. */
  readonly timeFeasible: boolean | null;
  /** Always true: the engine never claims a score it cannot back. */
  readonly isEstimate: true;
  readonly note: string;
}
