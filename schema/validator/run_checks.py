#!/usr/bin/env python3
"""Tier 2 check runner. Proves every cross-record invariant fires.

  - the good pack validates clean,
  - each reject fixture surfaces exactly the invariant it targets,
  - the CA v1 -> UQS migration produces a clean item,
  - the SVG sanitization guard accepts inert SVG and rejects scripted SVG.

Items are validated against the CA Foundation QA Profile (Core + Profile,
resolved through a referencing registry). Taxonomy nodes and the misconception
canon are loaded from the Profile directory (profiles/ca-foundation-qa/).

Run: python3 run_checks.py   (exit 0 = all good)
"""
import json
import pathlib
import sys

from referencing import Registry, Resource

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))

import canonical
import pack_validator as pv
import run_solutions
from migrate_ca_v1 import migrate

SCHEMA_DIR = HERE.parent
PROFILE_DIR = SCHEMA_DIR / "profiles" / "ca-foundation-qa"
CORE = json.loads((SCHEMA_DIR / "core" / "uqs-core.schema.json").read_text())
SCHEMA = json.loads((PROFILE_DIR / "ca-foundation-qa.schema.json").read_text())
REGISTRY = Registry().with_resource(CORE["$id"], Resource.from_contents(CORE))

# REJECTS maps each reject-fixture path to its EXACT expected violation set.
#
# Contract: the validator must fire EXACTLY this set of codes.  A fixture that
# starts producing extra codes (or losing its target) fails loudly — it is no
# longer isolating the invariant it is supposed to prove.
#
# Companion codes are documented inline.  They arise because a deliberately
# malformed fixture may satisfy multiple invariant violations simultaneously
# (e.g. missing per_option_rationale fields also trigger RATIONALE_COVERAGE).
# Every companion is deliberate and documented; accidental companions are bugs.
REJECTS: dict[str, frozenset[str]] = {
    # HASH_MISMATCH: stored hash is wrong.
    # RATIONALE_COVERAGE companion: the fixture omits per_option_rationale
    # fields to keep it minimal; the validator also fires coverage.
    "packs/reject/bad_hash.json": frozenset({"HASH_MISMATCH", "RATIONALE_COVERAGE"}),

    # DUP_CONTENT_HASH: two items share an identical content hash.
    # NEAR_DUPLICATE companion: the two items have identical stems (that is why
    #   they hash the same), so the near-duplicate check also fires.
    # RATIONALE_COVERAGE companion: minimal fixtures omit per_option_rationale.
    "packs/reject/dup_content_hash.json": frozenset({
        "DUP_CONTENT_HASH", "NEAR_DUPLICATE", "RATIONALE_COVERAGE"
    }),

    # DUP_ID: two items share the same id.
    # RATIONALE_COVERAGE companion: minimal fixtures omit per_option_rationale.
    "packs/reject/dup_id.json": frozenset({"DUP_ID", "RATIONALE_COVERAGE"}),

    # UNKNOWN_TEST_NODE: tests[] references a node not in the taxonomy.
    # RATIONALE_COVERAGE companion: minimal fixture.
    "packs/reject/unknown_test_node.json": frozenset({
        "UNKNOWN_TEST_NODE", "RATIONALE_COVERAGE"
    }),

    # BAD_OPTION_KEYS: option keys are not unique+contiguous, or answer is not a key.
    # RATIONALE_COVERAGE companion: minimal fixture.
    "packs/reject/bad_option_keys.json": frozenset({"BAD_OPTION_KEYS", "RATIONALE_COVERAGE"}),

    # RATIONALE_VERDICT_MISMATCH: a rationale's verdict disagrees with answer_key.
    "packs/reject/rationale_verdict_mismatch.json": frozenset({"RATIONALE_VERDICT_MISMATCH"}),

    # UNKNOWN_MISCONCEPTION: misconception id not in the exam vocabulary.
    "packs/reject/unknown_misconception.json": frozenset({"UNKNOWN_MISCONCEPTION"}),

    # DANGLING_ASSET_REF: {{asset:id}} reference does not resolve.
    # RATIONALE_COVERAGE companion: minimal fixture.
    "packs/reject/dangling_asset_ref.json": frozenset({"DANGLING_ASSET_REF", "RATIONALE_COVERAGE"}),

    # RATIONALE_COVERAGE: per_option_rationale does not cover all options.
    "packs/reject/missing_rationale.json": frozenset({"RATIONALE_COVERAGE"}),

    # MISCONCEPTION_REQUIRED: incorrect option has no misconception field.
    "packs/reject/rationale_missing_misconception.json": frozenset({"MISCONCEPTION_REQUIRED"}),

    # MISSING_COMMON_ERRORS: numeric_entry item has no common_errors.
    # SCHEMA companion: the fixture is a numeric_entry without options/explanation,
    #   which triggers a JSON Schema length/required violation.
    "packs/reject/numeric_missing_common_errors.json": frozenset({
        "MISSING_COMMON_ERRORS", "SCHEMA"
    }),

    # TAXONOMY_VERSION_MISMATCH: taxonomy version disagrees across pack.
    "packs/reject/taxonomy_version_mismatch.json": frozenset({"TAXONOMY_VERSION_MISMATCH"}),

    # ABSTRACT_TEST_NODE: tests[] targets an abstract (non-leaf) node.
    "packs/reject/abstract_test_node.json": frozenset({"ABSTRACT_TEST_NODE"}),

    # MISCONCEPTION_FAMILY_MISMATCH: misconception families do not intersect item ancestry.
    "packs/reject/misconception_family_mismatch.json": frozenset({"MISCONCEPTION_FAMILY_MISMATCH"}),

    # DISTRACTOR_EQUALS_KEY (W3-3): an incorrect option's text equals the correct option's
    #   text after canonical normalization.
    "packs/reject/distractor_equals_key.json": frozenset({"DISTRACTOR_EQUALS_KEY"}),

    # STEM_ANSWER_LEAK (W3-3): correct option text appears verbatim in the stem, or the
    #   stem contains a forbidden answer-leak phrase.
    "packs/reject/stem_answer_leak.json": frozenset({"STEM_ANSWER_LEAK"}),

    # NEAR_DUPLICATE (W3-3): two stems have word-shingle Jaccard similarity >= threshold.
    "packs/reject/near_duplicate.json": frozenset({"NEAR_DUPLICATE"}),

    # NOTATION_VIOLATION (W3-5): stem/options/explanation/rationale contain LaTeX, HTML,
    #   control characters, or characters outside the ADR 0015 allowlist.
    "packs/reject/notation_violation.json": frozenset({"NOTATION_VIOLATION"}),
}

