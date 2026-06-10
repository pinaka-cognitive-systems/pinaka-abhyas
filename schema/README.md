# UQS schema — Core and Profiles

The executable contract for a Pinaka question. Two axes here. Do not conflate them.

- **Composition: Core vs Profile.** `core/` is the exam-agnostic structure, shared by every exam. `profiles/<exam>/` specializes it via `allOf` + `$ref` and carries the exam-specific taxonomy, misconception canon, marking, and manifest. To add an exam, add a Profile. Do not edit the Core.
- **Validation: Tier 1 vs Tier 2.** Tier 1 is JSON Schema on a single record (`validate.py`). Tier 2 is the cross-record pack validator (`validator/`). In this repo "Tier 1 / Tier 2" always means the validation passes, never the Core/Profile split.

## Layout

| Path | Role |
|---|---|
| `core/uqs-core.schema.json` | Exam-agnostic Core (draft 2020-12). The reusable structure. |
| `core/event-log.schema.json` | The per-answer event record. Feeds diagnosis, spaced repetition, opt-in telemetry. |
| `profiles/ca-foundation-qa/ca-foundation-qa.schema.json` | CA Foundation QA Profile. `allOf` [Core, CA narrowing]. |
| `profiles/ca-foundation-qa/taxonomy.json` | CA QA skill tree (from the ICAI syllabus) + difficulty scale. |
| `profiles/ca-foundation-qa/misconceptions.json` | CA QA misconception canon (closed set + tagging rule). |
| `profiles/ca-foundation-qa/marking.json` | ICAI marking and pass config. |
| `profiles/ca-foundation-qa/profile.json` | Manifest: option count, item types, v1 scope, file links. |
| `examples/ca-qa-000088.valid.json` | Must-accept fixture. |
| `examples/ca-qa-000088.invalid.json` | Must-reject fixture. |
| `validate.py` | Tier 1: meta-validates Core and Profile, accepts the valid example, rejects the invalid one. |
| `validator/pack_validator.py` | Tier 2: cross-record invariants. |
| `validator/run_checks.py` | Tier 2 runner: good pack clean, every reject fires, migration, SVG guard. |
| `validator/canonical.py` | Canonical content hashing (shared by validator and build). |
| `validator/migrate_ca_v1.py` | CA v1 -> UQS migration. |
| `generate.sh` | Regenerate types. Pending a bundling step (see Codegen follow-up). |

## Use

- Tier 1: `python3 validate.py`
- Tier 2: `python3 validator/run_checks.py`

Both need `jsonschema`, `referencing`, and `rfc3339-validator`. Install with:

```bash
pip install ".[dev]"
```

Run this from the repo root in a fresh venv (`python3 -m venv .venv && source .venv/bin/activate`) or in any environment that has the root `pyproject.toml` installed. The `[dev]` extra also installs `pytest` for the test suites.

## v1 scope

CA Foundation QA: `single_best` (exactly 4 options) and `numeric_entry`. Diagrams and image assets are disabled in the Profile for v1; the Core keeps the asset machinery for future exams. `multi_select` and stimulus/grouping are deferred until an exam needs them.

## Codegen follow-up

`generated/` was removed during the Core/Profile split. The Profile composes the Core via `$ref` by `$id`; `datamodel-code-generator` and `json-schema-to-typescript` need a bundling step (inline the Core into one document) before they can emit types. Tracked as a follow-up.

## What Tier 1 does NOT check

Cross-record rules belong to Tier 2: `content_hash` recompute and pack-level uniqueness; `tests[]` referential integrity against the Profile taxonomy; `answer_key.correct` being an existing option key; `per_option_rationale.misconception` existing in the canon; asset sanitization and `{{asset:id}}` resolution.
