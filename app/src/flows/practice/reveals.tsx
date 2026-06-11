/**
 * RevealSection — accessible collapsible numbered reveal (ADR 0017).
 *
 * Shared between PracticeFlow and BaselineFlow. A button element carries
 * aria-expanded and aria-controls; the body uses the hidden attribute so it is
 * excluded from tab order and screen reader output when collapsed. No new
 * dependencies — uses only React primitives. Styles in practice.css (.pr-reveal).
 */

import { useState, type ReactNode } from "react";

/** A numbered, labelled collapsible section. `num` is the displayed mono number
 * (e.g. "01"). `defaultOpen` defaults to false. */
export function RevealSection({
  num,
  label,
  defaultOpen,
  children,
}: {
  readonly num: string;
  readonly label: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const bodyId = `pr-reveal-body-${num}`;
  return (
    <div className={`pr-reveal${open ? " pr-reveal--open" : ""}`}>
      <button
        type="button"
        className="pr-reveal__trigger"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pr-reveal__num">{num}</span>
        <span className="pr-reveal__label">{label}</span>
        <span className="pr-reveal__chevron" aria-hidden="true" />
      </button>
      <div id={bodyId} className="pr-reveal__body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
