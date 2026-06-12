/**
 * navigate.ts — the single hash-navigation helper (SSOT).
 *
 * Every programmatic route change goes through here so history behavior is
 * uniform (a history entry per navigation; Back works). The route crossfade
 * itself lives in the Router, which wraps its state swap in
 * document.startViewTransition on hashchange — keeping the View Transitions
 * logic in one place rather than at every call site.
 */

/** Navigate by setting the hash (records a history entry, so Back works). */
export function navigate(route: string): void {
  if (typeof window === "undefined") return;
  window.location.hash = route === "" ? "" : `/${route}`;
}

/** Read the current route from the URL hash (the fragment after "#/"). */
export function readRoute(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#\/?/, "");
}
