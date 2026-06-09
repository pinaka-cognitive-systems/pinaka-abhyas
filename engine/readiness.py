"""
readiness.py — honest readiness estimation for CA Foundation Paper 3 QA (v2).

Sources:
  marking.json:  +1 correct, -0.25 wrong, 0 unattempted; 100 questions; pass=40
  blueprint.json: parts qa.bmath (40 q), qa.lr (20 q), qa.stats (40 q)

v2 design — three improvements over v1:

1. Smart-attempt policy (negative-marking awareness)
   Per-question expected value: EV = 1.25 * P - 0.25.
   Attempt if EV > 0 (i.e. P > 0.20); else skip (contributes 0).
   predicted_mark is the sum of EV over the attempted set.
   naive_attempt_all_mark is the same sum assuming all 100 are attempted
   (for comparison, to show the value of skipping low-P questions).

2. Time feasibility (120-min budget)
   Estimated paper time = sum over attempted questions of:
     student's measured pace_ratio (mean_pace_ratio from mastery) * expected_seconds
   If this exceeds 120 min, greedily keep the highest-EV questions that fit,
   drop the rest. Predicted mark is recomputed over the feasible set.
   Returns time_feasible (bool), est_minutes, and the adjusted predicted_mark.

3. Honest band (coarse, round, always is_estimate)
   Round predicted_mark to int; band to nearest 5.
   confidence in {low, medium} only — never high.
   insufficient_data when total_events < MIN_EVENTS or band_width > MAX_BAND_WIDTH.
   is_estimate always True.
   marks_lost_to_recurring_misconceptions: rough estimate surfaced for coaching.

All parameters are PROVISIONAL. Real calibration comes from the beta cohort.

Honesty constraints (must never be removed):
  MIN_EVENTS = 20     (fewer -> insufficient_data)
  MAX_BAND_WIDTH = 30 (wider -> insufficient_data)
  is_estimate always True
  confidence never "high"
  predicted_mark and band rounded (coarse, not false-precise)
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

from .mastery import (
    effective_p as mastery_effective_p,
    effective_p_for_unseen,
    mean_pace_ratio,
    ranked_misconceptions,
)
from .types import MasteryState, ReadinessEstimate

# ---------------------------------------------------------------------------
# CA Foundation Paper 3 constants (from marking.json and blueprint.json)
# ---------------------------------------------------------------------------

MARKS_PER_CORRECT = 1.0
NEGATIVE_PER_WRONG = 0.25
NUM_QUESTIONS = 100
PASS_MARK = 40.0
PAPER_MINUTES = 120.0  # exam time budget

PARTS: Dict[str, int] = {
    "qa.bmath": 40,   # questions
    "qa.lr": 20,
    "qa.stats": 40,
}

# Expected seconds per difficulty level (from spec: L1=45, L2=75, L3=110)
EXPECTED_SECONDS_BY_DIFFICULTY: Dict[str, float] = {
    "L1": 45.0,
    "L2": 75.0,
    "L3": 110.0,
}
DEFAULT_EXPECTED_SECONDS = 75.0  # L2 default

PRIOR_P = 0.5

# ---------------------------------------------------------------------------
# Confidence band constants (provisional)
# ---------------------------------------------------------------------------

BASE_WIDTH = 25.0        # base band half-width (at 1 event, full uncertainty)
MIN_EVENTS = 20          # minimum events before we give a number
MAX_BAND_WIDTH = 30.0    # above this, return insufficient_data

# Known families (for coverage fraction)
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

def _total_events(mastery: MasteryState) -> int:
    return sum(nm.observations for nm in mastery.nodes.values())


def _node_coverage_fraction(mastery: MasteryState) -> float:
    """Fraction of known families that have at least one observation."""
    if not KNOWN_FAMILIES:
        return 0.0
    seen = sum(
        1 for f in KNOWN_FAMILIES
        if any(nid.startswith(f) or nid == f for nid in mastery.nodes)
    )
    return seen / len(KNOWN_FAMILIES)


def _band_half_width(total_events: int, coverage: float) -> float:
    """Half-width of confidence band. Shrinks with events; widens with low coverage."""
    coverage_penalty = max(1.0, 3.0 - coverage * 2.0)
    return (BASE_WIDTH / math.sqrt(max(1, total_events))) * coverage_penalty


def _part_effective_p(part_prefix: str, mastery: MasteryState, now_iso: str) -> float:
    """
    Observation-weighted average of decayed effective_p for nodes in this part.
    Includes a prior of weight 2 at 0.5 for unseen nodes.
    """
    relevant = [
        nm for node_id, nm in mastery.nodes.items()
        if node_id.startswith(part_prefix + ".") or node_id == part_prefix
    ]
    if not relevant:
        return PRIOR_P
    total_obs = 2.0  # prior weight
    total_p = 2.0 * PRIOR_P
    for nm in relevant:
        ep = mastery_effective_p(nm, now_iso)
        total_obs += nm.observations
        total_p += nm.observations * ep
    return total_p / total_obs


def _part_mean_pace_ratio(part_prefix: str, mastery: MasteryState) -> float:
    """
    Average measured pace_ratio for nodes in this part.
    Returns 1.0 (on-pace prior) if no speed data is available.
    """
    relevant = [
        nm for node_id, nm in mastery.nodes.items()
        if node_id.startswith(part_prefix + ".") or node_id == part_prefix
    ]
    total_pace_sum = 0.0
    total_pace_count = 0
    for nm in relevant:
        total_pace_sum += nm.pace_sum
        total_pace_count += nm.pace_count
    if total_pace_count == 0:
        return 1.0
    return total_pace_sum / total_pace_count


def _ev(p: float) -> float:
    """Expected value per question: EV = 1.25 * P - 0.25."""
    return 1.25 * p - 0.25


def _round_to_nearest_5(x: float) -> int:
    """Round to nearest 5 (for band endpoints)."""
    return int(round(x / 5.0) * 5)


# ---------------------------------------------------------------------------
# Per-question plan: smart-attempt policy + time feasibility
# ---------------------------------------------------------------------------

def _build_question_plan(
    mastery: MasteryState,
    now_iso: str,
    item_bank: Optional[Dict] = None,
) -> Tuple[List[Dict], float, float]:
    """
    Build a list of question-level decisions under the v2 smart-attempt policy.

    Returns
    -------
    questions: list of dicts with keys:
        part, p, ev, attempted (bool), expected_secs, pace_ratio, est_secs
    naive_mark: expected mark if all 100 questions attempted
    policy_mark: expected mark under attempt-if-EV>0 policy (before time cap)
    """
    questions = []

    for part_prefix, n_q in PARTS.items():
        p = _part_effective_p(part_prefix, mastery, now_iso)
        ev = _ev(p)
        pace_ratio = _part_mean_pace_ratio(part_prefix, mastery)

        # Representative expected seconds for this part (use L2 default)
        exp_sec = DEFAULT_EXPECTED_SECONDS
        est_secs = pace_ratio * exp_sec

        attempted = ev > 0  # attempt if EV > 0, i.e. P > 0.20

        for _ in range(n_q):
            questions.append({
                "part": part_prefix,
                "p": p,
                "ev": ev,
                "attempted": attempted,
                "expected_secs": exp_sec,
                "pace_ratio": pace_ratio,
                "est_secs": est_secs,
            })

    naive_mark = sum(q["ev"] for q in questions)
    policy_mark = sum(q["ev"] for q in questions if q["attempted"])

    return questions, naive_mark, policy_mark


def _apply_time_cap(
    questions: List[Dict],
    budget_minutes: float = PAPER_MINUTES,
) -> Tuple[List[Dict], float, float, float]:
    """
    If estimated paper time exceeds budget, greedily drop lowest-EV attempted
    questions until the time fits.

    Returns
    -------
    questions: with 'attempted' possibly set to False for dropped items
    pre_cap_minutes: estimated paper time BEFORE dropping any questions.
        Used for time_feasible and est_minutes reporting.
    post_cap_minutes: estimated paper time after the cap (not exposed).
    policy_mark: expected mark over the feasible set
    """
    budget_secs = budget_minutes * 60.0

    # Separate attempted from skipped
    attempted = [q for q in questions if q["attempted"]]

    total_secs = sum(q["est_secs"] for q in attempted)
    pre_cap_minutes = total_secs / 60.0

    if total_secs <= budget_secs:
        # Fits already
        mark = sum(q["ev"] for q in attempted)
        return questions, pre_cap_minutes, total_secs / 60.0, mark

    # Over budget: drop lowest-EV attempted questions until we fit
    # Sort attempted by EV ascending so we drop the weakest first
    attempted_sorted = sorted(attempted, key=lambda q: q["ev"])

    dropped_ids: set = set()
    i = 0
    while total_secs > budget_secs and i < len(attempted_sorted):
        q = attempted_sorted[i]
        total_secs -= q["est_secs"]
        dropped_ids.add(id(q))
        i += 1

    # Rebuild questions list with dropped items marked as not attempted
    new_questions = []
    for q in questions:
        if id(q) in dropped_ids:
            new_q = dict(q)
            new_q["attempted"] = False
            new_questions.append(new_q)
        else:
            new_questions.append(q)

    mark = sum(q["ev"] for q in new_questions if q["attempted"])
    return new_questions, pre_cap_minutes, total_secs / 60.0, mark


# ---------------------------------------------------------------------------
# Marks lost to recurring misconceptions (rough estimate for coaching)
# ---------------------------------------------------------------------------

def _marks_lost_to_misconceptions(mastery: MasteryState, now_iso: str) -> float:
    """
    Rough estimate of marks lost per paper to active recurring misconceptions.

    For each recurring misconception, we assume it causes roughly 1-2 wrong
    answers per part session. We use the misconception recency_score as a
    proxy for frequency and scale by 0.25 (the negative marking penalty).

    This is approximate; label it as such in outputs.
    """
    ranked = ranked_misconceptions(mastery, reference_iso=now_iso)
    total = 0.0
    for ms in ranked:
        if ms.is_recurring:
            # Estimate: recency_score roughly correlates with recent hit rate.
            # Multiply by 1.25 (EV cost: -0.25 wrong + missed +1 = -1.25 net swing).
            total += ms.recency_score * 1.25
    # Cap at a plausible upper bound
    return min(total, 20.0)


# ---------------------------------------------------------------------------
# Main readiness function (v2)
# ---------------------------------------------------------------------------

def estimate_readiness(
    mastery: MasteryState,
    now_iso: str = "2024-01-15T09:00:00+00:00",
    item_bank: Optional[Dict] = None,
) -> ReadinessEstimate:
    """
    Compute an honest v2 readiness estimate from current mastery state.

    Parameters
    ----------
    mastery: current MasteryState
    now_iso: current datetime (ISO-8601) for time-decay and due-date calc.
        Defaults to a fixed date so tests without a clock still work.
    item_bank: optional item bank for per-item expected_seconds lookup.
        When None, the L2 default (75 s) is used for all questions.

    Returns ReadinessEstimate with is_estimate always True.
    """
    n_events = _total_events(mastery)
    coverage = _node_coverage_fraction(mastery)

    # --- Insufficient data gate ---
    if n_events < MIN_EVENTS:
        return ReadinessEstimate(
            predicted_mark=None,
            low=None,
            high=None,
            distance_to_pass=None,
            label="insufficient_data",
            is_estimate=True,
            naive_attempt_all_mark=None,
            time_feasible=None,
            est_minutes=None,
            marks_lost_to_recurring_misconceptions=None,
            confidence="low",
            note=(
                f"Fewer than {MIN_EVENTS} events recorded. "
                "Keep practising — a number will appear once there is enough data."
            ),
        )

    # --- Build question plan ---
    questions, naive_mark, policy_mark_before_cap = _build_question_plan(
        mastery, now_iso, item_bank
    )

    # --- Time feasibility ---
    # pre_cap_minutes: estimated time to attempt all EV-positive questions.
    # time_feasible = True if the student can attempt them all within budget.
    # policy_mark is recomputed over the capped set if the budget is exceeded.
    questions_capped, pre_cap_minutes, _post_cap_minutes, policy_mark = _apply_time_cap(questions)
    time_feasible = pre_cap_minutes <= PAPER_MINUTES
    est_minutes = pre_cap_minutes  # report the pre-cap estimate to the app

    # --- Clamp marks to physical range ---
    naive_mark = max(-25.0, min(100.0, naive_mark))
    policy_mark = max(-25.0, min(100.0, policy_mark))

    # --- Confidence band ---
    hw_raw = _band_half_width(n_events, coverage)
    band_width = hw_raw * 2.0

    if band_width > MAX_BAND_WIDTH:
        return ReadinessEstimate(
            predicted_mark=None,
            low=None,
            high=None,
            distance_to_pass=None,
            label="insufficient_data",
            is_estimate=True,
            naive_attempt_all_mark=int(round(naive_mark)),
            time_feasible=time_feasible,
            est_minutes=round(est_minutes, 1),
            marks_lost_to_recurring_misconceptions=round(
                _marks_lost_to_misconceptions(mastery, now_iso), 1
            ),
            confidence="low",
            note=(
                "Data is thin — the confidence band is too wide to give a useful number. "
                "Keep practising to narrow it."
            ),
        )

    # --- Coarse rounding (honest precision) ---
    predicted_mark_int = int(round(policy_mark))
    low_raw = max(-25.0, policy_mark - hw_raw)
    high_raw = min(100.0, policy_mark + hw_raw)

    low_banded = _round_to_nearest_5(low_raw)
    high_banded = _round_to_nearest_5(high_raw)

    # Ensure band doesn't collapse due to rounding
    if high_banded <= low_banded:
        high_banded = low_banded + 5

    distance = policy_mark - PASS_MARK

    # --- Label (tied to band vs. pass threshold) ---
    if low_banded >= PASS_MARK:
        label = "on_track"
    elif high_banded < PASS_MARK:
        label = "not_ready"
    else:
        label = "borderline"

    # --- Confidence level ---
    confidence = "medium" if n_events >= 50 and coverage >= 0.5 else "low"

    # --- Marks lost to misconceptions ---
    marks_lost = round(_marks_lost_to_misconceptions(mastery, now_iso), 1)

    # --- Note ---
    skip_count = sum(1 for q in questions_capped if not q["attempted"])
    note_parts = []
    if skip_count > 0:
        note_parts.append(
            f"Smart-attempt policy skips ~{skip_count} low-probability questions "
            f"(EV <= 0); this protects against negative marking."
        )
    if not time_feasible:
        note_parts.append(
            f"At your current pace ({est_minutes:.0f} min estimated), "
            f"you may not finish. Speed practice on slow nodes can help."
        )
    if marks_lost > 0:
        note_parts.append(
            f"~{marks_lost:.1f} marks may be lost to recurring misconceptions."
        )
    note_parts.append("All figures are estimates; parameters are provisional.")
    note = " ".join(note_parts)

    return ReadinessEstimate(
        predicted_mark=float(predicted_mark_int),
        low=float(low_banded),
        high=float(high_banded),
        distance_to_pass=round(distance, 1),
        label=label,
        is_estimate=True,
        naive_attempt_all_mark=float(int(round(naive_mark))),
        time_feasible=time_feasible,
        est_minutes=round(est_minutes, 1),
        marks_lost_to_recurring_misconceptions=marks_lost,
        confidence=confidence,
        note=note,
    )
