#!/usr/bin/env python3
"""Pilot funnel runner for staged item batches.

Evaluates candidate items in a staging dir against every hard gate before they
touch the real pack. Writes a machine-readable report and exits nonzero if any
staged item fails.

Usage:
    python3 tools/funnel.py --staging packs/ca-foundation-qa/staging/batch-XX
    python3 tools/funnel.py --staging packs/ca-foundation-qa/staging/batch-XX \\
        --pack-dir packs/ca-foundation-qa
    python3 tools/funnel.py --staging packs/ca-foundation-qa/staging/batch-XX \\
        --promote
    python3 tools/funnel.py --self-test
    python3 tools/funnel.py --self-test --pack-dir /tmp/copy-of-pack

Options:
    --staging DIR    Path to a staging batch dir that contains items/ and solutions/.
    --pack-dir DIR   Path to the real pack dir (default: packs/ca-foundation-qa
                     relative to the repo root detected from this script's location).
    --promote        After passing the funnel, move PASS items into the real pack
                     and verify the pack stays green. Requires a current
                     funnel_report.json in the staging dir.
    --self-test      Run the built-in self-test with a scratch /tmp staging dir
                     and a /tmp copy of the real pack. Does not modify the repo.

Stages per item (each recorded in the report):
  (a) TIER1_SCHEMA    JSON Schema validation (Core + Profile via referencing registry)
  (b) TIER2_CROSSREC  Cross-record pack checks over the union of real + staged items
  (c) SOLUTION        Solution harness: solve() reproduces the answer key
  (d) QUALITY         Strict quality + B1 readability lint (gating for generated batches)

The funnel only judges; the caller decides what to do with rejects.
"""

import argparse
import copy
import datetime
import json
import pathlib
import shutil
import sys
import tempfile

# ---------------------------------------------------------------------------
# Locate the repo and the validator package.
# ---------------------------------------------------------------------------

_HERE = pathlib.Path(__file__).resolve().parent          # tools/
_REPO_ROOT = _HERE.parent                                # repo root
_VALIDATOR_DIR = _REPO_ROOT / "schema" / "validator"
_SCHEMA_DIR = _REPO_ROOT / "schema"
_PROFILE_DIR = _SCHEMA_DIR / "profiles" / "ca-foundation-qa"
_DEFAULT_PACK_DIR = _REPO_ROOT / "packs" / "ca-foundation-qa"

# Make the validator package importable (same pattern as run_checks.py).
sys.path.insert(0, str(_VALIDATOR_DIR))

import canonical
import pack_validator as pv
import run_solutions
from quality import lint_item, lint_b1_readability
from referencing import Registry, Resource

# ---------------------------------------------------------------------------
# Load schema + taxonomy once at module level (shared by all funnel runs).
# ---------------------------------------------------------------------------

_CORE = json.loads((_SCHEMA_DIR / "core" / "uqs-core.schema.json").read_text())
_SCHEMA = json.loads((_PROFILE_DIR / "ca-foundation-qa.schema.json").read_text())
_REGISTRY = Registry().with_resource(_CORE["$id"], Resource.from_contents(_CORE))


def _build_node_ancestors(nodes):
    parent = {n["id"]: n.get("parent") for n in nodes}
    ancestors = {}
    for node_id in parent:
        chain = set()
        cur = node_id
        while cur:
            chain.add(cur)
            cur = parent.get(cur)
        ancestors[node_id] = chain
    return ancestors


def _load_taxonomy():
    tax = json.loads((_PROFILE_DIR / "taxonomy.json").read_text())
    misc = json.loads((_PROFILE_DIR / "misconceptions.json").read_text())
    misc_version = misc.get("taxonomy_version") or misc.get("version")
    allowlist_path = _VALIDATOR_DIR / "family_scoping_allowlist.json"
    family_scoping_allowlist = set()
    if allowlist_path.exists():
        data = json.loads(allowlist_path.read_text())
        for entry in data.get("allowlist", []):
            family_scoping_allowlist.add(
                (entry["item_id"], entry["option_key"], entry["misconception"])
            )
    return {
        "nodes": {n["id"] for n in tax["nodes"]},
        "abstract_nodes": {n["id"] for n in tax["nodes"] if n.get("abstract")},
        "node_ancestors": _build_node_ancestors(tax["nodes"]),
        "misconceptions": {m["id"] for m in misc["misconceptions"]},
        "misconception_families": {m["id"]: m.get("families", []) for m in misc["misconceptions"]},
        "family_scoping_allowlist": family_scoping_allowlist,
        "difficulty_scale": tax["difficulty_scale"],
        "taxonomy_version": tax.get("taxonomy_version"),
        "misconception_version": misc_version,
    }


