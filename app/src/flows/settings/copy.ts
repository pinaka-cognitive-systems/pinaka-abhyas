/**
 * Settings copy (W5-5 flow e).
 *
 * Every string the settings screen shows, in one place so it can be
 * voice-checked. Voice rules (brand-core.md, positioning-ca.md): the Fellow
 * voice, no contractions ("do not", never "don't"), no exclamation marks, no
 * em-dashes, CEFR B1 target. The export line uses the brand table's progress
 * voice ("Your progress is yours. Export it any time, take it anywhere."). The
 * telemetry section is inert and honest per ADR 0014: off, nothing collected
 * today, opt-in if it ever ships, no personal data.
 *
 * A DOM-free test asserts no contraction, no "!", and no em-dash across every
 * string here (app/tests/flows/settings.copy.test.ts).
 */

export const COPY = {
  // --- Frame ----------------------------------------------------------------
  frame: {
    title: "Settings",
    close: "Back",
    closeAria: "Go back",
  },

  // --- Export (one tap; the universal backstop, ADR 0008). ------------------
  export: {
    eyebrow: "Your progress",
    title: "Back up your progress",
    // Brand table progress voice, stated as fact.
    body: "Your progress is yours. Export it any time, take it anywhere.",
    explain:
      "Export saves a file with everything you have practised. This file is " +
      "your backup. It works on any device. Keep it somewhere safe, and import " +
      "it to move your progress to a new phone or browser.",
    // {count} is filled at render time with the event count.
    countLabel: (count: number): string =>
      count === 1 ? "1 event saved on this device" : `${count} events saved on this device`,
    cta: "Export to a file",
    shareCta: "Share the file",
    done: "Your progress file is ready.",
    shared: "Shared. Keep the file somewhere safe.",
    empty:
      "You have nothing to back up yet. Practise a few questions, then export.",
    failed: "The export could not be saved. Try again, or use Share if it is shown.",
  },

  // --- Import (file picker -> preview -> confirm -> report). -----------------
  import: {
    eyebrow: "Move your progress here",
    title: "Import a progress file",
    body:
      "Choose a progress file you exported before. Nothing is changed until you " +
      "confirm. Importing only adds events you do not already have, so it is " +
      "safe to import the same file twice.",
    pick: "Choose a file",
    // Preview, after a dry-run merge. {new} and {dup} are filled at render time.
    previewTitle: "Here is what this file will add",
    previewFound: (total: number): string =>
      total === 1 ? "1 event found in the file" : `${total} events found in the file`,
    previewNew: (n: number): string =>
      n === 1 ? "1 event is new and will be added" : `${n} events are new and will be added`,
    previewDup: (n: number): string =>
      n === 1
        ? "1 event is already on this device and will be skipped"
        : `${n} events are already on this device and will be skipped`,
    previewInvalid: (n: number): string =>
      n === 1
        ? "1 record could not be read and will be skipped"
        : `${n} records could not be read and will be skipped`,
    previewNothing: "Nothing new to add. Everything in this file is already here.",
    confirm: "Add these events",
    cancel: "Cancel",
    // The final report after the merge commits.
    reportTitle: "Import finished",
    reportAdded: (n: number): string =>
      n === 1 ? "1 event added" : `${n} events added`,
    reportDuplicate: (n: number): string =>
      n === 1 ? "1 event already here, skipped" : `${n} events already here, skipped`,
    reportInvalid: (n: number): string =>
      n === 1 ? "1 record could not be read, skipped" : `${n} records could not be read, skipped`,
    reportReasonsTitle: "Records that could not be read",
    badFile:
      "This file could not be read as a progress file. Check that you chose the " +
      "right file, then try again.",
    done: "Done",
  },

  // --- Status (storage, install, versions). ---------------------------------
  status: {
    eyebrow: "This device",
    title: "Status",
    storageLabel: "Storage",
    storagePersistent: "Saved on this device, with lasting storage granted",
    storageNotPersisted:
      "Saved in this browser. Adding the app to your home screen makes it lasting.",
    storageDegraded:
      "Limited. This browser cannot store your progress between sessions. Export often.",
    installLabel: "Installed",
    installYes: "Yes, running from your home screen",
    installNo: "No, running in the browser",
    appVersionLabel: "App version",
    packVersionLabel: "Question pack",
    packNone: "No pack installed yet",
    examLabel: "Exam attempt",
    examSeptember: "September 2026",
    examJanuary: "January 2027",
    examUndecided: "Not decided yet",
  },

  // --- Telemetry (inert, ADR 0014). -----------------------------------------
  telemetry: {
    eyebrow: "Sharing",
    title: "Share anonymous data",
    stateOff: "Off",
    // ADR 0014 honest wording, verbatim intent.
    body:
      "Nothing is collected today. If sharing ships, it will be opt-in and " +
      "collect no personal data.",
  },

  // --- Update surface (drives the W5-4 updater). ----------------------------
  update: {
    eyebrow: "Questions",
    title: "Check for question updates",
    body:
      "Updates add new questions and fix any that were wrong. They download when " +
      "you are online and apply on their own.",
    check: "Check for updates",
    checking: "Checking",
    downloading: "Downloading the update",
    upToDate: "Your questions are up to date.",
    incompatibleApp:
      "A newer version of the questions is ready, but it needs a newer app. " +
      "Update the app first.",
    offline:
      "Could not check right now. This is normal when you are offline. Try again " +
      "when you are online.",
    deferred:
      "An update is ready and will apply when your mock ends. Your questions and " +
      "your clock will not change during a mock.",
    appliedTitle: "Questions updated",
    appliedTo: (version: string): string => `Updated to pack ${version}.`,
    errataTitle: "What was fixed",
    errataNone: "No corrections were listed for this update.",
  },

  // --- Danger zone (type-to-confirm DELETE, preceded by an export nudge). ----
  danger: {
    eyebrow: "Danger zone",
    title: "Delete all local data",
    body:
      "This removes everything on this device: your progress, your settings, and " +
      "your exam attempt. This cannot be undone.",
    nudge: "Export your progress first if you want to keep it.",
    nudgeCta: "Export now",
    confirmLabel: "To confirm, type DELETE below.",
    confirmWord: "DELETE",
    confirmPlaceholder: "DELETE",
    cta: "Delete everything",
    cancel: "Cancel",
    open: "Delete all local data",
    done: "Everything on this device has been deleted.",
  },
} as const;
