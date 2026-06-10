/**
 * Cold-start baseline plan (W5-8).
 *
 * A pure, deterministic function that picks ~24 items for a student's FIRST
 * session, before the engine has any history to serve from. The goal is not to
 * optimise — there is nothing yet to optimise against — but to lay down an
 * honest first map: a spread of evidence across the highest-mark blueprint
 * families, gently graded so a scared student eight weeks out does not meet the
 * hardest items first.
 *
 * This is a build-time-free, runtime-pure transform over the loaded pack: same
 * bank + blueprint in, identical item-id order out. No engine call (the engine
 * has nothing to say on an empty log), no clock, no randomness (SPEC 9
 * discipline). The baseline flow feeds these ids to the SAME question/feedback
 * machinery the practice loop uses; every answer still becomes an engine event
 * in mode "practice", so the closing diagnosis is real.
 *
 * DESIGN
 *
 *   Family weighting. Parts carry marks (Business Maths 40, Logical Reasoning
 *   20, Statistics 40 — blueprint.json); each family carries a question quota.
 *   A family's exam weight is its quota (one mark per question), so the highest-
 *   quota families are the highest-mark families. We visit families in
 *   descending quota (ties broken by node id for determinism) and take 2-3 items
 *   from each major family until the target (~24) is met. "Major" is any family
 *   the blueprint asks at least MAJOR_QUOTA questions of; minor families (a
 *   5-question tail like Index Numbers) are filled only if the target is not yet
 *   reached, so the limited first session spends its budget where the marks are.
 *
 *   Per-family difficulty grade. Within a family we take L1 first, then L2,
 *   never L3 — across the whole plan no L3 item is ever included (requirement:
 *   "a scared student 8 weeks out must not meet L3 first"). Items are picked in
 *   (difficulty L1<L2, then id) order so the choice is deterministic.
 *
 *   Global ordering. The assembled plan is then ordered L1-heavy first, then L2,
 *   so the SESSION opens easy and warms up — within a difficulty band, by family
 *   quota then id, so the early questions also sample the heaviest families
 *   first. Deterministic end-to-end.
 *
 * The plan only names item ids the screen has content for and that are
 * selectable (tombstones excluded, ADR 0009); a malformed or thin bank yields a
 * shorter plan rather than throwing.
 */

import { isSelectable, type Bank, type BankItem, type Blueprint } from "@pinaka/engine";

/** Target number of items in a baseline session (~24, requirement 1). */
export const BASELINE_TARGET = 24;

/** Minimum items to take from a single major family (the "2-3 per family"
 * floor). */
export const MIN_PER_FAMILY = 2;

/** Maximum items to take from a single family (the "2-3 per family" cap). */
export const MAX_PER_FAMILY = 3;

/** A family is "major" when the blueprint asks at least this many questions of
 * it. Minor families (the long thin tail) are filled only after majors. */
export const MAJOR_QUOTA = 10;

/** One planned item: its id and the difficulty it was graded at, retained so
 * the flow and the tests can assert the L1-before-L2 ordering. */
export interface PlannedItem {
  readonly itemId: string;
  readonly difficulty: "L1" | "L2";
  /** The blueprint family this item was drawn for. */
  readonly familyNodeId: string;
}

/** The assembled baseline plan: the ordered items plus the per-family
 * accounting the tests and (if wanted) an honest note can read. */
export interface BaselinePlan {
  /** Items in PRESENTATION order: L1-heavy first, then L2. */
  readonly items: readonly PlannedItem[];
  /** Distinct families the plan drew from, in the order they were visited
   * (descending quota, then node id). */
  readonly familiesCovered: readonly string[];
  /** The target the plan aimed for (for honest copy / tests). */
  readonly target: number;
}

/** A flattened blueprint family with its part id and quota. */
interface FlatFamily {
  readonly partId: string;
  readonly nodeId: string;
  readonly quota: number;
}

/** Flatten the blueprint into an ordered family list (blueprint document order). */
function flattenFamilies(blueprint: Blueprint): FlatFamily[] {
  const out: FlatFamily[] = [];
  for (const part of blueprint.parts) {
    for (const section of part.sections) {
      for (const fam of section.families) {
        out.push({ partId: part.id, nodeId: fam.nodeId, quota: fam.quota });
      }
    }
  }
  return out;
}

/** The family a bank item belongs to: the first blueprint family (in the given
 * order) whose node id the item's tests match (equal or dot-descendant). Mirrors
 * the mock assembler's attribution so an item lands in exactly one family. */