_TAX = _load_taxonomy()

# ---------------------------------------------------------------------------
# Helpers: load item files from a directory.
# ---------------------------------------------------------------------------


def _load_items_from_dir(items_dir: pathlib.Path) -> list:
    """Load every *.json file in items_dir as a bare item dict."""
    items = []
    for p in sorted(items_dir.glob("*.json")):
        items.append(json.loads(p.read_text()))
    return items


def _load_real_pack_items(pack_dir: pathlib.Path) -> list:
    """Load items from the real pack's items/ directory."""
    return _load_items_from_dir(pack_dir / "items")


# ---------------------------------------------------------------------------
# Stage (d): strict quality + B1 readability lint per item.
# ---------------------------------------------------------------------------

# Quality codes that are hard gates for generated batches.
_HARD_QUALITY_CODES = {
    "STYLE",
    "OPTIONS_DUPLICATE",
    "CORRECT_LONGEST",
    "RATIONALE_THIN",
    "RATIONALE_STOCK",
    "B1_READABILITY",
}


def _run_quality_stage(item: dict) -> tuple:
    """Return (passed: bool, violations: list[str]).

    Runs lint_item and lint_b1_readability, treats every warning as a hard gate
    per the content-pipeline spec: "anything advisory today is gating for
    generated batches."
    """
    warns = lint_item(item) + lint_b1_readability(item)
    codes = [w["code"] + ": " + w["message"] for w in warns]
    passed = len(warns) == 0
    return passed, codes


# ---------------------------------------------------------------------------
# Build a merged temp pack (real items + staged items) for cross-record checks.
# ---------------------------------------------------------------------------


def _build_merged_temp_dir(
    staged_items_dir: pathlib.Path,
    staged_solutions_dir: pathlib.Path,
    real_pack_dir: pathlib.Path,
) -> tempfile.TemporaryDirectory:
    """Create a temp dir with items/ and solutions/ merged from real and staged.

    Returns (TemporaryDirectory, pathlib.Path to temp root).
    The caller must keep a reference to TemporaryDirectory to avoid cleanup.
    """
    tmp = tempfile.TemporaryDirectory(prefix="funnel_merge_")
    tmp_root = pathlib.Path(tmp.name)
    tmp_items = tmp_root / "items"
    tmp_solutions = tmp_root / "solutions"
    tmp_items.mkdir()
    tmp_solutions.mkdir()

    # Copy real pack items and solutions.
    real_items_dir = real_pack_dir / "items"
    real_solutions_dir = real_pack_dir / "solutions"
    if real_items_dir.is_dir():
        for f in real_items_dir.glob("*.json"):
            shutil.copy2(f, tmp_items / f.name)
    if real_solutions_dir.is_dir():
        for f in real_solutions_dir.iterdir():
            if f.is_file():  # skip __pycache__ dirs and other non-files
                shutil.copy2(f, tmp_solutions / f.name)

    # Copy staged items and solutions on top (staged wins on name clash).
    if staged_items_dir.is_dir():
        for f in staged_items_dir.glob("*.json"):
            shutil.copy2(f, tmp_items / f.name)
    if staged_solutions_dir.is_dir():
        for f in staged_solutions_dir.iterdir():
            if f.is_file():
                shutil.copy2(f, tmp_solutions / f.name)

    return tmp, tmp_root


# ---------------------------------------------------------------------------
# Core per-item funnel runner.
# ---------------------------------------------------------------------------


def _stage_result(passed: bool, codes: list) -> dict:
    return {"passed": passed, "violations": codes}


