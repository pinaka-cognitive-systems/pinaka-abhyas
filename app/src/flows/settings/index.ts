/**
 * Settings flow public surface (W5-5 flow e).
 *
 * The router lazy-imports SettingsFlow from the component module directly (to
 * keep the lazy chunk boundary clean); this barrel exports the component type
 * and the pure logic for callers and tests.
 */

export { SettingsFlow, type SettingsFlowProps } from "./SettingsFlow.js";

export {
  canShareFile,
  exportEventCount,
  exportFilename,
  isDeleteConfirmed,
  isFileError,
  parseEnvelopeText,
  previewImport,
  serializeEnvelope,
  settingsStatus,
  updateView,
  type ImportFileError,
  type ImportPreview,
  type StatusView,
  type StorageStatus,
  type UpdateView,
} from "./logic.js";
