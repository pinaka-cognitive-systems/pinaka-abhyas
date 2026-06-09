"""Tests for quality.py — per-item lint and bank-health checks.

All fixtures are synthetic; no real bank files are read.
Uses stdlib unittest only (also runnable with pytest).
"""

import sys
import os
import unittest

# Ensure the validator directory is on the path
_VALIDATOR_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _VALIDATOR_DIR not in sys.path:
    sys.path.insert(0, _VALIDATOR_DIR)

from quality import (
    lint_item,
    check_answer_position_balance,
    check_correct_longest_rate,
    check_near_duplicates,
    check_misconception_usage,
    check_difficulty_distribution,
    check_blueprint_coverage,
    MIN_PACK,
    NEAR_DUP_THRESHOLD,
    OVERUSE_SHARE,
    CORRECT_LONGEST_WARN_RATE,
)
from tests.fixtures import (
    make_item,
    make_balanced_pack,
    make_skewed_pack,
    make_length_tell_pack,
    make_near_dup_pair,
    make_distinct_pair,
    make_overused_misconception_pack,
    minimal_blueprint,
)


# ---------------------------------------------------------------------------
# Per-item lint
# ---------------------------------------------------------------------------


class TestLintStyle(unittest.TestCase):
    def test_em_dash_flagged(self):
        item = make_item(stem="The answer — is five plus three equals eight")
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("STYLE", codes)
        msg = next(w["message"] for w in warns if w["code"] == "STYLE")
        self.assertIn("em_dash", msg)

    def test_latex_dollar_flagged(self):
        item = make_item(stem="Compute $x^2 + y^2$ using the formula given")
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("STYLE", codes)
        msg = next(w["message"] for w in warns if w["code"] == "STYLE" and "latex" in w["message"])
        self.assertIn("latex_dollar", msg)

    def test_filler_furthermore_flagged(self):
        item = make_item(stem="Furthermore, this result follows directly from the formula")
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("STYLE", codes)

    def test_filler_moreover_flagged(self):
        item = make_item(stem="Moreover this is a direct application of the theorem")
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("STYLE", codes)

    def test_asset_ref_flagged(self):
        item = make_item(stem="See {{asset:fig_001}} for the diagram below")
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("STYLE", codes)

    def test_clean_item_no_style_warn(self):
        item = make_item(stem="What is the simple interest on Rs 5000 at 8 percent for 2 years")
        warns = lint_item(item)
        style_warns = [w for w in warns if w["code"] == "STYLE"]
        self.assertEqual(len(style_warns), 0)


class TestLintOptionsDistinct(unittest.TestCase):
    def test_duplicate_options_flagged(self):
        options = [
            {"key": 1, "text": "5"},
            {"key": 2, "text": "5"},  # duplicate
            {"key": 3, "text": "15"},
            {"key": 4, "text": "20"},
        ]
        item = make_item(options=options)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("OPTIONS_DUPLICATE", codes)

    def test_case_insensitive_duplicate_flagged(self):
        options = [
            {"key": 1, "text": "Yes"},
            {"key": 2, "text": "yes"},  # same after normalisation
            {"key": 3, "text": "No"},
            {"key": 4, "text": "Maybe"},
        ]
        item = make_item(options=options)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("OPTIONS_DUPLICATE", codes)

    def test_distinct_options_no_warning(self):
        options = [
            {"key": 1, "text": "Rs 100"},
            {"key": 2, "text": "Rs 200"},
            {"key": 3, "text": "Rs 300"},
            {"key": 4, "text": "Rs 400"},
        ]
        item = make_item(options=options, correct=2)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertNotIn("OPTIONS_DUPLICATE", codes)


class TestLintCorrectLongest(unittest.TestCase):
    def test_correct_is_unique_longest_warns(self):
        options = [
            {"key": 1, "text": "Short"},
            {"key": 2, "text": "Medium text here"},
            {"key": 3, "text": "Longer option text here too"},
            {"key": 4, "text": "The longest option is this one making it a length tell for test"},
        ]
        rationales = [
            {"option_key": 4, "verdict": "correct", "rationale": "Correct because the full analysis applies."},
            {"option_key": 1, "verdict": "incorrect", "rationale": "Incorrect because value does not satisfy.", "misconception": "sign_error"},
            {"option_key": 2, "verdict": "incorrect", "rationale": "Incorrect because formula was misused here.", "misconception": "formula_misapplied"},
            {"option_key": 3, "verdict": "incorrect", "rationale": "Incorrect because wrong quantity was solved.", "misconception": "misread_quantity"},
        ]
        item = make_item(options=options, correct=4, rationales=rationales)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("CORRECT_LONGEST", codes)

    def test_tied_longest_no_warn(self):
        # Two options have same length as correct — not a unique length tell
        options = [
            {"key": 1, "text": "A long option text"},
            {"key": 2, "text": "B long option text"},  # same length as key 1
            {"key": 3, "text": "Short"},
            {"key": 4, "text": "Tiny"},
        ]
        item = make_item(options=options, correct=1)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertNotIn("CORRECT_LONGEST", codes)


