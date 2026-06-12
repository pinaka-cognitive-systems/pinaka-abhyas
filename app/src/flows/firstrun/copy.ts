/**
 * First-run copy (W5-5 flow d).
 *
 * Every string the first run shows, in one place so it can be voice-checked.
 * Voice rules (brand-core.md, positioning-ca.md): the Fellow voice, no
 * contractions ("do not", never "don't"), no exclamation marks, no em-dashes,
 * CEFR B1 target. Two surfaces live here: the webview escape and the
 * second-tab screen. The welcome itself transcribes the design prototype
 * inline in FirstRunFlow.tsx (scr-core.jsx:8-41).
 *
 * A DOM-free test asserts no contraction, no "!", and no em-dash across every
 * string here (app/tests/flows/firstrun.copy.test.ts).
 */

export const COPY = {
  // --- Webview escape (leads when inside an in-app browser; ADR 0008). ------
  webview: {
    eyebrow: "Open in your browser",
    title: "Open this in your browser first",
    body:
      "You are inside an in-app browser. Your progress may not be saved here. " +
      "Open this page in your phone browser, such as Chrome or Safari, before " +
      "you start.",
    how: "Use the menu in this app and choose Open in browser, or copy the link below.",
    copyButton: "Copy the link",
    copiedNote: "Link copied. Paste it into your browser.",
  },

  // --- Second tab (AlreadyOpenError). ---------------------------------------
  secondTab: {
    eyebrow: "Already open",
    title: "This is already open in another tab",
    body:
      "Your progress can only be open in one place at a time, so it is never " +
      "lost. Close the other tab, or take over here. Taking over will stop the " +
      "session in the other tab.",
    takeover: "Use it here",
    takingOver: "Taking over",
  },
} as const;
