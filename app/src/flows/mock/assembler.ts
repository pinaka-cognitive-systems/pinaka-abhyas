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
 * Assemble a mock from the bank per the blueprint, sized honestly to the bank.
 *
 * For each blueprint family, in blueprint order:
 *   1. collect the family's selectable items (tombstones excluded, ADR 0009),
 *      sorted by id for a deterministic starting set;
 *   2. shuffle them with the seeded RNG and take the first min(quota, available).
 *
 * The drawn items are concatenated in blueprint order (Business Maths, then
 * Logical Reasoning, then Statistics — matching the real paper's section order),
 * which keeps the palette's part grouping meaningful. No item is ever drawn
 * twice (a family owns each of its items, and we slice without replacement), so
 * the no-repeat guarantee holds by construction.
 *
 * @param seed       the mock seed; the same seed reproduces the same paper.
 * @param bank       the live item bank (the loaded pack's bank).
 * @param blueprint  the engine Blueprint (family quotas).
 * @param fullPaperSize the full-paper question count (marking.numQuestions).
 */
export function assembleMock(
  seed: number,
  bank: Bank,
  blueprint: Blueprint,
  fullPaperSize: number,
): AssembledMock {
  const rng = mulberry32(seed);
  const families = flattenFamilies(blueprint);
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
  for (const f of families) {
    const pool = buckets.get(f.nodeId)!;
    const available = pool.length;
    const drawn = Math.min(f.quota, available);
    const picked = shuffle(pool, rng).slice(0, drawn);
    for (const item of picked) order.push(item.id);
    familyRows.push({
      partId: f.partId,
      nodeId: f.nodeId,
      quota: f.quota,
      available,
      drawn,
    });
  }

  return {
    seed,
    order,
    size: order.length,
    fullPaperSize,
    families: familyRows,
    shortfall: Math.max(0, fullPaperSize - order.length),
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

export function scaleMarking(full: MarkingScheme, size: number): ScaledMarking {
  const ratio = full.numQuestions > 0 ? size / full.numQuestions : 0;
  return {
    marksPerCorrect: full.marksPerCorrect,
    negativePerWrong: full.negativePerWrong,
    marksPerUnattempted: full.marksPerUnattempted,
    numQuestions: size,
    maxMarks: size * full.marksPerCorrect,
    passMark: Math.round(full.passMark * ratio),
    durationMinutes: Math.round(full.durationMinutes * ratio),
    fullPaper: full,
  };
}
