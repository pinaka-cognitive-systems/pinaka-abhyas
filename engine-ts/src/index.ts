/**
 * Public surface of @pinaka/engine.
 *
 * Export every symbol the app or external callers need. Internal helpers
 * (time.ts, scale internals) are re-exported selectively so tree-shaking
 * in the app bundle removes what is not used.
 */

export {
  FRESH_SKILL,
  applyIdleDrift,
  expectedOutcome,
  masteryProbability,
  updateSkill,
  type Observation,
  type SkillState,
} from "./mastery.js";

export {
  DIFFICULTY_ANCHOR,
  GUESSING_FLOOR,
  PRIOR_DEVIATION,
  PRIOR_RATING,
  sigmoid,
  type DifficultyLabel,
} from "./scale.js";

export {
  type ActionKind,
  type Bank,
  type BankItem,
  type Blueprint,
  type BlueprintFamily,
  type BlueprintPart,
  type BlueprintSection,
  type Confidence,
  type EngineState,
  type Event,
  type ItemSchedule,
  type ItemType,
  type MarkingScheme,
  type MisconceptionHit,
  type Mode,
  type NextAction,
  type Readiness,
  type VerificationStatus,
  CA_FOUNDATION_QA_MARKING,
  DURATION_MINUTES,
  MARKS_PER_CORRECT,
  MARKS_PER_UNATTEMPTED,
  NEGATIVE_PER_WRONG,
  NUM_QUESTIONS,
  PASS_MARK,
  breakEvenProbability,
  isSelectable,
  isTombstone,
} from "./types.js";

// --- Replay (SPEC 7; ADR 0009): rebuild EngineState from the event log. ---
export {
  replay,
  skillsAsOf,
  type ReplayOptions,
  type RescoreRule,
} from "./replay.js";

// --- Selection (SPEC 5): the next action the UI serves, with session budget. ---
export {
  EMPTY_SESSION,
  recordServed,
  selectNextAction,
  type SessionProgress,
} from "./selector.js";

// --- Readiness (SPEC 6): the honest score band, never above medium confidence. ---
export { computeReadiness } from "./readiness.js";

// --- Scheduler (SPEC 4): due-item queue and the schedule reconciliation rule. ---
export {
  dueItems,
  reconcileSchedules,
} from "./scheduler.js";
