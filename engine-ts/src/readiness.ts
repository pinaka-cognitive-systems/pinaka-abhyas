/**
 * Readiness (SPEC section 6; W1-8, W1-7).
 *
 * Per-node mastery and deviation aggregate to expected marks per blueprint
 * section: expected questions per node come from the blueprint quotas, the
 * per-question P(correct) comes from mastery against the section's difficulty
 * mix, and marks expected value applies the marking scheme's negative marking.
 *
 * Attempt policy (W1-7) is a TIME decision, never an ability verdict. Attempting
 * is positive-EV whenever P exceeds the blind-guess break-even (0.20 under
 * +1/-0.25). The plan attempts everything; only when the expected total time
 * exceeds the duration does it drop the lowest EV-per-second questions until it
 * fits, by expected_seconds (empirical avg_seconds when present). A student
 * with P about 0.45 everywhere is therefore told to attempt everything when
 * time permits — the audited skip-everything failure cannot recur.
 *
 * Band: variance is summed over questions from rating deviations plus the
 * binomial exam-day noise floor; the band is EV +/- 1.645 sigma, floored at
 * +/- 5 marks no matter how much data exists, rounded to whole marks.
 *
 * Mock anchoring: completed mocks within 21 days contribute their net scores;
 * the point estimate is a precision-weighted blend of model EV and the
 * recency-weighted mock mean. A model that disagrees with real mocks loses.
 *
 * Confidence: insufficient_data below 20 events or below 25% blueprint coverage;
 * else low when mean deviation > 0.8 or coverage < 60%; else medium. Never higher.
 */

import { applyIdleDrift, FRESH_SKILL, type SkillState } from "./mastery.js";
import { DIFFICULTY_ANCHOR, type DifficultyLabel, GUESSING_FLOOR, sigmoid } from "./scale.js";
import { MS_PER_DAY } from "./time.js";
import type {
  Bank,
  Blueprint,
  Confidence,
  EngineState,
  Event,
  MarkingScheme,
  Readiness,
} from "./types.js";
import { breakEvenProbability } from "./types.js";

const Z90 = 1.645;
export const MIN_EVENTS = 20;
export const MIN_COVERAGE = 0.25;
export const LOW_DEVIATION_THRESHOLD = 0.8;
export const MEDIUM_COVERAGE = 0.6;
export const BAND_FLOOR_MARKS = 5;
export const MOCK_WINDOW_DAYS = 21;

/** Difficulty mix assumed when a section has no finer signal: ICAI Paper 3 is
 * classified 100% Level II (application). We model each exam question as an L2
 * item by default; the per-item bank difficulty is used where the blueprint
 * names a difficulty mix in future. */
const DEFAULT_LABEL: DifficultyLabel = "L2";

interface PlanQuestion {
  readonly nodeId: string;
  readonly label: DifficultyLabel;
  readonly p: number;
  readonly ev: number;
  /** Independent binomial (exam-day) variance of this question's marks. */
  readonly binomialVariance: number;
  /** Std of P from this node's rating deviation (shared across the node's
   * questions — a correlated source of error, aggregated per family). */
  readonly sigmaP: number;
  readonly expectedSeconds: number;
}

function skillFor(state: EngineState, nodeId: string, nowMs: number): SkillState {
  const s = state.skills.get(nodeId);
  if (s === undefined) return { ...FRESH_SKILL };
  return applyIdleDrift(s, nowMs);
}

/** P(correct) for an exam question on `nodeId` at `label`, blending the
 * guessing floor exactly as mastery.ts does. */
function questionP(skill: SkillState, label: DifficultyLabel): { p: number } {
  const b = DIFFICULTY_ANCHOR[label];
  const c = GUESSING_FLOOR.single_best;
  return { p: c + (1 - c) * sigmoid(skill.rating - b) };
}

/** Median expected_seconds for items on a node at a label, from the bank;
 * empirical avg_seconds overrides authored expected_seconds (SPEC 6). */
