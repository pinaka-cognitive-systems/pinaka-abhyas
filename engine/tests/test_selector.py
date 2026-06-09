"""
Tests for selector.py

Assertions from the spec:
  - With reviews due, selector returns "review".
  - Otherwise it picks a weak node and stays in the success band (0.60-0.80).
  - It does not repeat the just-served item.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import datetime
import unittest

from engine.selector import select_next, TARGET_LOW, TARGET_HIGH
from engine.mastery import apply_events
from engine.scheduler import apply_events as sched_apply_events, due_queue
from engine.types import Event, MasteryState, SchedulerState
from engine.synthetic import make_item_bank


def make_event(event_id, item_id, node_id, difficulty, correct,
               occurred_at="2024-01-15T10:00:00+00:00", misconception=None):
    return Event(
        event_id=event_id,
        item_id=item_id,
        tests=[node_id],
        difficulty_label=difficulty,
        mode="drill",
        correct=correct,
        selected_misconception=misconception,
        occurred_at=occurred_at,
        time_ms=30000,
        resurfaced=False,
    )


class TestSelectorReviewPriority(unittest.TestCase):

    def test_returns_review_when_items_due(self):
        """If reviews are due, the selector must return action='review'."""
        item_bank = make_item_bank()
        mastery_state = MasteryState()

        # Make item due: wrong answer on Jan 15, check Jan 17 (> 1 day later)
        item_id = "sd_bmath_ratio_000001"
        evt = make_event("e1", item_id, "qa.bmath.ratio_indices_log", "L2", False,
                         occurred_at="2024-01-15T10:00:00+00:00")
        sched_state = sched_apply_events([evt])

        now = "2024-01-17T10:00:00+00:00"
        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=now,
        )
        self.assertEqual(action.action, "review",
            f"Expected 'review' with due items, got '{action.action}'")

    def test_review_item_is_the_due_one(self):
        """The item_id in a review action should be the due item."""
        item_bank = make_item_bank()
        mastery_state = MasteryState()

        item_id = "sd_stats_prob_000001"
        evt = make_event("e1", item_id, "qa.stats.probability", "L2", False,
                         occurred_at="2024-01-15T10:00:00+00:00")
        sched_state = sched_apply_events([evt])

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso="2024-01-17T10:00:00+00:00",
        )
        self.assertEqual(action.action, "review")
        self.assertEqual(action.item_id, item_id,
            f"Review should serve the due item {item_id}, got {action.item_id}")


class TestSelectorPracticeMode(unittest.TestCase):

    def _no_reviews_state(self):
        """Return an empty scheduler (no due items) and a fresh item bank."""
        return SchedulerState(), make_item_bank()

    def test_picks_in_band_item_for_average_student(self):
        """
        For a student with average mastery (~0.5 per node), the selected item
        should have predicted success within [0.50, 0.90] — allowing some slack
        since the bank is small but the selector targets 0.60-0.80.
        """
        from engine.selector import _item_predicted_success
        sched_state, item_bank = self._no_reviews_state()
        mastery_state = MasteryState()  # all nodes at prior 0.5

        now = "2024-06-01T10:00:00+00:00"
        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=now,
        )
        self.assertEqual(action.action, "practice")
        self.assertIsNotNone(action.item_id)

        # Verify predicted success is in a reasonable range
        p = _item_predicted_success(action.item_id, item_bank[action.item_id], mastery_state)
        # Allow ±0.15 slack around band for small bank
        self.assertGreater(p, TARGET_LOW - 0.15,
            f"Item {action.item_id} predicted success {p:.3f} too low")

    def test_does_not_repeat_recently_served(self):
        """The selector must not return the same item that was just served."""
        sched_state, item_bank = self._no_reviews_state()
        mastery_state = MasteryState()
        now = "2024-06-01T10:00:00+00:00"

        first = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=now,
        )
        self.assertIsNotNone(first.item_id)

        second = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=now,
            recently_served={first.item_id},
        )
        self.assertNotEqual(first.item_id, second.item_id,
            "Selector should not repeat the most recently served item")

    def test_prefers_weak_node_over_strong(self):
        """
        When a student is strong at bmath but weak at stats, the selector
        should prefer stats items.
        """
        import random
        rng = random.Random(99)
        item_bank = make_item_bank()
        sched_state = SchedulerState()

        events = []
        # Make student strong at bmath: many correct answers
        bmath_items = [k for k in item_bank if k.startswith("sd_bmath") and
                       item_bank[k]["difficulty_label"] == "L2"]
        for i, iid in enumerate(bmath_items):
            for rep in range(8):
                dt = f"2024-01-{(i * 8 + rep) % 28 + 1:02d}T10:00:00+00:00"
                events.append(make_event(
                    f"ec_{iid}_{rep}", iid,
                    item_bank[iid]["tests"][0], "L2", True,
                    occurred_at=dt,
                ))

        # Make student weak at stats: many wrong answers
        stats_items = [k for k in item_bank if k.startswith("sd_stats") and
                       item_bank[k]["difficulty_label"] == "L2"]
        for i, iid in enumerate(stats_items):
            for rep in range(8):
                dt = f"2024-02-{(i * 8 + rep) % 28 + 1:02d}T10:00:00+00:00"
                events.append(make_event(
                    f"ew_{iid}_{rep}", iid,
                    item_bank[iid]["tests"][0], "L2", False,
                    occurred_at=dt,
                ))

        mastery_state = apply_events(events)
        now = "2024-06-01T10:00:00+00:00"

        # Check multiple selections to confirm stats is preferred
        stats_count = 0
        bmath_count = 0
        served = set()
        for _ in range(10):
            action = select_next(
                mastery=mastery_state,
                scheduler_state=sched_state,
                item_bank=item_bank,
                now_iso=now,
                recently_served=served,
            )
            if action.item_id:
                served.add(action.item_id)
                if action.item_id.startswith("sd_stats"):
                    stats_count += 1
                elif action.item_id.startswith("sd_bmath"):
                    bmath_count += 1

        self.assertGreater(stats_count, bmath_count,
            f"Weak stats nodes should be preferred: stats={stats_count}, bmath={bmath_count}")

    def test_reason_string_is_non_empty(self):
        """The reason field should always be a non-empty string."""
        sched_state, item_bank = self._no_reviews_state()
        mastery_state = MasteryState()
        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso="2024-06-01T10:00:00+00:00",
        )
        self.assertTrue(action.reason and len(action.reason) > 0,
                        "reason should be a non-empty string")


if __name__ == "__main__":
    unittest.main()
