"""
engine — Pinaka headless engine v2 (score-driven).

Reads UQS event-log records and produces per-node mastery with time-decay,
per-node speed tracking, per-misconception mastery, a spaced-repetition
schedule, a score-driven next action in 4-tier priority, and an honest
readiness estimate with smart-attempt policy and time feasibility.

Python 3 stdlib only; no network or file I/O in core logic.

Modules
-------
types       Shared data structures (Event, MasteryState, SchedulerState, etc.)
mastery     Elo-style mastery, time-decay (effective_p), speed (pace_ratio)
scheduler   SM-2-lite spaced-repetition scheduling (unchanged from v1)
value       Exam-value helpers: part_weight, headroom, base_priority
selector    4-tier score-driven next-action selection
readiness   Honest v2 readiness: smart-attempt policy, time feasibility
synthetic   Synthetic student and event generator (v2: realistic time_ms)

Usage
-----
from engine import mastery, scheduler, value, selector, readiness, synthetic
"""

try:
    from .types import (
        Event,
        ItemSchedule,
        MasteryState,
        MisconceptionSummary,
        NextAction,
        NodeMastery,
        ReadinessEstimate,
        SchedulerState,
    )
except ImportError:
    # Loaded as a standalone file (e.g. by pytest's importtestmodule during
    # test discovery). Fall back to absolute import using engine.types which
    # is registered via the conftest MetaPathFinder.
    from engine.types import (  # noqa: F401
        Event,
        ItemSchedule,
        MasteryState,
        MisconceptionSummary,
        NextAction,
        NodeMastery,
        ReadinessEstimate,
        SchedulerState,
    )

__all__ = [
    "Event",
    "ItemSchedule",
    "MasteryState",
    "MisconceptionSummary",
    "NextAction",
    "NodeMastery",
    "ReadinessEstimate",
    "SchedulerState",
]
