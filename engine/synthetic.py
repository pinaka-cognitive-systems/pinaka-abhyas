"""
synthetic.py — synthetic student and event generator.

A "true student" is defined by:
  - true_p: {node_id: float}  — true probability of answering a question on
    that node correctly at median difficulty (L2)
  - prone_misconceptions: {node_id: [misconception_id, ...]} — when the
    student gets a question on this node wrong, they emit one of these
    misconceptions with equal probability

The generator:
  1. Iterates over a series of (item, event_time) tuples.
  2. For each item, picks a difficulty from the item bank.
  3. Adjusts the true p by difficulty (same scaling as readiness.py):
       L1 -> true_p * 1.15 (clamped to 0.98)
       L2 -> true_p
       L3 -> true_p * 0.75
  4. Samples correct/incorrect from a Bernoulli with that adjusted probability.
  5. If incorrect, picks a misconception from the node's prone list (if any).
  6. Emits an Event with a synthetic UUID and advancing timestamp.

Timestamps advance by a configurable step (default 1 day between sessions,
items within a session spaced by ~2 minutes) so the scheduler can be
exercised across multiple "days".

No third-party dependencies; uses only stdlib random and datetime.
"""
from __future__ import annotations

import datetime
import random
import uuid
from typing import Dict, List, Optional, Tuple

from .types import Event

# ---------------------------------------------------------------------------
# Difficulty adjustments (same as readiness.py and selector.py)
# ---------------------------------------------------------------------------

DIFFICULTY_ADJUSTMENT = {
    "L1": 1.15,
    "L2": 1.00,
    "L3": 0.75,
}

DEFAULT_DIFFICULTY = "L2"

# ---------------------------------------------------------------------------
# Synthetic student descriptor
# ---------------------------------------------------------------------------

class SyntheticStudent:
    """
    Describes a simulated student.

    Parameters
    ----------
    true_p: {node_id: float} — true P(correct | L2, this node)
    prone_misconceptions: {node_id: [misconception_id, ...]}
    seed: random seed for reproducibility
    install_id: synthetic install id
    exam: exam identifier
    """

    def __init__(
        self,
        true_p: Dict[str, float],
        prone_misconceptions: Optional[Dict[str, List[str]]] = None,
        seed: int = 42,
        install_id: str = "synthetic-install-001",
        exam: str = "ca_foundation_qa",
    ):
        self.true_p = true_p
        self.prone_misconceptions = prone_misconceptions or {}
        self.rng = random.Random(seed)
        self.install_id = install_id
        self.exam = exam

    def node_p(self, node_id: str, difficulty_label: str = "L2") -> float:
        base = self.true_p.get(node_id, 0.5)
        adj = DIFFICULTY_ADJUSTMENT.get(difficulty_label.upper(), 1.0)
        return min(0.98, max(0.02, base * adj))

    def sample_correct(self, node_id: str, difficulty_label: str = "L2") -> bool:
        p = self.node_p(node_id, difficulty_label)
        return self.rng.random() < p

    def sample_misconception(self, node_id: str) -> Optional[str]:
        options = self.prone_misconceptions.get(node_id, [])
        if not options:
            return None
        return self.rng.choice(options)


# ---------------------------------------------------------------------------
# Event generator
# ---------------------------------------------------------------------------

def generate_events(
    student: SyntheticStudent,
    item_bank: Dict[str, Dict],
    num_events: int = 100,
    start_iso: str = "2024-01-15T09:00:00+00:00",
    session_gap_hours: float = 24.0,
    items_per_session: int = 10,
    item_sequence: Optional[List[str]] = None,
    mode: str = "drill",
) -> List[Event]:
    """
    Simulate a sequence of events for the given student.

    Parameters
    ----------
    student: SyntheticStudent
    item_bank: {item_id: {tests, difficulty_label}} — must be non-empty
    num_events: total events to generate
    start_iso: starting datetime
    session_gap_hours: hours between study sessions
    items_per_session: items per session (controls within-session spacing)
    item_sequence: if given, use this item order; else sample uniformly
    mode: event mode field value
    """
    if not item_bank:
        raise ValueError("item_bank must be non-empty")

    item_ids = list(item_bank.keys())
    events: List[Event] = []

    start_dt = _parse_iso(start_iso)
    session_num = 0
    item_in_session = 0

    for i in range(num_events):
        # Advance time
        session_num_cur = i // items_per_session
        item_in_session = i % items_per_session
        current_dt = (
            start_dt
            + datetime.timedelta(hours=session_gap_hours * session_num_cur)
            + datetime.timedelta(minutes=2 * item_in_session)
        )

        # Pick item
        if item_sequence is not None:
            item_id = item_sequence[i % len(item_sequence)]
        else:
            item_id = student.rng.choice(item_ids)

        meta = item_bank[item_id]
        difficulty = meta.get("difficulty_label", DEFAULT_DIFFICULTY)
        tests = meta.get("tests", [])

        # Sample outcome: use the first (primary) node, or mean over all nodes
        if tests:
            probs = [student.node_p(n, difficulty) for n in tests]
            avg_p = sum(probs) / len(probs)
        else:
            avg_p = 0.5

        correct = student.rng.random() < avg_p

        # Misconception: pick from the primary node's prone list
        misconception = None
        if not correct and tests:
            # Try each node; use the first that has a misconception option
            for node_id in tests:
                mc = student.sample_misconception(node_id)
                if mc is not None:
                    misconception = mc
                    break

        event = Event(
            event_id=str(uuid.UUID(int=student.rng.getrandbits(128))),
            item_id=item_id,
            tests=list(tests),
            difficulty_label=difficulty,
            mode=mode,
            correct=correct,
            selected_misconception=misconception,
            occurred_at=current_dt.isoformat(),
            time_ms=student.rng.randint(15000, 120000),
            resurfaced=False,
        )
        events.append(event)

    return events


