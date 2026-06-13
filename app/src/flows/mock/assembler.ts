/**
 * Mock assembler (W5-7): deterministic, seeded draw of a mock paper from the
 * live bank, sized to what the bank honestly supports per the blueprint.
 *
 * Pure and DOM-free (SPEC 9 discipline): the only entropy is the explicit
 * `seed`, fed through a seeded mulberry32 (the same generator the engine's
 * golden vectors use — engine-ts/vectors/scenarios.ts). The same seed always
 * yields the same paper, so an in-progress mock can be rebuilt from its stored
 * seed on resume (ADR 0009: "item order seed").
 *
 * HONEST SIZING. The real CA Foundation Paper 3 is 100 one-mark questions
 * (marking.json). The shipped bank does not yet hold 100 selectable items per
 * the blueprint quotas, so a full-fidelity 100-question mock cannot be drawn
 * without repeating items — and a repeated item is not a mock, it is a memory
 * test. So v1 mocks are SHORTER: for each blueprint family we draw
 * min(quota, available) items, never padding with repeats. The resulting mock
 * is the sum of those per-family draws, and the assembler surfaces the exact
 * shortfall (target vs available, per family and overall) so the pre-mock note
 * can state the count plainly. The marking scheme is scaled to the drawn size:
 * the time budget and the pass bar are proportional to the full paper.
 *
 * FAMILY ATTRIBUTION. Bank items are tagged at deep leaves
 * (e.g. "qa.bmath.finance.compound_interest") while the blueprint names family
 * nodes ("qa.bmath.finance"); an item belongs to a family when its test node
 * equals the family id or is a dot-descendant of it. The first matching family
 * (blueprint order) wins, so an item is drawn into exactly one family and never
 * double-counted across the paper.
 *
 * DIFFICULTY MIX (ADR 0022; mix revised by ADR 0024 to mirror the real ICAI
 * paper). Standard and pace mocks target a fixed share per difficulty label:
 * DIFFICULTY_MIX = { L1: 0.26, L2: 0.66, L3: 0.08 }. Applied
 * per family via largest-remainder rounding so the totals are exact. When a
 * label pool is short, the shortfall is filled from the remaining labels in a
 * fixed fallback order (nearest-label-first: for missing L1 → L2; for missing
 * L2 → L1 then L3; for missing L3 → L2). Hard mocks keep their existing
 * L3/misconception weighting and bypass the mix logic.
 *
 * EXPOSURE CONTROL (ADR 0022). The optional `recentItemIds` set names items
 * drawn on recent mocks. These items are deprioritised: they are excluded from
 * each per-label draw pool unless excluding them would make that label pool
 * contribute fewer items than its computed slot count — i.e., reuse is allowed
 * only to avoid deepening the shortfall. The count of reused-recent items is
 * surfaced in the result as `reusedRecent` so the pre-mock note can acknowledge
 * re-exposure honestly.
 */

import {
  isSelectable,
  type Bank,
  type BankItem,
  type Blueprint,
  type MarkingScheme,
} from "@pinaka/engine";

/**
 * Deterministic RNG: the seeded mulberry32 (copied verbatim from the engine's
 * vectors/scenarios.ts, which copied it from its mastery tests). Identical bit
 * pattern so a mock paper is reproducible across the engine and the app.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Fisher-Yates shuffle driven by a seeded RNG. Returns a new array; the input
 * is not mutated. Deterministic for a given rng sequence. */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Per-family shortfall accounting, surfaced to the pre-mock note. */
export interface FamilyShortfall {
  readonly partId: string;
  readonly nodeId: string;
  /** Questions the blueprint asks of this family on the full paper. */
  readonly quota: number;
  /** Selectable items the bank actually holds for this family. */
  readonly available: number;
  /** Items drawn into the mock: min(quota, available). */
  readonly drawn: number;
}

/** The assembled mock: the ordered item ids, the seed that produced them, and
 * the honest sizing the pre-mock note and the scorer both read. */
