/**
 * a11y.ts — accessibility settings helper (Settings flow, design parity).
 *
 * Applies the three accessibility toggles defined in scr-core.jsx:236-243 and
 * design.css (body.a11y-motion-off, body.a11y-hc, body.a11y-ts-large/small)
 * by toggling CSS classes on document.body.
 *
 * Call applyA11ySettings(settings) at boot (main.tsx, before first render) so
 * the page loads with the correct classes from the first paint. Also called
 * inside SettingsFlow on every toggle change.
 *
 * The settings shape is persisted as JSON in meta key META_A11Y (insights.ts).
 */

export interface A11ySettings {
  readonly reduceMotion: boolean;
  readonly contrast: boolean;
  readonly textSize: "small" | "regular" | "large";
}

export const A11Y_DEFAULTS: A11ySettings = {
  reduceMotion: false,
  contrast: false,
  textSize: "regular",
};

/**
 * Apply accessibility settings to document.body class list.
 * Safe to call in non-browser environments (no-op when document is absent).
 */
export function applyA11ySettings(settings: A11ySettings): void {
  if (typeof document === "undefined") return;
  const b = document.body.classList;
  b.toggle("a11y-motion-off", settings.reduceMotion);
  b.toggle("a11y-hc", settings.contrast);
  b.remove("a11y-ts-large", "a11y-ts-small");
  if (settings.textSize === "large") b.add("a11y-ts-large");
  if (settings.textSize === "small") b.add("a11y-ts-small");
}

/**
 * Parse the raw JSON string stored in META_A11Y back to typed settings.
 * Unknown or corrupt values resolve to defaults so a bad meta value never
 * breaks the UI.
 */
export function parseA11ySettings(raw: string | null): A11ySettings {
  if (raw === null) return A11Y_DEFAULTS;
  try {
    const v = JSON.parse(raw) as Partial<A11ySettings>;
    return {
      reduceMotion: typeof v.reduceMotion === "boolean" ? v.reduceMotion : A11Y_DEFAULTS.reduceMotion,
      contrast: typeof v.contrast === "boolean" ? v.contrast : A11Y_DEFAULTS.contrast,
      textSize:
        v.textSize === "small" || v.textSize === "large" || v.textSize === "regular"
          ? v.textSize
          : A11Y_DEFAULTS.textSize,
    };
  } catch {
    return A11Y_DEFAULTS;
  }
}
