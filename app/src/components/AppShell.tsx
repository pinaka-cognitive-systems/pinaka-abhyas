/**
 * AppShell.tsx — persistent navigation shell for the Pinaka Abhyas PWA.
 *
 * The rail is the design team's (design-team/v2/app-shell.jsx Rail, app.css
 * .rail family, ported to theme/design.css):
 *
 *   >= 1200px: full rail, 224px — brand lockup, six labelled destinations
 *   (Today, Practice, Diagnosis, Mocks, Syllabus, then Settings after a gap),
 *   reviews-due count pill on Practice, "On this device" foot.
 *
 *   900-1199px: icon rail, 64px — labels clipped (still in the a11y tree, an
 *   app addition recorded in as-built), count pill repositioned to the icon
 *   corner, foot hidden, native title tooltips carry the visible label.
 *
 *   < 900px: bottom tab bar (an app addition for phones, which the design
 *   drop does not cover; ruling 2026-06-12). Same six destinations, 44px
 *   touch targets, count pill on the Practice icon, safe-area padding.
 *
 * The shell never scrolls as a page; the content area scrolls internally.
 */

import { type ReactNode } from "react";

import { Icon, type IconName } from "./ui.js";
import { type NavId, navIdForRoute, routeForNavId } from "./navRoutes.js";
import { navigate } from "./navigate.js";
import "./shell.css";

/* ------------------------------------------------------------------ */
/* NAV ITEM DATA — design RAIL_ITEMS order (app-shell.jsx:67-73)        */
/* ------------------------------------------------------------------ */

interface NavItem {
  readonly id:    NavId;
  readonly label: string;
  readonly icon:  IconName;
}

const PRIMARY_ITEMS: readonly NavItem[] = [
  { id: "today",     label: "Today",     icon: "home" },
  { id: "practice",  label: "Practice",  icon: "crosshair" },
  { id: "diagnosis", label: "Diagnosis", icon: "layers" },
  { id: "mock",      label: "Mocks",     icon: "clipboard" },
  { id: "syllabus",  label: "Syllabus",  icon: "book" },
];

/* ------------------------------------------------------------------ */
/* SHELL COMPONENT                                                     */
/* ------------------------------------------------------------------ */

interface AppShellProps {
  /** The current hash route fragment (e.g. "today", "diagnosis"). */
  readonly route:        string;
  /** Number of reviews due (the badge on the Practice item). */
  readonly reviewCount?: number;
  /** Opens the keyboard shortcut sheet (the floating "Shortcuts ?" pill). */
  readonly onShortcuts?: () => void;
  /** The flow rendered in the content area. */
  readonly children:     ReactNode;
}

export function AppShell({
  route,
  reviewCount = 0,
  onShortcuts,
  children,
}: AppShellProps): JSX.Element {
  const activeId = navIdForRoute(route);

  function handleNav(id: NavId): void {
    navigate(routeForNavId(id));
  }

  function railItem(item: NavItem): JSX.Element {
    const isActive = activeId === item.id;
    return (
      <button
        key={item.id}
        className={`rail__item ${isActive ? "is-active" : ""}`}
        type="button"
        title={item.label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => handleNav(item.id)}
      >
        <Icon name={item.icon} size={17} />
        <span>{item.label}</span>
        {item.id === "practice" && reviewCount > 0 && (
          <span className="rail__count" title={`${reviewCount} reviews due`}>
            {reviewCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="app-shell">
      <nav className="app-shell__nav" aria-label="Primary">
        {/* ---- RAIL (>= 900px; full at >= 1200px, icons at 900-1199px) ---- */}
        <div className="rail">
          <div className="rail__brand">
            <Icon name="chevron-mark" size={22} />
            <span className="rail__brand-text">Pinaka</span>
            <span className="rail__brand-tag">abhyas</span>
          </div>
          <div className="rail__nav">
            {PRIMARY_ITEMS.map((item) => (
              <span key={item.id} style={{ display: "contents" }}>
                {railItem(item)}
                {item.id === "practice" && <div className="rail__divider" role="separator" />}
              </span>
            ))}
          </div>
          <div className="rail__nav" style={{ marginTop: "var(--space-2)" }}>
            <button
              className={`rail__item ${activeId === "settings" ? "is-active" : ""}`}
              type="button"
              title="Settings"
              aria-current={activeId === "settings" ? "page" : undefined}
              onClick={() => handleNav("settings")}
            >
              <Icon name="settings" size={17} />
              <span>Settings</span>
            </button>
          </div>
          <div className="rail__foot">
            <div className="rail__local"><span className="rail__dot" />On this device</div>
            <div className="rail__local-sub">CA Foundation · Paper 3 QA</div>
          </div>
        </div>

        {/* ---- TAB BAR (< 900px) ---- */}
        <div className="app-shell__tabs">
          {[...PRIMARY_ITEMS, { id: "settings" as NavId, label: "Settings", icon: "settings" as IconName }].map(
            (item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  className={`app-shell__tab ${isActive ? "app-shell__tab--active" : ""}`}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleNav(item.id)}
                >
                  <span className="app-shell__tab-icon">
                    <Icon name={item.icon} size={17} />
                    {item.id === "practice" && reviewCount > 0 && (
                      <span className="app-shell__tab-count" title={`${reviewCount} reviews due`}>
                        {reviewCount}
                      </span>
                    )}
                  </span>
                  <span className="app-shell__tab-label">{item.label}</span>
                </button>
              );
            },
          )}
        </div>
      </nav>

      {/* Content area: fills remaining space, scrolls internally. */}
      <div className="app-shell__content">{children}</div>

      {/* Floating shortcut hint (design App.html:172-174); desktop only. */}
      {onShortcuts && (
        <button className="kbd-hint app-shell__kbd-hint" type="button" onClick={onShortcuts}>
          <Icon name="keyboard" size={13} />
          Shortcuts <kbd className="kbd">?</kbd>
        </button>
      )}
    </div>
  );
}