export interface AssembledMock {
  /** The seed this paper was drawn with (stored for resume). */
  readonly seed: number;
  /** Item ids in presentation order. */
  readonly order: readonly string[];
  /** Questions on this mock (== order.length). */
  readonly size: number;
  /** Questions the full blueprint asks for (the real paper size). */
  readonly fullPaperSize: number;
  /** Per-family shortfall accounting, blueprint order. */
  readonly families: readonly FamilyShortfall[];
  /** Total questions short of the full paper (fullPaperSize - size). */
  readonly shortfall: number;
  /**
   * Count of items drawn from `recentItemIds` (the exposure-control exclusion
   * set). Non-zero only when fresh items were exhausted within a label bucket
   * and reuse was the only way to avoid deepening the shortfall. Surfaced to
   * the pre-mock note so re-exposure is acknowledged honestly.
   */
  readonly reusedRecent: number;
}

/** The family a bank item belongs to: the first blueprint family whose node id
 * the item's tests match (equal or dot-descendant). Null when no family claims
 * it (should not happen for a well-tagged pack). */
function familyOf(
  item: BankItem,
  families: readonly { readonly partId: string; readonly nodeId: string }[],
): string | null {
  for (const fam of families) {
    for (const t of item.tests) {
      if (t === fam.nodeId || t.startsWith(fam.nodeId + ".")) return fam.nodeId;
    }
  }
  return null;
}

/** Flatten the blueprint into an ordered family list with its part id and quota. */
function flattenFamilies(
  blueprint: Blueprint,
): { readonly partId: string; readonly nodeId: string; readonly quota: number }[] {
  const out: { partId: string; nodeId: string; quota: number }[] = [];
  for (const part of blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) {
        out.push({ partId: part.id, nodeId: fam.nodeId, quota: fam.quota });
      }
    }
  }
  return out;
}

/**
 * Mock type for assembly and submission routing.
 * - standard: full blueprint paper, mode "mock", feeds readiness.
 * - hard: same blueprint, L3-skewed items preferred; mode "drill" on submission
 *   (Handout §10 — hard mocks do not anchor readiness).
 * - pace: half-length (50q / 45min) paper; mode "drill" on submission.
 */
export type MockAssemblyType = "standard" | "hard" | "pace";

/** Constants for the pace mock, verbatim from data.jsx MOCK_TYPES. */
export const PACE_QUESTION_COUNT = 50;
export const PACE_DURATION_MINUTES = 45;

/**
 * Target difficulty label shares for standard and pace mocks (ADR 0022, mix
 * revised by ADR 0024 to mirror the real ICAI paper: ~26/66/8 L1/L2/L3).
 * Hard mocks bypass this mix and use their own L3-weighted logic.
 *
 * Shares must sum to exactly 1. Applied per family quota via
 * largest-remainder rounding so slot totals are exact.
 */
export const DIFFICULTY_MIX: Readonly<Record<"L1" | "L2" | "L3", number>> = {
  L1: 0.26,
  L2: 0.66,
  L3: 0.08,
};

/**
 * Fallback label order when a given label pool cannot fill its slot count.
 * "Nearest-label-first" means we prefer the label whose relative difficulty
 * is closest before reaching the furthest:
 *   L1 short → try L2, then L3
 *   L2 short → try L1, then L3
 *   L3 short → try L2, then L1
 */
const LABEL_FALLBACK: Readonly<Record<"L1" | "L2" | "L3", readonly ("L1" | "L2" | "L3")[]>> = {
  L1: ["L2", "L3"],
  L2: ["L1", "L3"],
  L3: ["L2", "L1"],
};

type DiffLabel = "L1" | "L2" | "L3";
const DIFF_LABELS: readonly DiffLabel[] = ["L1", "L2", "L3"];

/**
 * Compute per-label slot counts for a given total using largest-remainder
 * rounding so that sum(slots) === total exactly.
 */
