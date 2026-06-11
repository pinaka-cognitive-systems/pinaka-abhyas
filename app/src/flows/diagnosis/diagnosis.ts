/**
 * Diagnosis + readiness flow logic (W5-5 flow c).
 *
 * All flow LOGIC lives here as pure, DOM-free functions, never inline in JSX
 * (task requirement 5). The React view (DiagnosisFlow.tsx) is a thin renderer
 * over the typed selectors (app/src/engine/selectors.ts) and the derivations
 * below: band formatting, the readiness honesty rules, mastery grouping by
 * blueprint part/section, the per-node "too few attempts" heuristic, the
 * recurring-misconceptions list with marks framing, and the empty/early state
 * selection.
 *
 * HONESTY RULES (docs/design/build-spec.md section 3; engine-ts/SPEC.md section 6):
 *   - The string "predicted score" must never appear. Readiness is a band, not a
 *     number; `formatBand` always emits a low-to-high range, never a bare point.
 *   - No number is rendered below the attempt/data threshold: when confidence is
 *     "insufficient_data" (or expectedMarks is null) the band is withheld and the
 *     engine's note carries the honest wording instead (`readinessView`).
 *   - Confidence is only ever low / medium / insufficient_data; "good"/"high"
 *     does not exist by policy. `confidenceLabel` maps exactly those three.
 *   - A node below the per-node attempt threshold shows "too few attempts", not a
 *     point estimate. The heuristic the engine exposes is deviation near the
 *     prior (PRIOR_DEVIATION): an unobserved or barely-observed node has not
 *     moved off the prior, so its interval is too wide to claim a value.
 */

import {
  PRIOR_DEVIATION,
  sigmoid,
  DIFFICULTY_ANCHOR,
  NEGATIVE_PER_WRONG,
  type Blueprint,
  type Confidence,
  type EngineState,
  type MisconceptionHit,
  type Readiness,
} from "@pinaka/engine";
import type { NodeMastery } from "../../engine/selectors.js";

// ---------------------------------------------------------------------------
// Overall flow state selection (empty / early / ready / error).
// ---------------------------------------------------------------------------

/** The high-level state the diagnosis screen renders, chosen from the data the
 * student has produced — never a fake zero (task requirement 4). */
export type DiagnosisState = "empty" | "early" | "ready";

/**
 * Pick the screen state from the event count and the readiness gate.
 *  - "empty": no events at all. Route the student to practice; show no zeros.
 *  - "early": some events, but readiness is still below the data gate
 *    (insufficient_data). The map is provisional; the band stays withheld.
 *  - "ready": readiness has cleared the gate; the band may render.
 */
export function selectDiagnosisState(
  eventCount: number,
  confidence: Confidence,
): DiagnosisState {
  if (eventCount === 0) return "empty";
  if (confidence === "insufficient_data") return "early";
  return "ready";
}

// ---------------------------------------------------------------------------
// Readiness band formatting + honesty view.
// ---------------------------------------------------------------------------

/** The confidence label, restricted to the only three the engine emits. The
 * word "good" / "high" is never produced (v3-brief constraint 3). */
export function confidenceLabel(confidence: Confidence): string {
  switch (confidence) {
    case "low":
      return "Low confidence";
    case "medium":
      return "Medium confidence";
    case "insufficient_data":
      return "Not enough data yet";
  }
}

/**
 * Format the readiness band as a low-to-high range of whole marks out of the
 * paper total. NEVER returns a bare point estimate: the honesty rule is that
 * readiness is a band, not a number, so even when low === high the output is a
 * range phrase. Returns null when the band is unavailable (gated), so the caller
 * shows the engine note instead of inventing a number.
 */
export function formatBand(
  readiness: Readiness,
  paperTotal: number,
): string | null {
  if (
    readiness.low === null ||
    readiness.high === null ||
    readiness.expectedMarks === null
  ) {
    return null;
  }
  return `${readiness.low} to ${readiness.high} marks out of ${paperTotal}`;
}

/** Distance-to-pass phrasing: how far the band's centre sits from the pass mark,
 * framed as marks, never as a verdict. Null when gated. */