# ---------------------------------------------------------------------------
# Convenience: build a small synthetic item bank
# ---------------------------------------------------------------------------

def make_item_bank() -> Dict[str, Dict]:
    """
    Build a small but representative synthetic item bank covering all three
    CA QA parts and all three difficulty levels.

    item_id format: sd_<part>_<family>_<NNNNNN>
    """
    items: Dict[str, Dict] = {}

    specs = [
        # (item_id, tests, difficulty_label)
        # Business Mathematics
        ("sd_bmath_ratio_000001", ["qa.bmath.ratio_indices_log"], "L1"),
        ("sd_bmath_ratio_000002", ["qa.bmath.ratio_indices_log"], "L2"),
        ("sd_bmath_ratio_000003", ["qa.bmath.ratio_indices_log"], "L3"),
        ("sd_bmath_eqn_000001",   ["qa.bmath.equations"],         "L1"),
        ("sd_bmath_eqn_000002",   ["qa.bmath.equations"],         "L2"),
        ("sd_bmath_eqn_000003",   ["qa.bmath.equations"],         "L3"),
        ("sd_bmath_fin_000001",   ["qa.bmath.finance"],           "L1"),
        ("sd_bmath_fin_000002",   ["qa.bmath.finance"],           "L2"),
        ("sd_bmath_fin_000003",   ["qa.bmath.finance"],           "L3"),
        ("sd_bmath_perm_000001",  ["qa.bmath.permutations_combinations"], "L2"),
        ("sd_bmath_perm_000002",  ["qa.bmath.permutations_combinations"], "L3"),
        ("sd_bmath_calc_000001",  ["qa.bmath.calculus"],          "L2"),
        ("sd_bmath_calc_000002",  ["qa.bmath.calculus"],          "L3"),
        # Logical Reasoning
        ("sd_lr_series_000001",   ["qa.lr.series_coding"],        "L1"),
        ("sd_lr_series_000002",   ["qa.lr.series_coding"],        "L2"),
        ("sd_lr_series_000003",   ["qa.lr.series_coding"],        "L3"),
        ("sd_lr_dir_000001",      ["qa.lr.direction_tests"],      "L1"),
        ("sd_lr_dir_000002",      ["qa.lr.direction_tests"],      "L2"),
        ("sd_lr_seat_000001",     ["qa.lr.seating"],              "L2"),
        ("sd_lr_blood_000001",    ["qa.lr.blood_relations"],      "L2"),
        # Statistics
        ("sd_stats_data_000001",  ["qa.stats.data_representation"], "L1"),
        ("sd_stats_data_000002",  ["qa.stats.data_representation"], "L2"),
        ("sd_stats_cent_000001",  ["qa.stats.central_tendency_dispersion"], "L1"),
        ("sd_stats_cent_000002",  ["qa.stats.central_tendency_dispersion"], "L2"),
        ("sd_stats_cent_000003",  ["qa.stats.central_tendency_dispersion"], "L3"),
        ("sd_stats_prob_000001",  ["qa.stats.probability"],       "L2"),
        ("sd_stats_prob_000002",  ["qa.stats.probability"],       "L3"),
        ("sd_stats_dist_000001",  ["qa.stats.distributions"],     "L2"),
        ("sd_stats_corr_000001",  ["qa.stats.correlation_regression"], "L2"),
        ("sd_stats_idx_000001",   ["qa.stats.index_numbers"],     "L2"),
    ]

    for item_id, tests, difficulty in specs:
        items[item_id] = {
            "tests": tests,
            "difficulty_label": difficulty,
        }

    return items


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _parse_iso(iso: str) -> datetime.datetime:
    s = iso.strip().replace("Z", "+00:00")
    try:
        return datetime.datetime.fromisoformat(s)
    except ValueError:
        return datetime.datetime.fromisoformat(s[:19]).replace(
            tzinfo=datetime.timezone.utc
        )