function labelSlots(total: number): Record<DiffLabel, number> {
  const raw: Record<DiffLabel, number> = {
    L1: DIFFICULTY_MIX.L1 * total,
    L2: DIFFICULTY_MIX.L2 * total,
    L3: DIFFICULTY_MIX.L3 * total,
  };
  const floors: Record<DiffLabel, number> = {
    L1: Math.floor(raw.L1),
    L2: Math.floor(raw.L2),
    L3: Math.floor(raw.L3),
  };
  let remainder = total - (floors.L1 + floors.L2 + floors.L3);
  // Distribute remainder seats to the labels with the largest fractional parts.
  const fracs: [DiffLabel, number][] = DIFF_LABELS.map((lbl) => [lbl, raw[lbl] - floors[lbl]]);
  fracs.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [lbl] of fracs) {
    if (remainder <= 0) break;
    floors[lbl]++;
    remainder--;
  }
  return floors;
}

/**
 * Draw items per difficulty mix from a family's pool (standard/pace mocks).
 *
 * Algorithm:
 *   1. Partition the shuffled pool into per-label buckets. Items in
 *      `recentIds` are placed into a "recent" sub-bucket for each label and
 *      only used when the fresh sub-bucket is exhausted AND doing so avoids
 *      deepening the shortfall (exposure-control rule).
 *   2. Compute per-label slot counts via largest-remainder rounding of DIFFICULTY_MIX.
 *   3. For each label: fill from fresh items first. If the fresh supply is
 *      short, record the deficit. After processing all labels, redistribute
 *      deficits to other labels using LABEL_FALLBACK order — fresh items
 *      first, then recent items only under shortage.
 *   4. Surface the count of recent items actually used as reusedRecentOut.
 *
 * Returns the drawn item list (length ≤ quota) and the reused-recent count.
 */
function drawWithMix(
  pool: readonly BankItem[],
  quota: number,
  recentIds: ReadonlySet<string>,
  rng: () => number,
): { picked: BankItem[]; reusedRecent: number } {
  if (quota === 0) return { picked: [], reusedRecent: 0 };

  // Separate and shuffle each label bucket into fresh / recent sub-buckets.
  const freshByLabel: Record<DiffLabel, BankItem[]> = { L1: [], L2: [], L3: [] };
  const recentByLabel: Record<DiffLabel, BankItem[]> = { L1: [], L2: [], L3: [] };

  // We shuffle the whole pool first to randomise within labels.
  const shuffled = shuffle(pool, rng);
  for (const item of shuffled) {
    const lbl = item.difficulty_label as DiffLabel | undefined;
    if (lbl !== "L1" && lbl !== "L2" && lbl !== "L3") {
      // Unknown label: treat as L2 for fallback purposes.
      if (recentIds.has(item.id)) {
        recentByLabel.L2.push(item);
      } else {
        freshByLabel.L2.push(item);
      }
    } else if (recentIds.has(item.id)) {
      recentByLabel[lbl].push(item);
    } else {
      freshByLabel[lbl].push(item);
    }
  }

  const slots = labelSlots(quota);

  // Primary pass: fill each label's slot from fresh items; track deficits.
  const picked: BankItem[] = [];
  let reusedRecent = 0;
  const deficits: Record<DiffLabel, number> = { L1: 0, L2: 0, L3: 0 };
  const usedFromFresh: Record<DiffLabel, number> = { L1: 0, L2: 0, L3: 0 };

  for (const lbl of DIFF_LABELS) {
    const need = slots[lbl];
    const fresh = freshByLabel[lbl];
    const take = Math.min(need, fresh.length);
    for (let i = 0; i < take; i++) picked.push(fresh[i]!);
    usedFromFresh[lbl] = take;
    deficits[lbl] = need - take;
  }

  // Deficit redistribution: for each label that came up short, try to pull
  // from other labels in fallback order — fresh first, then recent.
  for (const srcLbl of DIFF_LABELS) {
    let deficit = deficits[srcLbl];
    if (deficit === 0) continue;
    for (const altLbl of LABEL_FALLBACK[srcLbl]) {
      if (deficit === 0) break;
      // Continue from the index where the primary pass stopped for altLbl.
      const freshPool = freshByLabel[altLbl];
      let ptr = usedFromFresh[altLbl];
      while (deficit > 0 && ptr < freshPool.length) {
        picked.push(freshPool[ptr]!);
        ptr++;
        usedFromFresh[altLbl] = ptr;
        deficit--;
      }
      deficits[srcLbl] = deficit;
    }
    // After exhausting fresh alternatives, fill from recent (exposure-control:
    // only under genuine shortage to avoid deepening the shortfall).
    if (deficits[srcLbl] > 0) {
      // Own label recent first, then fallback label recent.
      const recentOrder: DiffLabel[] = [srcLbl, ...LABEL_FALLBACK[srcLbl]];
      for (const rLbl of recentOrder) {
        if (deficits[srcLbl] === 0) break;
        const recentPool = recentByLabel[rLbl];
        while (deficits[srcLbl] > 0 && recentPool.length > 0) {
          picked.push(recentPool.shift()!);
          reusedRecent++;
          deficits[srcLbl]--;
        }
      }
    }
  }

  // Cap at quota (safety: rounding should be exact, but guard it).
  return { picked: picked.slice(0, quota), reusedRecent };
}

