/**
 * First-run platform detection and the beforeinstallprompt capture (W5-5 flow d).
 *
 * The browser surfaces that the sequencer (machine.ts) needs but that are not
 * already covered by storage/detectCapabilities(): the captured install prompt
 * (Chromium), the iOS Safari heuristic (manual share-sheet path), and whether
 * the app is already running standalone (installed).
 *
 * The beforeinstallprompt event fires once, early, and must be preventDefault'd
 * and stashed to be replayed later from a user gesture. We capture it at module
 * load so a prompt fired before the flow mounts is not lost.
 */

/** The non-standard BeforeInstallPromptEvent (Chromium only). Typed locally
 * because lib.dom does not ship it. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed" }>;
}

/** Module-level stash of the most recent captured prompt event. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Begin listening for beforeinstallprompt. Idempotent: safe to call from module
 * scope and again from a component effect. Returns an unsubscribe function for
 * the component-effect case.
 */
export function captureInstallPrompt(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPrompt = (e: Event): void => {
    e.preventDefault(); // stop the mini-infobar; we drive the prompt ourselves
    deferredPrompt = e as BeforeInstallPromptEvent;
  };
  const onInstalled = (): void => {
    deferredPrompt = null; // consumed; nothing left to offer
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** Whether a captured install prompt is available to replay. */
export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Replay the captured prompt from a user gesture. Returns the outcome, or
 * "unavailable" when there was nothing to prompt. The event is single-use, so
 * we clear the stash after prompting.
 */
export async function showInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const evt = deferredPrompt;
  if (evt === null) return "unavailable";
  deferredPrompt = null;
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

/**
 * Heuristic: the page is iOS Safari (the manual share-sheet install path).
 *
 * iOS reports "iPad"/"iPhone"/"iPod", OR an iPadOS Safari that masquerades as
 * desktop Macintosh but exposes touch points. We exclude in-app webviews
 * (CriOS = Chrome, FxiOS = Firefox, and the social webviews) because those have
 * no Add-to-Home-Screen and are routed out by the webview escape first anyway.
 */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOSDesktop =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  if (!iOSDevice && !iPadOSDesktop) return false;
  // Non-Safari iOS browsers and webviews: no Add-to-Home-Screen for our purpose.
  const notSafari = /CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
  return !notSafari;
}

/** Whether the app is already running as an installed/standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari exposes the legacy navigator.standalone flag.
  const iosStandalone =
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

// Begin capturing immediately on import so an early-firing prompt is not lost.
// In a non-browser (test) environment this is a no-op.
captureInstallPrompt();
