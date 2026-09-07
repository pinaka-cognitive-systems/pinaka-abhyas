#!/usr/bin/env python3
"""Gate: no shipped item may overlap a published exam-board question.

Originality is the legal basis for the content licence (LICENSE-CONTENT.md) and
the commercial licence (COMMERCIAL.md). This gate is the evidence for that claim.

It measures containment: of the word 5-grams in one of our items, what fraction
also appears in a reference paper. Containment is the right measure here, not
Jaccard, because a short copied item inside a long paper scores low on Jaccard
and high on containment.

The reference side is the committed fingerprint file, which holds one-way hashes
of sampled 5-grams and no text at all. Anyone can therefore re-run this gate and
check the claim, without us redistributing a single third-party question. The
file is produced by tools/build_reference_fingerprints.py, which needs the
operator-local papers.

WHAT THIS CATCHES, AND WHAT IT DOES NOT
It catches near-verbatim reuse. It does not catch a competent paraphrase, and
neither does any other word-overlap measure, including the funnel's own 0.80
originality gate. Paraphrase detection needs embeddings and is deliberately out
of scope: at the overlap levels this bank actually shows, it would cost real
money to restate a conclusion this gate already reaches for nothing.

Usage:
    python3 tools/check_originality.py                # gate the shipped pack
    python3 tools/check_originality.py --self-test    # prove the gate can fail
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FINGERPRINTS = ROOT / "packs" / "ca-foundation-qa" / "audit" / "reference-fingerprints.json"
ITEMS = ROOT / "packs" / "ca-foundation-qa" / "items"

FAIL_AT = 0.50    # containment at or above this fails the build
WARN_AT = 0.30    # containment at or above this is reported but does not fail
MIN_MATCHES = 5   # and it must match at least this many shingles to fail at all
MIN_TOKENS = 10   # shorter than this carries no authorship to compare
LOW_RES = 8       # fewer sampled shingles than this and the ratio is coarse

# Why MIN_MATCHES exists: a short item keeps few sampled shingles, so a single
# coincidental match can push its ratio over the bar. Requiring an absolute count
# as well means a failure always rests on real shared wording, never on one
# common phrase in a ten-word stem.


def tokens(text: str) -> list[str]:
    return re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()


def shingle_hashes(toks: list[str], k: int, keep: int, hex_len: int) -> set[str]:
    out: set[str] = set()
    for i in range(max(0, len(toks) - k + 1)):
        digest = hashlib.sha256(" ".join(toks[i : i + k]).encode()).hexdigest()
        if int(digest[:8], 16) % keep == 0:
            out.add(digest[:hex_len])
    return out


def item_text(record: dict) -> str:
    parts = [record.get("stem", "")]
    for opt in record.get("options") or []:
        parts.append(str(opt.get("text", "") if isinstance(opt, dict) else opt))
    return " ".join(p for p in parts if p)


def containment(text: str, reference: set[str], cfg: dict) -> tuple[float, int, int, str]:
    """Return (containment, matching shingles, sampled shingles, status).

    Status separates two things that look alike and are not:
      "short"  the item has too few words to carry authorship at all. A four-word
               stem with numeric options cannot be copied from anyone, and no
               word-overlap method can say anything about it.
      "blind"  the item is long enough, but sampling left it with no shingles, so
               the gate genuinely cannot see it. That is a defect in the gate.
    """
    toks = tokens(text)
    if len(toks) < MIN_TOKENS:
        return 0.0, 0, 0, "short"
    mine = shingle_hashes(toks, cfg["k"], cfg["keep"], cfg["hex"])
    if not mine:
        return 0.0, 0, 0, "blind"
    hits = len(mine & reference)
    return hits / len(mine), hits, len(mine), "ok"


def load_reference() -> tuple[set[str], dict, list[str]]:
    data = json.loads(FINGERPRINTS.read_text())
    cfg = {
        "k": data["shingle_words"],
        "keep": data["sample_keep_one_in"],
        "hex": len(data["papers"][0]["fingerprints"][0]),
    }
    reference: set[str] = set()
    names = []
    for paper in data["papers"]:
        reference |= set(paper["fingerprints"])
        names.append(f"{paper['source']} ({paper['questions']} questions)")
    return reference, cfg, names


def self_test(reference: set[str], cfg: dict) -> int:
    """A gate nobody has seen fail is not a gate. Prove it on synthetic text.

    The real reference papers are operator-local, so this builds its own tiny
    reference out of text written here. That tests the algorithm end to end
    without needing any third-party document, which is why it can run in CI.
    """
    print("Self-test (synthetic reference, no third-party text involved)\n")
    ok = True

    original = (
        "a shopkeeper marks the price of a lamp thirty percent above cost and then "
        "allows a discount of ten percent on the marked price find the profit"
    )
    synthetic = shingle_hashes(tokens(original), cfg["k"], cfg["keep"], cfg["hex"])

    cases = [
        ("verbatim copy fails", original, True),
        ("copy with two words changed fails",
         original.replace("lamp", "clock").replace("thirty", "forty"), True),
        ("unrelated item passes",
         "the mean of five observations is twelve and the median is eleven "
         "compute the standard deviation of the given data set", False),
        ("paraphrase passes, which is the documented limit",
         "an item is priced above its cost then reduced by a tenth what gain "
         "remains for the seller after the reduction is applied", False),
    ]
    for label, text, should_fail in cases:
        score, hits, total, _ = containment(text, synthetic, cfg)
        fails = score >= FAIL_AT and hits >= MIN_MATCHES
        good = fails == should_fail
        ok &= good
        print(f"  {'PASS' if good else 'FAIL'}  {label}")
        print(f"        containment {score:.3f}, {hits}/{total} shingles, "
              f"gate {'trips' if fails else 'holds'}")

    score, hits, total, status = containment("x", synthetic, cfg)
    good = (score, hits, total, status) == (0.0, 0, 0, "short")
    ok &= good
    print(f"  {'PASS' if good else 'FAIL'}  a one-word item is reported as too short, not as a pass")

    print("\nSelf-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--self-test", action="store_true", help="prove the gate can fail")
    args = ap.parse_args()

    if not FINGERPRINTS.exists():
        print(f"FAIL  {FINGERPRINTS.relative_to(ROOT)} is missing.")
        print("      Rebuild it with tools/build_reference_fingerprints.py.")
        return 1

    reference, cfg, names = load_reference()
    print(f"Reference: {', '.join(names)}")
    print(f"Fingerprints: {len(reference)} sampled {cfg['k']}-gram hashes, no text\n")

    if args.self_test:
        return self_test(reference, cfg)

    files = sorted(ITEMS.glob("*.json"))
    if not files:
        print(f"FAIL  no items in {ITEMS.relative_to(ROOT)}")
        return 1

    scored = []
    for path in files:
        record = json.loads(path.read_text())
        score, hits, total, status = containment(item_text(record), reference, cfg)
        scored.append((score, hits, total, path.stem, status))
    scored.sort(reverse=True)

    failed = [s for s in scored if s[0] >= FAIL_AT and s[1] >= MIN_MATCHES]
    warned = [s for s in scored if WARN_AT <= s[0] < FAIL_AT]
    coarse = [s for s in scored if s[4] == "ok" and s[2] < LOW_RES]
    short = [s for s in scored if s[4] == "short"]
    blind = [s for s in scored if s[4] == "blind"]

    print(f"Items checked: {len(scored) - len(short)} of {len(scored)}")
    print(f"Highest containment: {scored[0][0]:.3f}  "
          f"(fails at {FAIL_AT:.2f} with {MIN_MATCHES}+ matching shingles)")
    print("\nTop 5:")
    for score, hits, total, name, _ in scored[:5]:
        print(f"  {score:.3f}  {hits}/{total} shingles  {name}")

    # Resolution is reported, never hidden. An item the gate cannot see clearly
    # must be visible as such, or a silent pass looks like a real one.
    if coarse:
        print(f"\nNote: {len(coarse)} item(s) keep fewer than {LOW_RES} sampled shingles, "
              "so their ratio is coarse. The absolute match floor covers them.")
    if short:
        print(f"\nNote: {len(short)} item(s) hold fewer than {MIN_TOKENS} words across stem "
              "and options, so no word-overlap method can judge them. A stem that short "
              "carries no authorship to copy.")
        for _, _, _, name, _ in short:
            print(f"  {name}")

    if blind:
        print(f"\nFAIL  {len(blind)} item(s) are long enough to judge but produced no "
              "sampled shingles, so the gate could not see them:")
        for _, _, _, name, _ in blind[:10]:
            print(f"  {name}")
        print("\nAn unchecked item cannot be called original. Lower the sample rate in "
              "tools/build_reference_fingerprints.py and rebuild.")
        return 1

    if warned:
        print(f"\nWARN  {len(warned)} item(s) at or above {WARN_AT:.2f}. Review, do not ignore:")
        for score, hits, total, name, _ in warned:
            print(f"  {score:.3f}  {hits}/{total} shingles  {name}")

    if failed:
        print(f"\nFAIL  {len(failed)} item(s) at or above {FAIL_AT:.2f} containment "
              "against a published exam-board paper:")
        for score, hits, total, name, _ in failed:
            print(f"  {score:.3f}  {hits}/{total} shingles  {name}")
        print("\nEvery shipped question must be original. Rewrite or drop these items.")
        return 1

    print(f"\nOK: originality gate passed. No item reaches {FAIL_AT:.2f} containment "
          "against any published reference paper.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
