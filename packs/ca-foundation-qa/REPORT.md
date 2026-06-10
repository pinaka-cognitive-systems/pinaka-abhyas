# ca_abhyas generation spike v1 — report

Goal: prove we can generate ORIGINAL CA QA questions, from the public syllabus, with
accurate per-option misconception tags, cheaply. This is the real Gate A path (the v1
enrichment pilot is retired).

## What was built

24 original UQS items (`arn_caf_qa_000001`..`000024`), authored from scratch across 20
taxonomy nodes spanning Business Maths, Logical Reasoning, and Statistics, including the
LR and conceptual families that canon v1 could not tag. Pool `arena`, license
`CC-BY-NC-SA-4.0` (Pinaka-owned), provenance `pinaka_synth_genspike_v1`. No third-party
content.

Method: misconception canon v2 (37 ids) plus distractor-by-construction. Each wrong
option is produced by applying one specific canon misconception to the correct method
and computing the value it yields, so the tag is correct by construction. Four Sonnet
agents generated in parallel against `generation_spec.md` and the manifest.

## Verification

- Schema: Tier 1 + Tier 2 clean on all 24 (`build_and_validate.py`).
- Keys: a Haiku blind re-solve of all 24, plus two adversarial Sonnet auditors that
  independently re-solved every item AND recomputed every distractor.
- Deterministic: answer-position balance, answer-length, misconception coverage.

## Results (model-verified)

| Measure | Result |
|---|---|
| Wrong-key rate | **0/24.** Both Sonnet auditors confirmed all 24 keys. The Haiku blind solver disagreed on 10, but those were Haiku's own errors on harder items. |
| Distractor value-correctness | **72/72.** Every wrong option's value genuinely equals what its tagged misconception produces. By-construction worked. |
| Tag-name accuracy (as generated) | **58/72 = 81% strict; 66/72 = 92% acceptable.** 6 tags outright wrong, 8 weak (a defensible id where a more specific one existed). |
| After correction | 13 auditor-recommended tag fixes applied. Remaining: 0 known-wrong, 1 known-weak (`000017` opt4, a contrived regression distractor). |
| Answer position | 6 / 6 / 6 / 6 across keys 1-4. |
| Surface tell | Correct option uniquely longest in 2 of 24 (`000018`, `000020`). |
| Coverage | 31 of 37 canon misconceptions exercised, including all v2 LR and conceptual ids. |
| Cost | ~14k tokens/item to generate and verify (gen ~227k + verify ~109k tokens over 24). |

## Gate A status: demonstrated, not certified

- Wrong-key < 0.5%: met (0/24) on model verification.
- Tag accuracy >= 85%: 81% strict as-generated, 92% acceptable, ~99% after the auditor
  corrections. Met after a fix pass, on model audit.
- Known cost per question: yes, ~14k tokens/item.

Two honest limits remain before Gate A can be called passed:
1. **Human expert audit.** All verification here is model-on-model. The bar wants an
   expert-rated sample. A real CA tutor must audit a sample.
2. **Sample size.** 24 items is a spike; the rate has wide error bars. The same pipeline
   scales to the blueprint volume (~300) for a tight number.

## Artifacts

- Items: `packs/ca-foundation-qa/items/arn_caf_qa_*.json` (24). Stamped pack: `packs/ca-foundation-qa/pack.json`.
- Spec: `prashna/profiles/ca_abhyas/generation_spec.md`. Manifest: `packs/ca-foundation-qa/manifest.json`.
- Canon v2: `schema/profiles/ca-foundation-qa/misconceptions.json` (version 2, 37 ids).
- Re-run: `python3 packs/ca-foundation-qa/build_and_validate.py`.

## Next

Recruit a CA expert for the audit; scale generation to blueprint volume; then Gate A is
certifiable. The pipeline and canon are proven on this spike.

---

## Addendum: 2026-06-10 honesty relabeling (W0-9)

All 24 items have been relabeled from machine_verified to model_audited.

Reason: verification was model-on-model (Haiku blind solve, two Sonnet adversarial
auditors), not executable. ADR 0005 defines machine_verified to require an executable
solution that reproduces the key in CI. No such executable solution was authored for any
item in this spike. model_audited is the accurate status for verification that was
rigorous but performed by models only, with no executable solution having reproduced the
key.

Item arn_caf_qa_000009 has been set to quarantined. The 2026-06-10 deep audit (finding
CON-01) confirmed by brute-force enumeration over kinship assignments that this item's
premises are logically self-contradictory. Both model auditors missed this. The item
must not be served to students. A replacement will be authored at W4-1.

The usable count from this spike is 23. The stamped pack.json includes all 24 records
(including the quarantined item) so validators can inspect it, but the 23 non-quarantined
items are the ones eligible for use.

machine_verified labels are earned only through the W3-1 key-execution harness and the
W3-2 LR verification harness.
