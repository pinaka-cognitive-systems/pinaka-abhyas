#!/usr/bin/env python3
"""Canonical content hashing for UQS items (spec section 9).

Single source of the hashing logic. The validator and the build both import
this, so the hash is computed one way everywhere.

Identity is the PROBLEM, not the teaching. The canonical content set is an
exhaustive allowlist: exam, lang, item_type, normalized stem, option texts in
key order, answer_key, and the content_hash of every asset referenced by stem
or options. explanation, rationale, tags, difficulty, provenance, empirical,
ext, id, pool, status are NOT hashed.

CLI: python3 canonical.py --stamp pack1.json pack2.json
     (computes content_hash for every item in each pack, in place)
"""
import hashlib
import json
import re
import sys
import unicodedata

ASSET_REF = re.compile(r"\{\{asset:([^}]+)\}\}")


def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_answer_key(answer_key: dict) -> dict:
    """Return a canonical copy of answer_key with numeric values normalized.

    Rationale (VAL-08): int-vs-float and trailing-zero float formatting produce
    different JSON serializations that hash differently, splitting identical
    problems into distinct hashes.  e.g. 1000, 1000.0, "1000" (as a number)
    should all produce the same hash.

    Normalization rule: if 'value' is an int or float, convert to int when it
    is a whole number, otherwise round to 10 significant digits (to collapse
    floating-point representation noise like 0.30000000000000004).

    'correct' is an integer option key; it is left untouched.
    """
    if not answer_key:
        return answer_key
    result = dict(answer_key)
    v = result.get("value")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        float_v = float(v)
        if float_v == int(float_v):
            result["value"] = int(float_v)
        else:
            # Round to 10 significant figures to collapse floating-point noise.
            from decimal import Decimal, ROUND_HALF_UP
            result["value"] = float(f"{float_v:.10g}")
    return result


def referenced_asset_ids(texts):
    out = []
    for t in texts:
        out.extend(ASSET_REF.findall(t or ""))
    return out


def compute_item_content_hash(item, assets_by_id=None):
    assets_by_id = assets_by_id or {}
    options = sorted(item.get("options", []), key=lambda o: o["key"])
    option_texts = [o["text"] for o in options]
    ref_ids = referenced_asset_ids([item.get("stem", "")] + option_texts)
    asset_hashes = sorted(
        assets_by_id[i]["content_hash"] for i in ref_ids if i in assets_by_id
    )
    canonical = {
        "exam": item["exam"],
        "lang": item["lang"],
        "item_type": item["item_type"],
        "stem": normalize_text(item.get("stem", "")),
        "options": [normalize_text(t) for t in option_texts],
        "answer_key": normalize_answer_key(item["answer_key"]),
        "asset_hashes": asset_hashes,
    }
    blob = json.dumps(canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def stamp_pack(pack):
    assets_by_id = {a["id"]: a for a in pack.get("assets", [])}
    for item in pack.get("items", []):
        item["content_hash"] = compute_item_content_hash(item, assets_by_id)
    return pack


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--stamp":
        for path in args[1:]:
            with open(path) as fh:
                pack = json.load(fh)
            stamp_pack(pack)
            with open(path, "w") as fh:
                json.dump(pack, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            print("stamped", path)
    else:
        print(__doc__)
