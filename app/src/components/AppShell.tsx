/**
 * AppShell.tsx — persistent navigation shell for the Pinaka Abhyas PWA.
 *
 * Desktop (min-width 1024px): a 224px left rail with brand lockup at the top,
 * five nav destinations, a divider after Practice, and a Settings item at the
 * foot. The content area to the right fills the remaining space and scrolls
 * independently.
 *
 * Below 1024px: a fixed bottom tab bar with the same five destinations (icons
 * plus 11-12px labels), 44px minimum touch targets, a hairline border-top, and
 * env(safe-area-inset-bottom) padding for notched devices. The content area
 * must reserve height equal to the tab bar so flow content and any pinned dock
 * (.pr-dock) are not covered.
 *
 * The shell never scrolls as a page; the content area uses the same
 * 100dvh-based flex pattern the existing flows use.
 *
 * Accessibility: a single <nav aria-label="Main"> is rendered. On desktop the
 * tab bar is hidden (display: none via CSS) so only the rail appears in the
 * accessibility tree. On mobile the rail is hidden and the tab bar is visible.
 * Keeping one element visible at a time avoids duplicate landmark confusion.
 *
 * Icons: inline SVG recreated from the design-team Icon set geometry
 * (design-team/v2/app-shell.jsx). Stroke currentColor, strokeWidth 1.75,
 * strokeLinecap square, strokeLinejoin miter.
 */

import { type ReactNode } from "react";

import { BrandMark } from "./BrandMark.js";
import { type NavId, navIdForRoute, routeForNavId } from "./navRoutes.js";
import "./shell.css";

/** Navigate by setting the hash (records a history entry so Back works). */
function navigate(route: string): void {
  if (typeof window === "undefined") return;
  window.location.hash = route === "" ? "" : `/${route}`;
}

/* ------------------------------------------------------------------ */
/* ICONS                                                               */
/* ------------------------------------------------------------------ */

/** Shared SVG attributes for all nav icons. */
const iconProps = {
  width:           17,
  height:          17,
  viewBox:         "0 0 24 24",
  fill:            "none",
  stroke:          "currentColor",
  strokeWidth:     1.75,
  strokeLinecap:   "square" as const,
  strokeLinejoin:  "miter" as const,
  "aria-hidden":   true as const,
};

function IconHome(): JSX.Element {
  return (
    <svg {...iconProps}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconCrosshair(): JSX.Element {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function IconLayers(): JSX.Element {
  return (
    <svg {...iconProps}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconClipboard(): JSX.Element {
  return (
    <svg {...iconProps}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

function IconSettings(): JSX.Element {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* NAV ITEM DATA                                                       */
/* ------------------------------------------------------------------ */

interface NavItem {
  readonly id:    NavId;
  readonly label: string;
  readonly Icon:  () => JSX.Element;
}

const PRIMARY_ITEMS: readonly NavItem[] = [
  { id: "today",     label: "Today",     Icon: IconHome },
  { id: "practice",  label: "Practice",  Icon: IconCrosshair },
  { id: "diagnosis", label: "Diagnosis", Icon: IconLayers },
  { id: "mock",      label: "Mocks",     Icon: IconClipboard },
  // Syllabus is in the design rail but its flow has not landed; a nav item
  // that silently falls back to Today is worse than its absence. Restore the
  // row (id "syllabus", book icon from design-team/v2/app-shell.jsx) when the
  // flow ships.
];

/* ------------------------------------------------------------------ */
/* SHELL COMPONENT                                                     */
/* ------------------------------------------------------------------ */

interface AppShellProps {
  /** The current hash route fragment (e.g. "home", "diagnosis"). */
  readonly route:       string;
  /** Number of practice reviews due (shown as a badge on the Practice item). */
  readonly reviewCount?: number;
  /** The flow rendered in the content area. */
  readonly children:    ReactNode;
}

/**
 * AppShell — the persistent navigation wrapper for shell-hosted routes.
 *
 * Renders the rail (desktop) or the tab bar (mobile) plus the content area.
 * The calling Router is responsible for deciding which routes get the shell.
 */
export function AppShell({
  route,
  reviewCount = 0,
  children,
}: AppShellProps): JSX.Element {
  const activeId = navIdForRoute(route);

  function handleNav(id: NavId): void {
    navigate(routeForNavId(id));
  }

  return (
    <div className="app-shell">
      {/* Single nav element: the CSS shows rail on desktop, tabs on mobile.
          Rendering one element keeps the landmark tree clean. */}
      <nav className="app-shell__nav" aria-label="Main">
        {/* ---- RAIL (desktop, >= 1024px) ---- */}
        <div className="app-shell__rail" aria-hidden="false">
          <div className="app-shell__rail-brand">
            <BrandMark size={22} />
          </div>

          <div className="app-shell__rail-nav">
            {PRIMARY_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <div key={item.id}>
                  <button
                    className={
                      isActive
                        ? "app-shell__rail-item app-shell__rail-item--active"
                        : "app-shell__rail-item"
                    }
                    type="button"
                    title={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleNav(item.id)}
                  >
                    <item.Icon />
                    <span className="app-shell__rail-label">{item.label}</span>
                    {item.id === "practice" && reviewCount > 0 && (
                      <span
                        className="app-shell__rail-count"
                        title={`${reviewCount} reviews due`}
                      >
                        {reviewCount}
                      </span>
                    )}
                  </button>
                  {/* Divider after Practice, per the design mockup. */}
                  {item.id === "practice" && (
                    <div className="app-shell__rail-divider" role="separator" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="app-shell__rail-foot">
            <button
              className={
                activeId === "settings"
                  ? "app-shell__rail-item app-shell__rail-item--active"
                  : "app-shell__rail-item"
              }
              type="button"
              title="Settings"
              aria-current={activeId === "settings" ? "page" : undefined}
              onClick={() => handleNav("settings")}
            >
              <IconSettings />
              <span className="app-shell__rail-label">Settings</span>
            </button>

            <div className="app-shell__rail-device">
              <div className="app-shell__rail-device-line">
                <span className="app-shell__rail-dot" />
                <span>On this device</span>
              </div>
              <div className="app-shell__rail-device-sub">
                CA Foundation - Paper 3 QA
              </div>
            </div>
          </div>
        </div>

        {/* ---- TAB BAR (mobile / tablet, < 1024px) ---- */}
        <div className="app-shell__tabs" aria-hidden="false">
          {PRIMARY_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                className={
                  isActive
                    ? "app-shell__tab app-shell__tab--active"
                    : "app-shell__tab"
                }
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNav(item.id)}
              >
                <span className="app-shell__tab-icon">
                  {item.id === "practice" && reviewCount > 0 ? (
                    <span className="app-shell__tab-badge" aria-hidden="true">
                      <item.Icon />
                    </span>
                  ) : (
                    <item.Icon />
                  )}
                </span>
                <span className="app-shell__tab-label">{item.label}</span>
              </button>
            );
          })}

          <button
            className={
              activeId === "settings"
                ? "app-shell__tab app-shell__tab--active"
                : "app-shell__tab"
            }
            type="button"
            aria-current={activeId === "settings" ? "page" : undefined}
            onClick={() => handleNav("settings")}
          >
            <span className="app-shell__tab-icon">
              <IconSettings />
            </span>
            <span className="app-shell__tab-label">Settings</span>
          </button>
        </div>
      </nav>

      {/* Content area: fills remaining space, scrolls internally. */}
      <div className="app-shell__content">
        {children}
      </div>
    </div>
  );
}
