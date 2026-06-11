/**
 * BrandMark — the Pinaka Abhyas lockup: chevron-mark plus wordmark and tag.
 *
 * The mark is the design-team chevron (design-team/v2/app-shell.jsx, icon
 * "chevron-mark"): two strokes on a 24-unit grid, stroke width 3, square caps.
 * The same geometry ships as the favicon and the PWA icons
 * (app/scripts/make-icons.py); change it in all three places or none.
 */
import "./brand.css";

export function BrandMark({
  size = 22,
  lead = false,
}: {
  readonly size?: number;
  /** Adds breathing room below, for hosts that stack with margins not gap. */
  readonly lead?: boolean;
}): JSX.Element {
  return (
    <div className={lead ? "brand-lockup brand-lockup--lead" : "brand-lockup"}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-brand-primary)"
        strokeWidth={3}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M4 18L12 6" />
        <path d="M16 12L20 18" />
      </svg>
      <span className="brand-lockup__name">Pinaka</span>
      <span className="brand-lockup__tag">abhyas</span>
    </div>
  );
}