function expectedSecondsFor(
  bank: Bank,
  nodeId: string,
  label: DifficultyLabel,
): number {
  const secs: number[] = [];
  for (const item of bank.values()) {
    if (!item.tests.includes(nodeId)) continue;
    if (item.difficulty_label !== label) continue;
    secs.push(item.empirical?.avg_seconds ?? item.expected_seconds);
  }
  if (secs.length === 0) {
    // No item on this node/label: fall back to any item on the node.
    for (const item of bank.values()) {
      if (!item.tests.includes(nodeId)) continue;
      secs.push(item.empirical?.avg_seconds ?? item.expected_seconds);
    }
  }
  if (secs.length === 0) return 90; // last-resort default
  secs.sort((a, b) => a - b);
  return secs[Math.floor(secs.length / 2)]!;
}

/** Build the per-question exam plan from the blueprint quotas. */
function buildPlan(
  state: EngineState,
  bank: Bank,
  blueprint: Blueprint,
  marking: MarkingScheme,
  nowMs: number,
): PlanQuestion[] {
  const plan: PlanQuestion[] = [];
  const gain = marking.marksPerCorrect;
  const loss = marking.negativePerWrong;
  // Sort the families deterministically by node id.
  const families: Array<{ nodeId: string; quota: number }> = [];
  for (const part of blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) families.push({ nodeId: fam.nodeId, quota: fam.quota });
    }
  }
  families.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));

  for (const fam of families) {
    const skill = skillFor(state, fam.nodeId, nowMs);
    const label = DEFAULT_LABEL;
    const { p } = questionP(skill, label);
    // Marks EV under negative marking, attempting: +gain w.p. p, -loss w.p. 1-p.
    const ev = gain * p - loss * (1 - p);
    // Independent exam-day (binomial) variance of one question's marks.
    const mean = ev;
    const binomialVariance = p * (gain - mean) ** 2 + (1 - p) * (-loss - mean) ** 2;
    // sigmaP: first-order propagation of the rating deviation through the link.
    // P = c + (1-c)*sigmoid(r-b), so dP/dr = (1-c)*sigmoid(r-b)*(1-sigmoid(r-b)),
    // and sigmaP = |dP/dr| * deviation. Analytic propagation (not the compressed
    // sigmoid-interval half-width, which understates the tail spread).
    const c = GUESSING_FLOOR.single_best;
    const sig = sigmoid(skill.rating - DIFFICULTY_ANCHOR[label]);
    const dPdr = (1 - c) * sig * (1 - sig);
    const sigmaP = Math.abs(dPdr) * skill.deviation;
    const expectedSeconds = expectedSecondsFor(bank, fam.nodeId, label);
    for (let i = 0; i < fam.quota; i++) {
      plan.push({ nodeId: fam.nodeId, label, p, ev, binomialVariance, sigmaP, expectedSeconds });
    }
  }
  return plan;
}

/** Coverage: fraction of blueprint families with at least one observation. */
function coverage(state: EngineState, blueprint: Blueprint): number {
  const families = new Set<string>();
  for (const part of blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) families.add(fam.nodeId);
    }
  }
  if (families.size === 0) return 0;
  let seen = 0;
  for (const fam of families) {
    let touched = false;
    for (const node of state.skills.keys()) {
      if (node === fam || node.startsWith(fam + ".")) {
        touched = true;
        break;
      }
    }
    if (touched) seen++;
  }
  return seen / families.size;
}

/** Mean deviation across observed blueprint nodes (drifted to now). */
function meanDeviation(state: EngineState, nowMs: number): number {
  let sum = 0;
  let n = 0;
  for (const [, s] of state.skills) {
    sum += applyIdleDrift(s, nowMs).deviation;
    n++;
  }
  return n === 0 ? Infinity : sum / n;
}

/** Recency-weighted mock mean and total weight (for precision blend). Mocks
 * within MOCK_WINDOW_DAYS of nowMs only; weight decays linearly with age. */