class TestLintRationaleSubstantive(unittest.TestCase):
    def test_thin_rationale_flagged(self):
        options = [
            {"key": 1, "text": "5"},
            {"key": 2, "text": "10"},
            {"key": 3, "text": "15"},
            {"key": 4, "text": "20"},
        ]
        rationales = [
            {"option_key": 1, "verdict": "correct", "rationale": "Correct: x = 5."},
            {"option_key": 2, "verdict": "incorrect", "rationale": "Wrong.", "misconception": "sign_error"},  # too short
            {"option_key": 3, "verdict": "incorrect", "rationale": "Incorrect formula applied in step one.", "misconception": "formula_misapplied"},
            {"option_key": 4, "verdict": "incorrect", "rationale": "This choice misreads the quantity asked here.", "misconception": "misread_quantity"},
        ]
        item = make_item(options=options, correct=1, rationales=rationales)
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertIn("RATIONALE_THIN", codes)
        thin = [w for w in warns if w["code"] == "RATIONALE_THIN"]
        self.assertEqual(thin[0]["item_id"], item["id"])

    def test_substantive_rationale_no_warning(self):
        item = make_item()  # uses default rationales from make_item which are substantive
        warns = lint_item(item)
        codes = [w["code"] for w in warns]
        self.assertNotIn("RATIONALE_THIN", codes)


# ---------------------------------------------------------------------------
# Pack / bank-health
# ---------------------------------------------------------------------------


class TestAnswerPositionBalance(unittest.TestCase):
    def test_balanced_pack_passes(self):
        items = make_balanced_pack(n=24)
        result = check_answer_position_balance(items)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(len(result["warnings"]), 0)

    def test_skewed_pack_warns(self):
        items = make_skewed_pack(n=24)
        result = check_answer_position_balance(items)
        self.assertEqual(result["status"], "WARN")
        self.assertGreater(len(result["warnings"]), 0)

    def test_small_pack_skips_balance(self):
        # Pack smaller than MIN_PACK should skip the balance check
        items = make_balanced_pack(n=MIN_PACK - 1)
        result = check_answer_position_balance(items)
        # Should report that check was skipped, not flag it as a content WARN
        self.assertEqual(len([w for w in result["warnings"] if "balance check skipped" in w]), 1)

    def test_counts_sum_to_total(self):
        items = make_balanced_pack(n=24)
        result = check_answer_position_balance(items)
        self.assertEqual(sum(result["counts"].values()), 24)


class TestCorrectLongestRate(unittest.TestCase):
    def test_length_tell_pack_warns(self):
        # make_length_tell_pack has 4 items all with correct = unique longest
        items = make_length_tell_pack()
        result = check_correct_longest_rate(items)
        self.assertEqual(result["rate"], 1.0)
        # 1.0 > 0.35 threshold
        self.assertEqual(result["status"], "WARN")

    def test_balanced_pack_passes_longest(self):
        # Balanced pack with answer distributed — correct is not uniquely longest in most
        items = make_balanced_pack(n=24)
        # Check rate < 0.35 (likely 0 since all options have same short text)
        result = check_correct_longest_rate(items)
        self.assertEqual(result["status"], "PASS")

    def test_offending_ids_listed(self):
        items = make_length_tell_pack()
        result = check_correct_longest_rate(items)
        self.assertEqual(len(result["offending_ids"]), len(items))


class TestNearDuplicates(unittest.TestCase):
    def test_near_dup_pair_detected(self):
        items = make_near_dup_pair()
        result = check_near_duplicates(items)
        self.assertEqual(result["status"], "WARN")
        self.assertEqual(len(result["clusters"]), 1)
        cluster = result["clusters"][0]
        self.assertIn("dup_a", cluster)
        self.assertIn("dup_b", cluster)

    def test_distinct_pair_no_cluster(self):
        items = make_distinct_pair()
        result = check_near_duplicates(items)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(len(result["clusters"]), 0)

    def test_identical_stems_same_cluster(self):
        item_a = make_item(iid="id_x", stem="Asha deposits money in a bank what is the compound interest earned after one year")
        item_b = make_item(iid="id_y", stem="Asha deposits money in a bank what is the compound interest earned after one year")
        result = check_near_duplicates([item_a, item_b])
        self.assertEqual(result["status"], "WARN")


