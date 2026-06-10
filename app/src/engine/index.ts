/**
 * App engine integration layer (W5-3).
 *
 * The thin, app-facing seam over the certified @pinaka/engine package:
 *   - buildEngineState: replay the storage adapter's event log into EngineState.
 *   - loadPack (+ buildBank/buildBlueprint/buildMarking): the pack build
 *     artifact and profile JSON into the engine's Bank, Blueprint, MarkingScheme.
 *   - nextAction / readiness / masteryByNode / planSession: the typed selectors
 *     the screens call.
 *
 * The engine is frozen and certified; this layer adds no math. The golden-vector
 * replay suite (app/tests/engine/vectors.test.ts) re-runs every committed engine
 * vector through buildEngineState + these selectors, so any drift fails CI.
 */

export { buildEngineState } from "./state.js";

export {
  buildBank,
  buildBlueprint,
  buildMarking,
  loadPack,
  type LoadedPack,
  type RawBlueprint,
  type RawMarking,
  type RawPack,
  type RawPackItem,
} from "./pack.js";

export {
  DEFAULT_SESSION_LENGTH,
  masteryByNode,
  nextAction,
  planSession,
  readiness,
  type NodeMastery,
} from "./selectors.js";
