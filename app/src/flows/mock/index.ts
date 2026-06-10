/**
 * Mock flow barrel (W5-5 flow b, W5-7).
 *
 * The router imports `MockFlow` lazily from here; the pure logic modules
 * (assembler, state, scoring, premock, guard) are exported for the tests and
 * for the service-worker wiring (the MockGuard).
 */

export { MockFlow, type MockFlowProps } from "./MockFlow.js";
export { mockGuard, acquireMockGuard, releaseMockGuard, isMockInProgress } from "./guard.js";
export {
  assembleMock,
  scaleMarking,
  mulberry32,
  type AssembledMock,
  type ScaledMarking,
  type FamilyShortfall,
} from "./assembler.js";
export {
  MOCK_SESSION_META_KEY,
  parseSession,
  serializeSession,
  remainingMs,
  isTimeUp,
  resumeNote,
  withAnswer,
  withClearedAnswer,
  withToggledFlag,
  answeredCount,
  type MockSession,
  type MockAnswer,
} from "./state.js";
export {
  buildSubmissionBatch,
  scoreMock,
  partOfItem,
  type MockScore,
  type MockEventBatch,
  type PartBreakdown,
  type WrongAnswer,
  type FamilyRef,
} from "./scoring.js";
