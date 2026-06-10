"""
demo.py — run a synthetic student through the Pinaka engine v2 (score-driven).

Usage:
  python3 prototypes/engine-py/demo.py   (from repo root)
  python3 demo.py                        (from prototypes/engine-py/ directory)

Output includes:
  - Predicted mark under smart-attempt policy
  - Time feasibility
  - Next action framed in marks (headroom, marks cost of misconceptions)
  - Top recurring misconception
  - Readiness estimate with honest confidence band

No arguments required.
"""
import sys
import os
import importlib.util as _ilu

_here = os.path.dirname(os.path.abspath(__file__))
_prototypes = os.path.dirname(_here)
if _prototypes not in sys.path:
    sys.path.insert(0, _prototypes)

# Register modules under the "engine" namespace so this file can be run directly.
# (The package directory is named engine-py, not engine, so we register manually.)
if "engine" not in sys.modules:
    _spec = _ilu.spec_from_file_location(
        "engine", os.path.join(_here, "__init__.py"),
        submodule_search_locations=[_here])
    _pkg = _ilu.module_from_spec(_spec)
    sys.modules["engine"] = _pkg
    _spec.loader.exec_module(_pkg)
    for _m in ["mastery", "scheduler", "selector", "readiness",
               "synthetic", "types", "value"]:
        _mp = os.path.join(_here, f"{_m}.py")
        if os.path.exists(_mp):
            _ms = _ilu.spec_from_file_location(f"engine.{_m}", _mp)
            _mod = _ilu.module_from_spec(_ms)
            sys.modules[f"engine.{_m}"] = _mod
            _ms.loader.exec_module(_mod)
            setattr(_pkg, _m, _mod)

import engine.mastery as mastery_mod
import engine.scheduler as sched_mod
import engine.selector as sel_mod
import engine.readiness as ready_mod
from engine.mastery import ranked_misconceptions
from engine.synthetic import SyntheticStudent, generate_events, make_item_bank
from engine.types import MasteryState, SchedulerState


