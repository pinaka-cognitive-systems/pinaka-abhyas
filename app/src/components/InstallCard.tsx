/**
 * InstallCard — shared presentational component for the install affordance.
 *
 * Consumed by the baseline close screen (the commitment moment). The install
 * variant logic and platform probe originate in firstrun/platform.ts and are
 * passed in as props so this component remains a pure renderer.
 *
 * Storage honesty is folded into the install copy: the card explains that the
 * map lives on this device and the browser may clear it if storage runs low,
 * and points to installing as the durable path. The iOS path includes the
 * share-sheet steps and the seven-day eviction reality.
 *
 * The card is shown only when the variant is "prompt" or "ios-manual". The
 * caller is responsible for not rendering it when the variant is "none"
 * (already installed, or no install path on this browser).
 *
 * Phone-first (ADR 0011). Reuses firstrun CSS tokens (fr-*) and the COPY from
 * firstrun/copy.ts so strings are owned in exactly one place.
 */

import { useState } from "react";
import { COPY } from "../flows/firstrun/copy.js";
import { showInstallPrompt } from "../flows/firstrun/platform.js";
import type { InstallVariant } from "../flows/firstrun/machine.js";
import "../flows/firstrun/firstrun.css";

export type { InstallVariant };

export interface InstallCardProps {
  readonly variant: "prompt" | "ios-manual";
  /** Called when the student dismisses the card (installed, dismissed, or skip). */
  readonly onDone: () => void;
}

export function InstallCard({ variant, onDone }: InstallCardProps): JSX.Element {
  const [note, setNote] = useState<string | null>(null);

  if (variant === "prompt") {
    const c = COPY.installPrompt;
    const onInstall = (): void => {
      void showInstallPrompt().then((outcome) => {
        if (outcome === "accepted") {
          setNote(c.installedNote);
        } else if (outcome === "dismissed") {
          setNote(c.dismissedNote);
        } else {
          onDone();
        }
      });
    };
    return (
      <div className="fr-card fr-card--inset">
        <p className="fr-eyebrow">{c.eyebrow}</p>
        <p className="fr-card__heading">{c.title}</p>
        <p className="fr-text">
          Your map lives on this device. The browser may clear it if storage runs low.
          Add the app to your home screen to make it lasting.
        </p>
        {note !== null && (
          <p className="fr-note" role="status">
            {note}
          </p>
        )}
        <div className="fr-actions fr-actions--stack">
          <button type="button" className="fr-btn fr-btn--primary" onClick={onInstall}>
            {c.cta}
          </button>
          <button type="button" className="fr-btn fr-btn--ghost" onClick={onDone}>
            {c.skip}
          </button>
        </div>
      </div>
    );
  }

  // ios-manual
  const c = COPY.installIos;
  return (
    <div className="fr-card fr-card--inset">
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <p className="fr-card__heading">{c.title}</p>
      <p className="fr-text">
        Your map lives on this device. The browser may clear it if storage runs low.
        Add the app to your home screen to make it lasting.
      </p>
      <ol className="fr-steps">
        {c.steps.map((s, i) => (
          <li key={s} className="fr-steps__item">
            <span className="fr-steps__n">{i + 1}</span>
            <span className="fr-steps__body">{s}</span>
          </li>
        ))}
      </ol>
      <div className="fr-warning" role="note">
        <p className="fr-warning__body">{c.eviction}</p>
      </div>
      <div className="fr-actions">
        <button type="button" className="fr-btn fr-btn--ghost" onClick={onDone}>
          {c.skip}
        </button>
      </div>
    </div>
  );
}
