/**
 * navRoutes.ts — pure mapping between hash routes and nav item ids.
 *
 * The single registration point for the shell/route contract, mirroring the
 * design canvas RAIL_FOR map (design-team/v2/App.html:44-49): shell-hosted
 * routes keep the persistent rail (or the mobile tab bar) visible; full-bleed
 * flows hide it to preserve the focus environment.
 *
 *   today        -> rail Today        (canonical; "home" is a legacy alias)
 *   practice     -> rail Practice     (the hub; the drill itself is full-bleed)
 *   review       -> rail Practice     (the queue walks under Practice)
 *   diagnosis    -> rail Diagnosis
 *   misconception/* -> rail Diagnosis (the drill-through detail)
 *   syllabus     -> rail Syllabus
 *   mock         -> rail Mocks        (the hub; mock/* phases are full-bleed)
 *   settings     -> rail Settings
 *
 * Full-bleed (no rail): drill, mock/* (hall, reveal, breakdown, review),
 * firstrun, testday, demo, and the empty boot route.
 *
 * Exported functions are stateless and side-effect-free so they are testable
 * without a DOM or React context.
 */

/** Nav item identifiers, matching the design RAIL_ITEMS order. */
export type NavId = "today" | "practice" | "diagnosis" | "mock" | "syllabus" | "settings";

/** First-segment lookup for shell-hosted routes. */
const SHELL_ROUTE_MAP: Record<string, NavId> = {
  today:         "today",
  home:          "today",      // legacy alias; the router redirects to #/today
  practice:      "practice",
  review:        "practice",
  diagnosis:     "diagnosis",
  misconception: "diagnosis",
  syllabus:      "syllabus",
  mock:          "mock",
  settings:      "settings",
};

/** The route's first path segment ("misconception/x" -> "misconception"). */
function head(route: string): string {
  const i = route.indexOf("/");
  return i === -1 ? route : route.slice(0, i);
}

/**
 * Resolve the active nav id for a given hash route fragment (the part after
 * `#/`). Returns the nav id when the route is shell-hosted, or null when the
 * route is full-bleed. Mock sub-routes (mock/hall, mock/reveal, ...) are the
 * full-window exam phases and return null; the bare "mock" hub keeps the rail.
 */
export function navIdForRoute(route: string): NavId | null {
  const h = head(route);
  if (h === "mock" && route !== "mock") return null;
  return SHELL_ROUTE_MAP[h] ?? null;
}

/**
 * Resolve the canonical hash route fragment for a nav id, used by the shell
 * to navigate on item click and by the keyboard layer (1-5, comma).
 */
export function routeForNavId(id: NavId): string {
  return id;
}

/**
 * Returns true when the given route should be rendered inside the app shell
 * (persistent nav visible). Returns false for full-bleed routes.
 */
export function isShellRoute(route: string): boolean {
  return navIdForRoute(route) !== null;
}
