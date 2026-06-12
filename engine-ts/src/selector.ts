/**
 * Next-action selection (SPEC section 5; W1-5, W1-6, W1-7).
 *
 * Strict priority order:
 *   1. Misconception remediation — a misconception with >= 2 occurrences whose
 *      last occurrence is recent (<= 14 days) and whose nodes carry blueprint
 *      weight. Remediation OUTRANKS routine review by design: this is the
 *      audited starvation inversion (the prototype let reviews crowd out the
 *      thing actually costing marks).
 *   2. Budgeted review — due items, most overdue first, but never more than 50%
 *      of the session's actions. Served node-level: a sibling on the same node
 *      not seen in 7 days is preferred; the original is used only when no
 *      sibling exists OR the item is a lapse (seeing the exact error is the point).
 *   3. Learnable-band practice — nodes whose rating sits in the band around L2
 *      and whose deviation is still high, weighted by blueprint marks.
 *   4. Coverage — unseen blueprint nodes by descending mark weight; L1 first.
 *
 * Skill reads go through the hierarchical pools (ADR 0021): a family node the
 * student has only touched through leaf items reads its descendants' pooled
 * evidence instead of a fresh prior, and "seen" for the tier-3/tier-4 boundary
 * means any evidence — own or descendant.
 *
 * Determinism: every candidate ordering ends with (score desc, node_id asc,
 * item_id asc). No dependence on Map/object iteration order anywhere.
 */

import { buildSkillPools, effectiveSkill, hasEvidence, type SkillPools } from "./hierarchy.js";
import type { SkillState } from "./mastery.js";
import { DIFFICULTY_ANCHOR } from "./scale.js";
import { dueItems } from "./scheduler.js";
import { MS_PER_DAY } from "./time.js";
import type {
  Bank,
  BankItem,
  Blueprint,
  DifficultyLabel,
  EngineState,
  NextAction,
} from "./types.js";
import { isSelectable } from "./types.js";

export const REMEDIATION_RECENCY_DAYS = 14;
export const REMEDIATION_MIN_OCCURRENCES = 2;
export const REVIEW_BUDGET_SHARE = 0.5;
export const SIBLING_STALE_DAYS = 7;
/** Learnable band on rating relative to the L2 anchor (SPEC 5.3). */
export const BAND_LOW = -1.2;
export const BAND_HIGH = 0.6;
export const BAND_MIN_DEVIATION = 0.5;

/** Per-session bookkeeping the caller threads through successive nextAction
 * calls so the review budget can be enforced without a wall clock or mutation. */
export interface SessionProgress {
  /** Actions already served this session (any kind). */
  readonly served: number;
  /** Reviews already served this session. */
  readonly reviewsServed: number;
  /** Item ids already served this session (excluded from fresh picks). */
  readonly servedItems: ReadonlySet<string>;
}

export const EMPTY_SESSION: SessionProgress = {
  served: 0,
  reviewsServed: 0,
  servedItems: new Set(),
};

/** Blueprint family weight: marks per question (one here) times quota, summed
 * onto the family node, returned as a node-id -> weight map plus a node-prefix
 * lookup so a deep node inherits its family's weight. */
function blueprintWeights(blueprint: Blueprint): Map<string, number> {
  const w = new Map<string, number>();
  for (const part of blueprint.parts) {
    const markPerQuestion = part.questions > 0 ? part.marks / part.questions : 1;
    for (const section of part.sections) {
      for (const fam of section.families) {
        w.set(fam.nodeId, fam.quota * markPerQuestion);
      }
    }
  }
  return w;
}

/** Weight a node inherits: the blueprint family that is a prefix of (or equals)
 * the node id. Returns 0 for nodes carrying no blueprint weight. */
function nodeWeight(nodeId: string, weights: Map<string, number>): number {
  const direct = weights.get(nodeId);
  if (direct !== undefined) return direct;
  let best = 0;
  for (const [fam, weight] of weights) {
    if (nodeId === fam || nodeId.startsWith(fam + ".")) {
      // The family node is the weighted unit; a child inherits its weight.
      best = Math.max(best, weight);
    }
  }
  return best;
}