def run_funnel(
    staging_dir: pathlib.Path,
    pack_dir: pathlib.Path,
    verbose: bool = True,
) -> dict:
    """Evaluate staged items against every hard gate.

    Returns a report dict:
    {
      "batch": str,
      "generated_at": str (ISO-8601),
      "items": {
        item_id: {
          "verdict": "PASS" | "FAIL",
          "stages": {
            "tier1_schema": {"passed": bool, "violations": [str]},
            "tier2_crossrec": {"passed": bool, "violations": [str]},
            "solution": {"passed": bool, "violations": [str]},
            "quality": {"passed": bool, "violations": [str]},
          }
        }
      },
      "totals": {"pass": int, "fail": int, "total": int},
    }
    """
    staging_items_dir = staging_dir / "items"
    staging_solutions_dir = staging_dir / "solutions"

    if not staging_items_dir.is_dir():
        raise SystemExit(f"ERROR: staging items dir not found: {staging_items_dir}")

    staged_items = _load_items_from_dir(staging_items_dir)
    if not staged_items:
        raise SystemExit(f"ERROR: no *.json files found in {staging_items_dir}")

    staged_ids = {item.get("id") for item in staged_items}

    # Build merged temp dir for Tier-2 cross-record checks.
    tmp, tmp_root = _build_merged_temp_dir(
        staging_items_dir, staging_solutions_dir, pack_dir
    )

    try:
        # Stamp content_hash for all merged items so hash checks pass.
        merged_items = _load_items_from_dir(tmp_root / "items")
        merged_pack = {"items": merged_items, "assets": []}
        canonical.stamp_pack(merged_pack)
        # Write stamped items back so pack_validator can re-read them.
        # (pack_validator takes a pack dict directly so we just use merged_pack.)

        # Tier-2: run validate_pack over the full merged set.
        # pack_root points at the merged temp dir so solution-file existence checks
        # resolve correctly for both real and staged paths.
        tier2_violations = pv.validate_pack(
            merged_pack, _TAX, _SCHEMA, _REGISTRY, pack_root=tmp_root
        )

        # Index violations by item_id; keep only violations attributed to staged items.
        tier2_by_item: dict = {}
        for v in tier2_violations:
            if v.item_id in staged_ids:
                tier2_by_item.setdefault(v.item_id, []).append(
                    f"{v.code}: {v.message}"
                )

    finally:
        tmp.cleanup()

    # Per-item Tier-1 schema validation (separate pass to get per-item codes).
    from jsonschema import Draft202012Validator, FormatChecker
    schema_validator = Draft202012Validator(
        _SCHEMA, registry=_REGISTRY, format_checker=FormatChecker()
    )

    # Build report.
    report_items = {}
    n_pass = 0
    n_fail = 0

    for item in staged_items:
        iid = item.get("id", "<no-id>")

        # --- Stage (a): Tier-1 schema ---
        tier1_codes = [err.message for err in schema_validator.iter_errors(item)]
        tier1_ok = len(tier1_codes) == 0
        s_tier1 = _stage_result(tier1_ok, tier1_codes)

        # --- Stage (b): Tier-2 cross-record ---
        t2_codes = tier2_by_item.get(iid, [])
        tier2_ok = len(t2_codes) == 0
        s_tier2 = _stage_result(tier2_ok, t2_codes)

        # --- Stage (c): solution harness ---
        # Resolve solution path against staging solutions dir.
        solution = item.get("solution")
        sol_ok = False
        sol_codes = []
        if solution:
            sol_path_rel = solution.get("path", "")
            # The path is relative to pack root, e.g. "solutions/foo.py".
            # For staging items the solution file is under staging_dir.
            # Normalise: strip any leading "solutions/" prefix and look in staging.
            sol_filename = pathlib.Path(sol_path_rel).name
            sol_candidate = staging_solutions_dir / sol_filename
            if sol_candidate.exists():
                # Temporarily point solution path at the staging solutions dir
                # so verify_item can find it.
                patched_item = copy.deepcopy(item)
                patched_item["solution"]["path"] = f"solutions/{sol_filename}"
                status, code, detail = run_solutions.verify_item(
                    patched_item, staging_dir
                )
                if status == "PASS":
                    sol_ok = True
                else:
                    sol_codes = [f"{code}: {detail}"]
            else:
                sol_codes = [
                    f"SOLUTION_RUN_ERROR: solution file not found: {sol_path_rel}"
                ]
        else:
            # No solution field: not a hard gate for staging (item may be pending).
            sol_ok = True

        s_solution = _stage_result(sol_ok, sol_codes)

        # --- Stage (d): quality + B1 lint ---
        qual_ok, qual_codes = _run_quality_stage(item)
        s_quality = _stage_result(qual_ok, qual_codes)

        all_passed = tier1_ok and tier2_ok and sol_ok and qual_ok
        verdict = "PASS" if all_passed else "FAIL"
        if all_passed:
            n_pass += 1
        else:
            n_fail += 1

        report_items[iid] = {
            "verdict": verdict,
            "stages": {
                "tier1_schema": s_tier1,
                "tier2_crossrec": s_tier2,
                "solution": s_solution,
                "quality": s_quality,
            },
        }

        if verbose:
            _print_item_verdict(iid, verdict, report_items[iid]["stages"])

    totals = {"pass": n_pass, "fail": n_fail, "total": n_pass + n_fail}

    if verbose:
        print()
        print(f"funnel totals: {n_pass} PASS, {n_fail} FAIL, {n_pass + n_fail} total")

    report = {
        "batch": staging_dir.name,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "items": report_items,
        "totals": totals,
    }
    return report


