# UQS Tier 2 — shared pack validator (CA QA)

The cross-record rules JSON Schema cannot express. Tier 1 (`../uqs-ca-qa.schema.json`) checks one record's structure. Tier 2 checks a whole **pack**: a set of items, their assets, and the exam taxonomy together.

## Files

| File | Role |
|---|---|
| `canonical.py` | The one place content_hash is computed (spec section 9). Also `--stamp` to fill hashes into a pack. |
| `pack_validator.py` | The validator. Runs the schema per item, then the cross-record checks. Returns `Violation(code, item_id, message)`. Also `svg_is_safe()`. |
| `migrate_ca_v1.py` | Executable CA Foundation v1 -> UQS migration (spec 16.1). |
| `run_checks.py` | The CI entry point. Proves every invariant fires. |
| `taxonomy/ca_foundation.taxonomy.json` | CA taxonomy bundle: nodes, L1-L3 scale, misconception vocabulary. Seed; expand as content grows. |
| `packs/good.json` | A valid pack. Must validate clean. |
| `packs/reject/*.json` | One fixture per invariant. Each fails exactly one check. |
| `packs/legacy/ca_v1_000088.json` | A CA v1 item, input to the migration round-trip. |

## Run

```
python3 run_checks.py     # exit 0 = all good
```

This validates the good pack (expect 0 violations), asserts each reject fixture surfaces its invariant, migrates the legacy item and validates the result, and exercises the SVG sanitizer.

To (re)compute hashes after editing item content:

```
python3 canonical.py --stamp packs/good.json
```

## Invariants enforced (beyond the schema)

`HASH_MISMATCH`, `DUP_CONTENT_HASH`, `DUP_ID`, `UNKNOWN_TEST_NODE`, `DIFFICULTY_NOT_IN_SCALE`, `BAD_OPTION_KEYS`, `RATIONALE_BAD_OPTION`, `RATIONALE_VERDICT_MISMATCH`, `UNKNOWN_MISCONCEPTION`, `DANGLING_ASSET_REF`, `ASSET_OWNER_MISMATCH`, plus `svg_is_safe()` for SVG sanitization (spec 11.4).

## CI gate

The two commands together are the gate for any content change:

```
python3 ../validate.py     # Tier 1: schema + example fixtures
python3 run_checks.py      # Tier 2: cross-record + migration + sanitize
```

Scope: CA QA surface only. Stimulus, grouping, comparative passages, data sets, multi_select, and the LSAT extension are deferred per spec section 1.1.
