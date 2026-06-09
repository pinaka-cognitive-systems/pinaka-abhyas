"""Blueprint mock assembler — deterministic question-paper assembly.

Given a bank, a blueprint, and an integer seed, allocate items per part and family
following the blueprint weightages. Deterministic: uses random.Random(seed) only —
no global random, no wall-clock. Pure-functional core; no side effects.

PROVISIONAL THRESHOLDS — tune after the beta bank.
"""

import random
from collections import defaultdict, Counter

# ---------------------------------------------------------------------------
# PROVISIONAL THRESHOLDS
# ---------------------------------------------------------------------------

DEFAULT_PAPER_SIZE = 100
"""Default number of questions in a full mock paper."""

MAX_PER_SUBTOPIC = 2
"""Maximum items from any single leaf subtopic in the assembled paper."""

DIFFICULTY_WEIGHTS = {"L1": 1, "L2": 2, "L3": 3}
"""Preference weights for sampling a difficulty spread (higher = preferred later)."""

ANSWER_POS_TARGET = 0.25
"""Target fraction of correct answers at each position (balanced)."""

# Part mark allocations — must match blueprint
PART_MARKS = {"qa.bmath": 40, "qa.lr": 20, "qa.stats": 40}
"""Mark (= question) allocation per part for a 100-question paper."""

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _part_for_item(item: dict) -> str | None:
    """Return the part id (qa.bmath / qa.lr / qa.stats) for an item, or None."""
    tests = item.get("tests", [])
    if not tests:
        return None
    subtopic = tests[0]
    for pid in PART_MARKS:
        if subtopic == pid or subtopic.startswith(pid + "."):
            return pid
    return None


def _family_for_item(item: dict, all_families: set) -> str | None:
    """Return the deepest matching blueprint family for an item's first test node."""
    tests = item.get("tests", [])
    if not tests:
        return None
    subtopic = tests[0]
    matched = None
    for fam in all_families:
        if subtopic == fam or subtopic.startswith(fam + "."):
            if matched is None or len(fam) > len(matched):
                matched = fam
    return matched


def _subtopic_for_item(item: dict) -> str | None:
    tests = item.get("tests", [])
    return tests[0] if tests else None


def _all_families(blueprint: dict) -> set:
    """Collect all family ids from the blueprint."""
    fams = set()
    for part in blueprint.get("parts", []):
        for sec in part.get("sections", []):
            for fam in sec.get("families", []):
                fams.add(fam)
    return fams


def _family_weight_midpoints(blueprint: dict) -> dict:
    """Return {family_id: midpoint_weight} from blueprint section weightage ranges.

    For sections listing multiple families, split the midpoint equally among them.
    """
    weights: dict = {}
    for part in blueprint.get("parts", []):
        for sec in part.get("sections", []):
            fams = sec.get("families", [])
            if not fams:
                continue
            wrange = sec.get("weight_percent_of_part") or sec.get(
                "weight_percent_of_part_per_topic"
            )
            if wrange and len(wrange) == 2:
                mid = (wrange[0] + wrange[1]) / 2.0
            elif wrange and len(wrange) == 1:
                mid = float(wrange[0])
            else:
                mid = 100.0 / len(fams)
            per_fam = mid / len(fams)
            for fam in fams:
                weights[fam] = per_fam
    return weights


def _allocate_to_parts(size: int, blueprint: dict) -> dict:
    """Return {part_id: question_count} scaling PART_MARKS to the target size."""
    total_marks = sum(PART_MARKS.values())
    raw = {pid: (marks / total_marks) * size for pid, marks in PART_MARKS.items()}
    # Integer allocation preserving sum via largest-remainder
    floors = {pid: int(v) for pid, v in raw.items()}
    remainders = sorted(
        raw.items(), key=lambda kv: -(kv[1] - int(kv[1]))
    )
    deficit = size - sum(floors.values())
    for i in range(deficit):
        pid = remainders[i][0]
        floors[pid] += 1
    return floors


