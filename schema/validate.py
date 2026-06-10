#!/usr/bin/env python3
"""Validate the UQS CA QA examples against the composed schema (Core + Profile),
and validate the event-log schema plus its accept/reject fixtures.

This proves the schemas are executable, not just prose:
  1. the Core and the Profile each meta-validate as draft 2020-12,
  2. the must-accept item example conforms to the Profile (which $refs the Core),
  3. the must-reject item example is rejected,
  4. the event-log schema meta-validates as draft 2020-12,
  5. every accept fixture under validator/events/accept/ validates clean,
  6. every reject fixture under validator/events/reject/ is rejected,
  7. FormatChecker has an active date-time checker (rfc3339-validator must be installed).

The CA Foundation QA Profile (profiles/ca-foundation-qa/) composes the
exam-agnostic Core (core/uqs-core.schema.json) via allOf + $ref. A referencing
registry resolves that $ref at validation time.

Run: python3 validate.py   (exit 0 = all good, 1 = a check failed)

Note: cross-record invariants (content_hash recompute, pack-level uniqueness,
taxonomy and misconception referential integrity, answer membership) are NOT
checked here. They belong to the shared pack validator (validator/).
"""
import json
import pathlib
import sys

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

BASE = pathlib.Path(__file__).parent
CORE_PATH = BASE / "core" / "uqs-core.schema.json"
PROFILE_PATH = BASE / "profiles" / "ca-foundation-qa" / "ca-foundation-qa.schema.json"
EVENT_SCHEMA_PATH = BASE / "core" / "event-log.schema.json"
EVENTS_DIR = BASE / "validator" / "events"


def load(path):
    return json.loads((BASE / path).read_text())


def _assert_datetime_checker_active(fc: FormatChecker) -> None:
    """Fail loudly if the date-time format checker is not active.

    rfc3339-validator (or another date-time provider) must be installed.
    A missing dependency silently disables format validation, which is
    worse than a crash because bad timestamps pass without notice.
    """
    probe = {"type": "string", "format": "date-time"}
    probe_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "string",
        "format": "date-time",
    }
    validator = Draft202012Validator(probe_schema, format_checker=fc)
    errors = list(validator.iter_errors("not-a-date"))
    if not errors:
        print("FAIL  date-time FormatChecker is inactive — install rfc3339-validator")
        print("      pip install rfc3339-validator")
        sys.exit(1)


def main() -> int:
    core = json.loads(CORE_PATH.read_text())
    profile = json.loads(PROFILE_PATH.read_text())
    event_schema = json.loads(EVENT_SCHEMA_PATH.read_text())

    fc = FormatChecker()

    # 0. Assert date-time checker is active before any format-dependent test.
    _assert_datetime_checker_active(fc)
    print("PASS  date-time FormatChecker is active (rfc3339-validator installed)")

    # 1. Item schemas must themselves be valid.
    Draft202012Validator.check_schema(core)
    Draft202012Validator.check_schema(profile)
    print("PASS  core and profile meta-validate as draft 2020-12")

    registry = Registry().with_resource(core["$id"], Resource.from_contents(core))
    item_validator = Draft202012Validator(profile, registry=registry, format_checker=fc)
    ok = True

    # 2. Must-accept item example.
    valid_errs = sorted(item_validator.iter_errors(load("examples/ca-qa-000088.valid.json")),
                        key=lambda e: list(e.path))
    if valid_errs:
        ok = False
        print("FAIL  valid example produced errors:")
        for e in valid_errs:
            print(f"        {list(e.path)}: {e.message}")
    else:
        print("PASS  valid example conforms")

    # 3. Must-reject item example.
    invalid_errs = list(item_validator.iter_errors(load("examples/ca-qa-000088.invalid.json")))
    if not invalid_errs:
        ok = False
        print("FAIL  invalid example unexpectedly conformed")
    else:
        print(f"PASS  invalid example rejected ({len(invalid_errs)} violations); first: {invalid_errs[0].message}")

    # 4. Event-log schema meta-validates as draft 2020-12.
    Draft202012Validator.check_schema(event_schema)
    print("PASS  event-log schema meta-validates as draft 2020-12")

    event_validator = Draft202012Validator(event_schema, format_checker=fc)

    # 5. Accept fixtures: every file must validate clean.
    accept_dir = EVENTS_DIR / "accept"
    accept_files = sorted(accept_dir.glob("*.json")) if accept_dir.exists() else []
    if not accept_files:
        ok = False
        print("FAIL  no event accept fixtures found in validator/events/accept/")
    for path in accept_files:
        data = json.loads(path.read_text())
        errs = list(event_validator.iter_errors(data))
        if errs:
            ok = False
            print(f"FAIL  event accept/{path.name} produced errors:")
            for e in errs[:3]:
                print(f"        {list(e.path)}: {e.message}")
        else:
            print(f"PASS  event accept/{path.name} conforms")

    # 6. Reject fixtures: every file must be rejected.
    reject_dir = EVENTS_DIR / "reject"
    reject_files = sorted(reject_dir.glob("*.json")) if reject_dir.exists() else []
    if not reject_files:
        ok = False
        print("FAIL  no event reject fixtures found in validator/events/reject/")
    for path in reject_files:
        data = json.loads(path.read_text())
        errs = list(event_validator.iter_errors(data))
        if not errs:
            ok = False
            print(f"FAIL  event reject/{path.name} unexpectedly conformed (should be rejected)")
        else:
            print(f"PASS  event reject/{path.name} rejected ({len(errs)} violation(s)); first: {errs[0].message}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