function skillFor(state: EngineState, pools: SkillPools, nodeId: string): SkillState {
  return effectiveSkill(state, pools, nodeId);
}

function lastSeen(state: EngineState, itemId: string): number | undefined {
  return state.lastSeenMs.get(itemId);
}

/** Items that exercise a node OR any of its descendants, selectable, sorted by
 * item id ascending. Prefix matching mirrors readiness coverage(): blueprint
 * families sit at section level while real pack items tag leaf nodes, and an
 * exact match left most of a real bank unreachable by selection (found at
 * W5-3 integration). */
function itemsForNode(node: string, bank: Bank): BankItem[] {
  const out: BankItem[] = [];
  for (const item of bank.values()) {
    if (!isSelectable(item)) continue;
    if (item.tests.some((t) => t === node || t.startsWith(node + "."))) out.push(item);
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/**
 * The active remediation candidate, or null. A misconception qualifies when it
 * has >= 2 occurrences, its latest is within 14 days of nowMs, and its nodes
 * carry blueprint weight. Among qualifying misconceptions the most recent wins;
 * ties break on misconception id ascending.
 */
function pickRemediation(
  state: EngineState,
  bank: Bank,
  weights: Map<string, number>,
  nowMs: number,
  session: SessionProgress,
): NextAction | null {
  type Cand = { mid: string; lastMs: number; nodes: string[] };
  const cands: Cand[] = [];
  for (const [mid, hits] of state.misconceptions) {
    if (hits.length < REMEDIATION_MIN_OCCURRENCES) continue;
    const last = hits[hits.length - 1]!;
    const lastMs = last.occurredAtMs;
    if (nowMs - lastMs > REMEDIATION_RECENCY_DAYS * MS_PER_DAY) continue;
    const nodes = last.nodes.filter((n) => nodeWeight(n, weights) > 0);
    if (nodes.length === 0) continue;
    cands.push({ mid, lastMs, nodes });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => {
    if (a.lastMs !== b.lastMs) return b.lastMs - a.lastMs;
    return a.mid < b.mid ? -1 : a.mid > b.mid ? 1 : 0;
  });
  const top = cands[0]!;
  // Serve an unseen-or-stale item from an affected node, targeting this
  // misconception when possible. Order nodes by node id ascending for determinism.
  const nodes = [...top.nodes].sort();
  for (const node of nodes) {
    const items = itemsForNode(node, bank).filter((it) => !session.servedItems.has(it.id));
    // Prefer items whose distractors target the misconception, then unseen,
    // then stale; finally item id ascending (itemsForNode already sorts by id).
    const ranked = [...items].sort((a, b) => {
      const ta = a.targets_misconceptions?.includes(top.mid) ? 1 : 0;
      const tb = b.targets_misconceptions?.includes(top.mid) ? 1 : 0;
      if (ta !== tb) return tb - ta;
      const sa = lastSeen(state, a.id) ?? -Infinity;
      const sb = lastSeen(state, b.id) ?? -Infinity;
      if (sa !== sb) return sa - sb; // less-recently-seen (or unseen) first
      return a.id < b.id ? -1 : 1;
    });
    if (ranked.length > 0) {
      const item = ranked[0]!;
      return {
        kind: "remediate",
        itemId: item.id,
        nodeId: node,
        reason:
          `Recurring misconception '${top.mid}' keeps costing marks; ` +
          `practising it directly recovers more than routine review.`,
      };
    }
  }
  return null;
}

/**
 * Budgeted review pick, or null. Returns null when the review budget for this
 * session is already spent (reviews must never exceed 50% of session actions).
 * Node-level: prefer a sibling on the same node not seen in 7 days; fall back
 * to the original only when no sibling exists. A lapse always serves the
 * original item (seeing the exact error is the point).
 */
function pickReview(
  state: EngineState,
  bank: Bank,
  nowMs: number,
  session: SessionProgress,
  sessionLength: number,
): NextAction | null {
  // Budget: reviews are capped at floor(REVIEW_BUDGET_SHARE * sessionLength).
  const reviewCap = Math.floor(REVIEW_BUDGET_SHARE * sessionLength);
  if (session.reviewsServed >= reviewCap) return null;

  const due = dueItems(state.schedules, nowMs);
  for (const sched of due) {
    if (session.servedItems.has(sched.itemId)) continue;
    const original = bank.get(sched.itemId);
    // A due item whose bank entry is gone/tombstoned is skipped (reconcile
    // should have transferred it; defend anyway per ADR 0009).
    if (original === undefined || !isSelectable(original)) {
      // Only skip the original; do not skip the whole queue.
      if (!sched.lapsed && original !== undefined) {
        // fall through to sibling search below using the schedule's nodes
      } else {
        continue;
      }
    }

    if (sched.lapsed && original !== undefined && isSelectable(original)) {
      return {
        kind: "review",
        itemId: original.id,
        nodeId: original.tests[0] ?? null,
        reason:
          `Due review of a missed item — re-seeing the exact error is what fixes it; ` +
          `protects banked marks.`,
      };
    }

    // Node-level review: pick a sibling on one of the item's nodes not seen in
    // 7 days. Use the bank item's nodes when present, else the schedule alone
    // cannot name nodes, so fall back to the original.
    const nodes = original ? [...original.tests].sort() : [];
    for (const node of nodes) {
      const siblings = itemsForNode(node, bank).filter(
        (it) =>
          it.id !== sched.itemId &&
          !session.servedItems.has(it.id) &&
          (lastSeen(state, it.id) === undefined ||
            nowMs - (lastSeen(state, it.id) as number) >= SIBLING_STALE_DAYS * MS_PER_DAY),
      );
      if (siblings.length > 0) {
        const sib = siblings[0]!; // already item-id sorted
        return {
          kind: "review",
          itemId: sib.id,
          nodeId: node,
          reason:
            `Due review on '${node}', served via a fresh sibling item so you ` +
            `practise the idea, not a memorised answer; protects banked marks.`,
        };
      }
    }
    // No fresh sibling: fall back to the original when it is selectable.
    if (original !== undefined && isSelectable(original) && !session.servedItems.has(original.id)) {
      return {
        kind: "review",
        itemId: original.id,
        nodeId: original.tests[0] ?? null,
        reason:
          `Due review — no fresh sibling available, so the original item is ` +
          `served; protects banked marks.`,
      };
    }
  }
  return null;
}

/** Learnable-band practice pick, or null. */
function pickLearnable(
  state: EngineState,
  pools: SkillPools,
  bank: Bank,
  weights: Map<string, number>,
  session: SessionProgress,
): NextAction | null {
  const l2 = DIFFICULTY_ANCHOR.L2;
  type Cand = { node: string; score: number };
  const cands: Cand[] = [];
  for (const [node, weight] of weights) {
    if (weight <= 0) continue;
    // Learnable-band practice is for nodes with EVIDENCE (own or descendant,
    // ADR 0021); never-touched nodes are the job of tier 4 (coverage). A fresh
    // skill sits at the L2 anchor and would otherwise masquerade as learnable,
    // collapsing the tier distinction.
    if (!hasEvidence(state, pools, node)) continue;
    const skill = skillFor(state, pools, node);
    const rel = skill.rating - l2;
    if (rel < BAND_LOW || rel > BAND_HIGH) continue;
    if (skill.deviation <= BAND_MIN_DEVIATION) continue;
    cands.push({ node, score: weight });
  }
  cands.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.node < b.node ? -1 : 1;
  });
  for (const { node } of cands) {
    // Serve the difficulty label nearest the student's rating.
    const skill = skillFor(state, pools, node);
    const target = nearestLabel(skill.rating);
    const items = itemsForNode(node, bank).filter((it) => !session.servedItems.has(it.id));
    if (items.length === 0) continue;
    const ranked = rankByDifficultyThenUnseen(items, target, state);
    const item = ranked[0]!;
    return {
      kind: "practice",
      itemId: item.id,
      nodeId: node,
      reason:
        `High-weight, learnable node '${node}': you are close enough that ` +
        `practice converts directly to marks.`,
    };
  }
  return null;
}