def _print_item_verdict(iid: str, verdict: str, stages: dict) -> None:
    """Print one PASS/FAIL line per item, with violation codes on failure."""
    if verdict == "PASS":
        print(f"PASS  {iid}")
    else:
        failing = []
        for stage_name, s in stages.items():
            if not s["passed"]:
                for code in s["violations"]:
                    failing.append(f"{stage_name.upper()}/{code}")
        codes_str = " | ".join(failing) if failing else "unknown"
        print(f"FAIL  {iid}  [{codes_str}]")


# ---------------------------------------------------------------------------
# Promote: move PASS items from staging into the real pack, then re-verify.
# ---------------------------------------------------------------------------


def _promote(staging_dir: pathlib.Path, pack_dir: pathlib.Path) -> int:
    """Promote all PASS items from staging into pack_dir.

    Reads funnel_report.json in staging_dir. Refuses if it is missing or stale
    (items in staging not present in the report).

    Atomic per batch: if any post-move battery check fails, move everything
    back and report.

    Returns exit code: 0 = success, 1 = failure.
    """
    report_path = staging_dir / "funnel_report.json"
    if not report_path.exists():
        print(f"FAIL  promote refused: funnel_report.json not found in {staging_dir}")
        print("       Run the funnel first, then promote.")
        return 1

    report = json.loads(report_path.read_text())

    # Staleness check: every *.json in staging/items must appear in the report.
    staging_items_dir = staging_dir / "items"
    staging_solutions_dir = staging_dir / "solutions"
    current_ids = {p.stem for p in staging_items_dir.glob("*.json")}
    reported_ids = set(report.get("items", {}).keys())
    new_ids = current_ids - reported_ids
    if new_ids:
        print(
            f"FAIL  promote refused: staging dir contains items not in the report: "
            f"{sorted(new_ids)}"
        )
        print("       Re-run the funnel before promoting.")
        return 1

    pass_ids = [
        iid for iid, r in report["items"].items() if r["verdict"] == "PASS"
    ]
    if not pass_ids:
        print("INFO  nothing to promote (no PASS items in report)")
        return 0

    print(f"INFO  promoting {len(pass_ids)} item(s): {pass_ids}")

    real_items_dir = pack_dir / "items"
    real_solutions_dir = pack_dir / "solutions"
    real_items_dir.mkdir(exist_ok=True)
    real_solutions_dir.mkdir(exist_ok=True)

    moved_items = []
    moved_solutions = []

    try:
        for iid in pass_ids:
            src_item = staging_items_dir / f"{iid}.json"
            dst_item = real_items_dir / f"{iid}.json"

            # Load, set verification_status, re-stamp hash, write.
            item_data = json.loads(src_item.read_text())
            item_data["verification_status"] = "machine_verified"
            canonical.stamp_pack({"items": [item_data], "assets": []})
            dst_item.write_text(
                json.dumps(item_data, indent=2, ensure_ascii=False) + "\n"
            )
            moved_items.append((src_item, dst_item))

            # Move solution file if present.
            sol = item_data.get("solution")
            if sol:
                sol_filename = pathlib.Path(sol["path"]).name
                src_sol = staging_solutions_dir / sol_filename
                if src_sol.exists():
                    dst_sol = real_solutions_dir / sol_filename
                    shutil.copy2(src_sol, dst_sol)
                    moved_solutions.append((src_sol, dst_sol))

    except Exception as exc:
        print(f"FAIL  error moving items: {exc}")
        _rollback(moved_items, moved_solutions)
        return 1

    # Post-move battery: rebuild pack and run solution harness.
    print()
    print("INFO  running post-move battery (build_and_validate + solutions)...")
    battery_ok = _run_post_move_battery(pack_dir)

    if not battery_ok:
        print()
        print("FAIL  post-move battery failed; rolling back all promoted items")
        _rollback(moved_items, moved_solutions)
        return 1

    print()
    print(f"PASS  promotion complete: {len(pass_ids)} item(s) moved into {pack_dir}")
    return 0


