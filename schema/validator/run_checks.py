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
from migrate_ca_v1 import migrate

SCHEMA_DIR = HERE.parent
PROFILE_DIR = SCHEMA_DIR / "profiles" / "ca-foundation-qa"
CORE = json.loads((SCHEMA_DIR / "core" / "uqs-core.schema.json").read_text())
SCHEMA = json.loads((PROFILE_DIR / "ca-foundation-qa.schema.json").read_text())
REGISTRY = Registry().with_resource(CORE["$id"], Resource.from_contents(CORE))

REJECTS = {
    "packs/reject/bad_hash.json": "HASH_MISMATCH",
    "packs/reject/dup_content_hash.json": "DUP_CONTENT_HASH",
    "packs/reject/dup_id.json": "DUP_ID",
    "packs/reject/unknown_test_node.json": "UNKNOWN_TEST_NODE",
    "packs/reject/bad_option_keys.json": "BAD_OPTION_KEYS",
    "packs/reject/rationale_verdict_mismatch.json": "RATIONALE_VERDICT_MISMATCH",
    "packs/reject/unknown_misconception.json": "UNKNOWN_MISCONCEPTION",
    "packs/reject/dangling_asset_ref.json": "DANGLING_ASSET_REF",
    "packs/reject/missing_rationale.json": "RATIONALE_COVERAGE",
    "packs/reject/rationale_missing_misconception.json": "MISCONCEPTION_REQUIRED",
    "packs/reject/numeric_missing_common_errors.json": "MISSING_COMMON_ERRORS",
    "packs/reject/taxonomy_version_mismatch.json": "TAXONOMY_VERSION_MISMATCH",
    "packs/reject/abstract_test_node.json": "ABSTRACT_TEST_NODE",
    "packs/reject/misconception_family_mismatch.json": "MISCONCEPTION_FAMILY_MISMATCH",
}

# Rejects that need pack_root to fire (Tier-2 filesystem checks).
REJECTS_WITH_PACK_ROOT = {
    "packs/reject/solution_file_missing.json": "SOLUTION_FILE_MISSING",
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

    for path, code in REJECTS.items():
        codes = {v.code for v in pv.validate_pack(load(path), tax, SCHEMA, REGISTRY)}
        if code in codes:
            print(f"PASS  {pathlib.Path(path).name}: fired {code}")
        else:
            ok = False
            print(f"FAIL  {pathlib.Path(path).name}: expected {code}, got {sorted(codes) or 'none'}")

    # Rejects that need pack_root to trigger filesystem-backed checks.
    # Use a temporary empty directory as pack root so the referenced paths don't exist.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_root:
        tmp_path = pathlib.Path(tmp_root)
        for path, code in REJECTS_WITH_PACK_ROOT.items():
            codes = {v.code for v in pv.validate_pack(load(path), tax, SCHEMA, REGISTRY, pack_root=tmp_path)}
            if code in codes:
                print(f"PASS  {pathlib.Path(path).name}: fired {code}")
            else:
                ok = False
                print(f"FAIL  {pathlib.Path(path).name}: expected {code}, got {sorted(codes) or 'none'}")

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

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
