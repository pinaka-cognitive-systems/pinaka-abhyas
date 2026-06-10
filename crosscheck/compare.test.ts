// W1-12 cross-check, as a vitest spec.
//
// This delegates to compare.mjs, which imports the TypeScript engine BLINDLY
// (the source was never read) and replays cases.json through updateSkill,
// asserting agreement with the Python reference within SPEC section 9's
// tolerance of 1e-6 on ratings and deviations.
//
// Run via crosscheck/run_compare.sh, which invokes vitest from inside engine-ts
// (where node_modules lives) without modifying engine-ts config.

import { describe, it, expect } from 'vitest';
// @ts-expect-error - sibling ESM helper, resolved at runtime by tsx/vitest.
import { runComparison } from './compare.mjs';

describe('W1-12 independent core-math cross-check (SPEC section 3)', () => {
  it('Python reference and TypeScript engine agree within 1e-6', async () => {
    const r = await runComparison();

    // eslint-disable-next-line no-console
    console.log(
      `[crosscheck] cases=${r.count} maxRatingDiff=${r.maxRatingDiff} ` +
        `maxDeviationDiff=${r.maxDevDiff} pass=${r.pass}`,
    );

    if (!r.pass) {
      // eslint-disable-next-line no-console
      console.log('[crosscheck] disagreements:', JSON.stringify(r.disagreements, null, 2));
    }

    expect(r.count).toBeGreaterThan(0);
    expect(r.maxRatingDiff).toBeLessThanOrEqual(r.tolerance);
    expect(r.maxDevDiff).toBeLessThanOrEqual(r.tolerance);
    expect(r.disagreements.length).toBe(0);
  });
});