def _rollback(moved_items: list, moved_solutions: list) -> None:
    """Move items and solutions back to staging on battery failure."""
    for src, dst in moved_items:
        if dst.exists():
            dst.unlink()
            print(f"  rolled back: removed {dst}")
    for src, dst in moved_solutions:
        if dst.exists():
            dst.unlink()
            print(f"  rolled back: removed {dst}")


def _run_post_move_battery(pack_dir: pathlib.Path) -> bool:
    """Re-run the full real-pack battery after promotion.

    Rebuilds the pack (stamps hashes, runs Tier 1 + Tier 2), then runs the
    solution harness. Returns True if both pass.
    """
    items_dir = pack_dir / "items"
    items = _load_items_from_dir(items_dir)
    pack = {"items": items, "assets": []}
    canonical.stamp_pack(pack)

    violations = pv.validate_pack(pack, _TAX, _SCHEMA, _REGISTRY, pack_root=pack_dir)
    if violations:
        print(f"FAIL  pack battery: {len(violations)} violation(s):")
        for v in violations:
            print(f"  {v.item_id}  {v.code}: {v.message}")
        return False
    print(f"PASS  pack battery: {len(items)} items clean (Tier 1 + Tier 2)")

    harness_rc = run_solutions.run_pack(pack_dir)
    if harness_rc != 0:
        print("FAIL  solution harness: one or more solutions failed")
        return False
    return True


# ---------------------------------------------------------------------------
# Self-test: craft a tiny staging batch and run the funnel against /tmp.
# ---------------------------------------------------------------------------


