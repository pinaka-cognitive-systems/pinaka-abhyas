/**
 * ui.tsx — shared presentational components, ported from the design drop.
 *
 * SOURCE: design-team/v2/app-shell.jsx (Icon, Chip, Caveat, ScreenHead,
 * ReadinessBand, ShortcutSheet) and scr-core.jsx (toast). These are the
 * single implementations; flows import from here and never re-draw their own
 * icons or chips (SSOT). Styling comes from theme/design.css under the
 * design team's class names.
 *
 * The Sheet dialog adds the focus trap the Engineering Handout requires
 * (dialogs are focus-trapped, Esc-dismissable, labelled); the design canvas
 * implemented the trap at the app level (App.html:109-123), here it lives
 * with the dialog so every caller gets it.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* ICONS — design-team/v2/app-shell.jsx:4-42, geometry verbatim         */
/* ------------------------------------------------------------------ */

export type IconName =
  | "home" | "crosshair" | "repeat" | "clipboard" | "settings" | "check"
  | "x" | "arrow-right" | "arrow-left" | "chevron-down" | "chevron-right"
  | "chevron-up" | "minus" | "plus" | "square" | "alert" | "lightbulb"
  | "trend-down" | "trend-up" | "lock" | "download" | "clock" | "flag"
  | "layers" | "book" | "keyboard" | "circle" | "dot" | "chevron-mark";

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** Lucide-style monoline icon set, stroke 1.75, square caps, miter joins. */
export function Icon({ name, size = 18, className, style }: IconProps): JSX.Element | null {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    "aria-hidden": true as const,
    className,
    style,
  };
  switch (name) {
    case "home": return <svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case "crosshair": return <svg {...p}><circle cx="12" cy="12" r="8" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>;
    case "repeat": return <svg {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>;
    case "clipboard": return <svg {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
    case "check": return <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>;
    case "x": return <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "arrow-right": return <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
    case "arrow-left": return <svg {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
    case "chevron-down": return <svg {...p}><polyline points="6 9 12 15 18 9" /></svg>;
    case "chevron-right": return <svg {...p}><polyline points="9 18 15 12 9 6" /></svg>;
    case "chevron-up": return <svg {...p}><polyline points="18 15 12 9 6 15" /></svg>;
    case "minus": return <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "plus": return <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "square": return <svg {...p}><rect x="5" y="5" width="14" height="14" rx="1" /></svg>;
    case "alert": return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "lightbulb": return <svg {...p}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z" /></svg>;
    case "trend-down": return <svg {...p}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>;
    case "trend-up": return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
    case "lock": return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
    case "download": return <svg {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>;
    case "flag": return <svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
    case "layers": return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
    case "book": return <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
    case "keyboard": return <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="10" /><line x1="10" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="14" y2="10" /><line x1="18" y1="10" x2="18" y2="10" /><line x1="7" y1="14" x2="17" y2="14" /></svg>;
    case "circle": return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
    case "dot": return <svg {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></svg>;
    case "chevron-mark":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" className={className} style={style}>
          <path d="M4 18L12 6" />
          <path d="M16 12L20 18" />
        </svg>
      );
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* CHIP + CAVEAT — app-shell.jsx:110-116                                */
/* ------------------------------------------------------------------ */

export type ChipKind = "focus" | "solid" | "low";

export function Chip({ kind, children }: { readonly kind?: ChipKind; readonly children: ReactNode }): JSX.Element {
  return <span className={`chip ${kind ? `chip--${kind}` : ""}`}>{children}</span>;
}

export function Caveat({
  children,
  icon = "lock",
  style,
}: {
  readonly children: ReactNode;
  readonly icon?: IconName;
  readonly style?: CSSProperties;
}): JSX.Element {
  return (
    <span className="caveat" style={style}>
      <Icon name={icon} size={12} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* SCREEN HEAD — app-shell.jsx:118-131                                  */
/* ------------------------------------------------------------------ */

export function ScreenHead({
  eyebrow,
  eyebrowIcon,
  title,
  lede,
  right,
}: {
  readonly eyebrow?: ReactNode;
  readonly eyebrowIcon?: IconName;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly right?: ReactNode;
}): JSX.Element {
  return (
    <div className="screen__head">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {eyebrow && (
            <div className="screen__eyebrow">
              {eyebrowIcon && <Icon name={eyebrowIcon} size={13} />}
              {eyebrow}
            </div>
          )}
          <h1 className="screen__title">{title}</h1>
          {lede && <p className="screen__lede">{lede}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* READINESS BAND — app-shell.jsx:133-166                               */
/* The estimate band: never a single predicted score. The empty variant */
/* declares the absence instead of guessing.                            */
/* ------------------------------------------------------------------ */

/** The design-shaped readiness view-model (see engine/insights.ts). */
export interface ReadinessView {
  readonly net: number;
  readonly lo: number;
  readonly hi: number;
  /** Display ladder: "low" | "moderate" (the engine never claims more). */
  readonly confidence: string;
  readonly target: number | null;
}

export function ReadinessBand({
  readiness,
  compact = false,
}: {
  readonly readiness: ReadinessView | null;
  readonly compact?: boolean;
}): JSX.Element {
  if (!readiness) {
    return (
      <div className="rb rb--empty">
        <div className="rb__label">Readiness</div>
        <p className="rb__none">
          No estimate yet. It appears after your first mock — a number with
          nothing behind it would be a guess, and Pinaka does not guess.
        </p>
      </div>
    );
  }
  const { net, lo, hi, confidence, target } = readiness;
  const span = hi - lo;
  const pct = (v: number): string => `${Math.max(0, Math.min(100, v))}%`;
  const cleared = lo >= 40;
  return (
    <div className={`rb ${compact ? "rb--compact" : ""}`}>
      <div className="rb__top">
        <div className="rb__label">Readiness · estimate</div>
        <Chip kind={confidence === "low" ? "low" : confidence === "good" ? "solid" : "focus"}>
          {confidence} confidence
        </Chip>
      </div>
      <div className="rb__scale">
        <div className="rb__bar" style={{ left: pct(lo), width: `${span}%` }} />
        <div className="rb__pass" style={{ left: "40%" }}>
          <span className="rb__pass-label">Pass 40</span>
        </div>
        {target != null && (
          <div className="rb__target" style={{ left: pct(target) }}>
            <span className="rb__target-label">Target {target}</span>
          </div>
        )}
        <span className="rb__end" style={{ left: pct(lo) }}>{lo}</span>
        <span className="rb__end rb__end--hi" style={{ left: pct(hi) }}>{hi}</span>
      </div>
      <p className="rb__note">
        Likely net between <span className="mono">{lo}</span> and{" "}
        <span className="mono">{hi}</span> of 100, net of negative marking.{" "}
        {cleared ? "The whole band clears the 40 bar" : "The band still straddles the 40 bar"}
        {target != null ? (
          <>
            ; about <span className="mono">{Math.max(0, target - net)}</span> short of your
            target of <span className="mono">{target}</span>.
          </>
        ) : (
          "."
        )}{" "}
        An estimate, not a predicted score.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SHEET — the dialog pattern (screens.css .sheet/.sheet-dim).          */
/* Focus-trapped, Esc-dismissable, labelled (Handout section 14).       */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  label,
  width,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Accessible dialog name (aria-label). */
  readonly label: string;
  readonly width?: number;
  readonly children: ReactNode;
}): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);

  // Focus trap: Tab cycles inside the sheet; Esc closes. Capture phase so the
  // trap wins over any flow-level key handling underneath the dim.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const sheet = ref.current;
      if (!sheet) return;
      const f = [...sheet.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]")]
        .filter((x) => !(x as HTMLButtonElement).disabled);
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (!sheet.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-dim" onClick={onClose}>
      <div
        ref={ref}
        className="sheet"
        style={width !== undefined ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TOAST — scr-core.jsx:163-168. role=status, auto-hide is the caller's */
/* timer (6s for the undo pattern, Handout addendum: forgiveness).      */
/* ------------------------------------------------------------------ */

export function Toast({
  children,
  actionLabel,
  onAction,
}: {
  readonly children: ReactNode;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}): JSX.Element {
  return (
    <div className="toast" role="status">
      <span>{children}</span>
      {actionLabel && onAction && (
        <button className="toast__undo" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Auto-hide window for the undo toast, per the Handout addendum (6 seconds). */
export const UNDO_TOAST_MS = 6000;

/* ------------------------------------------------------------------ */
/* SHORTCUT SHEET — app-shell.jsx:169-194 + App.html:66-79              */
/* ------------------------------------------------------------------ */

export interface ShortcutGroup {
  readonly group: string;
  readonly items: readonly { readonly label: string; readonly keys: readonly string[] }[];
}

/** The app keyboard contract, verbatim from the design canvas. */
export const SHORTCUTS: readonly ShortcutGroup[] = [
  { group: "Navigate", items: [
    { label: "Today", keys: ["1"] }, { label: "Practice", keys: ["2"] }, { label: "Diagnosis", keys: ["3"] },
    { label: "Mocks", keys: ["4"] }, { label: "Syllabus", keys: ["5"] },
    { label: "Settings", keys: [","] },
  ]},
  { group: "In a question", items: [
    { label: "Choose option", keys: ["1", "–", "4"] }, { label: "Commit / next", keys: ["Enter"] },
    { label: "Reveal working", keys: ["Space"] }, { label: "Mark for review", keys: ["M"] },
  ]},
  { group: "Anywhere", items: [
    { label: "This sheet", keys: ["?"] }, { label: "Exit a flow", keys: ["Esc"] },
  ]},
];

export function ShortcutSheet({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}): JSX.Element | null {
  const close = useCallback(() => onClose(), [onClose]);
  if (!open) return null;
  return (
    <Sheet open={open} onClose={close} label="Keyboard shortcuts">
      <div className="sheet__head">
        <span className="eyebrow">
          <Icon name="keyboard" size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          Keyboard
        </span>
        <button className="sheet__close" type="button" onClick={close} aria-label="Close">
          <Icon name="x" size={15} />
        </button>
      </div>
      <div className="sheet__body">
        {SHORTCUTS.map((g) => (
          <div className="sheet__group" key={g.group}>
            <div className="sheet__group-title">{g.group}</div>
            {g.items.map((s) => (
              <div className="sheet__row" key={s.label}>
                <span>{s.label}</span>
                <span className="sheet__keys">
                  {s.keys.map((k) => (
                    <kbd className="kbd" key={k}>{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