/**
 * Assemble a mock from the bank per the blueprint, sized honestly to the bank.
 *
 * For each blueprint family, in blueprint order:
 *   1. collect the family's selectable items (tombstones excluded, ADR 0009),
 *      sorted by id for a deterministic starting set;
 *   2. apply difficulty-mix targeting (standard/pace) or L3-weighting (hard);
 *   3. take the first min(quota, available) drawn items.
 *
 * The drawn items are concatenated in blueprint order (Business Maths, then
 * Logical Reasoning, then Statistics — matching the real paper's section order),
 * which keeps the palette's part grouping meaningful. No item is ever drawn
 * twice (a family owns each of its items, and we slice without replacement), so
 * the no-repeat guarantee holds by construction.
 *
 * For "hard" type: items are sorted by difficulty_label descending (L3 first)
 * before shuffling, so L3 items are more likely to be drawn when the bank is
 * larger than the quota. Falls back to normal weighting when the bank is thin.
 * Hard mocks bypass DIFFICULTY_MIX.
 *
 * For "pace" type: quotas are proportionally scaled to PACE_QUESTION_COUNT.
 * DIFFICULTY_MIX is applied over the scaled quotas.
 *
 * @param seed           the mock seed; the same seed reproduces the same paper.
 * @param bank           the live item bank (the loaded pack's bank).
 * @param blueprint      the engine Blueprint (family quotas).
 * @param fullPaperSize  the full-paper question count (marking.numQuestions).
 * @param mockType       the assembly mode (default "standard").
 * @param costIds        misconception ids with the highest cost (for hard type);
 *                       items targeting these are drawn first within L3.
 * @param recentItemIds  item ids drawn on recent mocks; excluded from the draw
 *                       pools unless needed to avoid deepening the shortfall
 *                       (exposure-control, ADR 0022). Default empty.
 */
