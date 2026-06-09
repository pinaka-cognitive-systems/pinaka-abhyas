"""
demo.py — run a synthetic student through the full Pinaka engine and print results.

Usage:
  python3 engine/demo.py          (from repo root)
  python3 demo.py                 (from engine/ directory)

No arguments required. Output is human-readable; intended for manual inspection.
"""
import sys
import os

# Allow running from engine/ or from repo root
_here = os.path.dirname(os.path.abspath(__file__))
_repo = os.path.dirname(_here)
if _repo not in sys.path:
    sys.path.insert(0, _repo)

from engine import mastery as mastery_mod
from engine import scheduler as sched_mod
from engine import selector as sel_mod
from engine import readiness as ready_mod
from engine.synthetic import SyntheticStudent, generate_events, make_item_bank
from engine.mastery import ranked_misconceptions
from engine.types import MasteryState, SchedulerState


def hr(char="-", width=70):
    print(char * width)


def section(title):
    print()
    hr("=")
    print(f"  {title}")
    hr("=")


def main():
    # -----------------------------------------------------------------------
    # 1. Define synthetic student
    # -----------------------------------------------------------------------
    section("Synthetic Student Profile")

    true_p = {
        # Business Mathematics — moderate to strong
        "qa.bmath.ratio_indices_log":           0.78,
        "qa.bmath.equations":                   0.72,
        "qa.bmath.inequalities":                0.65,
        "qa.bmath.finance":                     0.80,
        "qa.bmath.permutations_combinations":   0.60,
        "qa.bmath.sequence_series":             0.68,
        "qa.bmath.sets_functions":              0.55,
        "qa.bmath.calculus":                    0.50,
        # Logical Reasoning — average
        "qa.lr.series_coding":                  0.62,
        "qa.lr.direction_tests":                0.70,
        "qa.lr.seating":                        0.58,
        "qa.lr.blood_relations":                0.65,
        # Statistics — weak
        "qa.stats.data_representation":         0.45,
        "qa.stats.central_tendency_dispersion": 0.40,
        "qa.stats.probability":                 0.35,   # weakest
        "qa.stats.distributions":               0.38,
        "qa.stats.correlation_regression":      0.42,
        "qa.stats.index_numbers":               0.48,
    }

    prone_misconceptions = {
        "qa.stats.probability": ["mis_prob_conditional_confusion",
                                  "mis_prob_complement_error"],
        "qa.stats.central_tendency_dispersion": ["mis_stats_mean_median_swap"],
        "qa.bmath.calculus": ["mis_calc_chain_rule_omission"],
    }

    student = SyntheticStudent(
        true_p=true_p,
        prone_misconceptions=prone_misconceptions,
        seed=42,
    )

    print("True P(correct | L2) per node:")
    for node, p in sorted(true_p.items()):
        bar = "#" * int(p * 20)
        print(f"  {node:<50} {p:.2f}  {bar}")

    print(f"\nProne misconceptions:")
    for node, mcs in prone_misconceptions.items():
        print(f"  {node}: {', '.join(mcs)}")

    # -----------------------------------------------------------------------
    # 2. Generate synthetic event history (simulate ~5 weeks of study)
    # -----------------------------------------------------------------------
    section("Generating Event History")

    item_bank = make_item_bank()
    events = generate_events(
        student=student,
        item_bank=item_bank,
        num_events=120,
        start_iso="2024-01-15T09:00:00+00:00",
        session_gap_hours=22,
        items_per_session=8,
    )
    print(f"Generated {len(events)} events over "
          f"{len(events) // 8 + 1} simulated sessions")
    correct_count = sum(1 for e in events if e.correct)
    print(f"Correct: {correct_count} / {len(events)} "
          f"({correct_count / len(events):.0%})")
    wrong_with_mis = sum(1 for e in events
                         if not e.correct and e.selected_misconception)
    print(f"Wrong with misconception: {wrong_with_mis}")

    # -----------------------------------------------------------------------
    # 3. Build mastery state
    # -----------------------------------------------------------------------
    section("Mastery State (per node)")

    mastery_state = mastery_mod.apply_events(events)
    node_masteries = sorted(
        mastery_state.nodes.values(),
        key=lambda nm: nm.p,
    )

    print(f"{'Node':<50}  {'P':>6}  {'Obs':>4}")
    hr()
    for nm in node_masteries:
        bar = "#" * int(nm.p * 20)
        print(f"  {nm.node_id:<48}  {nm.p:.3f}  {nm.observations:>4}  {bar}")

    # -----------------------------------------------------------------------
    # 4. Recurring misconceptions
    # -----------------------------------------------------------------------
    section("Misconception Tracker")

    reference_iso = "2024-03-31T09:00:00+00:00"  # ~75 days after start
    ranked = ranked_misconceptions(mastery_state, reference_iso=reference_iso)

    print(f"{'Misconception':<45}  {'Count':>5}  {'Recency':>8}  {'Recurring':>9}")
    hr()
    for ms in ranked:
        flag = "YES" if ms.is_recurring else "no"
        print(f"  {ms.misconception_id:<43}  {ms.hit_count:>5}  "
              f"{ms.recency_score:>8.4f}  {flag:>9}")
    if not ranked:
        print("  (no misconceptions recorded)")

    # -----------------------------------------------------------------------
    # 5. Scheduler: build state and show due queue
    # -----------------------------------------------------------------------
    section("Spaced-Repetition Schedule")

    active_misconception_ids = {
        ms.misconception_id for ms in ranked if ms.is_recurring
    }
    sched_state = sched_mod.apply_events(events, active_misconception_ids)

    # "Now" = a few weeks after last event, so some items are due
    now_iso = "2024-04-15T09:00:00+00:00"

    due = sched_mod.due_queue(
        sched_state,
        now_iso,
        active_misconception_items=set(),
    )

    print(f"Due queue at {now_iso[:10]} ({len(due)} items):")
    if due:
        print(f"  {'Item':<35}  {'Due':>12}  {'Interval':>10}  {'Ease':>6}")
        hr()
        for s in due[:10]:
            print(f"  {s.item_id:<35}  {s.due_at[:10]:>12}  "
                  f"{s.interval_days:>10.1f}d  {s.ease:>6.2f}")
        if len(due) > 10:
            print(f"  ... and {len(due) - 10} more")
    else:
        print("  (no items due)")

    # -----------------------------------------------------------------------
    # 6. Next action
    # -----------------------------------------------------------------------
    section("Next Action")

    active_mis_nodes = set()
    for ms in ranked:
        if ms.is_recurring:
            # The nodes prone to this misconception
            for node, mcs in prone_misconceptions.items():
                if ms.misconception_id in mcs:
                    active_mis_nodes.add(node)

    action = sel_mod.select_next(
        mastery=mastery_state,
        scheduler_state=sched_state,
        item_bank=item_bank,
        now_iso=now_iso,
        recently_served=set(),
        active_misconception_nodes=active_mis_nodes,
        active_misconception_items=set(),
    )

    print(f"Action:   {action.action.upper()}")
    print(f"Item ID:  {action.item_id or '(none)'}")
    print(f"Reason:   {action.reason}")

    # -----------------------------------------------------------------------
    # 7. Readiness estimate
    # -----------------------------------------------------------------------
    section("Readiness Estimate (CA Foundation Paper 3 QA)")

    result = ready_mod.estimate_readiness(mastery_state)

    print(f"is_estimate:      {result.is_estimate}  (always True)")
    print(f"label:            {result.label}")
    if result.predicted_mark is not None:
        print(f"predicted_mark:   {result.predicted_mark:.1f} / 100")
        print(f"confidence_band:  [{result.low:.1f}, {result.high:.1f}]")
        print(f"distance_to_pass: {result.distance_to_pass:+.1f} marks")
        band_width = result.high - result.low
        print(f"band_width:       {band_width:.1f} marks")
    else:
        print("predicted_mark:   (not available — insufficient data)")
    print(f"\nAssumption: {result.assumption}")

    # -----------------------------------------------------------------------
    # 8. Readiness progression (before vs after improvement simulation)
    # -----------------------------------------------------------------------
    section("Readiness Progression: Weak -> Improved")

    # Phase 1: early events only (first 30)
    state_early = mastery_mod.apply_events(events[:30])
    res_early = ready_mod.estimate_readiness(state_early)

    # Phase 2: all events
    res_full = ready_mod.estimate_readiness(mastery_state)

    print(f"{'Stage':<20}  {'Label':<20}  {'Predicted':>10}  {'Band':>20}")
    hr()

    def fmt_result(label, res):
        if res.predicted_mark is not None:
            return (f"  {label:<20}  {res.label:<20}  "
                    f"{res.predicted_mark:>10.1f}  "
                    f"[{res.low:.1f}, {res.high:.1f}]")
        return f"  {label:<20}  {res.label:<20}  {'N/A':>10}  {'N/A':>20}"

    print(fmt_result("Early (30 events)", res_early))
    print(fmt_result("Full (120 events)", res_full))

    hr("=")
    print()
    print("Demo complete.")


if __name__ == "__main__":
    main()
