"""
value.py — exam value and base priority for score-driven next-action selection (v2).

Maps skill nodes to their mark-weight within CA Foundation Paper 3 QA and
computes how much headroom remains toward TARGET_MASTERY.

Constants (from blueprint.json and marking.json — provisional):
  Part weights:
    qa.bmath -> 0.40  (40 marks out of 100)
    qa.lr    -> 0.20  (20 marks out of 100)
    qa.stats -> 0.40  (40 marks out of 100)

  TARGET_MASTERY = 0.8  (provisional; where the engine aims to bring a node)

All numbers labelled "approximate" or "rough" in reason strings.
Parameters here are PROVISIONAL; real calibration comes from the beta cohort.

Exports
-------
part_weight(node_id) -> float
headroom(effective_p, target=TARGET_MASTERY) -> float
base_priority(node_id, effective_p) -> float
est_marks_gain(node_id, effective_p, n_inscope_nodes_in_part) -> float
"""
from __future__ import annotations

from typing import Dict, Optional

# ---------------------------------------------------------------------------
# Constants (cite: marking.json and blueprint.json)
# ---------------------------------------------------------------------------

PART_WEIGHTS: Dict[str, float] = {
    "qa.bmath": 0.40,
    "qa.lr":    0.20,
    "qa.stats": 0.40,
}

# Total marks per part (100 questions, 1 mark each, 40/20/40 split)
PART_MARKS: Dict[str, int] = {
    "qa.bmath": 40,
    "qa.lr":    20,
    "qa.stats": 40,
}

TARGET_MASTERY = 0.80  # provisional

# Known leaf-family node count per part (from blueprint.json).
# Used only for est_marks_gain; a rough approximation is fine.
N_FAMILIES_PER_PART: Dict[str, int] = {
    "qa.bmath": 8,   # ratio_indices_log, equations, inequalities, finance,
                     # permutations_combinations, sequence_series, sets_functions, calculus
    "qa.lr":    4,   # series_coding, direction_tests, seating, blood_relations
    "qa.stats": 6,   # data_representation, central_tendency_dispersion, probability,
                     # distributions, correlation_regression, index_numbers
}

DEFAULT_PART_WEIGHT = 0.33  # fallback for unknown prefixes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_part(node_id: str) -> Optional[str]:
    """Return the part prefix for a node id, or None if unrecognised."""
    for prefix in PART_WEIGHTS:
        if node_id.startswith(prefix):
            return prefix
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def part_weight(node_id: str) -> float:
    """
    Return the fraction of total exam marks this node's part is worth.

    qa.bmath -> 0.40, qa.lr -> 0.20, qa.stats -> 0.40.
    Unknown nodes return DEFAULT_PART_WEIGHT.
    """
    part = _node_part(node_id)
    if part is None:
        return DEFAULT_PART_WEIGHT
    return PART_WEIGHTS[part]


def headroom(effective_p: float, target: float = TARGET_MASTERY) -> float:
    """
    Return max(0, target - effective_p).

    A fully mastered node (p >= target) has headroom 0.
    The weakest possible node (p = 0.02) has headroom 0.78.
    """
    return max(0.0, target - effective_p)


def base_priority(node_id: str, effective_p: float) -> float:
    """
    Score-driven base priority: part_weight * headroom.

    Higher = more mark-improvement opportunity.
    Range: [0, 0.40] for bmath/stats, [0, 0.20] for lr.
    """
    return part_weight(node_id) * headroom(effective_p)


def est_marks_gain(
    node_id: str,
    effective_p: float,
    n_inscope_nodes_in_part: Optional[int] = None,
) -> float:
    """
    ROUGH estimate of expected additional marks from improving this node to
    TARGET_MASTERY, for use in reason strings only.

    Formula (approximate):
      gain = (part_marks / n_nodes_in_part) * 1.25 * headroom(effective_p)

    1.25 is the EV coefficient from the marking scheme (EV = 1.25*P - 0.25).
    All figures are rough; label this as approximate in reason strings.

    Parameters
    ----------
    node_id: skill node
    effective_p: current decayed mastery probability
    n_inscope_nodes_in_part: optional override; defaults to N_FAMILIES_PER_PART.
    """
    part = _node_part(node_id)
    if part is None:
        return 0.0
    n_nodes = n_inscope_nodes_in_part or N_FAMILIES_PER_PART.get(part, 1)
    marks_per_node = PART_MARKS[part] / max(1, n_nodes)
    h = headroom(effective_p)
    return marks_per_node * 1.25 * h
