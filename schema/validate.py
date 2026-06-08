#!/usr/bin/env python3
"""Validate the UQS CA QA examples against the composed schema (Core + Profile).

This proves the schema is executable, not just prose:
  1. the Core and the Profile each meta-validate as draft 2020-12,
  2. the must-accept example conforms to the Profile (which $refs the Core),
  3. the must-reject example is rejected.

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


def load(path):
    return json.loads((BASE / path).read_text())


def main() -> int:
    core = json.loads(CORE_PATH.read_text())
    profile = json.loads(PROFILE_PATH.read_text())

    # 1. Both schemas must themselves be valid.
    Draft202012Validator.check_schema(core)
    Draft202012Validator.check_schema(profile)
    print("PASS  core and profile meta-validate as draft 2020-12")

    registry = Registry().with_resource(core["$id"], Resource.from_contents(core))
    validator = Draft202012Validator(profile, registry=registry, format_checker=FormatChecker())
    ok = True

    # 2. Must-accept.
    valid_errs = sorted(validator.iter_errors(load("examples/ca-qa-000088.valid.json")),
                        key=lambda e: list(e.path))
    if valid_errs:
        ok = False
        print("FAIL  valid example produced errors:")
        for e in valid_errs:
            print(f"        {list(e.path)}: {e.message}")
    else:
        print("PASS  valid example conforms")

    # 3. Must-reject.
    invalid_errs = list(validator.iter_errors(load("examples/ca-qa-000088.invalid.json")))
    if not invalid_errs:
        ok = False
        print("FAIL  invalid example unexpectedly conformed")
    else:
        print(f"PASS  invalid example rejected ({len(invalid_errs)} violations); first: {invalid_errs[0].message}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
