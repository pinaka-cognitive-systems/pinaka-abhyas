"""
Tests for scheduler.py

Assertions from the spec:
  - A missed item (wrong answer) becomes due sooner than a mastered one
    (many correct answers).
  - Intervals grow on repeated success.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import datetime
import unittest

from engine.scheduler import apply_event, apply_events, due_queue, update_item_schedule
from engine.types import Event, ItemSchedule, SchedulerState


def make_event(
    event_id, item_id, correct,
    occurred_at="2024-01-15T10:00:00+00:00",
    difficulty="L2",
    node="qa.bmath.equations",
    misconception=None,
):
    return Event(
        event_id=event_id,
        item_id=item_id,
        tests=[node],
        difficulty_label=difficulty,
        mode="drill",
        correct=correct,
        selected_misconception=misconception,
        occurred_at=occurred_at,
        time_ms=30000,
        resurfaced=False,
    )


class TestIntervalGrowth(unittest.TestCase):

    def test_intervals_grow_on_repeated_success(self):
        """
        After multiple correct answers, the interval should grow each time
        (first answer -> 1 day, second -> 6 days, third -> 6 * ease days...).
        """
        state = SchedulerState()
        item_id = "sd_bmath_eqn_000001"
        base_date = "2024-01-15T10:00:00+00:00"

        intervals = []
        for i in range(5):
            dt = datetime.datetime(2024, 1, 15 + i, 10, 0, 0,
                                   tzinfo=datetime.timezone.utc)
            evt = make_event(f"e{i}", item_id, True, occurred_at=dt.isoformat())
            state = apply_event(state, evt)
            intervals.append(state.items[item_id].interval_days)

        # Verify monotonically growing
        for j in range(1, len(intervals)):
            self.assertGreater(intervals[j], intervals[j - 1],
                f"Interval did not grow: {intervals}")

    def test_wrong_answer_resets_interval_short(self):
        """A wrong answer should reset the interval to a short value."""
        state = SchedulerState()
        item_id = "sd_bmath_eqn_000002"

        # Build up a long interval with correct answers
        for i in range(5):
            dt = datetime.datetime(2024, 1, 15 + i, 10, 0, 0,
                                   tzinfo=datetime.timezone.utc)
            evt = make_event(f"ec{i}", item_id, True, occurred_at=dt.isoformat())
            state = apply_event(state, evt)

        long_interval = state.items[item_id].interval_days
        self.assertGreater(long_interval, 6.0, "Should have built up a long interval")

        # Wrong answer
        evt_wrong = make_event("ew1", item_id, False,
                               occurred_at="2024-01-25T10:00:00+00:00")
        state = apply_event(state, evt_wrong)

        short_interval = state.items[item_id].interval_days
        self.assertLess(short_interval, long_interval,
            f"Wrong answer should reset interval from {long_interval:.1f} "
            f"but got {short_interval:.1f}")
        self.assertLessEqual(short_interval, 1.0,
            f"Reset interval should be <= 1 day, got {short_interval}")

    def test_missed_item_due_before_mastered(self):
        """
        An item that was wrong should have an earlier due_at than an item
        that was answered correctly many times.
        """
        state = SchedulerState()
        wrong_id = "sd_lr_series_000001"
        mastered_id = "sd_lr_series_000002"
        base = "2024-01-15T10:00:00+00:00"

        # Mastered item: 5 correct answers
        for i in range(5):
            dt = datetime.datetime(2024, 1, 15 + i, 10, 0, 0,
                                   tzinfo=datetime.timezone.utc)
            evt = make_event(f"em{i}", mastered_id, True, occurred_at=dt.isoformat())
            state = apply_event(state, evt)

        # Missed item: 1 wrong answer (same day as last correct)
        evt_wrong = make_event("ew1", wrong_id, False,
                               occurred_at="2024-01-19T10:00:00+00:00")
        state = apply_event(state, evt_wrong)

        wrong_due = state.items[wrong_id].due_at
        mastered_due = state.items[mastered_id].due_at

        self.assertLess(wrong_due, mastered_due,
            f"Wrong item due {wrong_due} should be before mastered due {mastered_due}")

    def test_consecutive_correct_increments(self):
        """consecutive_correct should count up through correct answers."""
        state = SchedulerState()
        item_id = "sd_stats_prob_000001"
        for i in range(4):
            dt = datetime.datetime(2024, 1, 15 + i, 10, 0, 0,
                                   tzinfo=datetime.timezone.utc)
            evt = make_event(f"e{i}", item_id, True, occurred_at=dt.isoformat())
            state = apply_event(state, evt)
        self.assertEqual(state.items[item_id].consecutive_correct, 4)

    def test_consecutive_correct_resets_on_wrong(self):
        """A wrong answer should reset consecutive_correct to 0."""
        state = SchedulerState()
        item_id = "sd_stats_prob_000002"
        for i in range(3):
            dt = datetime.datetime(2024, 1, 15 + i, 10, 0, 0,
                                   tzinfo=datetime.timezone.utc)
            evt = make_event(f"ec{i}", item_id, True, occurred_at=dt.isoformat())
            state = apply_event(state, evt)

        evt_wrong = make_event("ew", item_id, False,
                               occurred_at="2024-01-18T10:00:00+00:00")
        state = apply_event(state, evt_wrong)
        self.assertEqual(state.items[item_id].consecutive_correct, 0)

    def test_ease_decreases_on_wrong(self):
        """Ease factor should decrease after a wrong answer."""
        state = SchedulerState()
        item_id = "sd_bmath_fin_000001"
        from engine.scheduler import EASE_START, EASE_WRONG_PENALTY

        # Establish the item first
        evt_correct = make_event("ec1", item_id, True,
                                 occurred_at="2024-01-15T10:00:00+00:00")
        state = apply_event(state, evt_correct)
        initial_ease = state.items[item_id].ease

        evt_wrong = make_event("ew1", item_id, False,
                               occurred_at="2024-01-16T10:00:00+00:00")
        state = apply_event(state, evt_wrong)
        new_ease = state.items[item_id].ease

        self.assertLess(new_ease, initial_ease,
            f"Ease should decrease after wrong: {initial_ease:.3f} -> {new_ease:.3f}")


class TestDueQueue(unittest.TestCase):

    def test_due_items_returned(self):
        """Items past their due_at should appear in the due queue."""
        state = SchedulerState()
        item_id = "sd_bmath_eqn_000001"

        # One wrong answer: due in 1 day from Jan 15
        evt = make_event("e1", item_id, False,
                         occurred_at="2024-01-15T10:00:00+00:00")
        state = apply_event(state, evt)

        # Check 2 days later -> should be due
        now = "2024-01-17T10:00:00+00:00"
        queue = due_queue(state, now)
        self.assertIn(item_id, [s.item_id for s in queue])

    def test_not_yet_due_not_returned(self):
        """An item not yet due should not appear in the queue."""
        state = SchedulerState()
        item_id = "sd_bmath_eqn_000002"

        # Correct answer -> interval = 1 day from Jan 15
        evt = make_event("e1", item_id, True,
                         occurred_at="2024-01-15T10:00:00+00:00")
        state = apply_event(state, evt)

        # Check same day (not yet due)
        now = "2024-01-15T12:00:00+00:00"
        queue = due_queue(state, now)
        self.assertNotIn(item_id, [s.item_id for s in queue])

    def test_priority_items_first_in_queue(self):
        """
        Items linked to active misconceptions should appear before others
        in the due queue.
        """
        state = SchedulerState()
        normal_id = "sd_lr_dir_000001"
        priority_id = "sd_lr_series_000001"
        misconception_items = {priority_id}

        # Both items wrong, both due
        for iid in [normal_id, priority_id]:
            evt = make_event(f"e_{iid}", iid, False,
                             occurred_at="2024-01-15T10:00:00+00:00")
            state = apply_event(state, evt)

        now = "2024-01-16T12:00:00+00:00"
        queue = due_queue(state, now, active_misconception_items=misconception_items)
        self.assertGreater(len(queue), 0)
        self.assertEqual(queue[0].item_id, priority_id,
            f"Priority item should be first; got {queue[0].item_id}")

    def test_queue_sorted_soonest_first(self):
        """Non-priority due items should be sorted by due_at ascending."""
        state = SchedulerState()
        # Item A: wrong on Jan 15 -> due Jan 16
        # Item B: wrong on Jan 13 -> due Jan 14 (already past due; more overdue)
        evt_a = make_event("ea", "item_a", False,
                           occurred_at="2024-01-15T10:00:00+00:00")
        evt_b = make_event("eb", "item_b", False,
                           occurred_at="2024-01-13T10:00:00+00:00")
        state = apply_event(state, evt_a)
        state = apply_event(state, evt_b)

        now = "2024-01-20T10:00:00+00:00"
        queue = due_queue(state, now)
        ids = [s.item_id for s in queue]
        # item_b due Jan 14, item_a due Jan 16 -> item_b first
        self.assertEqual(ids[0], "item_b",
            f"Most overdue item should be first, got order: {ids}")


if __name__ == "__main__":
    unittest.main()