def run_self_test(pack_dir: pathlib.Path) -> int:
    """Build a scratch staging batch in /tmp, run the funnel, assert results.

    Uses a /tmp copy of pack_dir for --promote so the real pack is not touched.
    Returns 0 on success, 1 on failure.
    """
    print("=" * 72)
    print("  FUNNEL SELF-TEST")
    print("=" * 72)
    print()

    # Load a real item to clone for the good staging item.
    real_items_dir = pack_dir / "items"
    real_items = sorted(real_items_dir.glob("*.json"))
    if not real_items:
        print("FAIL  self-test: no items found in real pack to clone")
        return 1

    source_item_path = real_items[0]
    source_item = json.loads(source_item_path.read_text())
    source_sol_path = pack_dir / "solutions" / (source_item_path.stem + ".py")

    with tempfile.TemporaryDirectory(prefix="funnel_selftest_") as tmp:
        tmp_root = pathlib.Path(tmp)

        # --- Create scratch staging dir ---
        staging = tmp_root / "staging" / "batch-selftest"
        staging_items = staging / "items"
        staging_solutions = staging / "solutions"
        staging_items.mkdir(parents=True)
        staging_solutions.mkdir()

        # IDs must match the pack id pattern (sd|vlt|arn)_caf_qa_\d{6}.
        # Use the "arn" pool prefix with high-numbered ids to avoid clashing
        # with any real item or each other.
        good_id = "arn_caf_qa_990001"
        bad_id = "arn_caf_qa_990002"

        # --- Good item: fresh id, distinct stem so no dup-hash/near-dup fires ---
        good_item = copy.deepcopy(source_item)
        good_item["id"] = good_id
        good_item["verification_status"] = "draft"
        good_item.pop("content_hash", None)
        # Change the principal to make the stem distinct and produce a new hash.
        # We also update the answer_key to match the new calculation so the
        # existing solution still passes (we will adapt the solution below).
        # Easiest path: craft a self-contained item with a fresh stem.
        good_item["stem"] = (
            "Priya deposits Rs 50,000 in a bank at 8% per annum "
            "compounded annually for 1 year. What is the compound interest earned?"
        )
        # Options and answer for this variant: CI = 50000 * 0.08 = 4,000.
        good_item["options"] = [
            {"key": 1, "text": "Rs 4,000"},
            {"key": 2, "text": "Rs 4,800"},
            {"key": 3, "text": "Rs 3,200"},
            {"key": 4, "text": "Rs 5,000"},
        ]
        good_item["answer_key"] = {"correct": 1}
        # Update rationales to match new options.
        good_item["per_option_rationale"] = [
            {"option_key": 1, "verdict": "correct",
             "rationale": "CI = 50000 * 0.08 * 1 = 4,000 (annual compounding equals simple interest for 1 year)."},
            {"option_key": 2, "verdict": "incorrect",
             "rationale": "Uses 9.6% effective rate instead of 8%.",
             "misconception": "rate_period_mismatch"},
            {"option_key": 3, "verdict": "incorrect",
             "rationale": "Uses 6.4% by halving the rate incorrectly.",
             "misconception": "rate_period_mismatch"},
            {"option_key": 4, "verdict": "incorrect",
             "rationale": "Applies 10% instead of the stated 8%.",
             "misconception": "arithmetic_slip"},
        ]
        good_item["explanation"] = (
            "For annual compounding over 1 year, CI = P * r = 50000 * 0.08 = 4,000."
        )
        good_sol_filename = f"{good_id}.py"
        good_item["solution"] = {"language": "python", "path": f"solutions/{good_sol_filename}"}
        canonical.stamp_pack({"items": [good_item], "assets": []})
        (staging_items / f"{good_id}.json").write_text(
            json.dumps(good_item, indent=2, ensure_ascii=False) + "\n"
        )
        # Write a solution that computes and returns the correct key (1).
        (staging_solutions / good_sol_filename).write_text(
            "def solve():\n"
            "    principal = 50_000\n"
            "    rate = 0.08\n"
            "    ci = principal * rate\n"
            "    return {'value': ci, 'option_key': 1}\n"
        )

        # --- Bad item: fresh stem, but solution returns the wrong option_key ---
        bad_item = copy.deepcopy(source_item)
        bad_item["id"] = bad_id
        bad_item["verification_status"] = "draft"
        bad_item.pop("content_hash", None)
        bad_item["stem"] = (
            "Ravi invests Rs 25,000 at 12% per annum simple interest for 2 years. "
            "What is the total simple interest?"
        )
        bad_item["options"] = [
            {"key": 1, "text": "Rs 6,000"},
            {"key": 2, "text": "Rs 3,000"},
            {"key": 3, "text": "Rs 7,440"},
            {"key": 4, "text": "Rs 600"},
        ]
        bad_item["answer_key"] = {"correct": 1}  # SI = 25000 * 0.12 * 2 = 6000
        bad_item["per_option_rationale"] = [
            {"option_key": 1, "verdict": "correct",
             "rationale": "SI = 25000 * 0.12 * 2 = 6,000."},
            {"option_key": 2, "verdict": "incorrect",
             "rationale": "Uses only 1 year instead of 2.",
             "misconception": "time_factor_dropped"},
            {"option_key": 3, "verdict": "incorrect",
             "rationale": "Applies compound interest formula.",
             "misconception": "compound_interest_confusion"},
            {"option_key": 4, "verdict": "incorrect",
             "rationale": "Uses 1% instead of 12%.",
             "misconception": "decimal_place_error"},
        ]
        bad_item["explanation"] = "SI = P * r * t = 25000 * 0.12 * 2 = 6,000."
        bad_sol_filename = f"{bad_id}.py"
        bad_item["solution"] = {"language": "python", "path": f"solutions/{bad_sol_filename}"}
        canonical.stamp_pack({"items": [bad_item], "assets": []})
        (staging_items / f"{bad_id}.json").write_text(
            json.dumps(bad_item, indent=2, ensure_ascii=False) + "\n"
        )

        # Write a solution that returns the WRONG key (2 instead of 1).
        correct_key = bad_item["answer_key"]["correct"]  # 1
        wrong_key = 2
        (staging_solutions / bad_sol_filename).write_text(
            f"def solve():\n"
            f"    # BUG: returns wrong key on purpose for self-test\n"
            f"    return {{'value': 3000.0, 'option_key': {wrong_key}}}\n"
        )

        print(f"staging dir: {staging}")
        print(f"good item:   {good_id}  (correct key 1, solution returns key 1)")
        print(f"bad item:    {bad_id}  (correct key 1, solution returns key 2)")
        print()

        # --- Run the funnel ---
        print("--- funnel run ---")
        report = run_funnel(staging, pack_dir, verbose=True)

        # Write report to staging dir (mirrors normal usage).
        report_path = staging / "funnel_report.json"
        report_path.write_text(json.dumps(report, indent=2) + "\n")

        # --- Assertions ---
        print()
        print("--- assertions ---")
        ok = True

        good_verdict = report["items"].get(good_id, {}).get("verdict")
        bad_verdict = report["items"].get(bad_id, {}).get("verdict")
        bad_sol_stage = (
            report["items"].get(bad_id, {}).get("stages", {}).get("solution", {})
        )
        bad_codes = bad_sol_stage.get("violations", [])
        bad_code_str = " ".join(bad_codes)

        if good_verdict == "PASS":
            print(f"PASS  good item verdict is PASS")
        else:
            ok = False
            print(f"FAIL  good item verdict is {good_verdict}, expected PASS")
            print(f"      stages: {json.dumps(report['items'].get(good_id, {}).get('stages', {}), indent=2)}")

        if bad_verdict == "FAIL":
            print(f"PASS  bad item verdict is FAIL")
        else:
            ok = False
            print(f"FAIL  bad item verdict is {bad_verdict}, expected FAIL")

        if "SOLUTION_KEY_MISMATCH" in bad_code_str:
            print(f"PASS  bad item solution stage contains SOLUTION_KEY_MISMATCH")
        else:
            ok = False
            print(f"FAIL  SOLUTION_KEY_MISMATCH not in bad item violations: {bad_codes}")

        # --- Promote test: into a /tmp copy of the pack ---
        print()
        print("--- promote test (into /tmp copy of pack, not the real pack) ---")
        tmp_pack = tmp_root / "tmp_pack"
        shutil.copytree(pack_dir, tmp_pack)

        rc = _promote(staging, tmp_pack)
        promoted_path = tmp_pack / "items" / f"{good_id}.json"
        bad_promoted_path = tmp_pack / "items" / f"{bad_id}.json"

        if rc == 0:
            print(f"PASS  promote exited 0")
        else:
            ok = False
            print(f"FAIL  promote exited {rc}")

        if promoted_path.exists():
            promoted_item = json.loads(promoted_path.read_text())
            if promoted_item.get("verification_status") == "machine_verified":
                print(f"PASS  promoted good item has verification_status=machine_verified")
            else:
                ok = False
                print(
                    f"FAIL  promoted item verification_status is "
                    f"{promoted_item.get('verification_status')}, expected machine_verified"
                )
        else:
            ok = False
            print(f"FAIL  good item not found in tmp pack after promote")

        if not bad_promoted_path.exists():
            print(f"PASS  bad item was NOT promoted (as expected)")
        else:
            ok = False
            print(f"FAIL  bad item was promoted into the pack (should have been excluded)")

        print()
        print("=" * 72)
        if ok:
            print("  SELF-TEST RESULT: PASS")
        else:
            print("  SELF-TEST RESULT: FAIL")
        print("=" * 72)
        return 0 if ok else 1


