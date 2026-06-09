"""Tests for assemble.py — mock paper assembler.

Covers: allocation correctness, shortfall reporting, determinism.
All fixtures are synthetic; no real bank files are read.
Uses stdlib unittest only (also runnable with pytest).
"""

import sys
import os
import unittest

_VALIDATOR_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _VALIDATOR_DIR not in sys.path:
    sys.path.insert(0, _VALIDATOR_DIR)

from assemble import assemble_mock, summarise_assembly, _allocate_to_parts, _allocate_within_part
from tests.fixtures import (
    make_item,
    make_small_bank_for_assembler,
    minimal_blueprint,
    make_balanced_pack,
)


def _make_rich_bank(blueprint):
    """Build a bank with many items across all families in the minimal blueprint."""
    items = []
    subtopics = [
        ("qa.bmath.equations.simple", 1),
        ("qa.bmath.equations.quadratic", 2),
        ("qa.bmath.finance.simple_interest", 3),
        ("qa.bmath.finance.compound_interest", 4),
        ("qa.lr.blood_relations", 1),
        ("qa.stats.probability.classical", 2),
        ("qa.stats.probability.conditional", 3),
    ]
    iid = 0
    for subtopic, correct in subtopics:
        for j in range(10):
            items.append(
                make_item(
                    iid=f"bank_{iid:04d}",
                    stem=f"Rich bank item {iid} for {subtopic} variant {j} with enough words",
                    subtopic=subtopic,
                    correct=correct,
                )
            )
            iid += 1
    return items


# ---------------------------------------------------------------------------
# Part allocation arithmetic
# ---------------------------------------------------------------------------


class TestPartAllocation(unittest.TestCase):
    def test_100_item_paper_matches_blueprint(self):
        from assemble import PART_MARKS

        alloc = _allocate_to_parts(100, {"parts": []})
        # With empty parts list the function still uses PART_MARKS directly
        # Test via the full blueprint path instead
        bp = minimal_blueprint()
        alloc = _allocate_to_parts(100, bp)
        # PART_MARKS: bmath=40, lr=20, stats=40 → sum=100
        self.assertEqual(sum(alloc.values()), 100)
        self.assertEqual(alloc["qa.bmath"], 40)
        self.assertEqual(alloc["qa.lr"], 20)
        self.assertEqual(alloc["qa.stats"], 40)

    def test_allocation_sums_to_size(self):
        bp = minimal_blueprint()
        for size in [10, 50, 100, 37]:
            alloc = _allocate_to_parts(size, bp)
            self.assertEqual(
                sum(alloc.values()),
                size,
                msg=f"Allocation did not sum to {size}: {alloc}",
            )

    def test_family_allocation_sums_to_budget(self):
        families = ["qa.bmath.equations", "qa.bmath.finance"]
        weights = {"qa.bmath.equations": 55.0, "qa.bmath.finance": 45.0}
        for budget in [8, 10, 13, 7]:
            alloc = _allocate_within_part(budget, families, weights)
            self.assertEqual(sum(alloc.values()), budget)


# ---------------------------------------------------------------------------
# Assembler correctness
# ---------------------------------------------------------------------------


class TestAssemblerBasic(unittest.TestCase):
    def test_returns_expected_keys(self):
        bank = _make_rich_bank(minimal_blueprint())
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=10)
        for key in ["items", "by_part", "by_family", "answer_position_counts", "max_marks", "shortfalls", "seed", "size_requested", "size_assembled"]:
            self.assertIn(key, result)

    def test_no_duplicate_items(self):
        bank = _make_rich_bank(minimal_blueprint())
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=10)
        self.assertEqual(len(result["items"]), len(set(result["items"])))

    def test_all_selected_ids_exist_in_bank(self):
        bank = _make_rich_bank(minimal_blueprint())
        bank_ids = {item["id"] for item in bank}
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=10)
        for iid in result["items"]:
            self.assertIn(iid, bank_ids)

    def test_assembled_le_requested(self):
        bank = _make_rich_bank(minimal_blueprint())
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=100)
        self.assertLessEqual(result["size_assembled"], result["size_requested"])

    def test_by_part_consistent_with_items(self):
        bank = _make_rich_bank(minimal_blueprint())
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=10)
        all_from_parts = []
        for ids in result["by_part"].values():
            all_from_parts.extend(ids)
        self.assertEqual(sorted(all_from_parts), sorted(result["items"]))


# ---------------------------------------------------------------------------
# Shortfall on small bank
# ---------------------------------------------------------------------------


class TestAssemblerShortfall(unittest.TestCase):
    def test_small_bank_reports_shortfalls(self):
        bank = make_small_bank_for_assembler()  # only 5 items
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=100)
        # 5 items can't fill a 100-question paper
        self.assertGreater(len(result["shortfalls"]), 0)

    def test_shortfall_fields_present(self):
        bank = make_small_bank_for_assembler()
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=100)
        for sf in result["shortfalls"]:
            self.assertIn("scope", sf)
            self.assertIn("needed", sf)
            self.assertIn("available", sf)
            self.assertGreaterEqual(sf["needed"], sf["available"])

    def test_size_assembled_le_bank_size(self):
        bank = make_small_bank_for_assembler()
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=100)
        self.assertLessEqual(result["size_assembled"], len(bank))

    def test_empty_bank_gives_all_shortfalls(self):
        result = assemble_mock([], minimal_blueprint(), seed=42, size=100)
        self.assertEqual(result["size_assembled"], 0)
        self.assertGreater(len(result["shortfalls"]), 0)


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


class TestAssemblerDeterminism(unittest.TestCase):
    def test_same_seed_same_paper(self):
        bank = _make_rich_bank(minimal_blueprint())
        result_a = assemble_mock(bank, minimal_blueprint(), seed=42, size=20)
        result_b = assemble_mock(bank, minimal_blueprint(), seed=42, size=20)
        self.assertEqual(result_a["items"], result_b["items"])

    def test_different_seeds_different_papers(self):
        bank = _make_rich_bank(minimal_blueprint())
        result_a = assemble_mock(bank, minimal_blueprint(), seed=1, size=20)
        result_b = assemble_mock(bank, minimal_blueprint(), seed=99, size=20)
        # With a rich bank different seeds should in general produce different orders
        # Not guaranteed for tiny banks, but with 70 items it is effectively certain
        self.assertNotEqual(result_a["items"], result_b["items"])

    def test_determinism_with_small_bank(self):
        bank = make_small_bank_for_assembler()
        result_a = assemble_mock(bank, minimal_blueprint(), seed=7, size=100)
        result_b = assemble_mock(bank, minimal_blueprint(), seed=7, size=100)
        self.assertEqual(result_a["items"], result_b["items"])
        self.assertEqual(result_a["shortfalls"], result_b["shortfalls"])


# ---------------------------------------------------------------------------
# Summary text
# ---------------------------------------------------------------------------


class TestSummariseAssembly(unittest.TestCase):
    def test_summary_is_string(self):
        bank = _make_rich_bank(minimal_blueprint())
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=10)
        summary = summarise_assembly(result)
        self.assertIsInstance(summary, str)
        self.assertIn("Assembly:", summary)

    def test_summary_contains_shortfall_when_present(self):
        bank = make_small_bank_for_assembler()
        result = assemble_mock(bank, minimal_blueprint(), seed=42, size=100)
        summary = summarise_assembly(result)
        self.assertIn("SHORTFALL", summary)
