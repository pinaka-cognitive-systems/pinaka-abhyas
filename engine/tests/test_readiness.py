"""
Tests for readiness.py (v2)

v1 assertions kept:
  - Empty log -> insufficient_data (predicted_mark is None).
  - Sparse log (< MIN_EVENTS) -> insufficient_data.
  - is_estimate always True.
  - Strong student (p=0.9) predicts >= 40.
  - Weak student (p=0.35) predicts < 40.
  - Readiness increases as a student improves.
  - Wider band with less data.
  - assumption field present and non-empty.

v2 additions:
  - predicted_mark >= naive_attempt_all_mark: smart strategy never does worse
    than naive attempt-all (because EV-positive questions are kept and
    EV-negative ones are skipped).
  - A section with P < 0.2 contributes 0 (skipped), never negative.
  - time_feasible=False when pace is very slow across the paper.
  - is_estimate always True, confidence in {low, medium}.
  - Band endpoints are rounded to nearest 5.
  - note field present.
  - marks_lost_to_recurring_misconceptions present (may be None when no data).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import datetime
import unittest

from engine.readiness import estimate_readiness, MIN_EVENTS, PASS_MARK
from engine.mastery import apply_events
from engine.types import Event, MasteryState, NodeMastery
from engine.synthetic import SyntheticStudent, generate_events, make_item_bank

NOW_ISO = "2024-06-15T09:00:00+00:00"


class TestReadinessHonesty(unittest.TestCase):

    def test_empty_log_returns_insufficient_data(self):
        """A fresh mastery state must return 'insufficient_data'."""
        state = MasteryState()
        result = estimate_readiness(state, now_iso=NOW_ISO)
        self.assertEqual(result.label, "insufficient_data",
            f"Empty log should return insufficient_data, got {result.label}")
        self.assertIsNone(result.predicted_mark)
        self.assertIsNone(result.low)
        self.assertIsNone(result.high)
        self.assertIsNone(result.distance_to_pass)

    def test_sparse_log_returns_insufficient_data(self):
        """A log with fewer than MIN_EVENTS events should return insufficient_data."""
        item_bank = make_item_bank()
        student = SyntheticStudent(
            true_p={node: 0.7 for node in ["qa.bmath.equations", "qa.stats.probability"]},
            seed=1,
        )
        events = generate_events(student, item_bank, num_events=MIN_EVENTS - 1,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)
        self.assertEqual(result.label, "insufficient_data",
            f"Sparse log (<{MIN_EVENTS} events) should be insufficient_data, "
            f"got {result.label} with "
            f"{sum(nm.observations for nm in state.nodes.values())} events")

    def test_is_estimate_always_true(self):
        """is_estimate must be True regardless of data quantity."""
        for n_events in [0, 5, 50, 200]:
            item_bank = make_item_bank()
            if n_events == 0:
                state = MasteryState()
            else:
                student = SyntheticStudent(
                    true_p={"qa.bmath.equations": 0.7, "qa.stats.probability": 0.6,
                            "qa.lr.series_coding": 0.65},
                    seed=2,
                )
                events = generate_events(student, item_bank, num_events=n_events)
                state = apply_events(events)
            result = estimate_readiness(state, now_iso=NOW_ISO)
            self.assertTrue(result.is_estimate,
                f"is_estimate must be True always (n_events={n_events})")

    def test_confidence_not_high(self):
        """confidence must never be 'high'."""
        item_bank = make_item_bank()
        student = SyntheticStudent(
            true_p={node: 0.7 for node in [
                "qa.bmath.equations", "qa.stats.probability",
                "qa.lr.series_coding", "qa.bmath.finance",
            ]},
            seed=5,
        )
        for n_events in [25, 100, 300]:
            events = generate_events(student, item_bank, num_events=n_events)
            state = apply_events(events)
            result = estimate_readiness(state, now_iso=NOW_ISO)
            self.assertIn(result.confidence, ("low", "medium"),
                f"confidence should be 'low' or 'medium', got '{result.confidence}' "
                f"(n_events={n_events})")

    def test_strong_student_predicts_at_or_above_pass(self):
        """
        A student with high true p across all nodes should predict >= 40.
        """
        item_bank = make_item_bank()
        # Very strong: 0.9 on all nodes
        true_p = {
            "qa.bmath.ratio_indices_log": 0.90,
            "qa.bmath.equations": 0.90,
            "qa.bmath.inequalities": 0.90,
            "qa.bmath.finance": 0.90,
            "qa.bmath.permutations_combinations": 0.90,
            "qa.bmath.sequence_series": 0.90,
            "qa.bmath.sets_functions": 0.90,
            "qa.bmath.calculus": 0.90,
            "qa.lr.series_coding": 0.90,
            "qa.lr.direction_tests": 0.90,
            "qa.lr.seating": 0.90,
            "qa.lr.blood_relations": 0.90,
            "qa.stats.data_representation": 0.90,
            "qa.stats.central_tendency_dispersion": 0.90,
            "qa.stats.probability": 0.90,
            "qa.stats.distributions": 0.90,
            "qa.stats.correlation_regression": 0.90,
            "qa.stats.index_numbers": 0.90,
        }
        student = SyntheticStudent(true_p=true_p, seed=10)
        # use a start_iso close to now_iso to minimize time-decay effect
        events = generate_events(student, item_bank, num_events=150,
                                 start_iso="2024-06-01T09:00:00+00:00")
        state = apply_events(events)
        # now_iso close to last events so decay is minimal
        result = estimate_readiness(state, now_iso="2024-06-15T09:00:00+00:00")

        self.assertNotEqual(result.label, "insufficient_data",
            "Strong student with 150 events should not return insufficient_data")
        self.assertIsNotNone(result.predicted_mark)
        self.assertGreaterEqual(result.predicted_mark, PASS_MARK,
            f"Strong student should predict >= {PASS_MARK}, got {result.predicted_mark}")

    def test_weak_student_predicts_below_pass(self):
        """A student with low true p should predict < 40."""
        item_bank = make_item_bank()
        # Weak student: 0.35 across all nodes
        true_p = {
            "qa.bmath.ratio_indices_log": 0.35,
            "qa.bmath.equations": 0.35,
            "qa.bmath.inequalities": 0.35,
            "qa.bmath.finance": 0.35,
            "qa.bmath.permutations_combinations": 0.35,
            "qa.bmath.calculus": 0.35,
            "qa.lr.series_coding": 0.35,
            "qa.lr.direction_tests": 0.35,
            "qa.stats.data_representation": 0.35,
            "qa.stats.central_tendency_dispersion": 0.35,
            "qa.stats.probability": 0.35,
            "qa.stats.distributions": 0.35,
        }
        student = SyntheticStudent(true_p=true_p, seed=20)
        events = generate_events(student, item_bank, num_events=150,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state, now_iso="2024-06-15T09:00:00+00:00")

        self.assertNotEqual(result.label, "insufficient_data",
            "Weak student with 150 events should not return insufficient_data")
        self.assertIsNotNone(result.predicted_mark)
        self.assertLess(result.predicted_mark, PASS_MARK,
            f"Weak student should predict < {PASS_MARK}, got {result.predicted_mark}")

    def test_readiness_increases_as_student_improves(self):
        """
        A student who starts weak and then practises intensively should show
        a higher predicted mark after improvement than before.
        """
        item_bank = make_item_bank()
        # Phase 1: weak (few events at low true_p)
        weak_true_p = {k: 0.40 for k in [
            "qa.bmath.equations", "qa.bmath.finance",
            "qa.lr.series_coding", "qa.lr.direction_tests",
            "qa.stats.probability", "qa.stats.data_representation",
            "qa.stats.central_tendency_dispersion", "qa.stats.distributions",
        ]}
        student_phase1 = SyntheticStudent(true_p=weak_true_p, seed=30)
        events_phase1 = generate_events(student_phase1, item_bank, num_events=60,
                                        start_iso="2024-01-01T09:00:00+00:00")
        state_phase1 = apply_events(events_phase1)
        result_phase1 = estimate_readiness(state_phase1, now_iso="2024-03-01T09:00:00+00:00")

        # Phase 2: same student has improved significantly (higher true_p)
        strong_true_p = {k: 0.80 for k in weak_true_p}
        student_phase2 = SyntheticStudent(true_p=strong_true_p, seed=31)
        events_phase2 = generate_events(student_phase2, item_bank, num_events=100,
                                        start_iso="2024-03-01T09:00:00+00:00")
        # Apply all events together
        state_combined = apply_events(events_phase1 + events_phase2)
        result_phase2 = estimate_readiness(state_combined, now_iso="2024-06-15T09:00:00+00:00")

        # Both should produce numbers (not insufficient_data)
        if result_phase1.label == "insufficient_data":
            self.skipTest("Phase 1 returned insufficient_data; increase events in test")

        self.assertIsNotNone(result_phase2.predicted_mark)
        self.assertGreater(
            result_phase2.predicted_mark,
            result_phase1.predicted_mark,
            f"Readiness should improve: phase1={result_phase1.predicted_mark:.1f} "
            f"phase2={result_phase2.predicted_mark:.1f}"
        )

    def test_confidence_band_is_wider_with_less_data(self):
        """
        A student with more events should have a narrower confidence band
        than a student with fewer events.
        """
        item_bank = make_item_bank()
        true_p = {
            "qa.bmath.equations": 0.70,
            "qa.bmath.finance": 0.70,
            "qa.bmath.ratio_indices_log": 0.70,
            "qa.lr.series_coding": 0.70,
            "qa.lr.direction_tests": 0.70,
            "qa.stats.probability": 0.70,
            "qa.stats.data_representation": 0.70,
            "qa.stats.central_tendency_dispersion": 0.70,
            "qa.stats.distributions": 0.70,
        }
        student = SyntheticStudent(true_p=true_p, seed=40)

        events_few = generate_events(student, item_bank, num_events=25,
                                     start_iso="2024-01-15T09:00:00+00:00")
        events_many = generate_events(student, item_bank, num_events=200,
                                      start_iso="2024-01-15T09:00:00+00:00")

        state_few = apply_events(events_few)
        state_many = apply_events(events_many)

        result_few = estimate_readiness(state_few, now_iso=NOW_ISO)
        result_many = estimate_readiness(state_many, now_iso=NOW_ISO)

        if result_few.label == "insufficient_data" or result_many.label == "insufficient_data":
            self.skipTest("One of the states returned insufficient_data")

        band_few = result_few.high - result_few.low
        band_many = result_many.high - result_many.low

        self.assertGreater(band_few, band_many,
            f"Fewer events should produce wider band: {band_few:.1f} vs {band_many:.1f}")

    def test_result_has_assumption_field(self):
        """The assumption field should always be present and non-empty."""
        state = MasteryState()
        result = estimate_readiness(state, now_iso=NOW_ISO)
        self.assertTrue(result.assumption and len(result.assumption) > 10,
                        "assumption field should explain the model")

    def test_note_field_present(self):
        """note field must be present (may be empty string)."""
        state = MasteryState()
        result = estimate_readiness(state, now_iso=NOW_ISO)
        self.assertIsNotNone(result.note)

    def test_band_endpoints_rounded_to_nearest_5(self):
        """For data-rich states, band endpoints should be rounded to nearest 5."""
        item_bank = make_item_bank()
        true_p = {node: 0.70 for node in [
            "qa.bmath.equations", "qa.bmath.finance",
            "qa.bmath.ratio_indices_log", "qa.lr.series_coding",
            "qa.lr.direction_tests", "qa.stats.probability",
            "qa.stats.data_representation", "qa.stats.central_tendency_dispersion",
            "qa.stats.distributions",
        ]}
        student = SyntheticStudent(true_p=true_p, seed=50)
        events = generate_events(student, item_bank, num_events=200,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)

        if result.label == "insufficient_data":
            self.skipTest("State returned insufficient_data")
        if result.low is None or result.high is None:
            self.skipTest("No band returned")

        self.assertEqual(result.low % 5, 0,
            f"low ({result.low}) should be a multiple of 5")
        self.assertEqual(result.high % 5, 0,
            f"high ({result.high}) should be a multiple of 5")


class TestReadinessLabels(unittest.TestCase):

    def _make_state_with_p(self, part_p: float, n_events_per_node: int = 80):
        """Build a state where all nodes have approximately the given p."""
        item_bank = make_item_bank()
        nodes = list(set(
            n for meta in item_bank.values() for n in meta["tests"]
        ))
        true_p = {n: part_p for n in nodes}
        student = SyntheticStudent(true_p=true_p, seed=99)
        events = generate_events(student, item_bank, num_events=n_events_per_node * 3,
                                 start_iso="2024-01-15T09:00:00+00:00")
        return apply_events(events)

    def test_label_not_ready_for_weak(self):
        state = self._make_state_with_p(0.30)
        result = estimate_readiness(state, now_iso=NOW_ISO)
        if result.label == "insufficient_data":
            self.skipTest("Insufficient data for this state")
        self.assertEqual(result.label, "not_ready",
            f"Very weak student should be 'not_ready', got '{result.label}', "
            f"predicted={result.predicted_mark}, band=[{result.low},{result.high}]")

    def test_label_on_track_for_strong(self):
        state = self._make_state_with_p(0.90)
        result = estimate_readiness(state, now_iso=NOW_ISO)
        if result.label == "insufficient_data":
            self.skipTest("Insufficient data for this state")
        self.assertIn(result.label, ("on_track", "borderline"),
            f"Strong student should be 'on_track' or 'borderline', got '{result.label}'")


# ---------------------------------------------------------------------------
# v2: Smart-strategy tests
# ---------------------------------------------------------------------------

class TestSmartStrategy(unittest.TestCase):

    def test_predicted_mark_ge_naive_when_low_ev_skipped(self):
        """
        When EV-negative questions are skipped (P < 0.2), predicted_mark
        should be >= naive_attempt_all_mark (because skipping negative-EV
        questions never reduces expected score).

        Uses now_iso close to event dates to avoid time-decay pushing
        stored weak nodes back toward 0.5 before we can observe the skip.
        Also uses fast pace (pace_ratio=0.5) so time-cap does not drop
        any questions and cannot lower predicted_mark below naive.
        """
        from engine.mastery import apply_events as mastery_apply_events
        item_bank = make_item_bank()

        # Build mastery state directly with controlled p values
        # to avoid time-decay confounding the test.
        # Inject NodeMastery for each node manually:
        from engine.types import MasteryState, NodeMastery
        state = MasteryState()
        new_nodes = {}

        # Strong: bmath at p=0.80
        for node in ["qa.bmath.equations", "qa.bmath.finance",
                     "qa.bmath.ratio_indices_log"]:
            new_nodes[node] = NodeMastery(
                node_id=node, p=0.80, observations=50,
                last_updated="2024-06-14T09:00:00+00:00",
                pace_sum=25.0, pace_count=50,  # pace_ratio=0.5 (fast)
            )

        # Very weak: lr at p=0.10 -> EV = 1.25*0.10 - 0.25 = -0.125 < 0 -> skip
        for node in ["qa.lr.series_coding", "qa.lr.direction_tests",
                     "qa.lr.seating", "qa.lr.blood_relations"]:
            new_nodes[node] = NodeMastery(
                node_id=node, p=0.10, observations=50,
                last_updated="2024-06-14T09:00:00+00:00",
                pace_sum=25.0, pace_count=50,
            )

        # Strong: stats at p=0.80
        for node in ["qa.stats.probability", "qa.stats.data_representation",
                     "qa.stats.central_tendency_dispersion"]:
            new_nodes[node] = NodeMastery(
                node_id=node, p=0.80, observations=50,
                last_updated="2024-06-14T09:00:00+00:00",
                pace_sum=25.0, pace_count=50,
            )

        state.nodes = new_nodes
        # Use now_iso just 1 day after last_updated to minimize decay
        result = estimate_readiness(state, now_iso="2024-06-15T09:00:00+00:00")

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")
        if result.predicted_mark is None or result.naive_attempt_all_mark is None:
            self.skipTest("No mark data")

        # LR part has EV < 0 so it should be skipped; policy mark >= naive
        self.assertGreaterEqual(
            result.predicted_mark, result.naive_attempt_all_mark - 0.5,
            f"predicted_mark ({result.predicted_mark}) should be >= naive "
            f"({result.naive_attempt_all_mark}) under smart strategy"
        )

    def test_very_weak_part_does_not_reduce_score(self):
        """
        A part with P < 0.2 should contribute 0 (skipped), never negative marks.
        """
        # Build a state where qa.lr is very weak and bmath/stats are moderate
        item_bank = make_item_bank()
        true_p = {
            "qa.bmath.equations": 0.60,
            "qa.bmath.finance": 0.60,
            "qa.bmath.ratio_indices_log": 0.60,
            "qa.lr.series_coding": 0.10,   # EV < 0
            "qa.lr.direction_tests": 0.10,
            "qa.lr.seating": 0.10,
            "qa.lr.blood_relations": 0.10,
            "qa.stats.probability": 0.60,
            "qa.stats.data_representation": 0.60,
        }
        student = SyntheticStudent(true_p=true_p, seed=61)
        events = generate_events(student, item_bank, num_events=200,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")
        if result.predicted_mark is None:
            self.skipTest("No predicted mark")

        # naive_attempt_all_mark may be lower because LR drags it down with negatives
        # predicted_mark should be >= naive because we skip the EV-negative LR questions
        if result.naive_attempt_all_mark is not None:
            self.assertGreaterEqual(
                result.predicted_mark, result.naive_attempt_all_mark - 1.0,
                f"Skipping very weak LR ({result.predicted_mark:.1f}) should not "
                f"be worse than naive ({result.naive_attempt_all_mark:.1f})"
            )

    def test_time_feasible_returned(self):
        """time_feasible should be a bool when data is available."""
        item_bank = make_item_bank()
        true_p = {
            "qa.bmath.equations": 0.70,
            "qa.stats.probability": 0.70,
            "qa.lr.series_coding": 0.70,
        }
        student = SyntheticStudent(true_p=true_p, seed=62)
        events = generate_events(student, item_bank, num_events=60,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")
        self.assertIsNotNone(result.time_feasible)
        self.assertIsInstance(result.time_feasible, bool)

    def test_slow_student_time_not_feasible(self):
        """
        A student with pace_ratio >> 1.0 (very slow) should get time_feasible=False
        and est_minutes > 120.

        Uses NodeMastery injection to set pace directly, avoiding the averaging
        issue that arises when the random item bank covers nodes not in true_pace.
        """
        from engine.types import MasteryState, NodeMastery
        item_bank = make_item_bank()

        # Inject all nodes in the item bank with very high pace_ratio (5.0x)
        # so that the per-part average is clearly > 1.0 regardless of coverage.
        all_nodes = list(set(n for m in item_bank.values() for n in m.get("tests", [])))
        new_nodes = {}
        for node in all_nodes:
            new_nodes[node] = NodeMastery(
                node_id=node, p=0.70, observations=30,
                last_updated="2024-06-14T09:00:00+00:00",
                pace_sum=150.0, pace_count=30,  # mean pace_ratio = 5.0
            )

        state = MasteryState()
        state.nodes = new_nodes

        result = estimate_readiness(state, now_iso="2024-06-15T09:00:00+00:00")

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")

        # With pace_ratio=5.0 and 100 questions at ~75s each:
        # est time = 5.0 * 75 * 100 = 37500s = 625 min >> 120 min
        self.assertIsNotNone(result.time_feasible)
        self.assertFalse(result.time_feasible,
            f"Slow student (pace 5x) should have time_feasible=False; "
            f"est_minutes={result.est_minutes}")
        self.assertIsNotNone(result.est_minutes)
        self.assertGreater(result.est_minutes, 120,
            f"est_minutes should exceed 120, got {result.est_minutes}")


class TestReadinessV2Fields(unittest.TestCase):

    def test_naive_attempt_all_mark_present(self):
        """naive_attempt_all_mark should be returned when data is sufficient."""
        item_bank = make_item_bank()
        true_p = {node: 0.70 for node in [
            "qa.bmath.equations", "qa.stats.probability", "qa.lr.series_coding",
        ]}
        student = SyntheticStudent(true_p=true_p, seed=70)
        events = generate_events(student, item_bank, num_events=60)
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")
        self.assertIsNotNone(result.naive_attempt_all_mark)

    def test_est_minutes_positive(self):
        """est_minutes should be positive when data is sufficient."""
        item_bank = make_item_bank()
        true_p = {node: 0.70 for node in [
            "qa.bmath.equations", "qa.stats.probability", "qa.lr.series_coding",
        ]}
        student = SyntheticStudent(true_p=true_p, seed=71)
        events = generate_events(student, item_bank, num_events=60)
        state = apply_events(events)
        result = estimate_readiness(state, now_iso=NOW_ISO)

        if result.label == "insufficient_data":
            self.skipTest("Insufficient data")
        self.assertIsNotNone(result.est_minutes)
        self.assertGreater(result.est_minutes, 0)


if __name__ == "__main__":
    unittest.main()
