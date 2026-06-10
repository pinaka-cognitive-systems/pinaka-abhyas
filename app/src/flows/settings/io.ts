/**
 * Browser side-effects for export/import (W5-5 flow e).
 *
 * The impure edge: turning an envelope string into a downloaded file or a shared
 * file, and reading a picked file's text. Kept out of logic.ts so the decision
 * logic stays DOM-free and testable; these thin wrappers are exercised by hand
 * and by the real flow, not by the unit suite.
 */

/**
 * Trigger a file download of `text` named `filename`. Creates an object URL,
 * clicks a transient anchor, and revokes the URL. Returns true on success,
 * false if the DOM is unavailable (so the caller can show the failure note).
 */
export function downloadTextFile(text: string, filename: string, mime = "application/json"): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick so the click has been dispatched.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

/** Probe the Web Share API surface (passed into logic.canShareFile). */
export function shareProbe(): { hasShare: boolean; hasCanShare: boolean } {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  return {
    hasShare: typeof nav?.share === "function",
    hasCanShare: typeof nav?.canShare === "function",
  };
}

/** The result of an attempted share. */
export type ShareResult = "shared" | "cancelled" | "unsupported" | "failed";

/**
 * Share the progress file via the Web Share API where it accepts files. Falls
 * back to "unsupported" if files cannot be shared, so the caller can offer the
 * download path instead. A user-cancelled share is reported distinctly so the
 * UI does not show an error for a deliberate cancel.
 */
export async function shareTextFile(
  text: string,
  filename: string,
  mime = "application/json",
): Promise<ShareResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }
  try {
    const file = new File([text], filename, { type: mime });
    if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
      return "unsupported";
    }
    await navigator.share({ files: [file], title: "Pinaka Abhyas progress" });
    return "shared";
  } catch (err) {
    // AbortError is a user cancel, not a failure.
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    return "failed";
  }
}

/** Read a picked file's text. Rejects if the read fails. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsText(file);
  });
}
