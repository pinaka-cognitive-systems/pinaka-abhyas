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

  // --- Welcome (the Fellow voice; what this is). ----------------------------
  welcome: {
    eyebrow: "Welcome",
    title: "Practice that tells you what you do not know",
    points: [
      "Free for students. No account, no sign-in.",
      "Works offline once it has loaded.",
      "Your data stays on this device. Sharing is optional and collects no personal data.",
    ],
    body:
      "You practise verified questions. The app diagnoses what you do not know, " +
      "topic by topic, and tells you the next thing to do.",
    cta: "Get started",
  },

  // --- Install (Android/Chromium prompt path). ------------------------------
  installPrompt: {
    eyebrow: "Install",
    title: "Add this to your home screen",
    // Brand table line, verbatim.
    body: "Install to study offline. Your progress stays on your device.",
    cta: "Install",
    skip: "Not now",
    installedNote: "Installed. You can open it from your home screen.",
    dismissedNote: "No problem. You can install it later from the browser menu.",
  },

  // --- Install (iOS Safari manual path + honest eviction warning). ----------
  installIos: {
    eyebrow: "Install",
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
    skip: "Skip for now",
  },

  // --- Exam attempt (optional). ---------------------------------------------
  exam: {
    eyebrow: "Your attempt",
    title: "Which attempt are you sitting",
    body:
      "This helps the app plan your review around your exam. You can change it " +
      "later, and you can skip it for now.",
    options: {
      september: "September 2026",
      january: "January 2027",
      undecided: "I have not decided yet",
    },
    cta: "Continue",
    skip: "Skip for now",
  },

  // --- Storage status (the honest close). -----------------------------------
  storage: {
    eyebrow: "Your data",
    titlePersistent: "Your progress is saved on this device",
    bodyPersistent:
      "This browser has granted lasting storage. Your progress stays on this " +
      "device. You can export it at any time to move it or back it up.",
    titleNotPersisted: "Your progress is saved on this device",
    bodyNotPersisted:
      "Your progress is saved in this browser. The browser may clear it if " +
      "storage runs low. Adding the app to your home screen makes it lasting. " +
      "You can export your progress at any time.",
    titleDegraded: "Saving is limited in this browser",
    bodyDegraded:
      "This browser cannot store your progress between sessions. You can still " +
      "practise now. Export your progress before you close the tab, or open " +
      "this page in Chrome, Safari, or Firefox for lasting storage.",
    exportPromote: "Export keeps a copy you control. Use it any time.",
    cta: "Start practising",
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
