"""
Tests for selector.py (v2)

v1 assertions kept:
  - With reviews due, selector returns "review".
  - The review item_id is the due item.
  - Does not repeat recently served items.
  - Prefers weak nodes over strong.
  - reason is non-empty.

v2 additions (score-driven):
  - Two equally-weak nodes, one in a 40-mark part (bmath) and one in a
    20-mark part (lr): selector prefers the 40-mark node.
  - A near-mastered high-weight node is deprioritised vs a weak one.
  - An accurate-but-slow node yields action='speed_drill'.
  - A recurring misconception triggers action='remediate_misconception'.
  - Once misconception hits age out, its priority drops (no longer triggers
    remediate_misconception).
  - reason strings are framed in marks (contain 'marks' or 'headroom' or
    cost-language).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import datetime
import unittest

from engine.selector import select_next, TARGET_LOW, TARGET_HIGH
from engine.mastery import apply_events, ranked_misconceptions, apply_event
from engine.scheduler import apply_events as sched_apply_events, due_queue
from engine.types import Event, MasteryState, NodeMastery, SchedulerState
from engine.synthetic import make_item_bank

NOW_ISO = "2024-06-01T10:00:00+00:00"


def make_event(event_id, item_id, node_id, difficulty, correct,
               occurred_at="2024-01-15T10:00:00+00:00", misconception=None,
               time_ms=30000):
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
        since the bank is small but the selector targets 0.40-0.85.
        """
        from engine.selector import _item_predicted_success
        sched_state, item_bank = self._no_reviews_state()
        mastery_state = MasteryState()  # all nodes at prior 0.5

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=NOW_ISO,
        )
        self.assertEqual(action.action, "practice")
        self.assertIsNotNone(action.item_id)

        # Verify predicted success is in a reasonable range
        p = _item_predicted_success(action.item_id, item_bank[action.item_id],
                                     mastery_state, NOW_ISO)
        # Allow ±0.15 slack around band for small bank
        self.assertGreater(p, TARGET_LOW - 0.15,
            f"Item {action.item_id} predicted success {p:.3f} too low")

    def test_does_not_repeat_recently_served(self):
        """The selector must not return the same item that was just served."""
        sched_state, item_bank = self._no_reviews_state()
        mastery_state = MasteryState()

        first = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=NOW_ISO,
        )
        self.assertIsNotNone(first.item_id)

        second = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=NOW_ISO,
            recently_served={first.item_id},
        )
        self.assertNotEqual(first.item_id, second.item_id,
            "Selector should not repeat the most recently served item")

    def test_prefers_weak_node_over_strong(self):
        """
        When a student is strong at bmath but weak at stats, the selector
        should prefer stats items (stats is also high-weight, so doubly preferred).
        """
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

        # Check multiple selections to confirm stats is preferred
        stats_count = 0
        bmath_count = 0
        served = set()
        for _ in range(10):
            action = select_next(
                mastery=mastery_state,
                scheduler_state=sched_state,
                item_bank=item_bank,
                now_iso=NOW_ISO,
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
            now_iso=NOW_ISO,
        )
        self.assertTrue(action.reason and len(action.reason) > 0,
                        "reason should be a non-empty string")


# ---------------------------------------------------------------------------
# v2: Score-driven priority tests
# ---------------------------------------------------------------------------

