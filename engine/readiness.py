"""
readiness.py — honest readiness estimation for CA Foundation Paper 3 QA.

Sources:
  marking.json:  +1 correct, -0.25 wrong, 0 unattempted; 100 questions; pass=40
  blueprint.json: parts qa.bmath (40 q), qa.lr (20 q), qa.stats (40 q)

Formula (assuming student attempts all 100 questions):
  For each question i with P_correct_i:
    contribution_i = P_correct_i * 1 + (1 - P_correct_i) * (-0.25)
                   = P_correct_i - 0.25 * (1 - P_correct_i)
                   = 1.25 * P_correct_i - 0.25

  Expected score = sum over all 100 questions of contribution_i

For each part, P_correct for a question on a given node is taken from the
node mastery aggregated to part level. If no node data exists for a part,
the prior P = 0.5 is used.

Confidence band:
  width = BASE_WIDTH / sqrt(max(1, total_events)) * COVERAGE_PENALTY
  where COVERAGE_PENALTY = max(1.0, 3.0 - node_coverage_fraction * 2.0)
  (fewer nodes covered -> wider band)

Thresholds for label (applied to the band, not just the point estimate):
  - insufficient_data: total_events < MIN_EVENTS or band_width > MAX_BAND_WIDTH
  - not_ready:    high < 40   (even the optimistic end is below pass)
  - borderline:   low < 40 <= high   (pass is within the band)
  - on_track:     low >= 40  (even the pessimistic end clears pass)

All outputs carry is_estimate=True. The predicted_mark, low, high, and
distance_to_pass are None when label == insufficient_data.

Honesty constraints hard-coded here:
  MIN_EVENTS = 20     (fewer -> insufficient_data)
  MAX_BAND_WIDTH = 30 (wider band -> insufficient_data even if events >= 20)
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional

from .types import MasteryState, ReadinessEstimate

# ---------------------------------------------------------------------------
# CA Foundation Paper 3 constants (from marking.json and blueprint.json)
# ---------------------------------------------------------------------------

MARKS_PER_CORRECT = 1.0
NEGATIVE_PER_WRONG = 0.25
NUM_QUESTIONS = 100
PASS_MARK = 40.0

PARTS = {
    "qa.bmath": 40,   # questions
    "qa.lr": 20,
    "qa.stats": 40,
}

PRIOR_P = 0.5

# ---------------------------------------------------------------------------
# Confidence band constants
# ---------------------------------------------------------------------------

BASE_WIDTH = 25.0        # base band half-width (at 1 event, full uncertainty)
MIN_EVENTS = 20          # minimum events before we give a number
MAX_BAND_WIDTH = 30.0    # above this, return insufficient_data

# All known leaf node ids (used for coverage fraction). In production, this
# comes from the taxonomy. Here we enumerate the families from blueprint.json.
KNOWN_FAMILIES = {
    "qa.bmath.ratio_indices_log",
    "qa.bmath.equations",
    "qa.bmath.inequalities",
    "qa.bmath.finance",
    "qa.bmath.permutations_combinations",
    "qa.bmath.sequence_series",
    "qa.bmath.sets_functions",
    "qa.bmath.calculus",
    "qa.lr.series_coding",
    "qa.lr.direction_tests",
    "qa.lr.seating",
    "qa.lr.blood_relations",
    "qa.stats.data_representation",
    "qa.stats.central_tendency_dispersion",
    "qa.stats.probability",
    "qa.stats.distributions",
    "qa.stats.correlation_regression",
    "qa.stats.index_numbers",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _part_p(part_prefix: str, mastery: MasteryState) -> float:
    """
    Average P(correct) across all nodes belonging to this part.
    Observation-weighted, with the prior applied for unseen nodes.
    """
    relevant = [
        nm for node_id, nm in mastery.nodes.items()
        if node_id.startswith(part_prefix + ".")
        or node_id == part_prefix
    ]
    if not relevant:
        return PRIOR_P
    total_obs = sum(nm.observations for nm in relevant) + 2.0  # +2 prior weight
    total_p = 2.0 * PRIOR_P + sum(nm.observations * nm.p for nm in relevant)
    return total_p / total_obs


def _expected_contribution(p: float) -> float:
    """
    Expected marks contribution per question given P(correct) = p,
    assuming the student attempts (no skipping).
    """
    return MARKS_PER_CORRECT * p + (-NEGATIVE_PER_WRONG) * (1.0 - p)


def _total_events(mastery: MasteryState) -> int:
    return sum(nm.observations for nm in mastery.nodes.values())


def _node_coverage_fraction(mastery: MasteryState) -> float:
    """Fraction of known families that have at least one observation."""
    if not KNOWN_FAMILIES:
        return 0.0
    seen = sum(
        1 for f in KNOWN_FAMILIES
        if any(
            nid.startswith(f) or nid == f
            for nid in mastery.nodes
        )
    )
    return seen / len(KNOWN_FAMILIES)


def _band_half_width(total_events: int, coverage: float) -> float:
    """
    Half-width of the confidence band in mark units.
    Shrinks with more events; widens when coverage is low.
    """
    coverage_penalty = max(1.0, 3.0 - coverage * 2.0)
    hw = (BASE_WIDTH / math.sqrt(max(1, total_events))) * coverage_penalty
    return hw


# ---------------------------------------------------------------------------
# Main readiness function
# ---------------------------------------------------------------------------

def estimate_readiness(mastery: MasteryState) -> ReadinessEstimate:
    """
    Compute an honest readiness estimate from current mastery state.

    Returns ReadinessEstimate with is_estimate always True.
    """
    n_events = _total_events(mastery)
    coverage = _node_coverage_fraction(mastery)

    # Insufficient data: not enough events
    if n_events < MIN_EVENTS:
        return ReadinessEstimate(
            predicted_mark=None,
            low=None,
            high=None,
            distance_to_pass=None,
            label="insufficient_data",
            is_estimate=True,
        )

    # Compute expected mark
    expected_mark = 0.0
    for part_prefix, n_questions in PARTS.items():
        p = _part_p(part_prefix, mastery)
        expected_mark += _expected_contribution(p) * n_questions

    # Clamp to physically possible range
    # Worst case: all 100 wrong -> -25; best case: all right -> +100
    expected_mark = max(-25.0, min(100.0, expected_mark))

    hw = _band_half_width(n_events, coverage)
    band_width = hw * 2.0

    # Check if band is still too wide to be useful
    if band_width > MAX_BAND_WIDTH:
        return ReadinessEstimate(
            predicted_mark=None,
            low=None,
            high=None,
            distance_to_pass=None,
            label="insufficient_data",
            is_estimate=True,
        )

    low = max(-25.0, expected_mark - hw)
    high = min(100.0, expected_mark + hw)
    distance = expected_mark - PASS_MARK

    # Label tied to band vs. pass threshold
    if low >= PASS_MARK:
        label = "on_track"
    elif high < PASS_MARK:
        label = "not_ready"
    else:
        label = "borderline"

    return ReadinessEstimate(
        predicted_mark=round(expected_mark, 2),
        low=round(low, 2),
        high=round(high, 2),
        distance_to_pass=round(distance, 2),
        label=label,
        is_estimate=True,
    )