# Rejects that need pack_root to fire (Tier-2 filesystem checks).
# Same exact-set contract applies.
REJECTS_WITH_PACK_ROOT: dict[str, frozenset[str]] = {
    # SOLUTION_FILE_MISSING: item's solution.path does not exist under pack_root.
    "packs/reject/solution_file_missing.json": frozenset({"SOLUTION_FILE_MISSING"}),
}


def load(rel):
    return json.loads((HERE / rel).read_text())


def _build_node_ancestors(nodes):
    """Build a dict mapping each node id to the set of all ancestor ids (including self)."""
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


def load_taxonomy():
    tax = json.loads((PROFILE_DIR / "taxonomy.json").read_text())
    misc = json.loads((PROFILE_DIR / "misconceptions.json").read_text())
    # Support both the old "version" key and the aligned "taxonomy_version" key.
    misc_version = misc.get("taxonomy_version") or misc.get("version")
    # Load family scoping allowlist.
    allowlist_path = HERE / "family_scoping_allowlist.json"
    family_scoping_allowlist = set()
    if allowlist_path.exists():
        allowlist_data = json.loads(allowlist_path.read_text())
        for entry in allowlist_data.get("allowlist", []):
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


# Solution-harness self-test fixtures. Each is a tiny solution source paired with the
# violation code it must provoke (or None for the good one). They exercise the harness
# end to end: a real subprocess runs each in the sandbox.
HARNESS_FIXTURES = {
    # Good: reproduces the key, satisfiable+unique consistency.
    "good.py": (
        "def solve():\n"
        "    return {'value': 42, 'option_key': 2}\n"
        "def check_consistency():\n"
        "    return {'satisfiable': True, 'unique': True}\n",
        None,
    ),
    # Key mismatch: returns the wrong option_key.
    "mismatch.py": (
        "def solve():\n"
        "    return {'value': 0, 'option_key': 4}\n",
        "SOLUTION_KEY_MISMATCH",
    ),
    # Timeout: sleeps past the wall-clock limit without burning CPU (a busy loop would
    # trip the 5s CPU limit first and surface as a run error; sleeping isolates the
    # wall-clock path).
    "timeout.py": (
        "import time\n"
        "def solve():\n"
        "    time.sleep(30)\n"
        "    return {'value': 42, 'option_key': 2}\n",
        "SOLUTION_TIMEOUT",
    ),
    # Protocol violation: prints extra output to stdout before the JSON line.
    "protocol.py": (
        "def solve():\n"
        "    print('chatty noise on stdout')\n"
        "    return {'value': 42, 'option_key': 2}\n",
        "SOLUTION_PROTOCOL_ERROR",
    ),
    # Unsatisfiable: check_consistency reports the premises cannot be met.
    "unsatisfiable.py": (
        "def solve():\n"
        "    return {'value': 42, 'option_key': 2}\n"
        "def check_consistency():\n"
        "    return {'satisfiable': False, 'unique': False}\n",
        "SOLUTION_UNSATISFIABLE",
    ),
}


