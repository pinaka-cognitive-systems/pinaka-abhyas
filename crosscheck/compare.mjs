// W1-12 cross-check comparator.
//
// This is the ONLY file in the cross-check that touches the TypeScript engine.
// It imports engine-ts/src/mastery.ts BLINDLY (the source was never read) and
// replays every case in cases.json through the TS updateSkill, asserting
// agreement with the Python reference's final (rating, deviation) within the
// SPEC section 9 tolerance of 1e-6.
//
// Run with tsx so the .ts import resolves:
//   cd engine-ts && npx -y tsx ../crosscheck/compare.mjs
//
// The TS observation shape was discovered purely by runtime probing of the
// module's exported behavior (not by reading source):
//   updateSkill(skill, {
//     correct: boolean,
//     difficultyLabel: 'L1'|'L2'|'L3',
//     itemType: 'single_best'|'numeric_entry',
//     occurredAtMs: number,
//     empiricalDifficulty?: number,
//   }) -> { rating, deviation, lastEventMs, attempts }
//
// applyIdleDrift(skill, nowMs) -> { rating, deviation, lastEventMs, attempts }

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Absolute path to the TS engine module, imported blind.
const masteryUrl = resolve(__dirname, '..', 'engine-ts', 'src', 'mastery.ts');

const TOL = 1e-6;

export async function runComparison() {
  const mastery = await import(masteryUrl);
  const { updateSkill, FRESH_SKILL } = mastery;
  if (typeof updateSkill !== 'function') {
    throw new Error('engine-ts mastery.ts does not export updateSkill');
  }

  const casesPath = resolve(__dirname, 'cases.json');
  const data = JSON.parse(readFileSync(casesPath, 'utf8'));

  let maxRatingDiff = 0;
  let maxDevDiff = 0;
  const disagreements = [];

  for (const c of data.cases) {
    // Start from the same initial skill the Python reference used.
    let skill = {
      rating: c.initial.rating,
      deviation: c.initial.deviation,
      lastEventMs: c.initial.lastEventMs,
      attempts: c.initial.attempts,
    };

    for (const o of c.observations) {
      const obs = {
        correct: o.correct,
        difficultyLabel: o.difficulty_label,
        itemType: o.item_type,
        occurredAtMs: o.occurred_at_ms,
      };
      if (o.empirical_difficulty !== null && o.empirical_difficulty !== undefined) {
        obs.empiricalDifficulty = o.empirical_difficulty;
      }
      skill = updateSkill(skill, obs);
    }

    const ratingDiff = Math.abs(skill.rating - c.expected.rating);
    const devDiff = Math.abs(skill.deviation - c.expected.deviation);
    if (ratingDiff > maxRatingDiff) maxRatingDiff = ratingDiff;
    if (devDiff > maxDevDiff) maxDevDiff = devDiff;

    if (ratingDiff > TOL || devDiff > TOL) {
      disagreements.push({
        id: c.id,
        ratingDiff,
        devDiff,
        py: c.expected,
        ts: { rating: skill.rating, deviation: skill.deviation },
        nEvents: c.observations.length,
        initial: c.initial,
        observations: c.observations,
      });
    }
  }

  return {
    count: data.cases.length,
    tolerance: TOL,
    maxRatingDiff,
    maxDevDiff,
    pass: disagreements.length === 0,
    disagreements,
  };
}

// When run directly (not imported by vitest), print the report.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const r = await runComparison();
  console.log('=== W1-12 cross-check report ===');
  console.log('cases:            ', r.count);
  console.log('tolerance:        ', r.tolerance);
  console.log('max rating diff:  ', r.maxRatingDiff);
  console.log('max deviation diff:', r.maxDevDiff);
  console.log('pass (<= 1e-6):   ', r.pass);
  if (!r.pass) {
    console.log('\n--- DISAGREEMENTS ---');
    for (const d of r.disagreements) {
      console.log(JSON.stringify(d, null, 2));
    }
    process.exitCode = 1;
  }
}
