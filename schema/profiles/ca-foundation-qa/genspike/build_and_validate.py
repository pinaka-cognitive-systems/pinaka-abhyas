#!/usr/bin/env python3
"""Assemble, content-hash stamp, and validate the ca_abhyas enrichment pilot pack.

Reads every items/*.json, assembles a pack, stamps content_hash via the
repo's canonical.py, then runs the Tier 2 pack validator (which also runs Tier 1
JSON Schema per item) against the live taxonomy, misconception canon, and profile
schema. Writes the stamped pack to pilot/pack.json. Idempotent: re-run after fixes.

Run: python3 build_and_validate.py   (exit 0 = clean, 1 = violations)
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent              # .../pilot
PROFILE_DIR = HERE.parent                          # .../ca-foundation-qa
SCHEMA_DIR = PROFILE_DIR.parent.parent             # .../schema
VALIDATOR_DIR = SCHEMA_DIR / "validator"
sys.path.insert(0, str(VALIDATOR_DIR))

import canonical
import pack_validator as pv
from referencing import Registry, Resource

CORE = json.loads((SCHEMA_DIR / "core" / "uqs-core.schema.json").read_text())
SCHEMA = json.loads((PROFILE_DIR / "ca-foundation-qa.schema.json").read_text())
REGISTRY = Registry().with_resource(CORE["$id"], Resource.from_contents(CORE))

tax_raw = json.loads((PROFILE_DIR / "taxonomy.json").read_text())
misc_raw = json.loads((PROFILE_DIR / "misconceptions.json").read_text())
TAX = {
    "nodes": {n["id"] for n in tax_raw["nodes"]},
    "misconceptions": {m["id"] for m in misc_raw["misconceptions"]},
    "difficulty_scale": tax_raw["difficulty_scale"],
}

items_dir = HERE / "items"
paths = sorted(items_dir.glob("*.json"))
items = [json.loads(p.read_text()) for p in paths]
pack = {"items": items, "assets": []}
canonical.stamp_pack(pack)  # fills content_hash for every item

violations = pv.validate_pack(pack, TAX, SCHEMA, REGISTRY)

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
