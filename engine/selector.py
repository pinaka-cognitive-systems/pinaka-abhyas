"""
selector.py — next-action selector.

Decision logic:

  1. If any reviews are due -> action = "review", item_id = first due item.
  2. Otherwise -> find the best fresh item from the item bank:
     a. Exclude recently served items (last_served set).
     b. For each candidate, compute predicted_success = P(correct | node mastery, difficulty).
     c. Prefer items in the target band [0.60, 0.80]: not too easy, not too hard.
     d. Among in-band items, prefer:
        - Items exercising weak nodes (lowest average node mastery).
        - Items exercising nodes touched by active misconceptions.
        - Interleave across topics (avoid same part as the last served item).
     e. If no in-band item exists, pick the candidate closest to the band.

Predicted success for an item:
  p_item = average of p_node for the item's tested nodes (using PRIOR_P=0.5
  for unseen nodes), then adjusted for difficulty:
    L1 -> multiply by 1.15 (clamped to 1.0)  [easier than median]
    L2 -> no adjustment
    L3 -> multiply by 0.75                    [harder than median]

Item bank format: {item_id: {"tests": [node_id, ...], "difficulty_label": "L1"|"L2"|"L3"}}
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Set

from .types import Event, MasteryState, NextAction, SchedulerState
from .scheduler import due_queue

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TARGET_LOW = 0.60
TARGET_HIGH = 0.80
PRIOR_P = 0.5

DIFFICULTY_ADJUSTMENT = {
    "L1": 1.15,
    "L2": 1.00,
    "L3": 0.75,
}

# Part prefixes — used for interleaving
PART_PREFIXES = {
    "qa.bmath": "bmath",
    "qa.lr": "lr",
    "qa.stats": "stats",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_p(node_id: str, mastery: MasteryState) -> float:
    nm = mastery.nodes.get(node_id)
    return nm.p if nm is not None else PRIOR_P


def _item_predicted_success(
    item_id: str,
    item_meta: Dict,
    mastery: MasteryState,
) -> float:
    """Predict P(student answers this item correctly)."""
    tests: List[str] = item_meta.get("tests", [])
    if not tests:
        return PRIOR_P
    avg_p = sum(_node_p(nid, mastery) for nid in tests) / len(tests)
    adj = DIFFICULTY_ADJUSTMENT.get(
        item_meta.get("difficulty_label", "L2").upper(), 1.0
    )
    return min(0.99, max(0.01, avg_p * adj))


def _item_part(item_meta: Dict) -> Optional[str]:
    """Return the part label for this item based on its node prefixes."""
    tests = item_meta.get("tests", [])
    for node_id in tests:
        for prefix, part in PART_PREFIXES.items():
            if node_id.startswith(prefix):
                return part
    return None


def _average_node_mastery(item_meta: Dict, mastery: MasteryState) -> float:
    """Average p across nodes tested by this item."""
    tests = item_meta.get("tests", [])
    if not tests:
        return PRIOR_P
    return sum(_node_p(nid, mastery) for nid in tests) / len(tests)


def _touches_active_misconception_nodes(
    item_meta: Dict,
    active_misconception_nodes: Set[str],
) -> bool:
    """True if any of the item's nodes are in the active-misconception node set."""
    return bool(set(item_meta.get("tests", [])) & active_misconception_nodes)


def _distance_to_band(p: float) -> float:
    """0 if in band, else distance to nearest band edge."""
    if TARGET_LOW <= p <= TARGET_HIGH:
        return 0.0
    return min(abs(p - TARGET_LOW), abs(p - TARGET_HIGH))


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
) -> NextAction:
    """
    Return the next action for the student.

    Parameters
    ----------
    mastery: current MasteryState
    scheduler_state: current SchedulerState
    item_bank: {item_id: {tests, difficulty_label}} — all available items
    now_iso: current datetime (ISO-8601) for due-date comparison
    recently_served: item ids served in this session (excluded from fresh picks)
    active_misconception_nodes: node ids linked to active misconceptions
    last_served_part: part label of the last served item (for interleaving)
    active_misconception_items: item ids whose last wrong answer was a
        misconception item (priority resurface)
    """
    recently_served = recently_served or set()
    active_misconception_nodes = active_misconception_nodes or set()
    active_misconception_items = active_misconception_items or set()

    # --- Step 1: check for due reviews ---
    due = due_queue(scheduler_state, now_iso, active_misconception_items)
    if due:
        first_due = due[0]
        return NextAction(
            action="review",
            item_id=first_due.item_id,
            reason=f"Review due: {first_due.item_id} (was due {first_due.due_at[:10]})",
        )

    # --- Step 2: pick a fresh item ---
    candidates = [iid for iid in item_bank if iid not in recently_served]

    if not candidates:
        return NextAction(
            action="practice",
            item_id=None,
            reason="No items available (all recently served or bank empty).",
        )

    # Score each candidate — lower score = better.
    #
    # Primary driver: avg_mastery (lower = weaker = higher priority to practice).
    # We negate it so that weaker nodes score lower (better).
    #
    # Band preference: items whose predicted success falls in [0.60, 0.80] get
    # a bonus (-0.3). Items far outside the band get a mild penalty, but this
    # is secondary — we still prefer a very weak node even if it's below band
    # over a strong node that happens to be in-band.
    #
    # This matches the spec: "weighted toward weak nodes and active
    # misconceptions, and interleaved across topics".
    scored: List[tuple] = []
    for iid in candidates:
        meta = item_bank[iid]
        p_success = _item_predicted_success(iid, meta, mastery)
        avg_mastery = _average_node_mastery(meta, mastery)
        dist = _distance_to_band(p_success)
        touches_mis = _touches_active_misconception_nodes(meta, active_misconception_nodes)
        part = _item_part(meta)
        same_part = (part is not None and part == last_served_part)

        # Lower score = preferred.
        score = (
            avg_mastery                            # primary: prefer weak nodes (lower p)
            + dist * 0.5                           # secondary: mild nudge toward band
            - (0.15 if dist == 0.0 else 0.0)       # in-band bonus
            - (0.1 if touches_mis else 0.0)        # misconception coverage bonus
            + (0.05 if same_part else 0.0)         # mild interleave penalty
        )
        scored.append((score, iid, p_success, avg_mastery, touches_mis, dist))

    scored.sort(key=lambda x: x[0])
    best_score, best_id, best_p, best_avg, best_mis, best_dist = scored[0]
    meta = item_bank[best_id]

    # Build reason
    reasons = []
    if best_dist == 0.0:
        reasons.append(f"predicted success {best_p:.0%} (in target band 60-80%)")
    else:
        reasons.append(f"predicted success {best_p:.0%} (closest to target band)")
    if best_mis:
        reasons.append("covers an active misconception")
    reasons.append(f"average node mastery {best_avg:.0%}")

    return NextAction(
        action="practice",
        item_id=best_id,
        reason="; ".join(reasons),
    )
