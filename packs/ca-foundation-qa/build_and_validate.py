#!/usr/bin/env python3
"""Assemble, content-hash stamp, and validate the CA Foundation QA pack.

Reads every items/*.json, assembles a pack, stamps content_hash via the
repo's canonical.py, then runs the Tier 2 pack validator (which also runs Tier 1
JSON Schema per item) against the live taxonomy, misconception canon, and profile
schema. Writes the stamped pack to packs/ca-foundation-qa/pack.json. Idempotent: re-run after fixes.

Run: python3 packs/ca-foundation-qa/build_and_validate.py   (exit 0 = clean, 1 = violations)
"""
import datetime
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent              # .../packs/ca-foundation-qa
REPO_ROOT = HERE.parent.parent                     # repo root

# Distribution-manifest identity (ADR 0009 "Pack identity and versioning").
# This is the manifest the offline client fetches to learn of a new pack; it is
# distinct from manifest.json (the prashna generation spike's input). Semantic
# version: major = schema/Profile break, minor = new items, patch = errata batch.
PACK_ID = "ca-foundation-qa"
PACK_VERSION = "0.1.0"
# Lowest app version that can render this pack's schema/Profile. The client
# refuses an update whose min_app_version exceeds its own (ADR 0009 update flow).
MIN_APP_VERSION = "0.1.0"
SCHEMA_DIR = REPO_ROOT / "schema"                  # .../schema
PROFILE_DIR = SCHEMA_DIR / "profiles" / "ca-foundation-qa"
VALIDATOR_DIR = SCHEMA_DIR / "validator"
sys.path.insert(0, str(VALIDATOR_DIR))

import canonical
import pack_validator as pv
import run_solutions
from referencing import Registry, Resource

CORE = json.loads((SCHEMA_DIR / "core" / "uqs-core.schema.json").read_text())
SCHEMA = json.loads((PROFILE_DIR / "ca-foundation-qa.schema.json").read_text())
REGISTRY = Registry().with_resource(CORE["$id"], Resource.from_contents(CORE))

tax_raw = json.loads((PROFILE_DIR / "taxonomy.json").read_text())
misc_raw = json.loads((PROFILE_DIR / "misconceptions.json").read_text())
# Support both the old "version" key and the aligned "taxonomy_version" key.
misc_version = misc_raw.get("taxonomy_version") or misc_raw.get("version")


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


# Load family scoping allowlist from the shared validator directory.
_allowlist_path = VALIDATOR_DIR / "family_scoping_allowlist.json"
_family_scoping_allowlist = set()
if _allowlist_path.exists():
    _allowlist_data = json.loads(_allowlist_path.read_text())
    for _entry in _allowlist_data.get("allowlist", []):
        _family_scoping_allowlist.add(
            (_entry["item_id"], _entry["option_key"], _entry["misconception"])
        )

TAX = {
    "nodes": {n["id"] for n in tax_raw["nodes"]},
    "abstract_nodes": {n["id"] for n in tax_raw["nodes"] if n.get("abstract")},
    "node_ancestors": _build_node_ancestors(tax_raw["nodes"]),
    "misconceptions": {m["id"] for m in misc_raw["misconceptions"]},
    "misconception_families": {m["id"]: m.get("families", []) for m in misc_raw["misconceptions"]},
    "family_scoping_allowlist": _family_scoping_allowlist,
    "difficulty_scale": tax_raw["difficulty_scale"],
    "taxonomy_version": tax_raw.get("taxonomy_version"),
    "misconception_version": misc_version,
}

items_dir = HERE / "items"
paths = sorted(items_dir.glob("*.json"))
items = [json.loads(p.read_text()) for p in paths]
pack = {"items": items, "assets": []}
canonical.stamp_pack(pack)  # fills content_hash for every item

violations = pv.validate_pack(pack, TAX, SCHEMA, REGISTRY, pack_root=HERE)

out = HERE / "pack.json"
out.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n")
print(f"items: {len(items)}   stamped pack: {out}")

if violations:
    print(f"FAIL  {len(violations)} violation(s):")
    by_item = {}
    for v in violations:
        by_item.setdefault(v.item_id, []).append(f"{v.code}: {v.message}")
    for iid in sorted(by_item):
        for line in by_item[iid]:
            print(f"  {iid}  {line}")
    sys.exit(1)

print(f"PASS  all {len(items)} items clean (Tier 1 + Tier 2)")

# A pack build is always a verified build: run the solution harness over this pack.
# Every item carrying a solution has it executed in the sandbox and its key checked.
print("\nsolution harness:")
harness_rc = run_solutions.run_pack(HERE)
if harness_rc != 0:
    sys.exit(harness_rc)

# Distribution manifest (ADR 0009). Emitted next to pack.json on a clean build so
# the offline client can do its version handshake: pack_id, semantic version,
# taxonomy_version, item_count, a per-item content-hash listing, creation date,
# and min_app_version. Tombstones (verification_status == "retired") stay in the
# pack for history but are excluded from the served/selectable item_count.
served_items = [it for it in items if it.get("verification_status") != "retired"]
content_hashes = {it["id"]: it["content_hash"] for it in items}
taxonomy_versions = {it.get("taxonomy_version") for it in items}
if len(taxonomy_versions) != 1:
    print(f"FAIL  pack mixes taxonomy_versions {sorted(taxonomy_versions)}; manifest needs one")
    sys.exit(1)

dist_manifest = {
    "pack_id": PACK_ID,
    "version": PACK_VERSION,
    "taxonomy_version": taxonomy_versions.pop(),
    "item_count": len(served_items),
    "min_app_version": MIN_APP_VERSION,
    "created_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    # Per-item content hashes, sorted by item id for a stable, diffable listing.
    # The client re-scores history when an item's hash changes (ADR 0009).
    "content_hashes": dict(sorted(content_hashes.items())),
}
manifest_out = HERE / "pack.manifest.json"
manifest_out.write_text(json.dumps(dist_manifest, indent=2, ensure_ascii=False) + "\n")
print(f"\ndistribution manifest: {manifest_out}  "
      f"(v{PACK_VERSION}, {len(served_items)} served / {len(items)} total)")
