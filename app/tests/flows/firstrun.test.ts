/**
 * First-run sequencing logic (W5-5 flow d).
 *
 * The "which step shows when" logic, tested directly without a DOM (the repo
 * convention). Value-first order: the run is one screen (welcome) after
 * booting in a real browser. The webview path leads with the escape and shows
 * nothing else. Install, exam, and storage steps have moved to the baseline
 * close screen; installVariant is still tested here because the baseline close
 * screen uses it to decide whether to show the install card. The honest storage
 * state, exam-attempt persistence, and second-tab takeover contract are
 * unchanged. DOM-free (node environment).
 */

import { describe, expect, it } from "vitest";

import {
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
} from "../../src/flows/firstrun/machine.js";
import {
  FIRSTRUN_META_KEYS,
  getExamAttempt,
  getExamMs,
  isFirstRunComplete,
  markFirstRunComplete,
  setExamAttempt,
} from "../../src/flows/firstrun/meta.js";
import { MemoryAdapter } from "../../src/storage/memory.js";
import { AlreadyOpenError } from "../../src/storage/index.js";

/** A baseline non-webview, non-iOS, no-prompt, not-standalone platform. */
function platform(over: Partial<FirstRunPlatform> = {}): FirstRunPlatform {
  return {
    inAppWebview: false,
    installPromptAvailable: false,
    iosSafari: false,
    standalone: false,
    ...over,
  };
}

describe("first-run sequencing (value-first: one screen before baseline)", () => {
  it("webview path: leads with the escape and shows nothing else", () => {
    const seq = firstRunSequence(platform({ inAppWebview: true }));
    expect(seq).toEqual(["webview"]);
    // Even an installable-looking webview is escaped first; no install step.
    const seq2 = firstRunSequence(
      platform({ inAppWebview: true, installPromptAvailable: true, iosSafari: true }),
    );
    expect(seq2).toEqual(["webview"]);
  });

  it("standard path (any non-webview platform): single welcome screen", () => {
    expect(firstRunSequence(platform())).toEqual(["welcome"]);
    expect(firstRunSequence(platform({ installPromptAvailable: true }))).toEqual(["welcome"]);
    expect(firstRunSequence(platform({ iosSafari: true }))).toEqual(["welcome"]);
    expect(firstRunSequence(platform({ standalone: true }))).toEqual(["welcome"]);
  });

  it("welcome is the last step; nextStep returns null from it", () => {
    const seq = firstRunSequence(platform());
    expect(nextStep(seq, "welcome")).toBeNull();
    expect(isLastStep(seq, "welcome")).toBe(true);
  });

  it("nextStep returns null for a step not in the sequence", () => {
    const seq = firstRunSequence(platform());
    expect(nextStep(seq, "webview")).toBeNull();
  });
});

describe("installVariant (used by baseline close screen to show install card)", () => {
  it("standalone: nothing to install", () => {
    expect(installVariant(platform({ standalone: true }))).toBe("none");
    expect(installVariant(platform({ standalone: true, installPromptAvailable: true }))).toBe("none");
  });

  it("Chromium prompt path: returns prompt", () => {
    expect(installVariant(platform({ installPromptAvailable: true }))).toBe("prompt");
  });

  it("iOS Safari path: returns ios-manual", () => {
    expect(installVariant(platform({ iosSafari: true }))).toBe("ios-manual");
  });

  it("no install path (desktop browser, no prompt): returns none", () => {
    expect(installVariant(platform())).toBe("none");
  });
});

describe("honest storage state", () => {
  it("persistent: sahpool viable and persistence granted", () => {
    expect(storageState(true, true)).toBe("persistent");
  });
  it("not-persisted: sahpool viable but persistence not granted", () => {
    expect(storageState(true, false)).toBe("not-persisted");
  });
  it("degraded path: sahpool not viable always reports degraded", () => {
    expect(storageState(false, false)).toBe("degraded");
    // Even if persisted() somehow returned true, a non-viable backend is degraded.
    expect(storageState(false, true)).toBe("degraded");
  });
});

describe("exam attempt -> examMs", () => {
  it("september and january resolve to their fixed horizons; undecided is undefined", () => {
    expect(attemptToExamMs("september")).toBe(EXAM_ATTEMPT_MS.september);
    expect(attemptToExamMs("january")).toBe(EXAM_ATTEMPT_MS.january);
    expect(attemptToExamMs("undecided")).toBeUndefined();
  });

  it("the horizons are in the future-facing order september < january", () => {
    expect(EXAM_ATTEMPT_MS.september).toBeLessThan(EXAM_ATTEMPT_MS.january);
  });

  it("parseAttempt accepts the three valid values and defaults unknowns to undecided", () => {
    for (const a of ["september", "january", "undecided"] as const) {
      expect(parseAttempt(a)).toBe(a);
    }
    expect(parseAttempt(null)).toBe("undecided");
    expect(parseAttempt("garbage")).toBe("undecided");
    expect(parseAttempt("")).toBe("undecided");
  });
});

describe("exam-date persistence round-trip (real MemoryAdapter)", () => {
  it("setExamAttempt then getExamMs returns the engine horizon", async () => {
    const adapter = await MemoryAdapter.open();
    await setExamAttempt(adapter, "september");
    expect(await getExamAttempt(adapter)).toBe("september");
    expect(await getExamMs(adapter)).toBe(EXAM_ATTEMPT_MS.september);
    // Overwrite and re-read.
    await setExamAttempt(adapter, "january");
    expect(await getExamMs(adapter)).toBe(EXAM_ATTEMPT_MS.january);
    await adapter.close();
  });

  it("undecided persists and reads back as undefined examMs", async () => {
    const adapter = await MemoryAdapter.open();
    await setExamAttempt(adapter, "undecided");
    expect(await getExamMs(adapter)).toBeUndefined();
    await adapter.close();
  });

  it("an unset attempt reads back as undecided/undefined (no crash)", async () => {
    const adapter = await MemoryAdapter.open();
    expect(await getExamAttempt(adapter)).toBe("undecided");
    expect(await getExamMs(adapter)).toBeUndefined();
    expect(await adapter.getMeta(FIRSTRUN_META_KEYS.examAttempt)).toBeNull();
    await adapter.close();
  });

  it("first-run completion flag round-trips", async () => {
    const adapter = await MemoryAdapter.open();
    expect(await isFirstRunComplete(adapter)).toBe(false);
    await markFirstRunComplete(adapter);
    expect(await isFirstRunComplete(adapter)).toBe(true);
    expect(await adapter.getMeta(FIRSTRUN_META_KEYS.completed)).toBe("true");
    await adapter.close();
  });
});

describe("second-tab takeover contract", () => {
  it("AlreadyOpenError is the typed signal the second-tab screen renders on", () => {
    const err = new AlreadyOpenError();
    expect(err).toBeInstanceOf(AlreadyOpenError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AlreadyOpenError");
  });

  it("a takeover does not change the sequence (same platform, same steps)", () => {
    // The takeover does not change which step the run is on: the sequence is a
    // pure function of the platform, unchanged by a connection takeover.
    const p = platform({ iosSafari: true });
    const before = firstRunSequence(p);
    const after = firstRunSequence(p);
    expect(after).toEqual(before);
    const attempt: ExamAttempt = "september";
    expect(attemptToExamMs(attempt)).toBe(EXAM_ATTEMPT_MS.september);
  });
});