function mockAnchor(
  events: readonly Event[],
  bank: Bank,
  blueprint: Blueprint,
  marking: MarkingScheme,
  nowMs: number,
): { mean: number; weight: number } | null {
  void bank;
  void blueprint;
  // Group mock events by a mock session is not modelled here; instead we score
  // each completed mock as the net marks of its constituent answered events.
  // A mock session is identified by contiguous mode === "mock" events; we use a
  // simple aggregation: net score per mock day within the window.
  const windowMs = MOCK_WINDOW_DAYS * MS_PER_DAY;
  const byDay = new Map<number, { correct: number; wrong: number; t: number }>();
  for (const e of events) {
    if (e.mode !== "mock") continue;
    if (nowMs - e.occurredAtMs > windowMs) continue;
    if (e.occurredAtMs > nowMs) continue;
    const day = Math.floor(e.occurredAtMs / MS_PER_DAY);
    const agg = byDay.get(day) ?? { correct: 0, wrong: 0, t: e.occurredAtMs };
    if (e.correct) agg.correct++;
    else agg.wrong++;
    agg.t = Math.max(agg.t, e.occurredAtMs);
    byDay.set(day, agg);
  }
  if (byDay.size === 0) return null;
  // Scale each mock's net score to a full-paper-equivalent mark, weighted by
  // recency (newer mocks weigh more) and by how complete the mock was.
  let wSum = 0;
  let wScore = 0;
  for (const agg of byDay.values()) {
    const answered = agg.correct + agg.wrong;
    if (answered === 0) continue;
    const net =
      agg.correct * marking.marksPerCorrect - agg.wrong * marking.negativePerWrong;
    // Project the answered net rate onto the full paper.
    const perQ = net / answered;
    const projected = perQ * marking.numQuestions;
    const age = nowMs - agg.t;
    const recency = Math.max(0, 1 - age / windowMs);
    // Completeness weight: a fuller mock is a stronger anchor.
    const completeness = Math.min(1, answered / marking.numQuestions);
    const w = recency * completeness * answered;
    wSum += w;
    wScore += w * projected;
  }
  if (wSum === 0) return null;
  return { mean: wScore / wSum, weight: wSum };
}

/**
 * Compute readiness (SPEC 6). Pure; all clocks and tables are parameters.
 * `events` is needed only for mock anchoring; the model EV comes from `state`.
 */