function familyOf(item: BankItem, families: readonly FlatFamily[]): string | null {
  for (const fam of families) {
    for (const t of item.tests) {
      if (t === fam.nodeId || t.startsWith(fam.nodeId + ".")) return fam.nodeId;
    }
  }
  return null;
}

/** Difficulty rank for ordering: L1 before L2; L3 sorts last (and is never
 * selected). */
function difficultyRank(label: string): number {
  if (label === "L1") return 0;
  if (label === "L2") return 1;
  return 2; // L3 and anything unexpected
}

/**
 * Build the cold-start baseline plan from the loaded pack's bank and blueprint.
 *
 * Pure and deterministic: no clock, no randomness, no engine call. Returns at
 * most `target` items, never including an L3 item, drawn 2-3 per major family in
 * descending mark-weight (quota) order and presented L1-heavy first.
 */
export function buildBaselinePlan(
  bank: Bank,
  blueprint: Blueprint,
  target: number = BASELINE_TARGET,
  haveContent: (itemId: string) => boolean = () => true,
): BaselinePlan {
  const families = flattenFamilies(blueprint);

  // Bucket each selectable, content-backed, non-L3 item into its first family.
  // Sorted by id so the pre-grade set is deterministic regardless of Map order.
  const buckets = new Map<string, BankItem[]>();
  for (const f of families) buckets.set(f.nodeId, []);
  const ids = [...bank.keys()].sort();
  for (const id of ids) {
    const item = bank.get(id);
    if (item === undefined || !isSelectable(item)) continue;
    if (item.difficulty_label === "L3") continue; // never serve L3 in the baseline
    if (!haveContent(id)) continue;
    const fam = familyOf(item, families);
    if (fam === null) continue;
    buckets.get(fam)!.push(item);
  }

  // Visit families by descending exam weight (quota), ties by node id. Majors
  // first (a stable partition that keeps the quota order within each group), so
  // the limited budget is spent on the heaviest families before the thin tail.
  const byWeight = [...families].sort((a, b) =>
    b.quota - a.quota !== 0 ? b.quota - a.quota : a.nodeId < b.nodeId ? -1 : 1,
  );
  const majors = byWeight.filter((f) => f.quota >= MAJOR_QUOTA);
  const minors = byWeight.filter((f) => f.quota < MAJOR_QUOTA);
  const visitOrder = [...majors, ...minors];

  const picked: PlannedItem[] = [];
  const familiesCovered: string[] = [];

  // Two passes: first take the per-family floor from each family (majors then
  // minors) until the target is met; a second pass tops families up toward the
  // cap if budget remains. This guarantees SPREAD before depth.
  function takeFrom(fam: FlatFamily, want: number): void {
    const pool = buckets.get(fam.nodeId);
    if (pool === undefined || pool.length === 0) return;
    // Grade within the family: L1 before L2, then id. (L3 already excluded.)
    const graded = [...pool].sort((a, b) => {
      const dr = difficultyRank(a.difficulty_label) - difficultyRank(b.difficulty_label);
      return dr !== 0 ? dr : a.id < b.id ? -1 : 1;
    });
    const already = picked.filter((p) => p.familyNodeId === fam.nodeId).length;
    let taken = 0;
    for (const item of graded) {
      if (picked.length >= target) return;
      if (already + taken >= want) return;
      if (picked.some((p) => p.itemId === item.id)) continue;
      picked.push({
        itemId: item.id,
        difficulty: item.difficulty_label === "L1" ? "L1" : "L2",
        familyNodeId: fam.nodeId,
      });
      if (!familiesCovered.includes(fam.nodeId)) familiesCovered.push(fam.nodeId);
      taken++;
    }
  }

  // Pass 1: the floor (2 per family), spread across families by weight.
  for (const fam of visitOrder) {
    if (picked.length >= target) break;
    takeFrom(fam, MIN_PER_FAMILY);
  }
  // Pass 2: top up toward the cap (3 per family), same weight order.
  for (const fam of visitOrder) {
    if (picked.length >= target) break;
    takeFrom(fam, MAX_PER_FAMILY);
  }

  // Present the assembled set L1-heavy first, then L2; within a band by family
  // weight (so the heaviest families lead) then id, fully deterministic.
  const quotaOf = new Map(families.map((f) => [f.nodeId, f.quota]));
  const ordered = [...picked].sort((a, b) => {
    const dr = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
    if (dr !== 0) return dr;
    const qa = quotaOf.get(a.familyNodeId) ?? 0;
    const qb = quotaOf.get(b.familyNodeId) ?? 0;
    if (qb - qa !== 0) return qb - qa;
    return a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0;
  });

  return { items: ordered, familiesCovered, target };
}
