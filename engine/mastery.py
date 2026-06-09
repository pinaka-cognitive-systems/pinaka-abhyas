"""
mastery.py — per-node and per-misconception mastery estimation.

Algorithm: Elo-style update on the logit of p_node.

  logit(p) = log(p / (1 - p))
  Expected outcome E = difficulty_target(difficulty_label)
  Delta = K * (outcome - E)
  new_logit = old_logit + Delta
  new_p = sigmoid(new_logit)

Difficulty targets (probability a median student gets it right):
  L1 (easy)   -> 0.85
  L2 (medium) -> 0.65   <- the "median-difficulty" anchor
  L3 (hard)   -> 0.45

K-factor = 0.25 (chosen to be stable but responsive; one event moves p by
at most ~6 percentage points from the midpoint, matching the rough calibration
pace of SM-2).

A "surprising" outcome (correct on L3, wrong on L1) uses K_SURPRISE = 0.40,
so the estimate reacts more strongly to informative events.

Prior: every unseen node starts at p=0.5 (maximum uncertainty) with 0
observations. Aggregation uses observation-count-weighted averaging with a
low-confidence prior contribution of 0.5 weighted as 2 pseudo-observations,
so new nodes with 1-2 real events are pulled toward the prior.

Misconception recency weight: exponential decay with half-life = 14 days.
A misconception is "recurring" if it has been seen >= 3 times AND its
recency_score >= 0.5 (meaning at least one hit within ~14 days at full weight).
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

from .types import Event, MasteryState, MisconceptionSummary, NodeMastery

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PRIOR_P = 0.5          # starting p for an unseen node
PRIOR_WEIGHT = 2.0     # pseudo-observation count for the prior

K_NORMAL = 0.25        # Elo K-factor for expected outcomes
K_SURPRISE = 0.40      # K-factor for surprising outcomes

# Difficulty -> expected P(correct) for a student at the median
DIFFICULTY_TARGETS: Dict[str, float] = {
    "L1": 0.85,
    "L2": 0.65,
    "L3": 0.45,
}
DEFAULT_DIFFICULTY_TARGET = 0.65  # fallback for unknown labels

RECURRING_THRESHOLD_COUNT = 3    # min hits to call a misconception "recurring"
RECURRING_THRESHOLD_RECENCY = 0.5  # min recency score

MISCONCEPTION_HALF_LIFE_DAYS = 14.0  # decay half-life for recency weighting


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _logit(p: float) -> float:
    p = max(1e-6, min(1 - 1e-6, p))
    return math.log(p / (1.0 - p))


def _sigmoid(x: float) -> float:
    # Numerically stable sigmoid
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    else:
        e = math.exp(x)
        return e / (1.0 + e)


def _difficulty_target(label: str) -> float:
    return DIFFICULTY_TARGETS.get(label.upper() if label else "", DEFAULT_DIFFICULTY_TARGET)


def _is_surprising(correct: bool, difficulty_label: str) -> bool:
    """True if correct on L3 or wrong on L1 (the extremes of surprise)."""
    label = (difficulty_label or "").upper()
    return (correct and label == "L3") or (not correct and label == "L1")


def _isostr_to_epoch_days(iso: str) -> float:
    """
    Convert an ISO-8601 datetime string to days since epoch.
    Handles 'Z' suffix and '+00:00' offset. Stdlib only.
    """
    # Normalise: replace Z with +00:00, then strip offset for simplicity
    s = iso.strip().replace("Z", "+00:00")
    # datetime.fromisoformat handles +00:00 in Python 3.7+
    import datetime
    try:
        dt = datetime.datetime.fromisoformat(s)
    except ValueError:
        # Fallback: try without offset
        dt = datetime.datetime.fromisoformat(s[:19])
    # Return as a float in days (UTC seconds / 86400)
    return dt.timestamp() / 86400.0


def _recency_weight(event_iso: str, reference_iso: str) -> float:
    """Exponential decay weight: w = 2^(-|delta_days| / half_life)."""
    e_days = _isostr_to_epoch_days(event_iso)
    r_days = _isostr_to_epoch_days(reference_iso)
    delta = abs(r_days - e_days)
    return 2.0 ** (-delta / MISCONCEPTION_HALF_LIFE_DAYS)


# ---------------------------------------------------------------------------
# Node mastery update
# ---------------------------------------------------------------------------

def update_node_mastery(
    state: MasteryState,
    event: Event,
) -> MasteryState:
    """
    Return a new MasteryState after applying one event.

    For each node in event.tests, apply the Elo-style logit update.
    Pure function: returns a new state, does not mutate the input.
    """
    # Shallow-copy nodes dict; we'll replace individual NodeMastery objects
    new_nodes: Dict[str, NodeMastery] = dict(state.nodes)

    target = _difficulty_target(event.difficulty_label)
    outcome = 1.0 if event.correct else 0.0
    k = K_SURPRISE if _is_surprising(event.correct, event.difficulty_label) else K_NORMAL

    for node_id in event.tests:
        existing = new_nodes.get(node_id)
        if existing is None:
            p_old = PRIOR_P
            obs_old = 0
        else:
            p_old = existing.p
            obs_old = existing.observations

        # Elo update on logit
        new_logit = _logit(p_old) + k * (outcome - target)
        new_p = _sigmoid(new_logit)
        # Clamp to sensible range
        new_p = max(0.02, min(0.98, new_p))

        new_nodes[node_id] = NodeMastery(
            node_id=node_id,
            p=new_p,
            observations=obs_old + 1,
            last_updated=event.occurred_at,
        )

    return MasteryState(
        nodes=new_nodes,
        misconception_hits=state.misconception_hits,
    )


def update_misconceptions(
    state: MasteryState,
    event: Event,
) -> MasteryState:
    """
    Record a misconception hit when the event was wrong and has a
    selected_misconception. Pure function.
    """
    if event.correct or not event.selected_misconception:
        return state  # nothing to record

    misconception_id = event.selected_misconception
    existing_hits = list(state.misconception_hits.get(misconception_id, []))
    existing_hits.append((event.occurred_at, event.event_id))

    new_hits = dict(state.misconception_hits)
    new_hits[misconception_id] = existing_hits

    return MasteryState(
        nodes=state.nodes,
        misconception_hits=new_hits,
    )


def apply_event(state: MasteryState, event: Event) -> MasteryState:
    """Apply one event: update nodes then misconceptions."""
    state = update_node_mastery(state, event)
    state = update_misconceptions(state, event)
    return state


def apply_events(events: List[Event]) -> MasteryState:
    """Apply a sequence of events to a fresh state and return the result."""
    state = MasteryState()
    for event in sorted(events, key=lambda e: e.occurred_at):
        state = apply_event(state, event)
    return state


# ---------------------------------------------------------------------------
# Aggregation: leaf -> family -> part
# ---------------------------------------------------------------------------

def _weighted_p(node_masteries: List[NodeMastery]) -> float:
    """
    Weighted average of node p values. Nodes with more observations contribute
    more; a shared prior of weight PRIOR_WEIGHT at PRIOR_P anchors the result
    when data is sparse.
    """
    if not node_masteries:
        return PRIOR_P
    total_weight = PRIOR_WEIGHT
    total_p = PRIOR_WEIGHT * PRIOR_P
    for nm in node_masteries:
        w = nm.observations
        total_weight += w
        total_p += w * nm.p
    return total_p / total_weight


def aggregate_by_prefix(state: MasteryState) -> Dict[str, float]:
    """
    Return a dict of {prefix: p} aggregated from leaf nodes.

    Prefixes covered: "qa.bmath", "qa.lr", "qa.stats" (parts), plus any
    two-level family prefix like "qa.bmath.finance".

    Aggregation is observation-weighted with a prior, so unseen sub-trees
    are pulled toward 0.5 rather than being absent.
    """
    from collections import defaultdict
    buckets: Dict[str, List[NodeMastery]] = defaultdict(list)

    for node_id, nm in state.nodes.items():
        parts = node_id.split(".")
        # Add to every ancestor prefix (e.g. "qa.bmath.finance.ci" goes into
        # "qa", "qa.bmath", "qa.bmath.finance", "qa.bmath.finance.ci")
        for i in range(1, len(parts) + 1):
            prefix = ".".join(parts[:i])
            buckets[prefix].append(nm)

    return {prefix: _weighted_p(nms) for prefix, nms in buckets.items()}


# ---------------------------------------------------------------------------
# Misconception ranking
# ---------------------------------------------------------------------------

def ranked_misconceptions(
    state: MasteryState,
    reference_iso: str,
) -> List[MisconceptionSummary]:
    """
    Return misconceptions ranked by recency_score descending.

    recency_score = sum of exponential-decay weights for each hit, so a
    misconception triggered 3 times this week scores higher than one
    triggered 10 times a year ago.
    """
    results: List[MisconceptionSummary] = []
    for mid, hits in state.misconception_hits.items():
        count = len(hits)
        score = sum(
            _recency_weight(occurred_at, reference_iso)
            for occurred_at, _ in hits
        )
        is_recurring = (
            count >= RECURRING_THRESHOLD_COUNT
            and score >= RECURRING_THRESHOLD_RECENCY
        )
        results.append(MisconceptionSummary(
            misconception_id=mid,
            hit_count=count,
            recency_score=score,
            is_recurring=is_recurring,
        ))

    results.sort(key=lambda m: m.recency_score, reverse=True)
    return results
