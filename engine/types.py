"""
types.py — shared data structures for the Pinaka headless engine.

All types are plain dataclasses (no third-party deps). They are the vocabulary
that flows between mastery.py, scheduler.py, selector.py, and readiness.py.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Event (mirrors the UQS event-log contract, fields we actually use)
# ---------------------------------------------------------------------------

@dataclass
class Event:
    """
    One answer event, as produced by the app and stored in the local event log.
    Corresponds to schema/core/event-log.schema.json (uqs-event-1).

    Only the fields the engine reads are included here; the rest are opaque.
    """
    event_id: str          # UUID string
    item_id: str           # pattern: (sd|vlt|arn)_<part>_<family>_<NNNNNN>
    tests: List[str]       # skill-node ids exercised by this item
    difficulty_label: str  # "L1", "L2", or "L3"
    mode: str              # "drill" | "review" | "mock" | "diagnostic"
    correct: bool
    selected_misconception: Optional[str]   # None when correct or unmatched
    occurred_at: str       # ISO-8601 datetime string, e.g. "2024-01-15T10:30:00Z"
    time_ms: int
    resurfaced: bool       # True if this was a spaced-rep resurface


# ---------------------------------------------------------------------------
# Node mastery
# ---------------------------------------------------------------------------

@dataclass
class NodeMastery:
    """
    Estimated probability of answering a fresh median-difficulty (L2) item on
    a given skill node correctly. All values are in [0, 1].

    Speed tracking (v2):
      pace_sum:   running sum of (time_ms / 1000) / expected_seconds ratios.
      pace_count: number of events with a valid expected_seconds that contributed.
      mean_pace_ratio = pace_sum / pace_count when pace_count > 0, else 1.0 (on-pace prior).
      pace_status: "on_pace" if mean_pace_ratio <= 1.0 else "slow".
    """
    node_id: str
    p: float               # current estimate, [0, 1]
    observations: int      # number of events that touched this node
    last_updated: str      # ISO-8601 datetime of the last update
    # Speed tracking (v2) — defaults keep v1 states valid
    pace_sum: float = 0.0
    pace_count: int = 0


@dataclass
class MasteryState:
    """
    Full mastery state for one student: per-node, plus a misconception tracker.
    Passed into and returned from mastery update functions.
    """
    nodes: Dict[str, NodeMastery] = field(default_factory=dict)
    # misconception_id -> list of (occurred_at_str, event_id)
    misconception_hits: Dict[str, List[Tuple[str, str]]] = field(default_factory=dict)


@dataclass
class MisconceptionSummary:
    misconception_id: str
    hit_count: int
    recency_score: float   # higher = more recent and frequent
    is_recurring: bool     # hit_count >= RECURRING_THRESHOLD


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------

@dataclass
class ItemSchedule:
    """
    SM-2-lite state for one item.
    """
    item_id: str
    interval_days: float   # current interval, in days
    ease: float            # ease factor, >= 1.3
    last_seen: str         # ISO-8601 datetime
    due_at: str            # ISO-8601 datetime (last_seen + interval)
    consecutive_correct: int = 0


@dataclass
class SchedulerState:
    items: Dict[str, ItemSchedule] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Selector output
# ---------------------------------------------------------------------------

@dataclass
class NextAction:
    action: str            # "review" | "practice" | "remediate_misconception" | "speed_drill"
    item_id: Optional[str]  # None when action == "review" without a specific item
    reason: str


# ---------------------------------------------------------------------------
# Readiness
# ---------------------------------------------------------------------------

@dataclass
class ReadinessEstimate:
    """
    Honest readiness output (v2 — score-driven, smart-attempt policy).

    is_estimate is always True by construction.
    label is in {insufficient_data, not_ready, borderline, on_track}.

    v2 additions:
      predicted_mark: under the smart-attempt policy (skip low-EV questions).
      naive_attempt_all_mark: expected score if all 100 questions are attempted.
      time_feasible: True if the student can attempt their chosen set within 120 min.
      est_minutes: estimated paper time in minutes under the policy.
      marks_lost_to_recurring_misconceptions: rough estimate of marks lost to
          active recurring misconceptions (labelled approximate).
      confidence: "low" | "medium" (never "high"; never false precision).
      note: short plain-English explanation of the estimate and caveats.
    """
    predicted_mark: Optional[float]   # None when insufficient_data
    low: Optional[float]              # lower bound of confidence band
    high: Optional[float]             # upper bound
    distance_to_pass: Optional[float] # predicted_mark - 40; None when insufficient
    label: str                        # insufficient_data | not_ready | borderline | on_track
    is_estimate: bool = True          # ALWAYS True; never remove this field
    # v2 fields
    naive_attempt_all_mark: Optional[float] = None   # expected score if all attempted
    time_feasible: Optional[bool] = None             # fits 120 min at current pace?
    est_minutes: Optional[float] = None              # estimated paper time
    marks_lost_to_recurring_misconceptions: Optional[float] = None  # rough estimate
    confidence: str = "low"                          # "low" | "medium"
    note: str = ""                                   # plain-English caveat
    assumption: str = (
        "v2: uses smart-attempt policy (skip if EV <= 0, i.e. P <= 0.2). "
        "predicted_mark is under this policy; naive_attempt_all_mark assumes all 100 attempted. "
        "Time feasibility capped at 120 min. Negative marking: -0.25 per wrong. "
        "Pass threshold: 40 / 100 (single-paper, Paper 3 only). "
        "All figures are estimates; parameters are provisional."
    )
