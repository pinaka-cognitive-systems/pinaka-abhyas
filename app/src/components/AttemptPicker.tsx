/**
 * AttemptPicker — shared presentational component for the exam-date card.
 *
 * Consumed by the baseline close screen (the commitment moment). The logic
 * (platform probe, persistence calls) originates in firstrun and moves with
 * this component; state is lifted to the caller.
 *
 * Phone-first (ADR 0011). Reuses firstrun CSS tokens (fr-*) and the COPY from
 * firstrun/copy.ts so the string is owned in exactly one place.
 */

import { useState } from "react";
import { COPY } from "../flows/firstrun/copy.js";
import type { ExamAttempt } from "../flows/firstrun/machine.js";
import "../flows/firstrun/firstrun.css";

export type { ExamAttempt };

export interface AttemptPickerProps {
  /** Called when the student saves a choice. */
  readonly onSave: (attempt: ExamAttempt) => void;
  /** Called when the student skips. */
  readonly onSkip: () => void;
}

export function AttemptPicker({ onSave, onSkip }: AttemptPickerProps): JSX.Element {
  const c = COPY.exam;
  const [picked, setPicked] = useState<ExamAttempt | null>(null);

  const choices: readonly { readonly value: ExamAttempt; readonly label: string }[] = [
    { value: "september", label: c.options.september },
    { value: "january", label: c.options.january },
    { value: "undecided", label: c.options.undecided },
  ];

  return (
    <div className="fr-card fr-card--inset">
      <p className="fr-eyebrow">{c.eyebrow}</p>
      <p className="fr-card__heading">{c.title}</p>
      <p className="fr-text">{c.body}</p>
      <div className="fr-choices" role="radiogroup" aria-label={c.title}>
        {choices.map((ch) => {
          const selected = picked === ch.value;
          return (
            <button
              key={ch.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`fr-choice${selected ? " fr-choice--picked" : ""}`}
              onClick={() => setPicked(ch.value)}
            >
              {ch.label}
            </button>
          );
        })}
      </div>
      <div className="fr-actions fr-actions--stack">
        <button
          type="button"
          className="fr-btn fr-btn--primary"
          disabled={picked === null}
          onClick={() => picked !== null && onSave(picked)}
        >
          {c.cta}
        </button>
        <button type="button" className="fr-btn fr-btn--ghost" onClick={onSkip}>
          {c.skip}
        </button>
      </div>
    </div>
  );
}