def hr(char="-", width=72):
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

    # v2: true pace (some nodes slow)
    true_pace = {
        "qa.bmath.finance":                     0.85,   # fast
        "qa.stats.probability":                 1.80,   # slow
        "qa.stats.central_tendency_dispersion": 1.60,   # slow
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
        true_pace=true_pace,
        seed=42,
    )

    print("True P(correct | L2) per node:")
    for node, p in sorted(true_p.items()):
        pace_tag = ""
        if node in true_pace and true_pace[node] > 1.0:
            pace_tag = f"  [pace {true_pace[node]:.1f}x SLOW]"
        bar = "#" * int(p * 20)
        print(f"  {node:<50} {p:.2f}  {bar}{pace_tag}")

    # -----------------------------------------------------------------------
    # 2. Generate synthetic event history (~5 weeks)
    # -----------------------------------------------------------------------
    section("Generating Event History")

    item_bank = make_item_bank()
    # Use a start_iso close to now_iso to avoid excessive time-decay in demo
    start_iso = "2024-05-15T09:00:00+00:00"
    events = generate_events(
        student=student,
        item_bank=item_bank,
        num_events=120,
        start_iso=start_iso,
        session_gap_hours=22,
        items_per_session=8,
    )
    print(f"Generated {len(events)} events over {len(events) // 8 + 1} simulated sessions")
    correct_count = sum(1 for e in events if e.correct)
    print(f"Correct: {correct_count} / {len(events)} ({correct_count / len(events):.0%})")
    wrong_with_mis = sum(1 for e in events if not e.correct and e.selected_misconception)
    print(f"Wrong with misconception: {wrong_with_mis}")

    # -----------------------------------------------------------------------
    # 3. Build mastery state (v2: with item_bank for pace tracking)
    # -----------------------------------------------------------------------
    section("Mastery State (per node, with speed tracking)")

    mastery_state = mastery_mod.apply_events(events, item_bank=item_bank)
    node_masteries = sorted(mastery_state.nodes.values(), key=lambda nm: nm.p)

    print(f"{'Node':<50}  {'P':>6}  {'Obs':>4}  {'PaceRatio':>10}  {'Speed':>8}")
    hr()
    for nm in node_masteries:
        from engine.mastery import mean_pace_ratio, pace_status
        pr = mean_pace_ratio(nm)
        ps = pace_status(nm)
        bar = "#" * int(nm.p * 20)
        print(f"  {nm.node_id:<48}  {nm.p:.3f}  {nm.observations:>4}  "
              f"{pr:>10.2f}  {ps:>8}  {bar}")

    # -----------------------------------------------------------------------
    # 4. Recurring misconceptions
    # -----------------------------------------------------------------------
    section("Misconception Tracker")

    now_iso = "2024-07-01T09:00:00+00:00"  # ~6 weeks after start
    ranked = ranked_misconceptions(mastery_state, reference_iso=now_iso)

    print(f"{'Misconception':<45}  {'Count':>5}  {'Recency':>8}  {'Recurring':>9}")
    hr()
    for ms in ranked:
        flag = "YES" if ms.is_recurring else "no"
        print(f"  {ms.misconception_id:<43}  {ms.hit_count:>5}  "
              f"{ms.recency_score:>8.4f}  {flag:>9}")
    if not ranked:
        print("  (no misconceptions recorded)")

    # -----------------------------------------------------------------------
    # 5. Readiness estimate (v2 — score-driven, honest)
    # -----------------------------------------------------------------------
    section("Readiness Estimate (v2 — score-driven, smart-attempt policy)")

    result = ready_mod.estimate_readiness(mastery_state, now_iso=now_iso)

    print(f"is_estimate:       {result.is_estimate}  (always True)")
    print(f"label:             {result.label}")
    print(f"confidence:        {result.confidence}")

    if result.predicted_mark is not None:
        print(f"predicted_mark:    {result.predicted_mark:.0f} / 100  "
              f"(under smart-attempt policy)")
        if result.naive_attempt_all_mark is not None:
            print(f"naive_mark:        {result.naive_attempt_all_mark:.0f} / 100  "
                  f"(if all 100 attempted)")
            improvement = result.predicted_mark - result.naive_attempt_all_mark
            if improvement > 0:
                print(f"  -> Smart strategy gains +{improvement:.0f} marks by skipping "
                      f"low-EV questions.")
        print(f"confidence_band:   [{result.low:.0f}, {result.high:.0f}]  "
              f"(rounded to nearest 5)")
        print(f"distance_to_pass:  {result.distance_to_pass:+.1f} marks  "
              f"(pass = 40)")
    else:
        print("predicted_mark:    (not available — insufficient data)")

    if result.time_feasible is not None:
        feasible_str = "YES" if result.time_feasible else "NO — will run out of time"
        print(f"time_feasible:     {feasible_str}")
    if result.est_minutes is not None:
        print(f"est_minutes:       {result.est_minutes:.0f} min  "
              f"(budget: 120 min)")

    if result.marks_lost_to_recurring_misconceptions is not None:
        print(f"marks_lost_to_misconceptions: ~{result.marks_lost_to_recurring_misconceptions:.1f}  "
              f"(approximate)")

    if result.note:
        print(f"\nNote: {result.note}")

    # -----------------------------------------------------------------------
    # 6. Scheduler: build state and show due queue
    # -----------------------------------------------------------------------
    section("Spaced-Repetition Schedule")

    active_misconception_ids = {ms.misconception_id for ms in ranked if ms.is_recurring}
    sched_state = sched_mod.apply_events(events, active_misconception_ids)

    due = sched_mod.due_queue(sched_state, now_iso, active_misconception_items=set())

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
    # 7. Next action (v2 — score-driven, 4-tier, marks-framed)
    # -----------------------------------------------------------------------
    section("Next Action (v2 — score-driven, marks-framed)")

    # Build misconception->node map from prone_misconceptions
    mis_node_map = {}
    for node, mcs in prone_misconceptions.items():
        for mc in mcs:
            mis_node_map.setdefault(mc, []).append(node)

    active_mis_nodes = set()
    recurring_mcs = [ms for ms in ranked if ms.is_recurring]
    for ms in recurring_mcs:
        for node in mis_node_map.get(ms.misconception_id, []):
            active_mis_nodes.add(node)

    action = sel_mod.select_next(
        mastery=mastery_state,
        scheduler_state=sched_state,
        item_bank=item_bank,
        now_iso=now_iso,
        recently_served=set(),
        active_misconception_nodes=active_mis_nodes,
        active_misconception_items=set(),
        active_misconceptions=recurring_mcs,
        misconception_node_map=mis_node_map,
    )

    print(f"Action:    {action.action.upper()}")
    print(f"Item ID:   {action.item_id or '(none)'}")
    print(f"Reason:    {action.reason}")

    # Show top 3 actions with reasoning
    print()
    print("Top 3 next actions (simulating 'mark done and pick next'):")
    print("  Note: due reviews are always served; recently_served does not skip them.")
    # To show variety, use a different scheduler for iterations 2-3
    # (simulate that earlier due items have been answered)
    from engine.types import SchedulerState as SS
    sched_for_iter = [sched_state]
    served_for_iter: list = [set()]
    # For each subsequent pick, pretend the previous due item was answered correctly
    for i in range(2):
        prev = sched_for_iter[-1]
        due_now = sched_mod.due_queue(prev, now_iso)
        if due_now:
            first_item = due_now[0].item_id
            import engine.types as _t
            # Synthesise a correct answer at now_iso so it leaves the due queue
            fake_evt = _t.Event(
                event_id=f"demo_fake_{i}",
                item_id=first_item,
                tests=item_bank.get(first_item, {}).get("tests", []),
                difficulty_label="L2",
                mode="review",
                correct=True,
                selected_misconception=None,
                occurred_at=now_iso,
                time_ms=60000,
                resurfaced=True,
            )
            next_sched = sched_mod.apply_event(prev, fake_evt)
            sched_for_iter.append(next_sched)
        else:
            sched_for_iter.append(prev)
        served_for_iter.append(set())

    for i in range(3):
        a = sel_mod.select_next(
            mastery=mastery_state,
            scheduler_state=sched_for_iter[i],
            item_bank=item_bank,
            now_iso=now_iso,
            recently_served=served_for_iter[i],
            active_misconception_nodes=active_mis_nodes,
            active_misconception_items=set(),
            active_misconceptions=recurring_mcs,
            misconception_node_map=mis_node_map,
        )
        print(f"  {i+1}. [{a.action}] {a.item_id or '(none)'}")
        print(f"     {a.reason}")

    # -----------------------------------------------------------------------
    # 8. Readiness progression
    # -----------------------------------------------------------------------
    section("Readiness Progression: Early vs Full History")

    state_early = mastery_mod.apply_events(events[:30], item_bank=item_bank)
    early_now = "2024-06-01T09:00:00+00:00"  # close to early events
    res_early = ready_mod.estimate_readiness(state_early, now_iso=early_now)
    res_full = ready_mod.estimate_readiness(mastery_state, now_iso=now_iso)

    def fmt_result(label, res):
        if res.predicted_mark is not None:
            band = f"[{res.low:.0f},{res.high:.0f}]"
            return (f"  {label:<22}  {res.label:<15}  "
                    f"{res.predicted_mark:>6.0f}  {band:>12}  "
                    f"{res.confidence:>6}")
        return f"  {label:<22}  {res.label:<15}  {'N/A':>6}  {'N/A':>12}  {res.confidence:>6}"

    print(f"  {'Stage':<22}  {'Label':<15}  {'Mark':>6}  {'Band':>12}  {'Conf':>6}")
    hr()
    print(fmt_result("Early (30 events)", res_early))
    print(fmt_result("Full (120 events)", res_full))

    hr("=")
    print()
    print("Demo complete. All readiness figures are estimates (is_estimate=True).")
    print("Parameters are provisional — real calibration from the beta cohort.")


if __name__ == "__main__":
    main()
