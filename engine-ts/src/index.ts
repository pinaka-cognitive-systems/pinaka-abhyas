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
  type BankItem,
  type Blueprint,
  type BlueprintFamily,
  type BlueprintPart,
  type BlueprintSection,
  type Event,
  type ItemType,
  type MarkingScheme,
  type Mode,
  CA_FOUNDATION_QA_MARKING,
  DURATION_MINUTES,
  MARKS_PER_CORRECT,
  MARKS_PER_UNATTEMPTED,
  NEGATIVE_PER_WRONG,
  NUM_QUESTIONS,
  PASS_MARK,
  isSelectable,
  isTombstone,
} from "./types.js";