export function computeReadiness(
  state: EngineState,
  events: readonly Event[],
  bank: Bank,
  blueprint: Blueprint,
  marking: MarkingScheme,
  nowMs: number,
): Readiness {
  const cov = coverage(state, blueprint);
  if (state.eventCount < MIN_EVENTS || cov < MIN_COVERAGE) {
    return insufficient(
      state.eventCount < MIN_EVENTS
        ? `Fewer than ${MIN_EVENTS} events recorded.`
        : `Blueprint coverage below ${Math.round(MIN_COVERAGE * 100)}%.`,
    );
  }

  const plan = buildPlan(state, bank, blueprint, marking, nowMs);
  const breakEven = breakEvenProbability(marking);

  // Attempt policy: attempt every question whose P clears the break-even point;
  // questions below it are never worth attempting on EV grounds alone. (Below
  // break-even is only expected on a node with an active recurring misconception.)
  const attemptable = plan.filter((q) => q.p > breakEven);
  const refused = plan.length - attemptable.length;

  // Time policy: attempt all attemptable; if expected time exceeds the budget,
  // drop the lowest EV-per-second questions until it fits. Skipping is a TIME
  // decision only.
  const budgetSeconds = marking.durationMinutes * 60;
  const sortedByValueDensity = [...attemptable].sort(
    (a, b) => a.ev / a.expectedSeconds - b.ev / b.expectedSeconds,
  );
  let totalSeconds = attemptable.reduce((s, q) => s + q.expectedSeconds, 0);
  const fullTimeSeconds = totalSeconds;
  const dropped = new Set<PlanQuestion>();
  let i = 0;
  while (totalSeconds > budgetSeconds && i < sortedByValueDensity.length) {
    const q = sortedByValueDensity[i]!;
    dropped.add(q);
    totalSeconds -= q.expectedSeconds;
    i++;
  }
  const skippedForTime = dropped.size;
  const timeFeasible = fullTimeSeconds <= budgetSeconds;

  // Attempted set = attemptable minus time-dropped. Skipped questions (refused
  // for ability or time) contribute the unattempted marks (0).
  const swing = marking.marksPerCorrect + marking.negativePerWrong;
  let ev = 0;
  // Two variance sources (SPEC 6):
  //  (a) the binomial exam-day noise floor: independent p(1-p) marks variance
  //      per attempted question — the irreducible sampling term.
  //  (b) rating-deviation (estimation) uncertainty: SHARED across all questions
  //      on a node, so it is correlated and must be summed per family before
  //      squaring, not per question. Treating it independently badly
  //      underestimates the band and was why naive coverage came in low.
  let binomialVar = 0;
  const familyAttempted = new Map<string, { n: number; sigmaP: number }>();
  for (const q of attemptable) {
    if (dropped.has(q)) continue;
    ev += q.ev;
    binomialVar += q.p * (1 - q.p) * swing * swing;
    const f = familyAttempted.get(q.nodeId) ?? { n: 0, sigmaP: q.sigmaP };
    f.n += 1;
    familyAttempted.set(q.nodeId, f);
  }
  let ratingVar = 0;
  for (const f of familyAttempted.values()) {
    // marks for the family ~ n * (swing*P - loss); d/dP = n*swing; var = (n*swing*sigmaP)^2.
    ratingVar += (f.n * swing * f.sigmaP) ** 2;
  }
  const variance = binomialVar + ratingVar;

  const sigma = Math.sqrt(variance);
  let pointEstimate = ev;

  // Mock anchoring: precision-weighted blend of model EV and mock mean.
  const mock = mockAnchor(events, bank, blueprint, marking, nowMs);
  let note = "";
  if (mock !== null) {
    const modelPrecision = variance > 0 ? 1 / variance : 1e6;
    // Each unit of mock weight is worth roughly one observed answer; convert to
    // a precision comparable to the model's by scaling against per-question
    // marks variance (use the mean attempted variance as the unit).
    const attemptedCount = attemptable.length - dropped.size;
    const perQVar = attemptedCount > 0 ? variance / attemptedCount : 1;
    const mockPrecision = mock.weight / Math.max(perQVar, 1e-9);
    pointEstimate =
      (modelPrecision * ev + mockPrecision * mock.mean) /
      (modelPrecision + mockPrecision);
    note =
      `Anchored to ${Math.round(mock.mean)} from recent mock(s); the estimate is ` +
      `a precision-weighted blend with the model. `;
  }

  // Band: +/- 1.645 sigma, floored at +/- 5 marks, rounded to whole marks.
  const halfWidth = Math.max(BAND_FLOOR_MARKS, Z90 * sigma);
  const expectedMarks = Math.round(pointEstimate);
  const low = Math.round(pointEstimate - halfWidth);
  const high = Math.round(pointEstimate + halfWidth);

  const confidence = confidenceLevel(state, cov, nowMs);

  if (refused > 0) {
    note +=
      `${refused} question(s) sit below the break-even probability and are not ` +
      `worth attempting on a recurring-error node. `;
  }
  if (!timeFeasible) {
    note +=
      `At your pace the full paper takes ~${Math.round(fullTimeSeconds / 60)} min; ` +
      `${skippedForTime} low-value-per-second question(s) are dropped to fit ${marking.durationMinutes} min. `;
  } else {
    note += `Time permitting, attempt everything: every attemptable question is positive-EV. `;
  }
  note += "All figures are estimates; parameters are provisional until calibration.";

  return {
    expectedMarks,
    low,
    high,
    distanceToPass: expectedMarks - marking.passMark,
    confidence,
    estMinutes: Math.round(Math.min(fullTimeSeconds, budgetSeconds) / 60),
    skippedForTime,
    timeFeasible,
    isEstimate: true,
    note: note.trim(),
  };
}

function confidenceLevel(state: EngineState, cov: number, nowMs: number): Confidence {
  // (insufficient_data already handled by the caller's gate.)
  const md = meanDeviation(state, nowMs);
  if (md > LOW_DEVIATION_THRESHOLD || cov < MEDIUM_COVERAGE) return "low";
  return "medium";
}

function insufficient(reason: string): Readiness {
  return {
    expectedMarks: null,
    low: null,
    high: null,
    distanceToPass: null,
    confidence: "insufficient_data",
    estMinutes: null,
    skippedForTime: null,
    timeFeasible: null,
    isEstimate: true,
    note: `${reason} Keep practising — a number appears once there is enough data.`,
  };
}
