/**
 * Second-tab screen (W5-5 flow d, ADR 0008 single-connection posture).
 *
 * The opfs-sahpool backend holds a single Web Lock. When another tab already
 * holds it, getSharedStorage() throws AlreadyOpenError. Any flow that opens storage
 * renders THIS screen on that error and offers an honest takeover, which
 * reopens with { steal: true } to break the existing lock cleanly.
 *
 * Presentational only: it owns no storage. The caller passes onTakeover (which
 * performs the steal reopen) and the in-flight flag; this screen renders the
 * honest copy and the button. Phone-native, tokens only (firstrun.css).
 */

import { COPY } from "./copy.js";
import "./firstrun.css";

export interface SecondTabScreenProps {
  /** Perform the takeover: reopen storage with { steal: true } and continue. */
  readonly onTakeover: () => void;
  /** True while the takeover reopen is in flight (disables the button). */
  readonly takingOver?: boolean;
}

export function SecondTabScreen({ onTakeover, takingOver = false }: SecondTabScreenProps): JSX.Element {
  const c = COPY.secondTab;
  return (
    <div className="fr-screen">
      <main className="fr-body">
        <section className="fr-card" role="alert">
          <p className="fr-eyebrow">{c.eyebrow}</p>
          <h1 className="fr-title">{c.title}</h1>
          <p className="fr-text">{c.body}</p>
          <div className="fr-actions">
            <button
              type="button"
              className="fr-btn fr-btn--primary"
              onClick={onTakeover}
              disabled={takingOver}
            >
              {takingOver ? c.takingOver : c.takeover}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
