/**
 * navRoutes.ts — pure mapping between hash routes and nav item ids.
 *
 * Shell-hosted routes have a corresponding nav item; full-bleed routes do not.
 * This module is the single registration point so the shell and any tests stay
 * in sync without importing each other.
 *
 * Exported functions are stateless and side-effect-free so they are testable
 * without a DOM or React context.
 */

/** Nav item identifiers, matching the RAIL_ITEMS order in the design drop. */
export type NavId = "today" | "practice" | "diagnosis" | "mock" | "syllabus" | "settings";

/** Routes that live inside the shell (persistent rail or tab bar visible). */
const SHELL_ROUTE_MAP: Record<string, NavId> = {
  home:      "today",
  diagnosis: "diagnosis",
  mock:      "mock",
  settings:  "settings",
  // "syllabus" route reserved; nav item present, flow not yet landed.
  syllabus:  "syllabus",
};

/**
 * Resolve the active nav id for a given hash route fragment (the part after
 * `#/`). Returns the nav id when the route is shell-hosted, or null when the
 * route is full-bleed (practice, baseline, firstrun, demo, or the boot default).
 */
export function navIdForRoute(route: string): NavId | null {
  return SHELL_ROUTE_MAP[route] ?? null;
}

/**
 * Resolve the hash route fragment for a given nav id. Returns the canonical
 * route so the shell can call navigate() on item click.
 */
export function routeForNavId(id: NavId): string {
  switch (id) {
    case "today":     return "home";
    case "diagnosis": return "diagnosis";
    case "mock":      return "mock";
    case "settings":  return "settings";
    case "syllabus":  return "syllabus";
    // Practice is a full-bleed flow; the nav item navigates into it.
    case "practice":  return "practice";
  }
}

/**
 * Returns true when the given route should be rendered inside the app shell
 * (persistent nav visible). Returns false for full-bleed routes.
 *
 * Full-bleed: firstrun, baseline, practice (active question session), demo,
 * and the empty-hash boot screen while the default target is resolving.
 */
export function isShellRoute(route: string): boolean {
  return route in SHELL_ROUTE_MAP;
}