export function assembleMock(
  seed: number,
  bank: Bank,
  blueprint: Blueprint,
  fullPaperSize: number,
  mockType: MockAssemblyType = "standard",
  costIds: readonly string[] = [],
  recentItemIds: ReadonlySet<string> = new Set(),
): AssembledMock {
  const rng = mulberry32(seed);
  const allFamilies = flattenFamilies(blueprint);

  // For pace type: scale each family's quota proportionally to PACE_QUESTION_COUNT.
  const paceRatio = mockType === "pace" ? PACE_QUESTION_COUNT / fullPaperSize : 1;
  const families = allFamilies.map((f) =>
    mockType === "pace"
      ? { ...f, quota: Math.max(1, Math.round(f.quota * paceRatio)) }
      : f,
  );

  const famLookup = families.map((f) => ({ partId: f.partId, nodeId: f.nodeId }));

  // Bucket every selectable item into the first family that claims it. Sorted by
  // id first so the pre-shuffle set is deterministic regardless of Map order.
  const buckets = new Map<string, BankItem[]>();
  for (const f of families) buckets.set(f.nodeId, []);
  const ids = [...bank.keys()].sort();
  for (const id of ids) {
    const item = bank.get(id);
    if (item === undefined || !isSelectable(item)) continue;
    const fam = familyOf(item, famLookup);
    if (fam === null) continue;
    buckets.get(fam)!.push(item);
  }

  const order: string[] = [];
  const familyRows: FamilyShortfall[] = [];
  const costSet = new Set(costIds);
  let totalReusedRecent = 0;

  for (const f of families) {
    const pool = buckets.get(f.nodeId)!;
    const available = pool.length;
    const quota = f.quota;

    if (mockType === "hard") {
      // Hard mock: sort L3 items first, then items targeting the student's top
      // cost misconceptions within L3, then the rest. Shuffle within each tier
      // so the order is still seeded-random, not alphabetical. Bypasses mix.
      let workPool: BankItem[];
      if (pool.length > quota) {
        const l3Cost: BankItem[] = [];
        const l3Other: BankItem[] = [];
        const rest: BankItem[] = [];
        for (const item of shuffle(pool, rng)) {
          if (item.difficulty_label === "L3") {
            const targets = (item as BankItem & { targets_misconceptions?: string[] })
              .targets_misconceptions ?? [];
            if (targets.some((m) => costSet.has(m))) {
              l3Cost.push(item);
            } else {
              l3Other.push(item);
            }
          } else {
            rest.push(item);
          }
        }
        workPool = [...l3Cost, ...l3Other, ...rest];
      } else {
        workPool = shuffle(pool, rng);
      }
      const drawn = Math.min(quota, available);
      const picked = workPool.slice(0, drawn);
      for (const item of picked) order.push(item.id);
      familyRows.push({ partId: f.partId, nodeId: f.nodeId, quota, available, drawn });
    } else {
      // Standard / pace: apply DIFFICULTY_MIX with exposure control.
      const drawn = Math.min(quota, available);
      const { picked, reusedRecent } = drawWithMix(pool, drawn, recentItemIds, rng);
      for (const item of picked) order.push(item.id);
      totalReusedRecent += reusedRecent;
      familyRows.push({ partId: f.partId, nodeId: f.nodeId, quota, available, drawn });
    }
  }

  const effectiveFullPaperSize = mockType === "pace" ? PACE_QUESTION_COUNT : fullPaperSize;

  return {
    seed,
    order,
    size: order.length,
    fullPaperSize: effectiveFullPaperSize,
    families: familyRows,
    shortfall: Math.max(0, effectiveFullPaperSize - order.length),
    reusedRecent: totalReusedRecent,
  };
}

/**
 * Scale the full-paper marking scheme to a drawn mock of `size` questions. The
 * per-question marks and negative penalty are unchanged (they are exam rules,
 * not paper-size dependent); the question count, the pass bar, and the time
 * budget scale proportionally to the drawn size, rounded to whole marks/minutes.
 * A 76-question mock against the 100-question paper gets ~91 minutes and a ~30
 * pass bar — honest about being shorter, faithful to the marking rules.
 */
export interface ScaledMarking {
  readonly marksPerCorrect: number;
  readonly negativePerWrong: number;
  readonly marksPerUnattempted: number;
  /** Questions on this (drawn) mock. */
  readonly numQuestions: number;
  /** Max marks on this mock (numQuestions * marksPerCorrect). */
  readonly maxMarks: number;
  /** Pass bar scaled from the full-paper bar by the size ratio, whole marks. */
  readonly passMark: number;
  /** Time budget scaled from the full-paper duration, whole minutes. */
  readonly durationMinutes: number;
  /** The full-paper marking it was scaled from (for honest copy). */
  readonly fullPaper: MarkingScheme;
}

export function scaleMarking(
  full: MarkingScheme,
  size: number,
  mockType: MockAssemblyType = "standard",
): ScaledMarking {
  const ratio = full.numQuestions > 0 ? size / full.numQuestions : 0;
  // Pace mock: use the fixed 45-minute budget per data.jsx regardless of ratio.
  const durationMinutes =
    mockType === "pace" ? PACE_DURATION_MINUTES : Math.round(full.durationMinutes * ratio);
  return {
    marksPerCorrect: full.marksPerCorrect,
    negativePerWrong: full.negativePerWrong,
    marksPerUnattempted: full.marksPerUnattempted,
    numQuestions: size,
    maxMarks: size * full.marksPerCorrect,
    passMark: Math.round(full.passMark * ratio),
    durationMinutes,
    fullPaper: full,
  };
}
