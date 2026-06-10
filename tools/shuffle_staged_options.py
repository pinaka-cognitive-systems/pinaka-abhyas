#!/usr/bin/env python3
"""Shuffle option positions of STAGED single_best items, deterministically.

Generation agents tend to place the correct option first, which is an
answer-position tell. This tool permutes each staged item's options with a
seed derived from the item id, remaps answer_key.correct and every
per_option_rationale option_key, rewrites the solution file's option_key
constant, recomputes the content hash with the repo canonicalization, and
verifies the rewritten solution still reproduces the key.

Usage: python3 tools/shuffle_staged_options.py --staging packs/ca-foundation-qa/staging/batch-B1
"""
import argparse
import json
import pathlib
import re
import sys
import zlib

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "schema" / "validator"))

import canonical  # noqa: E402
import run_solutions  # noqa: E402


def shuffle_item(item_path: pathlib.Path, staging: pathlib.Path) -> str:
    item = json.loads(item_path.read_text())
    if item.get("item_type") != "single_best":
        return f"SKIP  {item['id']}: not single_best"

    # Idempotent by construction: the correct option's target position derives
    # from the item id; distractors order by a stable text hash. Running the
    # tool any number of times converges to the same arrangement. (A seeded
    # shuffle is NOT idempotent: the same permutation applied twice cancels
    # when it is an involution, which sent most keys back to position 1.)
    correct_key = item["answer_key"]["correct"]
    correct = next(o for o in item["options"] if o["key"] == correct_key)
    others = sorted(
        (o for o in item["options"] if o["key"] != correct_key),
        key=lambda o: zlib.crc32((item["id"] + o["text"]).encode()),
    )
    target = 1 + zlib.crc32(item["id"].encode()) % 4
    arranged = []
    for pos in range(1, 5):
        arranged.append(correct if pos == target else others.pop(0))
    remap = {}
    new_options = []
    for new_key, opt in enumerate(arranged, start=1):
        remap[opt["key"]] = new_key
        new_options.append({**opt, "key": new_key})
    item["options"] = new_options
    item["answer_key"] = {**item["answer_key"], "correct": remap[item["answer_key"]["correct"]]}
    item["per_option_rationale"] = [
        {**entry, "option_key": remap[entry["option_key"]]}
        for entry in item["per_option_rationale"]
    ]
    item["content_hash"] = canonical.compute_item_content_hash(item, {})
    item_path.write_text(json.dumps(item, indent=2, ensure_ascii=False) + "\n")

    # Rewrite the solution's option_key constant and re-verify through the harness.
    sol_path = staging / item["solution"]["path"]
    src = sol_path.read_text()
    new_key = item["answer_key"]["correct"]
    src2, n = re.subn(r"option_key\s*=\s*\d+", f"option_key = {new_key}", src)
    if n == 0:
        src2, n = re.subn(r'("option_key":\s*)\d+', rf"\g<1>{new_key}", src)
    if n == 0:
        return f"FAIL  {item['id']}: could not locate option_key constant in solution"
    sol_path.write_text(src2)

    status, code, detail = run_solutions.verify_item(item, staging)
    if status != "PASS":
        return f"FAIL  {item['id']}: post-shuffle harness {code} {detail}"
    return f"PASS  {item['id']}: key now at position {new_key}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging", required=True)
    args = ap.parse_args()
    # Absolute: the harness child runs in a temp cwd, so a relative root breaks.
    staging = pathlib.Path(args.staging).resolve()
    ok = True
    positions = []
    for item_path in sorted((staging / "items").glob("*.json")):
        line = shuffle_item(item_path, staging)
        print(line)
        ok &= not line.startswith("FAIL")
        m = re.search(r"position (\d)", line)
        if m:
            positions.append(m.group(1))
    print(f"position spread: {''.join(sorted(positions))}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
