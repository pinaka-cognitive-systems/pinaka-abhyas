"""
Tests for mastery.py (v2)

v1 assertions kept:
  - Mastery rises with correct streaks and falls with wrong streaks.
  - The weakest true node ends with the lowest estimated mastery.
  - A repeatedly triggered misconception appears at the top of the recurring list.
  - Surprising outcomes (L3-correct, L1-wrong) move mastery more.
  - Observations count correctly.
  - p stays in [0, 1].
  - Misconception recording and recency.

v2 additions:
  - effective_p applies time-decay toward 0.5.
  - A node seen recently decays less than a node seen long ago.
  - pace_sum / pace_count updated from events with expected_seconds.
  - mean_pace_ratio and pace_status reflect measured speed.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import unittest

from engine.mastery import (
    apply_event,
    apply_events,
    effective_p,
    mean_pace_ratio,
    pace_status,
    ranked_misconceptions,
    RECURRING_THRESHOLD_COUNT,
    DECAY_HALFLIFE_DAYS,
)
from engine.types import Event, MasteryState, NodeMastery


def make_event(
    event_id, item_id, node_id, difficulty, correct,
    misconception=None,
    occurred_at="2024-01-15T10:00:00+00:00",
    time_ms=30000,
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
        time_ms=time_ms,
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


# ---------------------------------------------------------------------------
# v2: Time-decay tests
# ---------------------------------------------------------------------------

class TestEffectiveP(unittest.TestCase):

    def test_no_decay_at_zero_days(self):
        """effective_p == p when queried at the same time as last_updated."""
        nm = NodeMastery(
            node_id="qa.bmath.equations",
            p=0.80,
            observations=10,
            last_updated="2024-06-01T10:00:00+00:00",
        )
        ep = effective_p(nm, now_iso="2024-06-01T10:00:00+00:00")
        self.assertAlmostEqual(ep, 0.80, places=3)

    def test_decay_toward_05_after_one_halflife(self):
        """After DECAY_HALFLIFE_DAYS, effective_p should be halfway between p and 0.5."""
        p_stored = 0.80
        nm = NodeMastery(
            node_id="qa.bmath.equations",
            p=p_stored,
            observations=10,
            last_updated="2024-01-01T00:00:00+00:00",
        )
        # now = last_updated + DECAY_HALFLIFE_DAYS
        import datetime
        last_dt = datetime.datetime(2024, 1, 1, tzinfo=datetime.timezone.utc)
        now_dt = last_dt + datetime.timedelta(days=DECAY_HALFLIFE_DAYS)
        ep = effective_p(nm, now_iso=now_dt.isoformat())
        expected = 0.5 + (p_stored - 0.5) * 0.5  # halfway back
        self.assertAlmostEqual(ep, expected, places=3,
            msg=f"After one half-life, effective_p should be {expected:.3f}, got {ep:.3f}")

    def test_decay_further_after_two_halflives(self):
        """After 2x DECAY_HALFLIFE_DAYS, effective_p should be closer to 0.5 than after 1x."""
        p_stored = 0.80
        nm = NodeMastery(
            node_id="qa.bmath.equations",
            p=p_stored,
            observations=10,
            last_updated="2024-01-01T00:00:00+00:00",
        )
        import datetime
        last_dt = datetime.datetime(2024, 1, 1, tzinfo=datetime.timezone.utc)
        now_1hl = last_dt + datetime.timedelta(days=DECAY_HALFLIFE_DAYS)
        now_2hl = last_dt + datetime.timedelta(days=2 * DECAY_HALFLIFE_DAYS)

        ep_1 = effective_p(nm, now_1hl.isoformat())
        ep_2 = effective_p(nm, now_2hl.isoformat())

        # For p > 0.5, more decay means lower ep
        self.assertLess(ep_2, ep_1,
            f"After 2 half-lives ({ep_2:.3f}) should be less than after 1 ({ep_1:.3f})")

    def test_node_below_05_decays_upward(self):
        """A weak node (p < 0.5) should decay upward toward 0.5."""
        p_stored = 0.20
        nm = NodeMastery(
            node_id="qa.stats.probability",
            p=p_stored,
            observations=10,
            last_updated="2024-01-01T00:00:00+00:00",
        )
        import datetime
        last_dt = datetime.datetime(2024, 1, 1, tzinfo=datetime.timezone.utc)
        now_dt = last_dt + datetime.timedelta(days=DECAY_HALFLIFE_DAYS)
        ep = effective_p(nm, now_iso=now_dt.isoformat())
        # Should be between p_stored and 0.5
        self.assertGreater(ep, p_stored,
            f"Weak node should decay upward: {p_stored:.3f} -> {ep:.3f}")
        self.assertLessEqual(ep, 0.5 + 1e-6,
            f"Should not exceed 0.5 after decay from {p_stored:.3f}")

    def test_recently_updated_decays_less_than_old(self):
        """A recently-updated node decays less than a long-stale one."""
        p_stored = 0.80
        recent_nm = NodeMastery(
            node_id="qa.bmath.finance",
            p=p_stored,
            observations=10,
            last_updated="2024-06-01T00:00:00+00:00",
        )
        old_nm = NodeMastery(
            node_id="qa.bmath.finance",
            p=p_stored,
            observations=10,
            last_updated="2024-01-01T00:00:00+00:00",
        )
        now_iso = "2024-06-15T00:00:00+00:00"
        ep_recent = effective_p(recent_nm, now_iso)
        ep_old = effective_p(old_nm, now_iso)
        self.assertGreater(ep_recent, ep_old,
            f"Recently updated ({ep_recent:.3f}) should decay less than old ({ep_old:.3f})")


# ---------------------------------------------------------------------------
# v2: Speed (pace) tracking tests
# ---------------------------------------------------------------------------

class TestSpeedTracking(unittest.TestCase):

    def test_pace_ratio_tracked_with_expected_seconds(self):
        """When expected_seconds is provided, pace_sum and pace_count update."""
        state = MasteryState()
        node = "qa.bmath.equations"
        # time_ms = 150000 (150 s), expected_seconds = 75 -> pace_ratio = 2.0
        evt = make_event("e1", "item1", node, "L2", True,
                         occurred_at="2024-01-15T10:00:00+00:00",
                         time_ms=150000)
        state = apply_event(state, evt, expected_seconds=75.0)
        nm = state.nodes[node]
        self.assertEqual(nm.pace_count, 1)
        self.assertAlmostEqual(nm.pace_sum, 2.0, places=3)

    def test_mean_pace_ratio_reflects_average(self):
        """mean_pace_ratio should average across events."""
        state = MasteryState()
        node = "qa.bmath.equations"
        # Event 1: 150 s / 75 s = 2.0
        # Event 2: 37.5 s / 75 s = 0.5
        # Mean: 1.25
        for i, ms in enumerate([150000, 37500]):
            evt = make_event(f"e{i}", f"item{i}", node, "L2", True,
                             occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00",
                             time_ms=ms)
            state = apply_event(state, evt, expected_seconds=75.0)
        nm = state.nodes[node]
        self.assertAlmostEqual(mean_pace_ratio(nm), 1.25, places=3)

    def test_pace_status_on_pace(self):
        """pace_ratio <= 1.0 -> on_pace."""
        nm = NodeMastery(
            node_id="qa.lr.series_coding",
            p=0.7, observations=5,
            last_updated="2024-01-15T10:00:00+00:00",
            pace_sum=0.8, pace_count=1,  # 0.8 <= 1.0 -> on_pace
        )
        self.assertEqual(pace_status(nm), "on_pace")

    def test_pace_status_slow(self):
        """pace_ratio > 1.0 -> slow."""
        nm = NodeMastery(
            node_id="qa.stats.probability",
            p=0.4, observations=5,
            last_updated="2024-01-15T10:00:00+00:00",
            pace_sum=2.5, pace_count=1,  # 2.5 > 1.0 -> slow
        )
        self.assertEqual(pace_status(nm), "slow")

    def test_no_expected_seconds_does_not_update_pace(self):
        """Events without expected_seconds should not update pace_count."""
        state = MasteryState()
        node = "qa.bmath.equations"
        evt = make_event("e1", "item1", node, "L2", True,
                         occurred_at="2024-01-15T10:00:00+00:00",
                         time_ms=75000)
        # No expected_seconds provided
        state = apply_event(state, evt, expected_seconds=None)
        nm = state.nodes[node]
        self.assertEqual(nm.pace_count, 0,
            "pace_count should remain 0 when expected_seconds is None")

    def test_apply_events_with_item_bank_updates_pace(self):
        """apply_events with an item_bank should propagate expected_seconds."""
        from engine.synthetic import make_item_bank
        from engine.mastery import apply_events as mastery_apply_events

        item_bank = make_item_bank()
        # Use an L2 item with expected_seconds=75
        item_id = "sd_bmath_eqn_000002"
        node = "qa.bmath.equations"
        self.assertIn(item_id, item_bank)
        self.assertEqual(item_bank[item_id]["expected_seconds"], 75.0)

        events = []
        for i in range(5):
            events.append(Event(
                event_id=f"e{i}",
                item_id=item_id,
                tests=[node],
                difficulty_label="L2",
                mode="drill",
                correct=True,
                selected_misconception=None,
                occurred_at=f"2024-01-{15+i:02d}T10:00:00+00:00",
                time_ms=75000,  # exactly on pace
                resurfaced=False,
            ))

        state = mastery_apply_events(events, item_bank=item_bank)
        nm = state.nodes[node]
        self.assertEqual(nm.pace_count, 5,
            f"Expected pace_count=5, got {nm.pace_count}")
        self.assertAlmostEqual(mean_pace_ratio(nm), 1.0, places=2,
            msg="At 75000ms / 75s = pace_ratio 1.0, mean should be ~1.0")


if __name__ == "__main__":
    unittest.main()