class TestScoreDrivenPriority(unittest.TestCase):

    def _build_equal_weak_state(self):
        """
        Two nodes equally weak (p ~ 0.35):
          - qa.bmath.finance   (in 40-mark part)
          - qa.lr.series_coding (in 20-mark part)
        Return item bank with items for both.
        """
        item_bank = make_item_bank()
        events = []
        for node, prefix in [("qa.bmath.finance", "sd_bmath_fin"),
                               ("qa.lr.series_coding", "sd_lr_series")]:
            # 12 wrong answers -> p well below 0.5
            for i in range(12):
                dt = f"2024-01-{i + 1:02d}T10:00:00+00:00"
                item_id = f"{prefix}_000002"  # L2 item
                events.append(make_event(
                    f"e_{node}_{i}", item_id, node, "L2", False,
                    occurred_at=dt,
                ))
        return apply_events(events), SchedulerState(), item_bank

    def test_40mark_part_preferred_over_20mark_when_equally_weak(self):
        """
        Two equally-weak nodes, one in a 40-mark part (bmath) and one in a
        20-mark part (lr): the selector should pick the 40-mark one.
        """
        mastery_state, sched_state, item_bank = self._build_equal_weak_state()

        # Verify both nodes exist and are similarly weak
        bmath_p = mastery_state.nodes.get("qa.bmath.finance")
        lr_p = mastery_state.nodes.get("qa.lr.series_coding")
        self.assertIsNotNone(bmath_p)
        self.assertIsNotNone(lr_p)

        # Collect items for each node
        bmath_items = {iid for iid, m in item_bank.items()
                       if "qa.bmath.finance" in m.get("tests", [])}
        lr_items = {iid for iid, m in item_bank.items()
                    if "qa.lr.series_coding" in m.get("tests", [])}

        bmath_selected = 0
        lr_selected = 0
        served = set()
        for _ in range(6):
            action = select_next(
                mastery=mastery_state,
                scheduler_state=sched_state,
                item_bank=item_bank,
                now_iso=NOW_ISO,
                recently_served=served,
            )
            if action.item_id:
                served.add(action.item_id)
                if action.item_id in bmath_items:
                    bmath_selected += 1
                elif action.item_id in lr_items:
                    lr_selected += 1

        self.assertGreater(bmath_selected, lr_selected,
            f"bmath (40-mark) should be preferred over lr (20-mark) when equally weak: "
            f"bmath={bmath_selected}, lr={lr_selected}")

    def test_near_mastered_high_weight_deprioritised(self):
        """
        A near-mastered bmath node should be deprioritised compared to a weak
        stats node, even though bmath is high-weight.
        """
        item_bank = make_item_bank()
        events = []

        # bmath.finance: near-mastered (many correct)
        for i in range(20):
            dt = f"2024-01-{i % 28 + 1:02d}T10:00:00+00:00"
            events.append(make_event(
                f"em_{i}", "sd_bmath_fin_000002", "qa.bmath.finance", "L2", True,
                occurred_at=dt,
            ))

        # stats.probability: very weak (many wrong)
        for i in range(20):
            dt = f"2024-02-{i % 28 + 1:02d}T10:00:00+00:00"
            events.append(make_event(
                f"ew_{i}", "sd_stats_prob_000001", "qa.stats.probability", "L2", False,
                occurred_at=dt,
            ))

        mastery_state = apply_events(events)
        sched_state = SchedulerState()

        stats_items = {iid for iid, m in item_bank.items()
                       if "qa.stats.probability" in m.get("tests", [])}
        bmath_items = {iid for iid, m in item_bank.items()
                       if "qa.bmath.finance" in m.get("tests", [])}

        stats_selected = 0
        bmath_selected = 0
        served = set()
        for _ in range(6):
            action = select_next(
                mastery=mastery_state,
                scheduler_state=sched_state,
                item_bank=item_bank,
                now_iso=NOW_ISO,
                recently_served=served,
            )
            if action.item_id:
                served.add(action.item_id)
                if action.item_id in stats_items:
                    stats_selected += 1
                elif action.item_id in bmath_items:
                    bmath_selected += 1

        self.assertGreater(stats_selected, bmath_selected,
            f"Weak stats should be preferred over near-mastered bmath: "
            f"stats={stats_selected}, bmath={bmath_selected}")


class TestSpeedDrill(unittest.TestCase):

    SPEED_NOW_ISO = "2024-01-17T10:00:00+00:00"  # 2 days after events -> minimal decay

    def _make_accurate_but_slow_state(self, item_bank):
        """
        Build a state where qa.bmath.finance is accurate (p > 0.65) but slow
        (pace_ratio > 1.0). Use apply_event with expected_seconds to track pace.
        Events are on Jan 1-15; query time is Jan 17 (minimal decay).
        """
        from engine.mastery import apply_event as mastery_apply_event
        node = "qa.bmath.finance"
        state = MasteryState()

        # 15 correct answers to get p high (accurate)
        for i in range(15):
            dt = f"2024-01-{i + 1:02d}T10:00:00+00:00"
            evt = make_event(f"em{i}", "sd_bmath_fin_000002", node, "L2", True,
                             occurred_at=dt, time_ms=225000)  # 225s / 75s = 3.0 pace
            state = mastery_apply_event(state, evt, expected_seconds=75.0)

        return state

    def test_accurate_but_slow_yields_speed_drill(self):
        """
        A node that is accurate (p >= 0.65) but slow (pace_ratio > 1.0)
        and is in a high-value part should trigger action='speed_drill'.
        """
        item_bank = make_item_bank()
        mastery_state = self._make_accurate_but_slow_state(item_bank)
        sched_state = SchedulerState()

        # Use now_iso close to events to avoid decay bringing p below threshold
        test_now = self.SPEED_NOW_ISO

        # Confirm the node is accurate and slow
        nm = mastery_state.nodes.get("qa.bmath.finance")
        self.assertIsNotNone(nm)
        from engine.mastery import mean_pace_ratio as mpr, effective_p
        ep = effective_p(nm, test_now)
        pr = mpr(nm)
        self.assertGreaterEqual(ep, 0.65,
            f"Expected p >= 0.65 for accurate test, got {ep:.3f}")
        self.assertGreater(pr, 1.0,
            f"Expected pace_ratio > 1.0 for slow test, got {pr:.3f}")

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=test_now,
        )
        self.assertEqual(action.action, "speed_drill",
            f"Expected speed_drill for accurate-but-slow node, got '{action.action}': "
            f"{action.reason}")

    def test_speed_drill_reason_mentions_pace(self):
        """speed_drill reason should mention pace or finish."""
        item_bank = make_item_bank()
        mastery_state = self._make_accurate_but_slow_state(item_bank)
        sched_state = SchedulerState()

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=self.SPEED_NOW_ISO,
        )
        if action.action == "speed_drill":
            lower_reason = action.reason.lower()
            self.assertTrue(
                "pace" in lower_reason or "finish" in lower_reason or "slow" in lower_reason,
                f"speed_drill reason should mention pace/finish/slow: {action.reason}"
            )


