#!/usr/bin/env python3
"""run_quality.py — content-quality report + assembly dry-run.

Usage:
    python3 schema/validator/run_quality.py [ITEMS_DIR_OR_PACK_JSON]

Defaults to the genspike items directory when no argument is given.
Always exits 0 (advisory). Prints a structured WARN summary.
"""

import json
import os
import sys
import glob

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(os.path.dirname(_HERE))  # two levels up from validator/
_DEFAULT_ITEMS_DIR = os.path.join(
    _REPO_ROOT,
    "schema",
    "profiles",
    "ca-foundation-qa",
    "genspike",
    "items",
)
_BLUEPRINT_PATH = os.path.join(
    _REPO_ROOT, "schema", "profiles", "ca-foundation-qa", "blueprint.json"
)
_MISCONCEPTIONS_PATH = os.path.join(
    _REPO_ROOT, "schema", "profiles", "ca-foundation-qa", "misconceptions.json"
)

# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------


def load_items(path: str) -> list:
    """Load items from a directory of JSONs or a single pack.json file."""
    if os.path.isdir(path):
        files = sorted(glob.glob(os.path.join(path, "*.json")))
        items = []
        for f in files:
            with open(f) as fh:
                obj = json.load(fh)
            # Accept both bare items and pack envelopes
            if "items" in obj and isinstance(obj["items"], list):
                items.extend(obj["items"])
            else:
                items.append(obj)
        return items
    elif os.path.isfile(path):
        with open(path) as fh:
            obj = json.load(fh)
        if "items" in obj and isinstance(obj["items"], list):
            return obj["items"]
        return [obj]
    else:
        print(f"ERROR: path not found: {path}", file=sys.stderr)
        sys.exit(0)


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------

_HRULE = "=" * 72
_SRULE = "-" * 72


def _section(title: str) -> str:
    return f"\n{_HRULE}\n  {title}\n{_HRULE}"


def _status_badge(status: str) -> str:
    return "[PASS]" if status == "PASS" else "[WARN]"


def _print_item_warnings(item_warnings: dict) -> None:
    if not item_warnings:
        print("  No per-item lint warnings.")
        return
    for iid, warns in sorted(item_warnings.items()):
        for w in warns:
            print(f"  WARN  {iid}  {w['code']}  {w['message']}")


# ---------------------------------------------------------------------------
# Main report
# ---------------------------------------------------------------------------


def print_quality_report(report: dict) -> None:
    """Print the full quality report to stdout."""
    print(_section("CONTENT QUALITY REPORT"))
    print(f"\n  Bank size: {report['total_items']} items")
    print(f"  Total advisory warnings: {report['warn_count']}\n")

    # --- Per-item lint ---
    print(_SRULE)
    print("  PER-ITEM LINT")
    print(_SRULE)
    _print_item_warnings(report["item_warnings"])

    # --- Answer position ---
    pos = report["answer_position"]
    print(f"\n{_SRULE}")
    print(f"  ANSWER POSITION BALANCE  {_status_badge(pos['status'])}")
    print(_SRULE)
    counts = pos["counts"]
    fracs = pos["fractions"]
    for k in sorted(counts):
        bar = "#" * counts[k]
        print(f"  key {k}: {counts[k]:3d}  ({fracs.get(k, 0):.1%})  {bar}")
    for w in pos["warnings"]:
        print(f"  WARN: {w}")

    # --- Correct longest ---
    longest = report["correct_longest"]
    print(f"\n{_SRULE}")
    print(f"  CORRECT-OPTION LENGTH TELL  {_status_badge(longest['status'])}")
    print(_SRULE)
    print(f"  correct-is-unique-longest rate: {longest['rate']:.1%}")
    if longest["offending_ids"]:
        print(f"  offending items: {longest['offending_ids']}")
    for w in longest["warnings"]:
        print(f"  WARN: {w}")

    # --- Near duplicates ---
    dups = report["near_duplicates"]
    print(f"\n{_SRULE}")
    print(f"  NEAR-DUPLICATE STEMS  {_status_badge(dups['status'])}")
    print(_SRULE)
    if dups["clusters"]:
        for cl in dups["clusters"]:
            print(f"  cluster: {cl}")
    else:
        print("  No near-duplicate clusters found.")

    # --- Misconception usage ---
    misc = report["misconception_usage"]
    print(f"\n{_SRULE}")
    print(f"  MISCONCEPTION USAGE  {_status_badge(misc['status'])}")
    print(_SRULE)
    print(f"  Total wrong-option tags: {misc['total_tags']}")
    print("  Usage counts (sorted by frequency):")
    sorted_misc = sorted(misc["counts"].items(), key=lambda kv: -kv[1])
    for mid, cnt in sorted_misc:
        share = cnt / misc["total_tags"] if misc["total_tags"] else 0
        flag = "  <<< OVERUSED" if any(o["id"] == mid for o in misc["overused"]) else ""
        print(f"    {mid:40s} {cnt:3d}  ({share:.1%}){flag}")
    for w in misc["warnings"]:
        print(f"  WARN: {w}")
    if misc["never_used"]:
        print(f"  INFO: {len(misc['never_used'])} canon ids never used (coverage gap):")
        for mid in misc["never_used"]:
            print(f"    {mid}")

    # --- Difficulty ---
    diff = report["difficulty"]
    print(f"\n{_SRULE}")
    print(f"  DIFFICULTY DISTRIBUTION  {_status_badge(diff['status'])}")
    print(_SRULE)
    for level in ["L1", "L2", "L3"]:
        cnt = diff["counts"].get(level, 0)
        frac = diff["fractions"].get(level, 0)
        bar = "#" * cnt
        print(f"  {level}: {cnt:3d}  ({frac:.1%})  {bar}")
    for w in diff["warnings"]:
        print(f"  WARN: {w}")

    # --- Blueprint coverage ---
    cov = report["blueprint_coverage"]
    print(f"\n{_SRULE}")
    print(f"  BLUEPRINT COVERAGE  {_status_badge(cov['status'])}")
    print(_SRULE)
    print("  Items by part:")
    for pid, cnt in sorted(cov["by_part"].items()):
        print(f"    {pid}: {cnt}")
    print("  Items by family (non-zero only):")
    for fam, cnt in sorted(cov["by_family"].items()):
        if cnt > 0:
            print(f"    {fam}: {cnt}")
    if cov["gaps"]:
        print(f"  GAPS ({len(cov['gaps'])} families with zero items):")
        for fam in cov["gaps"]:
            print(f"    {fam}")
    for w in cov["part_share_warnings"]:
        print(f"  WARN: {w}")


