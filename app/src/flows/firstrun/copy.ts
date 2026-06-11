/**
 * First-run copy (W5-5 flow d).
 *
 * Every string the first run shows, in one place so it can be voice-checked.
 * Voice rules (brand-core.md, positioning-ca.md): the Fellow voice, no
 * contractions ("do not", never "don't"), no exclamation marks, no em-dashes,
 * CEFR B1 target. The install prompt copy is the brand table's exact line
 * ("Install to study offline. Your progress stays on your device."), plain, no
 * urgency. The iOS eviction warning states the seven-day reality from ADR 0008
 * without alarm.
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

  // --- Welcome (one screen; the Fellow voice; value-first). -----------------
  // The three old bullet points collapse into one quiet assurance line.
  // The primary CTA sets the expectation plainly; the secondary action mirrors
  // the old baseline intro skip (marks baseline done, exits to practice).
  welcome: {
    eyebrow: "Welcome",
    title: "Practice that tells you what you do not know",
    assurance: "Free. Works offline. No account. Your data stays on this device.",
    cta: "Start: 24 questions, about 30 minutes",
    skip: "I would rather just practise",
  },

  // --- Install (Android/Chromium prompt path). Used by InstallCard shared
  //     component which the baseline close screen imports. Kept here as the
  //     single string source so the voice-check test still covers these lines.
  installPrompt: {
    eyebrow: "Add to home screen",
    title: "Add this to your home screen",
    // Brand table line, verbatim.
    body: "Install to study offline. Your progress stays on your device.",
    cta: "Install",
    skip: "Not now",
    installedNote: "Installed. You can open it from your home screen.",
    dismissedNote: "No problem. You can install it later from the browser menu.",
  },

  // --- Install (iOS Safari manual path + honest eviction warning). Used by
  //     InstallCard shared component (baseline close screen). -----------------
  installIos: {
    eyebrow: "Add to home screen",
    title: "Add this to your home screen",
    body: "Install to study offline. Your progress stays on your device.",
    steps: [
      "Tap the Share button in Safari.",
      "Scroll down and tap Add to Home Screen.",
      "Tap Add.",
    ],
    // ADR 0008 seven-day eviction reality, stated plainly, not alarmist.
    eviction:
      "On iPhone, if you do not add this to your home screen, the browser may " +
      "clear your saved progress after seven days without use. Adding it to " +
      "your home screen keeps your progress safe. You can also export your " +
      "progress at any time.",
    skip: "Skip",
  },

  // --- Exam attempt picker. Used by AttemptPicker shared component which the
  //     baseline close screen imports. ----------------------------------------
  exam: {
    eyebrow: "Your exam",
    title: "When are you sitting?",
    body: "This plans your review around your exam.",
    options: {
      september: "September 2026",
      january: "January 2027",
      undecided: "I have not decided yet",
    },
    cta: "Save",
    skip: "Skip",
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