def _allocate_within_part(part_budget: int, families: list, weights: dict) -> dict:
    """Allocate question slots among families within a part.

    families: ordered list of family ids for the part.
    weights: {family_id: midpoint_weight}.
    Returns {family_id: int}.
    """
    total_w = sum(weights.get(f, 1.0) for f in families)
    raw = {
        f: (weights.get(f, 1.0) / total_w) * part_budget for f in families
    }
    floors = {f: int(v) for f, v in raw.items()}
    deficit = part_budget - sum(floors.values())
    remainders = sorted(raw.items(), key=lambda kv: -(kv[1] - int(kv[1])))
    for i in range(deficit):
        floors[remainders[i][0]] += 1
    return floors


def _near_dup_ids(items: list, threshold: float = 0.80) -> dict:
    """Return {item_id: {near-dup item_ids}} for quick exclusion during assembly.

    Uses word-shingle Jaccard, same as quality.py but imported here independently
    to keep modules decoupled (no import of quality.py).
    """
    import re

    def _norm(text):
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    def _shingles(text, k=3):
        words = _norm(text).split()
        if len(words) < k:
            return set(words) if words else set()
        return {tuple(words[i : i + k]) for i in range(len(words) - k + 1)}

    def _jaccard(a, b):
        if not a and not b:
            return 1.0
        u = a | b
        return len(a & b) / len(u) if u else 0.0

    ids = [item.get("id") for item in items]
    shingled = [_shingles(item.get("stem", "")) for item in items]
    result: dict = defaultdict(set)
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if _jaccard(shingled[i], shingled[j]) >= threshold:
                result[ids[i]].add(ids[j])
                result[ids[j]].add(ids[i])
    return dict(result)


# ---------------------------------------------------------------------------
# Core assembler
# ---------------------------------------------------------------------------