def print_assembly_summary(assembly_result: dict) -> None:
    """Print the assembly dry-run summary."""
    from assemble import summarise_assembly

    print(_section("MOCK ASSEMBLER DRY-RUN (size=100, seed=42)"))
    print()
    print(summarise_assembly(assembly_result))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    # Determine input path
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
    else:
        input_path = _DEFAULT_ITEMS_DIR

    print(f"Loading items from: {input_path}")

    items = load_items(input_path)
    print(f"Loaded {len(items)} items.\n")

    # Load supporting files
    with open(_BLUEPRINT_PATH) as fh:
        blueprint = json.load(fh)
    with open(_MISCONCEPTIONS_PATH) as fh:
        misc_data = json.load(fh)
    canon_ids = {m["id"] for m in misc_data.get("misconceptions", [])}

    # Run quality checks
    from quality import run_quality_checks

    report = run_quality_checks(items, blueprint, canon_ids)
    print_quality_report(report)

    # Run assembler dry-run
    from assemble import assemble_mock

    assembly = assemble_mock(items, blueprint, seed=42, size=100)
    print_assembly_summary(assembly)

    # Final WARN summary
    print()
    print(_HRULE)
    print("  WARN SUMMARY")
    print(_HRULE)

    all_warnings = []

    for iid, warns in report["item_warnings"].items():
        for w in warns:
            all_warnings.append(f"[ITEM]     {iid}  {w['code']}  {w['message']}")

    for section_key, section_label in [
        ("answer_position", "ANSWER_POS"),
        ("correct_longest", "LONGEST"),
        ("near_duplicates", "NEAR_DUP"),
        ("misconception_usage", "MISCONCEPTION"),
        ("difficulty", "DIFFICULTY"),
        ("blueprint_coverage", "COVERAGE"),
    ]:
        for w in report[section_key]["warnings"]:
            all_warnings.append(f"[{section_label:14s}]  {w}")

    if all_warnings:
        for w in all_warnings:
            print(f"  WARN  {w}")
    else:
        print("  All checks passed — no warnings.")

    print()
    print(f"  Total items:    {report['total_items']}")
    print(f"  Total warnings: {report['warn_count']}")
    print(f"  Assembled:      {assembly['size_assembled']}/{assembly['size_requested']} questions")
    print(f"  Shortfalls:     {len(assembly['shortfalls'])} families")
    print()
    print("  Advisory only — exit 0.")
    # Always exit 0
    sys.exit(0)


if __name__ == "__main__":
    main()
