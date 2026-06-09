"""
Tests for value.py (new v2 module)

Checks:
  - part_weight returns 0.40 for bmath/stats, 0.20 for lr, default for unknown.
  - headroom is max(0, TARGET_MASTERY - p).
  - base_priority = part_weight * headroom.
  - est_marks_gain is positive for weak nodes and zero for mastered nodes.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import unittest

from engine.value import (
    part_weight,
    headroom,
    base_priority,
    est_marks_gain,
    TARGET_MASTERY,
    PART_WEIGHTS,
    DEFAULT_PART_WEIGHT,
)


class TestPartWeight(unittest.TestCase):

    def test_bmath_weight(self):
        self.assertAlmostEqual(part_weight("qa.bmath.finance"), 0.40)
        self.assertAlmostEqual(part_weight("qa.bmath.equations"), 0.40)
        self.assertAlmostEqual(part_weight("qa.bmath"), 0.40)

    def test_lr_weight(self):
        self.assertAlmostEqual(part_weight("qa.lr.series_coding"), 0.20)
        self.assertAlmostEqual(part_weight("qa.lr"), 0.20)

    def test_stats_weight(self):
        self.assertAlmostEqual(part_weight("qa.stats.probability"), 0.40)
        self.assertAlmostEqual(part_weight("qa.stats"), 0.40)

    def test_unknown_prefix_returns_default(self):
        self.assertAlmostEqual(part_weight("qa.unknown.something"), DEFAULT_PART_WEIGHT)
        self.assertAlmostEqual(part_weight("unrelated"), DEFAULT_PART_WEIGHT)

    def test_weights_sum_to_one(self):
        total = sum(PART_WEIGHTS.values())
        self.assertAlmostEqual(total, 1.0, places=5,
            msg=f"Part weights should sum to 1.0, got {total}")


class TestHeadroom(unittest.TestCase):

    def test_zero_for_mastered(self):
        """A node at or above TARGET_MASTERY has zero headroom."""
        self.assertAlmostEqual(headroom(TARGET_MASTERY), 0.0)
        self.assertAlmostEqual(headroom(0.95), 0.0)

    def test_positive_for_weak(self):
        """A weak node has positive headroom."""
        h = headroom(0.40)
        self.assertGreater(h, 0.0)
        self.assertAlmostEqual(h, TARGET_MASTERY - 0.40, places=5)

    def test_at_prior(self):
        """Unseen node (p=0.5) has headroom = TARGET_MASTERY - 0.5."""
        h = headroom(0.5)
        self.assertAlmostEqual(h, TARGET_MASTERY - 0.5, places=5)

    def test_never_negative(self):
        """headroom must never be negative."""
        for p in [0.0, 0.5, 0.8, 0.9, 1.0]:
            self.assertGreaterEqual(headroom(p), 0.0, f"headroom({p}) should be >= 0")


class TestBasePriority(unittest.TestCase):

    def test_bmath_weak_beats_lr_weak(self):
        """
        A weak bmath node should have higher base_priority than an equally
        weak lr node, because bmath is worth 2x as many marks.
        """
        bp_bmath = base_priority("qa.bmath.finance", 0.40)
        bp_lr = base_priority("qa.lr.series_coding", 0.40)
        self.assertGreater(bp_bmath, bp_lr,
            f"bmath weak ({bp_bmath:.4f}) should beat lr weak ({bp_lr:.4f})")

    def test_mastered_node_zero_priority(self):
        """A node at TARGET_MASTERY has zero priority."""
        bp = base_priority("qa.bmath.finance", TARGET_MASTERY)
        self.assertAlmostEqual(bp, 0.0)

    def test_priority_range(self):
        """base_priority must be in [0, part_weight] for all valid p."""
        for node in ["qa.bmath.finance", "qa.lr.series_coding", "qa.stats.probability"]:
            for p in [0.1, 0.3, 0.5, 0.7, 0.8, 0.9]:
                bp = base_priority(node, p)
                pw = part_weight(node)
                self.assertGreaterEqual(bp, 0.0)
                self.assertLessEqual(bp, pw + 1e-6,
                    f"base_priority({node}, {p}) = {bp:.4f} exceeds part_weight {pw:.4f}")


class TestEstMarksGain(unittest.TestCase):

    def test_positive_for_weak_node(self):
        """A weak node in a high-weight part should have positive est_marks_gain."""
        gain = est_marks_gain("qa.bmath.finance", 0.30)
        self.assertGreater(gain, 0.0,
            f"est_marks_gain for weak bmath node should be > 0, got {gain:.3f}")

    def test_zero_for_mastered_node(self):
        """A mastered node has zero headroom, so est_marks_gain = 0."""
        gain = est_marks_gain("qa.bmath.finance", TARGET_MASTERY)
        self.assertAlmostEqual(gain, 0.0, places=3)

    def test_bmath_gain_ge_lr_gain_at_same_p(self):
        """
        bmath gain should be >= lr gain at the same mastery level.

        Note: est_marks_gain is a rough heuristic for reason strings. The
        formula (part_marks / n_nodes * 1.25 * headroom) may produce equal
        values when marks-per-node ratios happen to be equal (e.g. 40/8 == 20/4).
        The important relationship is in base_priority (part_weight * headroom),
        not est_marks_gain. We assert >= to stay honest to the rough nature of
        this figure.
        """
        gain_bmath = est_marks_gain("qa.bmath.finance", 0.40)
        gain_lr = est_marks_gain("qa.lr.series_coding", 0.40)
        self.assertGreaterEqual(gain_bmath, gain_lr,
            f"bmath gain ({gain_bmath:.3f}) should be >= lr gain ({gain_lr:.3f})")

    def test_unknown_node_returns_zero(self):
        gain = est_marks_gain("qa.unknown.node", 0.40)
        self.assertAlmostEqual(gain, 0.0)


if __name__ == "__main__":
    unittest.main()