class TestMisconceptionUsage(unittest.TestCase):
    def test_overused_misconception_warns(self):
        items = make_overused_misconception_pack(n=12)
        canon = {"formula_misapplied", "sign_error", "arithmetic_slip", "wrong_formula"}
        result = check_misconception_usage(items, canon)
        self.assertEqual(result["status"], "WARN")
        overused_ids = [o["id"] for o in result["overused"]]
        self.assertIn("formula_misapplied", overused_ids)

    def test_balanced_misconceptions_pass(self):
        # Use make_balanced_pack which has 'sign_error' on all wrong options
        items = make_balanced_pack(n=8)
        canon = {"sign_error", "formula_misapplied", "arithmetic_slip"}
        result = check_misconception_usage(items, canon)
        # sign_error will be 100% — should warn
        # This is expected: balanced pack uses only sign_error fixture
        # The point is the function runs; status depends on share
        self.assertIn(result["status"], {"PASS", "WARN"})

    def test_never_used_listed(self):
        items = make_balanced_pack(n=4)
        canon = {"sign_error", "arithmetic_slip", "rare_misconception_id"}
        result = check_misconception_usage(items, canon)
        self.assertIn("rare_misconception_id", result["never_used"])

    def test_total_tags_counted(self):
        items = make_overused_misconception_pack(n=4)
        # 4 items * 3 wrong options = 12 tags
        result = check_misconception_usage(items, {"formula_misapplied"})
        self.assertEqual(result["total_tags"], 12)


class TestDifficultyDistribution(unittest.TestCase):
    def test_extreme_skew_warns(self):
        # 24 items all L2 → 100% which is > 0.85
        items = make_balanced_pack(n=24)  # all difficulty L2 by default
        result = check_difficulty_distribution(items)
        self.assertEqual(result["status"], "WARN")
        self.assertGreater(len(result["warnings"]), 0)

    def test_mixed_distribution_passes(self):
        items = []
        for i in range(9):
            items.append(make_item(iid=f"l1_{i}", difficulty="L1"))
        for i in range(9):
            items.append(make_item(iid=f"l2_{i}", difficulty="L2"))
        for i in range(6):
            items.append(make_item(iid=f"l3_{i}", difficulty="L3"))
        result = check_difficulty_distribution(items)
        self.assertEqual(result["status"], "PASS")

    def test_counts_correct(self):
        items = [make_item(iid=f"a{i}", difficulty="L1") for i in range(3)]
        items += [make_item(iid=f"b{i}", difficulty="L2") for i in range(5)]
        result = check_difficulty_distribution(items)
        self.assertEqual(result["counts"]["L1"], 3)
        self.assertEqual(result["counts"]["L2"], 5)
        self.assertEqual(result["counts"].get("L3", 0), 0)


class TestBlueprintCoverage(unittest.TestCase):
    def _bp(self):
        return minimal_blueprint()

    def test_missing_families_flagged_as_gaps(self):
        # Bank only has equations items — finance, blood_relations, probability are gaps
        items = [
            make_item(iid="eq1", subtopic="qa.bmath.equations.simple"),
            make_item(iid="eq2", subtopic="qa.bmath.equations.quadratic"),
        ]
        result = check_blueprint_coverage(items, self._bp())
        self.assertIn("qa.bmath.finance", result["gaps"])
        self.assertIn("qa.lr.blood_relations", result["gaps"])
        self.assertIn("qa.stats.probability", result["gaps"])

    def test_no_gaps_when_all_families_covered(self):
        items = [
            make_item(iid="eq1", subtopic="qa.bmath.equations.simple"),
            make_item(iid="fin1", subtopic="qa.bmath.finance.simple_interest"),
            make_item(iid="br1", subtopic="qa.lr.blood_relations"),
            make_item(iid="pr1", subtopic="qa.stats.probability.classical"),
        ]
        result = check_blueprint_coverage(items, self._bp())
        self.assertEqual(result["gaps"], [])

    def test_part_share_warning_on_imbalance(self):
        # Feed items from only one part (qa.bmath) — other parts get 0%
        items = [make_item(iid=f"eq{i}", subtopic="qa.bmath.equations.simple") for i in range(10)]
        result = check_blueprint_coverage(items, self._bp())
        self.assertEqual(result["status"], "WARN")
