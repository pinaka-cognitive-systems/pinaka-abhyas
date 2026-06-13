# Content integrity report — generation run gen-2026-06-13

CA Foundation, Paper 3 (Quantitative Aptitude). This run produced 600 new
questions, taking the bank from 106 to 706 items. This report is the public
funnel for that run: what was generated, what was rejected and why, and what we
did about each rejection. Rejections are recorded, not hidden. The machine-readable
record is `funnel_report.json` next to this file.

## The principle

No item ships on trust. Every question passes a chain of automated gates before it
enters the bank. Each gate has one job and one rejection rule. When a gate fails an
item, we either fix the specific defect and re-run every gate, or we throw the item
away and generate a fresh one. Either way it is recorded below.

## The gates, and exactly how we decide an item is not good enough

| Gate | What it checks | Rejection rule |
|---|---|---|
| Generation | An agent authors the item, original, from the public syllabus | Failed to produce a complete item (e.g. a network error mid-generation) |
| Tier-1 schema | The item's structure (required fields, option count, types) | Any field missing or malformed |
| Tier-2 cross-record | Tagging and question integrity across the whole bank | A distractor's misconception tag does not belong to the topic; the correct answer text leaks into the stem; a wrong option equals the correct one; the stem is a near-duplicate (word-overlap >= 0.80) of another item; notation or voice rules are broken (no LaTeX, no dashes) |
| Solution harness | **Correctness.** Every item ships an executable Python solution that is run in an isolated sandbox | The computed answer must reproduce the item's answer key. A mismatch, error, timeout, or any stray output is a hard reject |
| Originality | Word-overlap of the stem against both our own bank and the 723-item ICAI-modelled reference vault | Overlap >= 0.80 with any existing or reference item |

The solution harness is the heart of it: an item's answer is not accepted because a
language model said so. It is accepted because independent code computes the same
answer. The originality gate compares against the exam-board-modelled reference set
as well as our own bank, so nothing shipped is a reskin of someone else's question.

## This run's funnel

| Measure | Count |
|---|---|
| Generated (attempted) | 600 |
| Accepted into the bank | 600 |
| Passed every gate first time | 537 (89.5%) |
| Needed an edit, then re-verified | 55 |
| Thrown away and regenerated | 8 |
| **Shipped with a wrong answer key** | **0** |
| **Shipped that were not original** | **0** |

First-pass rejections by gate:

| Gate | Items flagged on first pass |
|---|---|
| Tier-1 schema | 10 |
| Tier-2 cross-record | 42 |
| Solution harness | 6 |
| Generation (transient failure) | 6 |

## What we did about each rejection

**Edited in place (55).** These items were sound questions with a cosmetic or
tagging defect, so we corrected the specific field and re-ran every gate:
- 19 had a misconception tag that did not belong to the topic (the diagnosis a
  student would see would have been wrong). We swapped each to the correct tag for
  the actual error the distractor represents.
- 18 used a forbidden double hyphen; reworded.
- 6 had a solution that printed debug output; we stripped it so only the verified
  answer remains.
- 3 leaked the answer into the stem; reworded the stem (the maths and the answer
  unchanged). One was a genuine leak; two were substring artifacts (for example the
  answer "8 days" sitting inside "18 days" in the question).
- 1 used a non-allowed character; fixed.
- The 10 proof-batch items below are also counted here.

**Regenerated (8).** These could not be repaired, so we discarded them and authored
replacements that re-entered the full gate chain:
- 6 never finished generating because their batch hit a network error.
- 1 was a near-duplicate of another new item; we replaced it with a distinct problem
  (word-overlap dropped to 0.24).
- (The near-duplicate's partner was kept; only one of the pair is removed.)

Every regenerated and edited item passed all five gates on re-check.

## A defect we caught before it could scale

We did not generate 600 items blind. We first generated a 10-item proof batch and ran
it through the gates. The schema gate rejected all 10 — two spec bugs: the per-option
diagnosis field was named wrong, and the correct option was missing its explanation.
We fixed the authoring spec, re-verified the 10, and only then generated the remaining
590. This is why the schema gate shows 10 first-pass rejections and why the full run
came in at 89.5% first-pass clean rather than failing wholesale.

## Cost

Generation: ~3.37M agent output tokens across 53 batches, plus the fix and
verification passes. All compute is at build time; students run zero AI and need no
internet after first load.

## Reproducibility

The gates are the scripts in `schema/validator/` (`pack_validator.py` for Tier-1/2,
`run_solutions.py` for the harness). The per-item record — every flagged item, its
violation, and the action taken — is in `funnel_report.json`. This funnel is emitted
for every generation run and committed with the pack.

## Not yet done (stated honestly)

These 600 are machine-verified (the solution harness reproduced every answer) but have
not yet been through the sampled blind-verify and human style/difficulty audit
(pipeline stage 5), which catches ambiguous wording that the maths cannot. That pass
is pending before this content is treated as exam-final.