export function formatDistanceToPass(readiness: Readiness): string | null {
  if (readiness.distanceToPass === null) return null;
  const d = readiness.distanceToPass;
  if (d === 0) return "Right at the pass mark.";
  const marks = Math.abs(d);
  const unit = marks === 1 ? "mark" : "marks";
  return d > 0
    ? `About ${marks} ${unit} above the pass mark.`
    : `About ${marks} ${unit} below the pass mark.`;
}

/** Optional time line: the estimated attempt minutes and any time-only skips,
 * framed as a time decision (never an ability verdict). Null when absent. */
export function formatTimeLine(readiness: Readiness): string | null {
  if (readiness.estMinutes === null) return null;
  const base = `Estimated attempt time about ${readiness.estMinutes} min.`;
  if (readiness.skippedForTime !== null && readiness.skippedForTime > 0) {
    const q = readiness.skippedForTime;
    return (
      `${base} ${q} question${q === 1 ? "" : "s"} dropped only to fit the clock — ` +
      `a time decision, not an ability verdict.`
    );
  }
  return base;
}

/** The honesty-checked readiness view the screen renders. When `band` is null
 * the band is withheld (gated) and only the engine note is shown. */
export interface ReadinessView {
  /** The band phrase, or null when below the data threshold. */
  readonly band: string | null;
  /** Always present: low / medium / insufficient label. */
  readonly confidenceLabel: string;
  readonly confidence: Confidence;
  /** Distance-to-pass phrase, or null when gated. */
  readonly distanceToPass: string | null;
  /** Time line, or null when absent. */
  readonly timeLine: string | null;
  /** The engine's note, verbatim — it carries the honesty line, time framing,
   * and drift wording. Never paraphrased. */
  readonly note: string;
  /** True when the band is withheld because the data gate is not cleared. */
  readonly gated: boolean;
}

/** Build the readiness view, applying the honesty rules. */
export function readinessView(
  readiness: Readiness,
  paperTotal: number,
): ReadinessView {
  const band = formatBand(readiness, paperTotal);
  return {
    band,
    confidenceLabel: confidenceLabel(readiness.confidence),
    confidence: readiness.confidence,
    distanceToPass: formatDistanceToPass(readiness),
    timeLine: formatTimeLine(readiness),
    note: readiness.note,
    gated: band === null,
  };
}

// ---------------------------------------------------------------------------
// Mastery: per-node probability + interval, grouped by blueprint part/section.
// ---------------------------------------------------------------------------

/** A node's mastery rendered as a probability with its 90% interval, plus the
 * "too few attempts" flag (deviation near the prior). The probability is the
 * mastery against an L2 anchor item, the band the engine's reference difficulty
 * for this paper (blueprint is 100% Level II). */
export interface NodeMasteryView {
  readonly nodeId: string;
  /** Human label derived from the node id's leaf segment. */
  readonly label: string;
  /** P(correct) point estimate against the L2 anchor. */
  readonly p: number;
  /** 90% interval lower bound. */
  readonly low: number;
  /** 90% interval upper bound. */
  readonly high: number;
  /** True when the node has too few attempts to claim a value: its deviation has
   * barely moved off the prior, so the interval is too wide to read as mastery. */
  readonly tooFew: boolean;
}

/**
 * Fraction of the prior deviation, at or above which a node counts as "too few
 * attempts". A fresh node sits at PRIOR_DEVIATION; one or two observations barely
 * move it. At/above 90% of the prior the interval is still essentially the prior
 * width, so we decline to render a point estimate. This is the heuristic the
 * engine exposes (deviation), not a separate attempt counter.
 */
export const TOO_FEW_DEVIATION_FRACTION = 0.9;

/** Title-case a node id's leaf segment into a human label, e.g.
 * "qa.bmath.ratio_indices_log" -> "Ratio Indices Log". Pure, no lookup table:
 * the engine Blueprint carries no human names, so the id is the source. */
