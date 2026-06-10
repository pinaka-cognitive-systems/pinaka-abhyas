/**
 * First-run flow public surface (W5-5 flow d).
 *
 * The router lazy-imports FirstRunFlow and SecondTabScreen from the component
 * modules directly (to keep the lazy chunk boundary clean); this barrel exports
 * the pure logic and the engine seam for callers and tests.
 *
 * `getExamMs` is the one helper the practice flow uses to feed the engine its
 * exam horizon (see the reviewer wiring flag). The practice flow must NOT read
 * meta itself.
 */

export { FirstRunFlow, type FirstRunFlowProps } from "./FirstRunFlow.js";
export { SecondTabScreen, type SecondTabScreenProps } from "./SecondTabScreen.js";

export {
  attemptToExamMs,
  EXAM_ATTEMPT_MS,
  firstRunSequence,
  installVariant,
  isLastStep,
  nextStep,
  parseAttempt,
  storageState,
  type ExamAttempt,
  type FirstRunPlatform,
  type FirstRunStep,
  type InstallVariant,
  type StorageState,
} from "./machine.js";

export {
  FIRSTRUN_META_KEYS,
  getExamAttempt,
  getExamMs,
  isFirstRunComplete,
  markFirstRunComplete,
  setExamAttempt,
} from "./meta.js";