# ---------------------------------------------------------------------------
# CLI entry point.
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Pilot funnel runner for staged item batches.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--staging",
        metavar="DIR",
        help="Path to staging batch dir (must contain items/ and solutions/).",
    )
    parser.add_argument(
        "--pack-dir",
        metavar="DIR",
        default=str(_DEFAULT_PACK_DIR),
        help=(
            "Path to the real pack dir "
            f"(default: {_DEFAULT_PACK_DIR})."
        ),
    )
    parser.add_argument(
        "--promote",
        action="store_true",
        help="Promote PASS items into pack-dir after funnel pass.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        dest="self_test",
        help="Run built-in self-test; does not modify the repo.",
    )
    args = parser.parse_args()

    pack_dir = pathlib.Path(args.pack_dir).resolve()
    if not pack_dir.is_dir():
        print(f"ERROR: pack-dir not found: {pack_dir}", file=sys.stderr)
        return 2

    if args.self_test:
        return run_self_test(pack_dir)

    if not args.staging:
        parser.print_help()
        return 2

    staging_dir = pathlib.Path(args.staging).resolve()
    if not staging_dir.is_dir():
        print(f"ERROR: staging dir not found: {staging_dir}", file=sys.stderr)
        return 2

    if args.promote:
        return _promote(staging_dir, pack_dir)

    # Normal funnel run.
    report = run_funnel(staging_dir, pack_dir, verbose=True)

    # Write machine-readable report.
    report_path = staging_dir / "funnel_report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(f"\nreport written to: {report_path}")

    n_fail = report["totals"]["fail"]
    return 1 if n_fail > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
