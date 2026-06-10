/**
 * Baseline flow barrel (W5-8).
 *
 * The cold-start baseline: a guided first session that lays down an honest map
 * before the engine has history to serve from. See BaselineFlow.tsx.
 */

export { BaselineFlow, type BaselineFlowProps } from "./BaselineFlow.js";
export {
  buildBaselinePlan,
  BASELINE_TARGET,
  type BaselinePlan,
  type PlannedItem,
} from "./plan.js";
export { isBaselineDone, markBaselineDone, shouldShowBaseline } from "./meta.js";