def assemble_mock(
    items: list,
    blueprint: dict,
    seed: int,
    size: int = DEFAULT_PAPER_SIZE,
) -> dict:
    """Deterministically assemble a mock paper from a bank.

    Parameters
    ----------
    items     : list of item dicts (the bank)
    blueprint : the blueprint JSON dict
    seed      : integer seed for random.Random (no global random used)
    size      : target paper size (default 100)

    Returns
    -------
    {
        "items":                [ordered item ids],
        "by_part":              {part_id: [item_ids]},
        "by_family":            {family_id: [item_ids]},
        "answer_position_counts": {key: int},
        "max_marks":            int,
        "shortfalls":           [{"scope": str, "needed": int, "available": int}],
        "seed":                 int,
        "size_requested":       int,
        "size_assembled":       int,
    }
    """
    rng = random.Random(seed)

    all_fams = _all_families(blueprint)
    fam_weights = _family_weight_midpoints(blueprint)

    # Pre-compute maps
    item_by_id = {item.get("id"): item for item in items}
    near_dups = _near_dup_ids(items)

    # Group items by family
    by_family: dict = defaultdict(list)
    for item in items:
        fam = _family_for_item(item, all_fams)
        if fam:
            by_family[fam].append(item)

    # Part allocations
    part_alloc = _allocate_to_parts(size, blueprint)

    # Part -> families map (preserving blueprint order)
    part_families_ordered: dict = {}
    for part in blueprint.get("parts", []):
        pid = part["id"]
        fams = []
        for sec in part.get("sections", []):
            for fam in sec.get("families", []):
                fams.append(fam)
        part_families_ordered[pid] = fams

    selected_ids: list = []
    by_part_result: dict = defaultdict(list)
    by_family_result: dict = defaultdict(list)
    shortfalls: list = []
    pos_counts: Counter = Counter()
    selected_set: set = set()

    for part in blueprint.get("parts", []):
        pid = part["id"]
        budget = part_alloc.get(pid, 0)
        families = part_families_ordered.get(pid, [])

        fam_budgets = _allocate_within_part(budget, families, fam_weights)

        for fam in families:
            fam_budget = fam_budgets.get(fam, 0)
            if fam_budget == 0:
                continue

            candidates = [
                item for item in by_family.get(fam, [])
                if item.get("id") not in selected_set
            ]

            # Shuffle deterministically
            rng.shuffle(candidates)

            # Sort by difficulty spread preference: prefer L1/L3 first for variety
            # (stable sort preserving shuffle within same difficulty)
            diff_order = {"L1": 0, "L2": 1, "L3": 2}
            # We want spread: pick in order L1, L3, L2, L1, L3, L2...
            # Simplest deterministic spread: sort cycle [L1, L3, L2]
            spread_order = {"L1": 0, "L3": 1, "L2": 2}
            candidates.sort(key=lambda it: spread_order.get(it.get("difficulty_label", "L2"), 1))

            subtopic_counts: Counter = Counter()
            chosen: list = []

            for candidate in candidates:
                if len(chosen) >= fam_budget:
                    break
                cid = candidate.get("id")
                subtopic = _subtopic_for_item(candidate)

                # Cap per subtopic
                if subtopic and subtopic_counts[subtopic] >= MAX_PER_SUBTOPIC:
                    continue

                # Exclude near-duplicates of already selected items
                if any(nd in selected_set for nd in near_dups.get(cid, set())):
                    continue

                chosen.append(candidate)
                if subtopic:
                    subtopic_counts[subtopic] += 1

            n_chosen = len(chosen)
            available_total = len(by_family.get(fam, []))

            if n_chosen < fam_budget:
                shortfalls.append(
                    {
                        "scope": fam,
                        "needed": fam_budget,
                        "available": min(n_chosen, available_total),
                    }
                )

            for item in chosen:
                iid = item.get("id")
                selected_ids.append(iid)
                selected_set.add(iid)
                by_part_result[pid].append(iid)
                by_family_result[fam].append(iid)
                correct = item.get("answer_key", {}).get("correct")
                if correct is not None:
                    pos_counts[correct] += 1

    return {
        "items": selected_ids,
        "by_part": dict(by_part_result),
        "by_family": dict(by_family_result),
        "answer_position_counts": dict(pos_counts),
        "max_marks": len(selected_ids),
        "shortfalls": shortfalls,
        "seed": seed,
        "size_requested": size,
        "size_assembled": len(selected_ids),
    }


def summarise_assembly(result: dict) -> str:
    """Return a human-readable summary of an assemble_mock result."""
    lines = []
    lines.append(
        f"Assembly: seed={result['seed']}  requested={result['size_requested']}  "
        f"assembled={result['size_assembled']}  max_marks={result['max_marks']}"
    )
    lines.append("")

    lines.append("By part:")
    for pid, ids in result["by_part"].items():
        lines.append(f"  {pid}: {len(ids)} items")

    lines.append("")
    lines.append("By family:")
    for fam, ids in result["by_family"].items():
        lines.append(f"  {fam}: {len(ids)} items")

    lines.append("")
    lines.append("Answer position distribution:")
    pos = result["answer_position_counts"]
    total = sum(pos.values())
    for k in sorted(pos):
        lines.append(f"  key {k}: {pos[k]} ({pos[k]/total:.0%})" if total else f"  key {k}: {pos[k]}")

    shortfalls = result.get("shortfalls", [])
    if shortfalls:
        lines.append("")
        lines.append(f"SHORTFALLS ({len(shortfalls)} families cannot be fully filled):")
        for sf in shortfalls:
            lines.append(
                f"  {sf['scope']}: needed {sf['needed']}, available {sf['available']} "
                f"(gap {sf['needed'] - sf['available']})"
            )
    else:
        lines.append("")
        lines.append("No shortfalls — bank can fully satisfy this paper size.")

    return "\n".join(lines)