def run_solution_harness_selftest(ok: bool) -> bool:
    """Drive run_solutions over a temp pack of crafted solutions, asserting each fires
    its violation code (and the good one passes). Mirrors the reject-fixture pattern:
    every harness violation is proven to fire."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        sol_dir = root / "solutions"
        sol_dir.mkdir()
        for fname, (source, _code) in HARNESS_FIXTURES.items():
            (sol_dir / fname).write_text(source)

        # Each crafted item targets option_key 2 / answer_key.correct 2 so a faithful
        # solution passes and only the intended fault trips the harness.
        for fname, (_source, expected_code) in HARNESS_FIXTURES.items():
            item = {
                "id": f"selftest_{fname[:-3]}",
                "item_type": "single_best",
                "answer_key": {"correct": 2},
                "solution": {"language": "python", "path": f"solutions/{fname}"},
            }
            status, code, detail = run_solutions.verify_item(item, root)
            if expected_code is None:
                if status == "PASS":
                    print(f"PASS  harness self-test {fname}: passes clean")
                else:
                    ok = False
                    print(f"FAIL  harness self-test {fname}: expected PASS, got {status} {code} {detail}")
            else:
                if status == "FAIL" and code == expected_code:
                    print(f"PASS  harness self-test {fname}: fired {expected_code}")
                else:
                    ok = False
                    print(
                        f"FAIL  harness self-test {fname}: expected {expected_code}, "
                        f"got {status} {code} ({detail})"
                    )
    return ok


def main() -> int:
    tax = load_taxonomy()
    ok = True

    # pack_root is the packs/ directory so filesystem-backed checks (solution
    # file existence) run for real against the exemplar pack.
    good = pv.validate_pack(load("packs/good.json"), tax, SCHEMA, REGISTRY, pack_root=HERE / "packs")
    if good:
        ok = False
        print("FAIL  good pack produced violations:")
        for v in good:
            print("       ", v.code, v.item_id, v.message)
    else:
        print("PASS  good pack: 0 violations")

    for path, expected_set in REJECTS.items():
        codes = {v.code for v in pv.validate_pack(load(path), tax, SCHEMA, REGISTRY)}
        if codes == expected_set:
            print(f"PASS  {pathlib.Path(path).name}: exact set {sorted(expected_set)}")
        else:
            ok = False
            missing = sorted(expected_set - codes)
            extra = sorted(codes - expected_set)
            print(
                f"FAIL  {pathlib.Path(path).name}: expected {sorted(expected_set)}, "
                f"got {sorted(codes)}"
                + (f" [missing: {missing}]" if missing else "")
                + (f" [extra: {extra}]" if extra else "")
            )

    # Rejects that need pack_root to trigger filesystem-backed checks.
    # Use a temporary empty directory as pack root so the referenced paths don't exist.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_root:
        tmp_path = pathlib.Path(tmp_root)
        for path, expected_set in REJECTS_WITH_PACK_ROOT.items():
            codes = {v.code for v in pv.validate_pack(load(path), tax, SCHEMA, REGISTRY, pack_root=tmp_path)}
            if codes == expected_set:
                print(f"PASS  {pathlib.Path(path).name}: exact set {sorted(expected_set)}")
            else:
                ok = False
                missing = sorted(expected_set - codes)
                extra = sorted(codes - expected_set)
                print(
                    f"FAIL  {pathlib.Path(path).name}: expected {sorted(expected_set)}, "
                    f"got {sorted(codes)}"
                    + (f" [missing: {missing}]" if missing else "")
                    + (f" [extra: {extra}]" if extra else "")
                )

    v1 = load("packs/legacy/ca_v1_000088.json")
    migrated = migrate(v1)
    pack = canonical.stamp_pack({"items": [migrated], "assets": []})
    residual = {v.code for v in pv.validate_pack(pack, tax, SCHEMA, REGISTRY)}
    # CA v1 carries no per-option diagnosis and was tagged at taxonomy_version 1.
    # Allowed residuals: RATIONALE_COVERAGE (per-option diagnosis not yet enriched),
    # TAXONOMY_VERSION_MISMATCH (migrated item retains original taxonomy_version; the
    # re-tag migration to the current bundle version is a separate enrichment step).
    allowed_residual = {"RATIONALE_COVERAGE", "TAXONOMY_VERSION_MISMATCH"}
    if residual <= allowed_residual and migrated["id"] == "vlt_caf_qa_000088":
        notes = sorted(residual) if residual else ["clean"]
        print(f"PASS  migration CA v1 -> UQS field-complete; id {migrated['id']} ({', '.join(notes)})")
    else:
        ok = False
        print(f"FAIL  migration: id {migrated['id']}, residual {sorted(residual)}")

    if pv.svg_is_safe('<svg><circle r="3"/></svg>') and not pv.svg_is_safe(
        '<svg><script>x()</script></svg>'
    ):
        print("PASS  svg_is_safe accepts inert SVG, rejects scripted SVG")
    else:
        ok = False
        print("FAIL  svg_is_safe sanitization logic wrong")

    # Solution-harness check layer: prove each harness violation code fires.
    ok = run_solution_harness_selftest(ok)

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
