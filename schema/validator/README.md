# UQS Tier 2 — shared pack validator (CA QA)

The cross-record rules JSON Schema cannot express. Tier 1 (`../profiles/ca-foundation-qa/ca-foundation-qa.schema.json`) checks one record's structure. Tier 2 checks a whole **pack**: a set of items, their assets, and the exam taxonomy together.

## Files

| File | Role |
|---|---|
| `canonical.py` | The one place content_hash is computed (spec section 9). Also `--stamp` to fill hashes into a pack. Normalizes numeric answer_key values before hashing (VAL-08). |
| `pack_validator.py` | The validator. Runs the schema per item, then the cross-record checks. Returns `Violation(code, item_id, message)`. Also `svg_is_safe()`. |
| `migrate_ca_v1.py` | Executable CA Foundation v1 -> UQS migration (spec 16.1). |
| `run_checks.py` | The CI entry point. Proves every invariant fires with exact violation-set assertions (VAL-05). |
| `quality.py` | Advisory content-quality lint. Contains `run_b1_readability_checks()` for B1 CEFR readability. |
| `../profiles/ca-foundation-qa/taxonomy.json` | CA taxonomy bundle: nodes, L1-L3 scale. |
| `../profiles/ca-foundation-qa/misconceptions.json` | Misconception canon (v2). |
| `packs/good.json` | A valid pack. Must validate clean. |
| `packs/reject/*.json` | One fixture per invariant. Each fires exactly the documented violation set (see REJECTS in run_checks.py). |
| `packs/legacy/ca_v1_000088.json` | A CA v1 item, input to the migration round-trip. |

## Run

```
python3 run_checks.py     # exit 0 = all good
```

This validates the good pack (expect 0 violations), asserts each reject fixture fires exactly its documented violation set, migrates the legacy item and validates the result, and exercises the SVG sanitizer.

To (re)compute hashes after editing item content:

```
python3 canonical.py --stamp packs/good.json
```

## Invariants enforced (beyond the schema)

`HASH_MISMATCH`, `DUP_CONTENT_HASH`, `DUP_ID`, `UNKNOWN_TEST_NODE`, `DIFFICULTY_NOT_IN_SCALE`, `BAD_OPTION_KEYS`, `RATIONALE_BAD_OPTION`, `RATIONALE_VERDICT_MISMATCH`, `UNKNOWN_MISCONCEPTION`, `DANGLING_ASSET_REF`, `ASSET_OWNER_MISMATCH`, `ABSTRACT_TEST_NODE`, `MISCONCEPTION_FAMILY_MISMATCH`, `TAXONOMY_VERSION_MISMATCH`, `SOLUTION_FILE_MISSING`, plus `svg_is_safe()` for SVG sanitization (spec 11.4).

**Highest-harm content gates (W3-3):**
- `DISTRACTOR_EQUALS_KEY` — any incorrect option text equals the correct option text after canonical normalization.
- `STEM_ANSWER_LEAK` — the correct option text appears verbatim in the stem (non-LR items), or the stem contains the literal phrases "the answer is" or "correct option".
- `NEAR_DUPLICATE` — two stems in the same pack have word-shingle (k=3) Jaccard similarity ≥ 0.80.

**Encoding and notation gate (W3-5 / ADR 0015):**
- `NOTATION_VIOLATION` — stem, options, explanation, or rationales contain LaTeX commands (backslash sequences), HTML tags, C0/C1 control characters, U+FFFD replacement character, or any character outside the ADR 0015 unicode allowlist (ASCII + explicit math/currency glyphs).

## CI gate

The two commands together are the gate for any content change:

```
python3 ../validate.py     # Tier 1: schema + example fixtures + 23-variant invalid matrix
python3 run_checks.py      # Tier 2: cross-record + migration + sanitize
```

Scope: CA QA surface only. Stimulus, grouping, comparative passages, data sets, multi_select, and the LSAT extension are deferred per spec section 1.1.
