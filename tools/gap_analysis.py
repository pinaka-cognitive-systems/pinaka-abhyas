#!/usr/bin/env python3
"""gap_analysis.py — blueprint coverage report and generation targeting.

Reads the built pack, the Profile blueprint, and the taxonomy, and reports per
blueprint family: quota, available selectable items, deficit. Also reports
per-leaf coverage and the bank's difficulty mix against the content-pipeline
targets (20% L1, 55% L2, 25% L3).

Family quota rule mirrors app/src/engine/pack.ts buildBlueprint: each
section's derived_target_questions splits evenly across its families, integer
remainder to the earliest families in list order. Family attribution mirrors
the mock assembler: an item belongs to the FIRST blueprint family (blueprint
order) whose node id equals or dot-prefixes the item's tests[0].

With --manifest N it emits generation target rows (JSON to stdout) for the N
most under-served slots: family deficits first, ordered worst-deficit first,
preferring leaves with no coverage, balancing difficulty toward the global mix
and correct_pos uniformly across 1..4.

Run: python3 tools/gap_analysis.py [--manifest N] [--start-id NNNNNN]
"""
import argparse
import collections
import json
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
PACK = ROOT / "packs" / "ca-foundation-qa" / "pack.json"
PROFILE = ROOT / "schema" / "profiles" / "ca-foundation-qa"

DIFF_MIX = {"L1": 0.20, "L2": 0.55, "L3": 0.25}


def split_quota(total, n):
    if n <= 0:
        return []
    base, rem = divmod(total, n)
    return [base + (1 if i < rem else 0) for i in range(n)]


def flatten_families(bp):
    out = []
    for part in bp["parts"]:
        for section in part["sections"]:
            target = section.get(
                "derived_target_questions",
                round(part["questions"] / len(part["sections"])),
            )
            quotas = split_quota(target, len(section["families"]))
            for node_id, quota in zip(section["families"], quotas):
                out.append({"part": part["id"], "node": node_id, "quota": quota})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", type=int, default=0, help="emit N generation targets")
    ap.add_argument("--start-id", type=int, default=201, help="first numeric id suffix for targets")
    args = ap.parse_args()

    pack = json.loads(PACK.read_text())
    bp = json.loads((PROFILE / "blueprint.json").read_text())
    tax = json.loads((PROFILE / "taxonomy.json").read_text())
    misc = json.loads((PROFILE / "misconceptions.json").read_text())

    leaves = [n["id"] for n in tax["nodes"] if not n.get("abstract")]
    fams = flatten_families(bp)

    items = [
        i for i in pack["items"]
        if i.get("verification_status") not in ("quarantined",)
        and i.get("pool") != "quarantined"
        and i["id"] != "arn_caf_qa_000009"
    ]

    # First-match family attribution, blueprint order (assembler rule).
    by_family = collections.defaultdict(list)
    leaf_count = collections.Counter()
    for item in items:
        node = (item.get("tests") or [None])[0]
        if node is None:
            continue
        leaf_count[node] += 1
        for fam in fams:
            if node == fam["node"] or node.startswith(fam["node"] + "."):
                by_family[fam["node"]].append(item)
                break

    print(f"usable items: {len(items)}")
    print(f"{'family':46} quota avail deficit")
    total_quota = total_avail = total_deficit = 0
    deficits = []
    for fam in fams:
        avail = len(by_family[fam["node"]])
        deficit = max(0, fam["quota"] - avail)
        total_quota += fam["quota"]
        total_avail += min(avail, fam["quota"])
        total_deficit += deficit
        mark = "  <-- SHORT" if deficit else ""
        print(f"{fam['node']:46} {fam['quota']:5} {avail:5} {deficit:7}{mark}")
        if deficit:
            deficits.append((fam, deficit))
    print(f"{'TOTAL':46} {total_quota:5} {total_avail:5} {total_deficit:7}")

    covered = [l for l in leaves if leaf_count[l] > 0]
    uncovered = [l for l in leaves if leaf_count[l] == 0]
    print(f"\nleaf coverage: {len(covered)}/{len(leaves)}; uncovered: {uncovered}")

    mix = collections.Counter(i["difficulty_label"] for i in items)
    print("difficulty mix:", {k: f"{mix[k]} ({mix[k]/len(items):.0%}, target {DIFF_MIX[k]:.0%})" for k in ("L1", "L2", "L3")})

    if args.manifest <= 0:
        return

    # Misconception suggestions: canon entries whose families list intersects
    # the node's ancestor chain, or are unrestricted.
    def suggestions(node):
        chain = []
        parts = node.split(".")
        for i in range(1, len(parts) + 1):
            chain.append(".".join(parts[:i]))
        out = []
        for m in misc["misconceptions"]:
            families = m.get("families", [])
            if families == ["*"] or any(f in chain for f in families):
                out.append(m["id"])
        return out[:8]

    # Build target rows: worst deficits first; inside a family prefer leaves
    # with the least coverage (uncovered first).
    deficits.sort(key=lambda d: -d[1])
    rows = []
    next_id = args.start_id
    diff_cycle = ["L2", "L2", "L1", "L2", "L3", "L2", "L1", "L2", "L3", "L2"]
    while len(rows) < args.manifest and deficits:
        for di, (fam, deficit) in enumerate(list(deficits)):
            if len(rows) >= args.manifest:
                break
            fam_leaves = sorted(
                [l for l in leaves if l == fam["node"] or l.startswith(fam["node"] + ".")],
                key=lambda l: leaf_count[l],
            )
            leaf = fam_leaves[0] if fam_leaves else fam["node"]
            leaf_count[leaf] += 1
            rows.append({
                "target_id": f"arn_caf_qa_{next_id:06d}",
                "node": leaf,
                "difficulty": diff_cycle[len(rows) % len(diff_cycle)],
                "correct_pos": (len(rows) % 4) + 1,
                "suggested_misconceptions": suggestions(leaf),
            })
            next_id += 1
            if deficit - 1 <= 0:
                deficits.remove((fam, deficit))
            else:
                deficits[deficits.index((fam, deficit))] = (fam, deficit - 1)

    print("\nMANIFEST:")
    print(json.dumps(rows, indent=1))


if __name__ == "__main__":
    main()
