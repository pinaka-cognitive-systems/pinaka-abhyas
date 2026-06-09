"""
engine — Pinaka headless engine prototype.

Exam-agnostic brain: reads UQS event-log records and produces per-node mastery,
per-misconception mastery, a spaced-repetition schedule, the next action, and an
honest readiness estimate. Python 3 stdlib only; no network or file I/O in core
logic.

Modules
-------
types       Shared data structures (Event, MasteryState, SchedulerState, etc.)
mastery     Elo-style per-node mastery and misconception tracking
scheduler   SM-2-lite spaced-repetition scheduling
selector    Next-action selection (review vs. fresh practice)
readiness   Honest readiness estimation with confidence band
synthetic   Synthetic student and event generator for testing

Usage
-----
from engine import mastery, scheduler, selector, readiness, synthetic
"""

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