/** Coverage pick over unseen weighted nodes, or null. */
function pickCoverage(
  state: EngineState,
  pools: SkillPools,
  bank: Bank,
  weights: Map<string, number>,
  session: SessionProgress,
): NextAction | null {
  type Cand = { node: string; weight: number };
  const cands: Cand[] = [];
  for (const [node, weight] of weights) {
    if (weight <= 0) continue;
    // "Seen" includes descendant evidence (ADR 0021): a family the student
    // reached through leaf items is not unseen territory.
    if (hasEvidence(state, pools, node)) continue;
    cands.push({ node, weight });
  }
  cands.sort((a, b) => {
    if (a.weight !== b.weight) return b.weight - a.weight;
    return a.node < b.node ? -1 : 1;
  });
  for (const { node } of cands) {
    const items = itemsForNode(node, bank).filter((it) => !session.servedItems.has(it.id));
    if (items.length === 0) continue;
    // L1 entry items first, then by item id.
    const ranked = rankByDifficultyThenUnseen(items, "L1", state);
    const item = ranked[0]!;
    return {
      kind: "coverage",
      itemId: item.id,
      nodeId: node,
      reason:
        `Unseen high-weight node '${node}': an entry item here opens marks you ` +
        `have not yet touched.`,
    };
  }
  return null;
}

