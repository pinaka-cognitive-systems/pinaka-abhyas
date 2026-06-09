"""
Tests for readiness.py

Assertions from the spec:
  - A strong synthetic student predicts at or above 40 with a reasonable band.
  - A weak one predicts below 40.
  - A near-empty log returns insufficient_data, not a confident number.
  - Readiness increases as the same student improves over time.
  - is_estimate is always True.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import unittest

from engine.readiness import estimate_readiness, MIN_EVENTS, PASS_MARK
from engine.mastery import apply_events
from engine.types import Event, MasteryState
from engine.synthetic import SyntheticStudent, generate_events, make_item_bank


class TestReadinessHonesty(unittest.TestCase):

    def test_empty_log_returns_insufficient_data(self):
        """A fresh mastery state must return 'insufficient_data'."""
        state = MasteryState()
        result = estimate_readiness(state)
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
        result = estimate_readiness(state)
        self.assertEqual(result.label, "insufficient_data",
            f"Sparse log (<{MIN_EVENTS} events) should be insufficient_data, "
            f"got {result.label} with {sum(nm.observations for nm in state.nodes.values())} events")

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
            result = estimate_readiness(state)
            self.assertTrue(result.is_estimate,
                f"is_estimate must be True always (n_events={n_events})")

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
        events = generate_events(student, item_bank, num_events=150,
                                 start_iso="2024-01-15T09:00:00+00:00")
        state = apply_events(events)
        result = estimate_readiness(state)

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
        result = estimate_readiness(state)

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
        result_phase1 = estimate_readiness(state_phase1)

        # Phase 2: same student has improved significantly (higher true_p)
        strong_true_p = {k: 0.80 for k in weak_true_p}
        student_phase2 = SyntheticStudent(true_p=strong_true_p, seed=31)
        events_phase2 = generate_events(student_phase2, item_bank, num_events=100,
                                        start_iso="2024-03-01T09:00:00+00:00")
        # Apply all events together
        state_combined = apply_events(events_phase1 + events_phase2)
        result_phase2 = estimate_readiness(state_combined)

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

        result_few = estimate_readiness(state_few)
        result_many = estimate_readiness(state_many)

        if result_few.label == "insufficient_data" or result_many.label == "insufficient_data":
            self.skipTest("One of the states returned insufficient_data")

        band_few = result_few.high - result_few.low
        band_many = result_many.high - result_many.low

        self.assertGreater(band_few, band_many,
            f"Fewer events should produce wider band: {band_few:.1f} vs {band_many:.1f}")

    def test_result_has_assumption_field(self):
        """The assumption field should always be present and non-empty."""
        state = MasteryState()
        result = estimate_readiness(state)
        self.assertTrue(result.assumption and len(result.assumption) > 10,
                        "assumption field should explain the model")


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
        result = estimate_readiness(state)
        if result.label == "insufficient_data":
            self.skipTest("Insufficient data for this state")
        self.assertEqual(result.label, "not_ready",
            f"Very weak student should be 'not_ready', got '{result.label}', "
            f"predicted={result.predicted_mark}, band=[{result.low},{result.high}]")

    def test_label_on_track_for_strong(self):
        state = self._make_state_with_p(0.90)
        result = estimate_readiness(state)
        if result.label == "insufficient_data":
            self.skipTest("Insufficient data for this state")
        self.assertIn(result.label, ("on_track", "borderline"),
            f"Strong student should be 'on_track' or 'borderline', got '{result.label}'")


if __name__ == "__main__":
    unittest.main()
