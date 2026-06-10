"""
scheduler.py — SM-2-lite spaced-repetition scheduler.

Algorithm (SM-2-lite):

  On correct answer:
    consecutive_correct += 1
    if consecutive_correct == 1:  interval = 1 day
    elif consecutive_correct == 2: interval = 6 days
    else: interval = round(prev_interval * ease)
    ease = max(EASE_MIN, ease + 0.1)    # reward for correct

  On wrong answer:
    consecutive_correct = 0
    interval = LAPSE_INTERVAL (1 day default, shorter for priority items)
    ease = max(EASE_MIN, ease - 0.20)   # penalise

  due_at = last_seen + interval (in days)

Priority boost for wrong items and items touching active misconceptions:
  These items use LAPSE_INTERVAL_PRIORITY (0.5 days) instead of 1 day,
  making them come up sooner after a lapse.

New items (not yet in SchedulerState) are treated as immediately due.

Constants:
  EASE_START     = 2.5  (SM-2 default)
  EASE_MIN       = 1.3
  LAPSE_INTERVAL = 1.0  (days)
  LAPSE_INTERVAL_PRIORITY = 0.5  (days, for wrong+misconception items)
"""
from __future__ import annotations

import datetime
from typing import Dict, List, Optional, Set

from .types import Event, ItemSchedule, SchedulerState

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EASE_START = 2.5
EASE_MIN = 1.3
EASE_CORRECT_BONUS = 0.1
EASE_WRONG_PENALTY = 0.20

LAPSE_INTERVAL = 1.0           # days after a wrong answer
LAPSE_INTERVAL_PRIORITY = 0.5  # days for high-priority wrong answers

INITIAL_INTERVALS = {1: 1.0, 2: 6.0}  # consecutive_correct -> interval (days)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_iso(iso: str) -> datetime.datetime:
    s = iso.strip().replace("Z", "+00:00")
    try:
        return datetime.datetime.fromisoformat(s)
    except ValueError:
        return datetime.datetime.fromisoformat(s[:19]).replace(
            tzinfo=datetime.timezone.utc
        )


def _add_days(iso: str, days: float) -> str:
    dt = _parse_iso(iso)
    result = dt + datetime.timedelta(days=days)
    return result.isoformat()


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Core update
# ---------------------------------------------------------------------------

def update_item_schedule(
    schedule: Optional[ItemSchedule],
    item_id: str,
    event: Event,
    is_priority: bool = False,
) -> ItemSchedule:
    """
    Apply one event to an item's schedule. Pure function; returns new schedule.

    is_priority: True if the item is flagged for priority re-surfacing
    (e.g. it exercises an active misconception or was recently wrong).
    """
    if schedule is None:
        # First time we see this item
        ease = EASE_START
        consecutive_correct = 0
        prev_interval = 0.0
    else:
        ease = schedule.ease
        consecutive_correct = schedule.consecutive_correct
        prev_interval = schedule.interval_days

    if event.correct:
        consecutive_correct += 1
        if consecutive_correct == 1:
            interval = INITIAL_INTERVALS[1]
        elif consecutive_correct == 2:
            interval = INITIAL_INTERVALS[2]
        else:
            interval = max(INITIAL_INTERVALS[2], prev_interval * ease)
        ease = min(4.0, ease + EASE_CORRECT_BONUS)
    else:
        consecutive_correct = 0
        interval = LAPSE_INTERVAL_PRIORITY if is_priority else LAPSE_INTERVAL
        ease = max(EASE_MIN, ease - EASE_WRONG_PENALTY)

    due_at = _add_days(event.occurred_at, interval)

    return ItemSchedule(
        item_id=item_id,
        interval_days=interval,
        ease=ease,
        last_seen=event.occurred_at,
        due_at=due_at,
        consecutive_correct=consecutive_correct,
    )


def apply_event(
    state: SchedulerState,
    event: Event,
    active_misconceptions: Optional[Set[str]] = None,
) -> SchedulerState:
    """
    Update the scheduler state for one event. Pure function.

    active_misconceptions: set of misconception ids currently considered
    active (recurring). Items whose event has a selected_misconception in
    this set get priority treatment on a lapse.
    """
    active_misconceptions = active_misconceptions or set()
    existing = state.items.get(event.item_id)

    is_priority = (
        not event.correct
        and bool(
            event.selected_misconception
            and event.selected_misconception in active_misconceptions
        )
    )

    new_schedule = update_item_schedule(existing, event.item_id, event, is_priority)

    new_items = dict(state.items)
    new_items[event.item_id] = new_schedule

    return SchedulerState(items=new_items)


def apply_events(
    events: List[Event],
    active_misconceptions: Optional[Set[str]] = None,
) -> SchedulerState:
    """Apply a sequence of events (in chronological order) to a fresh scheduler."""
    state = SchedulerState()
    for event in sorted(events, key=lambda e: e.occurred_at):
        state = apply_event(state, event, active_misconceptions)
    return state


# ---------------------------------------------------------------------------
# Due queue
# ---------------------------------------------------------------------------

def due_queue(
    state: SchedulerState,
    now_iso: str,
    active_misconception_items: Optional[Set[str]] = None,
) -> List[ItemSchedule]:
    """
    Return all items whose due_at <= now_iso, sorted soonest-due first,
    with priority items (wrong + active misconception) sorted first within
    the due set.

    active_misconception_items: item ids that exercised an active misconception
    on their most recent wrong answer. These bubble to the top.
    """
    active_misconception_items = active_misconception_items or set()
    now_dt = _parse_iso(now_iso)

    due: List[ItemSchedule] = []
    for sched in state.items.values():
        if _parse_iso(sched.due_at) <= now_dt:
            due.append(sched)

    def sort_key(s: ItemSchedule):
        priority = 0 if s.item_id in active_misconception_items else 1
        return (priority, _parse_iso(s.due_at))

    due.sort(key=sort_key)
    return due
