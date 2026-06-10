/**
 * Service-worker / pack-update barrel (W5-4).
 *
 * Public surface for the wiring point (main.tsx) and the UI (W5-5):
 *   - registerSW: register the offline app-shell worker (production only).
 *   - PackUpdater + state types: the update state machine the UI subscribes to.
 *   - createHttpPort / createStoragePort: the live ports the updater runs on.
 *   - stampVersions: record app + pack version into storage meta on session start.
 *   - manifest helpers: shape, validation, and the pure update decision.
 */

export { registerSW, type RegisterResult, type RegisterSWOptions } from "./register.js";

export {
  PackUpdater,
  type UpdaterDeps,
  type UpdaterListener,
  type UpdaterState,
  type UpdateNote,
} from "./updater.js";

export { createHttpPort, extractErrataFromBody, type PackLocation } from "./network.js";
export { createStoragePort, stampVersions } from "./storagePort.js";

export {
  ALWAYS_ALLOW,
  type MockGuard,
  type PackNetworkPort,
  type PackStagingPort,
  type StagedPack,
} from "./port.js";

export {
  compareSemVer,
  decideUpdate,
  parseSemVer,
  validateManifest,
  type PackManifest,
  type UpdateDecision,
  type UpdateDecisionKind,
} from "./manifest.js";
