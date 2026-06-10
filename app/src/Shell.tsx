/**
 * Shell: the minimal app chrome for W5-1.
 *
 * Purpose: prove the import graph works end-to-end under Vite.
 * The shell imports masteryProbability from @pinaka/engine and renders its
 * output, so CI can verify that a production build succeeds and the engine
 * is reachable from the app bundle.
 *
 * Real flows (practice loop, mock hall, diagnosis, onboarding, settings) land
 * in W5-5; real design tokens land via the W6-2 intake. Until then the shell
 * uses base.css placeholders.
 */

import { FRESH_SKILL, masteryProbability } from "@pinaka/engine";

/**
 * Compute mastery for a brand-new skill (no observations, prior only).
 * masteryProbability returns sigmoid(rating - difficulty_anchor), so
 * PRIOR_RATING = 0 and L2 anchor = 0 yields p = sigmoid(0) = 0.5.
 */
function freshSkillMastery(): { p: number; low: number; high: number } {
  return masteryProbability(FRESH_SKILL);
}

export function Shell(): JSX.Element {
  const { p, low, high } = freshSkillMastery();

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="shell-wordmark">Pinaka Abhyas</span>
      </header>
      <main className="shell-main">
        {/*
          Engine import proof (W5-1):
          masteryProbability on a fresh skill returns the prior probability.
          This node is removed once real screens replace the shell.
        */}
        <section className="engine-probe" aria-label="Engine import proof">
          <p className="engine-probe-label">Fresh skill mastery (prior)</p>
          <p className="engine-probe-value" data-testid="mastery-p">
            {(p * 100).toFixed(1)}%
          </p>
          <p className="engine-probe-band" data-testid="mastery-band">
            90% band: {(low * 100).toFixed(1)}% – {(high * 100).toFixed(1)}%
          </p>
        </section>
      </main>
    </div>
  );
}