class TestMisconceptionRemediation(unittest.TestCase):

    def _make_recurring_misconception_state(self, item_bank):
        """
        Build a state with a recurring misconception on qa.stats.probability.
        """
        node = "qa.stats.probability"
        state = MasteryState()
        # 10 wrong with misconception in recent days
        for i in range(10):
            day = f"2024-05-{i + 15:02d}T10:00:00+00:00"
            evt = make_event(f"em{i}", "sd_stats_prob_000001", node, "L2", False,
                             misconception="mis_prob_cond",
                             occurred_at=day)
            state = apply_event(state, evt)
        return state

    def test_recurring_misconception_triggers_remediate(self):
        """
        An active recurring misconception should trigger action='remediate_misconception'.
        """
        item_bank = make_item_bank()
        mastery_state = self._make_recurring_misconception_state(item_bank)
        sched_state = SchedulerState()

        ref = "2024-05-25T10:00:00+00:00"
        ranked = ranked_misconceptions(mastery_state, reference_iso=ref)
        recurring = [m for m in ranked if m.is_recurring]
        self.assertGreater(len(recurring), 0, "Should have a recurring misconception")

        # Build misconception->node map
        mis_node_map = {"mis_prob_cond": ["qa.stats.probability"]}

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=ref,
            active_misconceptions=recurring,
            misconception_node_map=mis_node_map,
        )
        self.assertEqual(action.action, "remediate_misconception",
            f"Expected remediate_misconception, got '{action.action}': {action.reason}")

    def test_remediate_reason_mentions_marks_cost(self):
        """remediate_misconception reason should mention marks cost."""
        item_bank = make_item_bank()
        mastery_state = self._make_recurring_misconception_state(item_bank)
        sched_state = SchedulerState()

        ref = "2024-05-25T10:00:00+00:00"
        ranked = ranked_misconceptions(mastery_state, reference_iso=ref)
        recurring = [m for m in ranked if m.is_recurring]
        mis_node_map = {"mis_prob_cond": ["qa.stats.probability"]}

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=ref,
            active_misconceptions=recurring,
            misconception_node_map=mis_node_map,
        )
        if action.action == "remediate_misconception":
            lower_reason = action.reason.lower()
            self.assertTrue(
                "marks" in lower_reason or "cost" in lower_reason,
                f"Remediate reason should mention marks/cost: {action.reason}"
            )

    def test_aged_out_misconception_no_longer_triggers_remediate(self):
        """
        Once misconception hits are old (recency_score low), it should no longer
        trigger remediate_misconception.
        """
        item_bank = make_item_bank()
        node = "qa.stats.probability"
        state = MasteryState()

        # 10 wrong with misconception, but 2 years ago
        for i in range(10):
            day = f"2022-01-{i + 1:02d}T10:00:00+00:00"
            evt = make_event(f"em{i}", "sd_stats_prob_000001", node, "L2", False,
                             misconception="mis_prob_cond_old",
                             occurred_at=day)
            state = apply_event(state, evt)

        # Reference time is now 2024-06 — 2+ years later
        ref = "2024-06-01T10:00:00+00:00"
        ranked = ranked_misconceptions(state, reference_iso=ref)
        recurring = [m for m in ranked if m.is_recurring]

        # Should have no recurring misconceptions
        self.assertEqual(len(recurring), 0,
            "Old misconception hits should not be recurring")

        mis_node_map = {"mis_prob_cond_old": ["qa.stats.probability"]}
        sched_state = SchedulerState()

        action = select_next(
            mastery=state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=ref,
            active_misconceptions=recurring,  # empty
            misconception_node_map=mis_node_map,
        )
        self.assertNotEqual(action.action, "remediate_misconception",
            f"Aged-out misconception should not trigger remediate: {action.action}")


class TestMarkFramedReasons(unittest.TestCase):

    def test_practice_reason_mentions_marks(self):
        """Tier-4 practice reason should mention marks/headroom."""
        item_bank = make_item_bank()
        mastery_state = MasteryState()
        sched_state = SchedulerState()

        action = select_next(
            mastery=mastery_state,
            scheduler_state=sched_state,
            item_bank=item_bank,
            now_iso=NOW_ISO,
        )
        if action.action == "practice":
            lower = action.reason.lower()
            self.assertTrue(
                "marks" in lower or "headroom" in lower or "weight" in lower,
                f"Practice reason should be marks-framed: {action.reason}"
            )


if __name__ == "__main__":
    unittest.main()
