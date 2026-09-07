#!/usr/bin/env python3
"""Build the originality fingerprint file from operator-local reference papers.

WHY THIS EXISTS
Originality is the legal basis for the content licence (LICENSE-CONTENT.md) and
for the commercial licence (COMMERCIAL.md). Until now the funnel only measured an
item against our own bank and our own reference set. It never compared a shipped
item against a real exam board's published questions, because those papers are
operator-local and are never committed (see .gitignore).

This script closes that gap without redistributing anything. It reads the local
papers and writes one-way hashes of their word 5-grams. Hashes are not text. The
committed file lets anyone re-run the gate and check our originality claim, and
it lets CI run the gate on every push, while the source papers stay where they
are.

WHY THE SHINGLES ARE SAMPLED
A complete set of 5-gram hashes can in principle be chained back into the source
text, because consecutive 5-grams overlap by four words. Keeping only a
deterministic fraction breaks that chaining while leaving overlap measurable: the
sample is unbiased, so a copied item still matches a matching fraction of its own
sampled shingles. KEEP_FRACTION sets the rate.

The rate is a real trade-off and was measured, not guessed. At one in four, a
third of our items retained fewer than eight sampled shingles and some retained
none at all, so the gate could not see them: a silent pass, which is worse than
no gate. One in two gives a median of about twenty shingles per item, enough for
a stable ratio, while still leaving gaps that defeat chaining. The gate also
requires an absolute number of matching shingles, so a very short item cannot
fail on one coincidence.

Operator use only. Run it when a reference paper is added or changed:
    python3 tools/build_reference_fingerprints.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "syllabus" / "extracted"
OUT = ROOT / "packs" / "ca-foundation-qa" / "audit" / "reference-fingerprints.json"

K = 5                 # words per shingle
KEEP_FRACTION = 2     # keep 1 shingle in this many
HASH_HEX = 12         # bytes of digest kept per shingle
MIN_QUESTIONS = 10    # below this a file is a table, not a question paper


def tokens(text: str) -> list[str]:
    """Lowercase word tokens. Punctuation and case never carry authorship."""
    return re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()


def shingle_hashes(toks: list[str], keep: int = KEEP_FRACTION) -> set[str]:
    """Deterministically sampled 5-gram hashes. Same input, same output, always."""
    out: set[str] = set()
    for i in range(max(0, len(toks) - K + 1)):
        digest = hashlib.sha256(" ".join(toks[i : i + K]).encode()).hexdigest()
        if int(digest[:8], 16) % keep == 0:
            out.add(digest[:HASH_HEX])
    return out


def split_questions(raw: str) -> list[str]:
    """Split an extracted paper into questions on the bold-number heading."""
    parts = re.split(r"\n(?=\*\*\d)", raw)
    return [p for p in parts if len(tokens(p)) >= 10]


def main() -> int:
    if not SOURCE_DIR.is_dir():
        print(f"FAIL  {SOURCE_DIR} not found. This script is operator-only and needs")
        print("      the local reference papers, which are never committed.")
        return 1

    sources = sorted(SOURCE_DIR.glob("*.md"))
    if not sources:
        print(f"FAIL  no .md reference extractions in {SOURCE_DIR}")
        return 1

    papers = []
    for src in sources:
        questions = split_questions(src.read_text())
        if len(questions) < MIN_QUESTIONS:
            # Weightage tables and syllabus outlines are reference data, not
            # authored questions. Fingerprinting them would flag every item that
            # merely names a topic.
            print(f"skip  {src.name}: {len(questions)} block(s), not a question paper")
            continue
        papers.append(
            {
                "source": src.stem,
                "questions": len(questions),
                "fingerprints": sorted(
                    set().union(*(shingle_hashes(tokens(q)) for q in questions))
                ),
            }
        )
        print(f"ok    {src.name}: {len(questions)} questions")

    if not papers:
        print("FAIL  nothing to fingerprint")
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "note": (
                    "One-way hashes of sampled word 5-grams from published exam-board "
                    "papers. Not text, and not a copy. Used by tools/check_originality.py "
                    "so the originality claim can be verified without redistributing any "
                    "third-party question."
                ),
                "shingle_words": K,
                "sample_keep_one_in": KEEP_FRACTION,
                "hash": f"sha256, first {HASH_HEX} hex characters",
                "papers": papers,
            },
            indent=2,
        )
        + "\n"
    )
    total = sum(len(p["fingerprints"]) for p in papers)
    print(f"\nwrote {OUT.relative_to(ROOT)}: {len(papers)} paper(s), {total} fingerprints")
    return 0


if __name__ == "__main__":
    sys.exit(main())