export function nodeLabel(nodeId: string): string {
  const leaf = nodeId.slice(nodeId.lastIndexOf(".") + 1);
  return leaf
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Map an engine NodeMastery to its view: probability + interval against the L2
 * anchor, and the too-few-attempts flag from the deviation heuristic. */
export function nodeMasteryView(node: NodeMastery): NodeMasteryView {
  const b = DIFFICULTY_ANCHOR.L2;
  const z = 1.645; // 90% interval, matching the engine's masteryProbability.
  const p = sigmoid(node.rating - b);
  const low = sigmoid(node.rating - z * node.deviation - b);
  const high = sigmoid(node.rating + z * node.deviation - b);
  const tooFew =
    !node.observed ||
    node.deviation >= PRIOR_DEVIATION * TOO_FEW_DEVIATION_FRACTION;
  return { nodeId: node.nodeId, label: nodeLabel(node.nodeId), p, low, high, tooFew };
}

/** One blueprint section's nodes, for the grouped diagnosis view. */
export interface SectionGroup {
  readonly sectionId: string;
  readonly nodes: readonly NodeMasteryView[];
}

/** One blueprint part's sections. */
export interface PartGroup {
  readonly partId: string;
  /** Total marks for this part (from the blueprint), for marks framing. */
  readonly marks: number;
  readonly sections: readonly SectionGroup[];
}

/**
 * Group observed-node mastery under the blueprint's part → section → family
 * structure. Only nodes the blueprint names appear, and only those with observed
 * evidence (masteryByNode already filters to observed; a never-seen node is the
 * prior and belongs to the "not yet seen" reading, not the map). A node whose id
 * is a descendant of a family node (deeper leaf) is attributed to that family.
 * Empty sections and parts are dropped so the view shows only what has signal.
 */
export function groupByBlueprint(
  mastery: readonly NodeMastery[],
  blueprint: Blueprint,
): PartGroup[] {
  const byNode = new Map<string, NodeMastery>();
  for (const m of mastery) byNode.set(m.nodeId, m);

  const parts: PartGroup[] = [];
  for (const part of blueprint.parts) {
    const sections: SectionGroup[] = [];
    for (const section of part.sections) {
      const nodes: NodeMasteryView[] = [];
      for (const fam of section.families) {
        // Attribute the family node itself and any deeper-leaf descendant of it.
        for (const [nodeId, m] of byNode) {
          if (nodeId === fam.nodeId || nodeId.startsWith(fam.nodeId + ".")) {
            nodes.push(nodeMasteryView(m));
          }
        }
      }
      if (nodes.length > 0) {
        nodes.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));
        sections.push({ sectionId: section.id, nodes });
      }
    }
    if (sections.length > 0) {
      parts.push({ partId: part.id, marks: part.marks, sections });
    }
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Recurring misconceptions, with marks framing.
// ---------------------------------------------------------------------------

/** One recurring misconception, ranked by how many marks it has cost. Marks are
 * framed from the count and the marking scheme: every wrong answer carrying this
 * misconception cost the negative mark per wrong, so the marks-at-stake figure is
 * the count times the negative-marking penalty (the only honest, engine-backed
 * framing — the engine records occurrences, not a dollar value). */
export interface MisconceptionView {
  readonly id: string;
  readonly label: string;
  /** Number of recorded occurrences. */
  readonly count: number;
  /** Marks lost to this misconception under the paper's negative marking. */
  readonly marks: number;
}

/**
 * Rank the recurring misconceptions from engine state, most-marks-lost first
 * (ties broken by id for a stable render). Only misconceptions with at least
 * `minOccurrences` occurrences are "recurring"; a single slip is not a pattern.
 */
export function recurringMisconceptions(
  state: EngineState,
  negativePerWrong: number = NEGATIVE_PER_WRONG,
  minOccurrences = 2,
): MisconceptionView[] {
  const out: MisconceptionView[] = [];
  for (const [id, hits] of state.misconceptions) {
    const count = hits.length;
    if (count < minOccurrences) continue;
    out.push({
      id,
      label: nodeLabel(id),
      count,
      marks: round2(count * negativePerWrong),
    });
  }
  out.sort((a, b) =>
    b.marks !== a.marks ? b.marks - a.marks : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return out;
}

/** Round to two decimals (marks are quarter-mark granular). */
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// Re-exported for the view and tests so the misconception type is reachable
// without importing the engine directly.
export type { MisconceptionHit };
