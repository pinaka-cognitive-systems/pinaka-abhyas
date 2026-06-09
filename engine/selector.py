"""
selector.py — score-driven next-action selector (v2).

4-tier decision logic (in strict priority order):

  1. Due reviews (spaced retention protects banked marks) -> action "review".
  2. Active recurring misconception costing marks -> action "remediate_misconception":
     serve practice targeting that misconception's node(s) until it stops recurring.
  3. Accurate but slow on a high-value node -> action "speed_drill": timed practice
     to fix pace before the student runs out of time in the exam.
  4. Else -> action "practice": the node with the highest base_priority among
     LEARNABLE items (predicted success in soft band ~0.40-0.85 so it is improvable,
     not hopeless), interleaved across parts, excluding recently served items.

All reason strings are framed in marks:
  "high-weight area (~N marks of headroom)"
  "this misconception has cost ~M marks; let's kill it"
  "you are accurate but slow here; at this pace you may not finish the paper"

Python 3 standard library only. No file/network I/O. Pure-functional core.
Parameters labelled PROVISIONAL; real calibration from beta cohort.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Set

from .mastery import effective_p as mastery_effective_p, mean_pace_ratio, ranked_misconceptions
from .scheduler import due_queue
from .types import Event, MasteryState, NextAction, SchedulerState
from .value import base_priority, est_marks_gain, part_weight

# ---------------------------------------------------------------------------
# Constants (provisional)
# ---------------------------------------------------------------------------

# Learnable band: predicted success in [BAND_LOW, BAND_HIGH]
# Below BAND_LOW -> item too hard (hopeless); above BAND_HIGH -> too easy (no gain)
BAND_LOW = 0.40
BAND_HIGH = 0.85

# For the "accurate-but-slow" tier: node must have mastery >= ACCURATE_P_THRESHOLD
# and pace_ratio > SLOW_PACE_THRESHOLD to qualify for a speed_drill.
ACCURATE_P_THRESHOLD = 0.65   # node is reasonably well understood
SLOW_PACE_THRESHOLD = 1.0     # pace_ratio > 1.0 means taking longer than expected

# High-value for speed_drill: only drill speed on nodes whose base_priority
# is in a part that is "high-value" (i.e. part_weight >= HIGH_VALUE_WEIGHT).
HIGH_VALUE_WEIGHT = 0.35  # qa.bmath and qa.stats qualify (0.40 each); qa.lr does not

# Minimum pace_count before we trust the speed measurement
MIN_PACE_COUNT = 3

DIFFICULTY_ADJUSTMENT = {
    "L1": 1.15,
    "L2": 1.00,
    "L3": 0.75,
}

PRIOR_P = 0.5

PART_PREFIXES = {
    "qa.bmath": "bmath",
    "qa.lr": "lr",
    "qa.stats": "stats",
}

# Target band kept for v1 test compatibility (imported by tests)
TARGET_LOW = BAND_LOW
TARGET_HIGH = BAND_HIGH


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _node_effective_p(node_id: str, mastery: MasteryState, now_iso: str) -> float:
    nm = mastery.nodes.get(node_id)
    if nm is None:
        return PRIOR_P
    return mastery_effective_p(nm, now_iso)


def _item_predicted_success(
    item_id: str,
    item_meta: Dict,
    mastery: MasteryState,
    now_iso: str,
) -> float:
    """Predict P(student answers this item correctly) using decayed mastery."""
    tests: List[str] = item_meta.get("tests", [])
    if not tests:
        return PRIOR_P
    avg_p = sum(_node_effective_p(n, mastery, now_iso) for n in tests) / len(tests)
    adj = DIFFICULTY_ADJUSTMENT.get(
        item_meta.get("difficulty_label", "L2").upper(), 1.0
    )
    return min(0.99, max(0.01, avg_p * adj))


def _item_part(item_meta: Dict) -> Optional[str]:
    tests = item_meta.get("tests", [])
    for node_id in tests:
        for prefix, part in PART_PREFIXES.items():
            if node_id.startswith(prefix):
                return part
    return None


def _item_avg_priority(item_meta: Dict, mastery: MasteryState, now_iso: str) -> float:
    """Average base_priority across nodes tested by this item."""
    tests = item_meta.get("tests", [])
    if not tests:
        return 0.0
    return sum(
        base_priority(n, _node_effective_p(n, mastery, now_iso))
        for n in tests
    ) / len(tests)


def _in_learnable_band(p: float) -> bool:
    return BAND_LOW <= p <= BAND_HIGH


def _distance_to_band(p: float) -> float:
    if _in_learnable_band(p):
        return 0.0
    return min(abs(p - BAND_LOW), abs(p - BAND_HIGH))


def _is_accurate_but_slow(node_id: str, mastery: MasteryState, now_iso: str) -> bool:
    """True if node is well-understood (p >= ACCURATE_P_THRESHOLD) but slow."""
    nm = mastery.nodes.get(node_id)
    if nm is None:
        return False
    ep = mastery_effective_p(nm, now_iso)
    if ep < ACCURATE_P_THRESHOLD:
        return False  # not accurate yet
    if nm.pace_count < MIN_PACE_COUNT:
        return False  # not enough speed data
    pr = mean_pace_ratio(nm)
    return pr > SLOW_PACE_THRESHOLD


def _nodes_for_misconception(
    misconception_id: str,
    misconception_node_map: Dict[str, List[str]],
) -> List[str]:
    """Return node ids associated with a misconception, from the provided map."""
    return misconception_node_map.get(misconception_id, [])


def _items_for_nodes(
    node_ids: Set[str],
    item_bank: Dict[str, Dict],
    recently_served: Set[str],
) -> List[str]:
    """Return items that test at least one of the given nodes, excluding recently served."""
    result = []
    for iid, meta in item_bank.items():
        if iid in recently_served:
            continue
        if set(meta.get("tests", [])) & node_ids:
            result.append(iid)
    return result


# ---------------------------------------------------------------------------
# Main selector
# ---------------------------------------------------------------------------

def select_next(
    mastery: MasteryState,
    scheduler_state: SchedulerState,
    item_bank: Dict[str, Dict],
    now_iso: str,
    recently_served: Optional[Set[str]] = None,
    active_misconception_nodes: Optional[Set[str]] = None,
    last_served_part: Optional[str] = None,
    active_misconception_items: Optional[Set[str]] = None,
    # v2 additions
    active_misconceptions: Optional[List] = None,       # list of MisconceptionSummary
    misconception_node_map: Optional[Dict[str, List[str]]] = None,  # mid -> [node_id]
) -> NextAction:
    """
    Return the next action for the student (v2 — score-driven, 4-tier).

    Parameters
    ----------
    mastery: current MasteryState (with time-decayed effective_p available)
    scheduler_state: current SchedulerState
    item_bank: {item_id: {tests, difficulty_label, expected_seconds}} — all items
    now_iso: current datetime (ISO-8601)
    recently_served: item ids served this session (excluded from fresh picks)
    active_misconception_nodes: node ids linked to active recurring misconceptions
    last_served_part: part label of last served item (for interleaving in tier 4)
    active_misconception_items: item ids whose last wrong was a misconception item
    active_misconceptions: list of MisconceptionSummary (from mastery.ranked_misconceptions)
    misconception_node_map: {misconception_id: [node_id, ...]} for tier-2 targeting
    """
    recently_served = recently_served or set()
    active_misconception_nodes = active_misconception_nodes or set()
    active_misconception_items = active_misconception_items or set()
    active_misconceptions = active_misconceptions or []
    misconception_node_map = misconception_node_map or {}

    # -----------------------------------------------------------------------
    # Tier 1: Due reviews (spaced retention protects banked marks)
    # -----------------------------------------------------------------------
    due = due_queue(scheduler_state, now_iso, active_misconception_items)
    if due:
        first_due = due[0]
        item_meta = item_bank.get(first_due.item_id, {})
        tests = item_meta.get("tests", [])
        gain_str = ""
        if tests:
            ep = _node_effective_p(tests[0], mastery, now_iso)
            gain_approx = est_marks_gain(tests[0], ep)
            if gain_approx > 0.1:
                gain_str = f" (~{gain_approx:.1f} marks of headroom)"
        return NextAction(
            action="review",
            item_id=first_due.item_id,
            reason=(
                f"Review due: spaced repetition protects banked marks{gain_str}. "
                f"(was due {first_due.due_at[:10]})"
            ),
        )

    candidates = [iid for iid in item_bank if iid not in recently_served]

    if not candidates:
        return NextAction(
            action="practice",
            item_id=None,
            reason="No items available (all recently served or bank empty).",
        )

    # -----------------------------------------------------------------------
    # Tier 2: Remediate active recurring misconception
    # -----------------------------------------------------------------------
    recurring_misconceptions = [ms for ms in active_misconceptions if ms.is_recurring]
    if recurring_misconceptions:
        # Pick the highest-recency-score recurring misconception
        top_mis = max(recurring_misconceptions, key=lambda m: m.recency_score)
        mis_nodes = set(_nodes_for_misconception(top_mis.misconception_id, misconception_node_map))

        if not mis_nodes:
            # Fallback: use active_misconception_nodes if no specific map provided
            mis_nodes = active_misconception_nodes

        if mis_nodes:
            mis_items = _items_for_nodes(mis_nodes, item_bank, recently_served)
            if mis_items:
                # Pick the item with the best learnable-band fit among mis_items
                best_item = None
                best_dist = math.inf
                for iid in mis_items:
                    meta = item_bank[iid]
                    p = _item_predicted_success(iid, meta, mastery, now_iso)
                    dist = _distance_to_band(p)
                    if dist < best_dist:
                        best_dist = dist
                        best_item = iid

                # Estimate cost of this misconception
                cost = round(top_mis.recency_score * 1.25, 1)
                return NextAction(
                    action="remediate_misconception",
                    item_id=best_item,
                    reason=(
                        f"Recurring misconception '{top_mis.misconception_id}' "
                        f"is costing ~{cost:.1f} marks. "
                        f"Practice here until it stops recurring."
                    ),
                )

    # -----------------------------------------------------------------------
    # Tier 3: Speed drill — accurate but slow on a high-value node
    # -----------------------------------------------------------------------
    slow_nodes: List[str] = []
    for node_id, nm in mastery.nodes.items():
        if not _is_accurate_but_slow(node_id, mastery, now_iso):
            continue
        pw = part_weight(node_id)
        if pw < HIGH_VALUE_WEIGHT:
            continue
        slow_nodes.append(node_id)

    if slow_nodes:
        # Pick the slowest high-value node (highest pace_ratio)
        slowest = max(slow_nodes, key=lambda n: mean_pace_ratio(mastery.nodes[n]))
        slow_items = _items_for_nodes({slowest}, item_bank, recently_served)
        if slow_items:
            # Prefer in-band items for speed drill
            in_band = [
                iid for iid in slow_items
                if _in_learnable_band(
                    _item_predicted_success(iid, item_bank[iid], mastery, now_iso)
                )
            ]
            drill_item = in_band[0] if in_band else slow_items[0]
            pr = mean_pace_ratio(mastery.nodes[slowest])
            return NextAction(
                action="speed_drill",
                item_id=drill_item,
                reason=(
                    f"You are accurate but slow on '{slowest}' "
                    f"(pace {pr:.1f}x expected). "
                    f"At this pace you may not finish the paper. "
                    f"This is a high-weight area — speed here protects marks."
                ),
            )

    # -----------------------------------------------------------------------
    # Tier 4: Practice — highest base_priority learnable node
    # -----------------------------------------------------------------------
    scored: List[tuple] = []
    for iid in candidates:
        meta = item_bank[iid]
        p_success = _item_predicted_success(iid, meta, mastery, now_iso)
        avg_priority = _item_avg_priority(meta, mastery, now_iso)
        dist = _distance_to_band(p_success)
        part = _item_part(meta)
        same_part = (part is not None and part == last_served_part)

        # Score: higher base_priority is better; nudge for in-band and interleave
        score = (
            -avg_priority                              # primary: higher priority = lower score
            + dist * 0.2                               # secondary: mild nudge toward band
            - (0.05 if dist == 0.0 else 0.0)           # in-band bonus
            + (0.03 if same_part else 0.0)             # mild interleave penalty
        )
        scored.append((score, iid, p_success, avg_priority, dist))

    scored.sort(key=lambda x: x[0])
    best_score, best_id, best_p, best_priority, best_dist = scored[0]
    meta = item_bank[best_id]
    tests = meta.get("tests", [])

    # Build marks-framed reason
    if tests:
        node = tests[0]
        ep = _node_effective_p(node, mastery, now_iso)
        gain_approx = est_marks_gain(node, ep)
        pw = part_weight(node)
        pw_pct = int(round(pw * 100))
        reason = (
            f"High-weight area ({pw_pct}% of marks), ~{gain_approx:.1f} marks of headroom"
        )
        if best_dist > 0:
            reason += f"; predicted success {best_p:.0%} (near learnable band)"
        else:
            reason += f"; predicted success {best_p:.0%} (in learnable band)"
    else:
        reason = f"Highest priority available item (predicted success {best_p:.0%})"

    return NextAction(
        action="practice",
        item_id=best_id,
        reason=reason,
    )
