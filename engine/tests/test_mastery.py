"""
Tests for mastery.py

Assertions from the spec:
  - Mastery rises with correct streaks and falls with wrong streaks.
  - The weakest true node ends with the lowest estimated mastery.
  - A repeatedly triggered misconception appears at the top of the
    recurring list.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import unittest

from engine.mastery import (
    apply_event,
    apply_events,
    ranked_misconceptions,
    RECURRING_THRESHOLD_COUNT,
)
from engine.types import Event, MasteryState


def make_event(
    event_id, item_id, node_id, difficulty, correct,
    misconception=None,
    occurred_at="2024-01-15T10:00:00+00:00",
):
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


class TestMasteryUpdates(unittest.TestCase):

    def test_correct_streak_raises_mastery(self):
        """Repeated correct answers on a node should push p above 0.5."""
        state = MasteryState()
        node = "qa.bmath.equations"
        for i in range(10):
            evt = make_event(
                f"e{i}", f"item{i}", node, "L2", True,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
            )
            state = apply_event(state, evt)

        p = state.nodes[node].p
        self.assertGreater(p, 0.5, f"Expected p > 0.5 after correct streak, got {p:.4f}")

    def test_wrong_streak_lowers_mastery(self):
        """Repeated wrong answers should push p below 0.5."""
        state = MasteryState()
        node = "qa.stats.probability"
        for i in range(10):
            evt = make_event(
                f"e{i}", f"item{i}", node, "L2", False,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
            )
            state = apply_event(state, evt)

        p = state.nodes[node].p
        self.assertLess(p, 0.5, f"Expected p < 0.5 after wrong streak, got {p:.4f}")

    def test_weakest_node_has_lowest_mastery(self):
        """
        With different true-p profiles, the node with the worst true-p ends up
        with the lowest estimated p after a series of events.
        """
        import random
        rng = random.Random(7)

        nodes = {
            "qa.bmath.finance": 0.85,     # strong
            "qa.lr.series_coding": 0.65,  # medium
            "qa.stats.probability": 0.35, # weak
        }

        events = []
        for i, (node, true_p) in enumerate(nodes.items()):
            for j in range(30):
                correct = rng.random() < true_p
                evt = make_event(
                    f"e{i}_{j}", f"item_{node}_{j}", node, "L2", correct,
                    occurred_at=f"2024-01-{(i * 30 + j) % 28 + 1:02d}T{(j % 10) + 8:02d}:00:00+00:00"
                )
                events.append(evt)

        state = apply_events(events)

        strong_p = state.nodes["qa.bmath.finance"].p
        medium_p = state.nodes["qa.lr.series_coding"].p
        weak_p = state.nodes["qa.stats.probability"].p

        self.assertLess(weak_p, medium_p,
            f"Weakest node ({weak_p:.4f}) should be < medium ({medium_p:.4f})")
        self.assertLess(medium_p, strong_p,
            f"Medium node ({medium_p:.4f}) should be < strong ({strong_p:.4f})")

    def test_surprising_correct_on_hard_moves_more(self):
        """Correct on L3 (surprising) should move p more than correct on L2."""
        # Baseline: two nodes both starting at ~0.5, one gets L3-correct,
        # the other gets L2-correct.
        state_l2 = MasteryState()
        state_l3 = MasteryState()
        node = "qa.bmath.calculus"

        for state, diff in [(state_l2, "L2"), (state_l3, "L3")]:
            for i in range(5):
                evt = make_event(
                    f"e{i}", f"item{i}", node, diff, True,
                    occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
                )
                if diff == "L2":
                    state_l2 = apply_event(state_l2, evt)
                else:
                    state_l3 = apply_event(state_l3, evt)

        p_l2 = state_l2.nodes[node].p
        p_l3 = state_l3.nodes[node].p
        # L3-correct uses a higher K factor; p should be higher
        self.assertGreater(p_l3, p_l2,
            f"L3-correct p ({p_l3:.4f}) should exceed L2-correct p ({p_l2:.4f})")

    def test_surprising_wrong_on_easy_moves_more(self):
        """Wrong on L1 (surprising) should lower p more than wrong on L2."""
        state_l1 = MasteryState()
        state_l2 = MasteryState()
        node = "qa.lr.direction_tests"

        for i in range(5):
            evt_l1 = make_event(
                f"e1_{i}", f"item_l1_{i}", node, "L1", False,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
            )
            evt_l2 = make_event(
                f"e2_{i}", f"item_l2_{i}", node, "L2", False,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
            )
            state_l1 = apply_event(state_l1, evt_l1)
            state_l2 = apply_event(state_l2, evt_l2)

        p_l1 = state_l1.nodes[node].p
        p_l2 = state_l2.nodes[node].p
        self.assertLess(p_l1, p_l2,
            f"L1-wrong p ({p_l1:.4f}) should be below L2-wrong p ({p_l2:.4f})")

    def test_observations_count_increments(self):
        """observation count should equal number of events for that node."""
        state = MasteryState()
        node = "qa.stats.distributions"
        n = 7
        for i in range(n):
            evt = make_event(
                f"e{i}", f"item{i}", node, "L2", i % 2 == 0,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00"
            )
            state = apply_event(state, evt)
        self.assertEqual(state.nodes[node].observations, n)

    def test_p_stays_in_bounds(self):
        """p must remain in [0, 1] (more precisely in [0.02, 0.98]) at all times."""
        state = MasteryState()
        node = "qa.bmath.ratio_indices_log"
        for i in range(50):
            evt = make_event(
                f"e{i}", f"item{i}", node, "L1", False,  # extreme wrong on easy
                occurred_at=f"2024-01-{(i % 28) + 1:02d}T10:00:00+00:00"
            )
            state = apply_event(state, evt)
        p = state.nodes[node].p
        self.assertGreaterEqual(p, 0.0)
        self.assertLessEqual(p, 1.0)


class TestMisconceptionTracking(unittest.TestCase):

    def test_misconception_recorded_on_wrong(self):
        """A wrong event with a misconception should be recorded."""
        state = MasteryState()
        evt = make_event("e1", "item1", "qa.lr.seating", "L2", False,
                         misconception="mis_seating_direction")
        state = apply_event(state, evt)
        self.assertIn("mis_seating_direction", state.misconception_hits)
        self.assertEqual(len(state.misconception_hits["mis_seating_direction"]), 1)

    def test_no_misconception_on_correct(self):
        """A correct event should not record a misconception."""
        state = MasteryState()
        evt = make_event("e1", "item1", "qa.lr.seating", "L2", True,
                         misconception="mis_seating_direction")
        state = apply_event(state, evt)
        self.assertNotIn("mis_seating_direction", state.misconception_hits)

    def test_recurring_misconception_tops_ranked_list(self):
        """
        A misconception triggered >= RECURRING_THRESHOLD_COUNT times recently
        should top the ranked list.
        """
        state = MasteryState()
        # Fire "mis_A" many times recently
        base_date = "2024-06-01"
        for i in range(10):
            day = f"2024-06-{i + 1:02d}T10:00:00+00:00"
            evt = make_event(f"eA{i}", f"itemA{i}", "qa.stats.probability", "L2",
                             False, misconception="mis_A", occurred_at=day)
            state = apply_event(state, evt)

        # Fire "mis_B" once, earlier
        evt_b = make_event("eB1", "itemB1", "qa.bmath.equations", "L2",
                           False, misconception="mis_B",
                           occurred_at="2024-01-01T10:00:00+00:00")
        state = apply_event(state, evt_b)

        ranked = ranked_misconceptions(state, reference_iso="2024-06-10T10:00:00+00:00")
        self.assertGreater(len(ranked), 0)
        top = ranked[0]
        self.assertEqual(top.misconception_id, "mis_A",
                         f"Expected mis_A on top, got {top.misconception_id}")

    def test_recurring_flag_set_correctly(self):
        """Misconception above threshold should be marked is_recurring=True."""
        state = MasteryState()
        reference = "2024-06-10T10:00:00+00:00"
        for i in range(RECURRING_THRESHOLD_COUNT):
            day = f"2024-06-{i + 5:02d}T10:00:00+00:00"
            evt = make_event(f"e{i}", f"item{i}", "qa.stats.probability", "L2",
                             False, misconception="mis_recur", occurred_at=day)
            state = apply_event(state, evt)

        ranked = ranked_misconceptions(state, reference_iso=reference)
        recur_entry = next((m for m in ranked if m.misconception_id == "mis_recur"), None)
        self.assertIsNotNone(recur_entry)
        self.assertTrue(recur_entry.is_recurring,
                        "Should be flagged as recurring after threshold hits")

    def test_old_misconception_not_recurring(self):
        """
        A misconception triggered many times a year ago should not be
        flagged recurring (recency score decays to near-zero).
        """
        state = MasteryState()
        for i in range(15):
            day = f"2023-01-{i + 1:02d}T10:00:00+00:00"
            evt = make_event(f"e{i}", f"item{i}", "qa.bmath.finance", "L2",
                             False, misconception="mis_old", occurred_at=day)
            state = apply_event(state, evt)

        reference = "2024-06-10T10:00:00+00:00"  # ~17 months later
        ranked = ranked_misconceptions(state, reference_iso=reference)
        old_entry = next((m for m in ranked if m.misconception_id == "mis_old"), None)
        if old_entry:
            # Score should be tiny; is_recurring should be False
            self.assertFalse(old_entry.is_recurring,
                             f"Old misconception should not be recurring; "
                             f"recency_score={old_entry.recency_score:.6f}")


if __name__ == "__main__":
    unittest.main()
