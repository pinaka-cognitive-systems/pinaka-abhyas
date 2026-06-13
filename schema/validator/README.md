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

`SCHEMA`, `HASH_MISMATCH`, `HASH_ERROR`, `DUP_CONTENT_HASH`, `DUP_ID`, `UNKNOWN_TEST_NODE`, `DIFFICULTY_NOT_IN_SCALE`, `BAD_OPTION_KEYS`, `RATIONALE_COVERAGE`, `RATIONALE_BAD_OPTION`, `RATIONALE_VERDICT_MISMATCH`, `UNKNOWN_MISCONCEPTION`, `MISCONCEPTION_REQUIRED`, `MISSING_COMMON_ERRORS`, `COMMON_ERROR_EQUALS_ANSWER`, `DANGLING_ASSET_REF`, `ASSET_OWNER_MISMATCH`, `ABSTRACT_TEST_NODE`, `MISCONCEPTION_FAMILY_MISMATCH`, `TAXONOMY_VERSION_MISMATCH`, `UNPUBLISHABLE_LICENSE`, `SOLUTION_FILE_MISSING`, plus `svg_is_safe()` for SVG sanitization (spec 11.4).

**Schema and integrity:**
- `SCHEMA` — item fails JSON Schema (Tier 1) validation; message carries the jsonschema error detail.
- `HASH_ERROR` — `content_hash` could not be recomputed due to a canonicalization exception (e.g. malformed item structure); item is treated as invalid.

**Option and rationale checks:**
- `RATIONALE_COVERAGE` — `per_option_rationale` does not cover exactly the same option keys as `options`; keys present in one set but not the other are reported.
- `MISCONCEPTION_REQUIRED` — an incorrect option in `per_option_rationale` has no `misconception` tag; every wrong option must cite a misconception.
- `MISSING_COMMON_ERRORS` — a `numeric_entry` item has no `common_errors` list; numeric items must carry at least one error-pattern diagnosis.
- `COMMON_ERROR_EQUALS_ANSWER` — a value in `common_errors` equals the correct answer after normalization; a common error must be a wrong value.

**License gate:**
- `UNPUBLISHABLE_LICENSE` — `provenance.license` is `LicenseRef-pinaka-internal-unreleased` and `verification_status` is `published`; unreleased content cannot be shipped.

**Voice and notation gate:**
- `DASH_VIOLATION` — `--` (ASCII double hyphen) appears in stem, options, explanation, `explanation_sections`, or rationales; the voice rule bans dashes (em/en dashes are already rejected by the ADR 0015 allowlist — this catches the ASCII stand-in).

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