function nearestLabel(rating: number): DifficultyLabel {
  let best: DifficultyLabel = "L2";
  let bestD = Infinity;
  for (const label of ["L1", "L2", "L3"] as const) {
    const d = Math.abs(rating - DIFFICULTY_ANCHOR[label]);
    if (d < bestD) {
      bestD = d;
      best = label;
    }
  }
  return best;
}

function rankByDifficultyThenUnseen(
  items: BankItem[],
  target: DifficultyLabel,
  state: EngineState,
): BankItem[] {
  return [...items].sort((a, b) => {
    const da = a.difficulty_label === target ? 0 : 1;
    const db = b.difficulty_label === target ? 0 : 1;
    if (da !== db) return da - db;
    const sa = state.lastSeenMs.get(a.id) ?? -Infinity;
    const sb = state.lastSeenMs.get(b.id) ?? -Infinity;
    if (sa !== sb) return sa - sb; // unseen / staler first
    return a.id < b.id ? -1 : 1;
  });
}

/**
 * Choose the next action (SPEC 5). Pure: the blueprint is passed explicitly
 * (nothing is global) and there is no wall clock. `session` lets the caller
 * enforce the review budget across a session without mutation; omit it for a
 * single pick from a fresh session.
 */
export function selectNextAction(
  state: EngineState,
  bank: Bank,
  blueprint: Blueprint,
  nowMs: number,
  sessionLength = 20,
  session: SessionProgress = EMPTY_SESSION,
): NextAction {
  const weights = blueprintWeights(blueprint);
  const pools = buildSkillPools(state, nowMs);
  return (
    pickRemediation(state, bank, weights, nowMs, session) ??
    pickReview(state, bank, nowMs, session, sessionLength) ??
    pickLearnable(state, pools, bank, weights, session) ??
    pickCoverage(state, pools, bank, weights, session) ?? {
      kind: "none",
      itemId: null,
      nodeId: null,
      reason: "Nothing to serve: no remediation, no due review, no learnable or unseen node.",
    }
  );
}

/** Advance session bookkeeping after serving an action. Pure. */
export function recordServed(
  session: SessionProgress,
  action: NextAction,
): SessionProgress {
  if (action.itemId === null) return session;
  const servedItems = new Set(session.servedItems);
  servedItems.add(action.itemId);
  return {
    served: session.served + 1,
    reviewsServed: session.reviewsServed + (action.kind === "review" ? 1 : 0),
    servedItems,
  };
}
