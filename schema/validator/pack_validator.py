#!/usr/bin/env python3
"""UQS Tier 2 pack validator (CA QA surface).

Runs the JSON Schema (Tier 1) on every item, then the cross-record rules that
JSON Schema cannot express. Returns a list of Violation(code, item_id, message).

Cross-record checks:
  HASH_MISMATCH              content_hash != recomputed
  DUP_CONTENT_HASH           two items in an exam share content (duplicate problem)
  DUP_ID                     two items share an id
  UNKNOWN_TEST_NODE          tests[] references a node absent from the taxonomy
  DIFFICULTY_NOT_IN_SCALE    difficulty_label not in the exam scale
  BAD_OPTION_KEYS            option keys not unique+contiguous, or answer not a key
  RATIONALE_BAD_OPTION       rationale references a non-existent option
  RATIONALE_VERDICT_MISMATCH rationale verdict disagrees with answer_key
  UNKNOWN_MISCONCEPTION      misconception absent from the exam vocabulary
  DANGLING_ASSET_REF         {{asset:id}} reference does not resolve
  ASSET_OWNER_MISMATCH       referenced asset is owned by another record

Note: SVG sanitization is svg_is_safe(); the build runs it before packing.
Schema-level structure is delegated to the JSON Schema.
"""
import re
from collections import namedtuple

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry

import canonical

Violation = namedtuple("Violation", ["code", "item_id", "message"])

# SVG can carry scripts. Reject these tokens (spec 11.4).
SVG_FORBIDDEN = re.compile(
    r"<script\b|<foreignObject\b|\son\w+\s*=|(?:xlink:)?href\s*=\s*[\"']\s*https?:",
    re.IGNORECASE,
)


def svg_is_safe(svg_text: str) -> bool:
    return SVG_FORBIDDEN.search(svg_text or "") is None


def validate_pack(pack, taxonomy, schema, registry=None):
    """taxonomy = {"nodes": set, "misconceptions": set, "difficulty_scale": list}.

    schema is the item schema to enforce (the CA Foundation QA Profile). When that
    schema composes the Core via $ref, pass a referencing registry that resolves it.
    """
    violations = []
    reg = registry if registry is not None else Registry()
    schema_validator = Draft202012Validator(schema, registry=reg, format_checker=FormatChecker())
    items = pack.get("items", [])
    assets_by_id = {a["id"]: a for a in pack.get("assets", [])}

    seen_ids = set()
    seen_hash = {}

    for item in items:
        iid = item.get("id", "<no-id>")

        # 1. structural (Tier 1)
        for err in schema_validator.iter_errors(item):
            violations.append(Violation("SCHEMA", iid, err.message))

        # 2. id uniqueness (pack-level)
        if iid in seen_ids:
            violations.append(Violation("DUP_ID", iid, "duplicate id in pack"))
        seen_ids.add(iid)

        # 3. content_hash recompute + uniqueness
        try:
            recomputed = canonical.compute_item_content_hash(item, assets_by_id)
            if item.get("content_hash") != recomputed:
                violations.append(
                    Violation("HASH_MISMATCH", iid, f"expected {recomputed}")
                )
            else:
                key = (item.get("exam"), recomputed)
                if key in seen_hash:
                    violations.append(
                        Violation("DUP_CONTENT_HASH", iid, f"same content as {seen_hash[key]}")
                    )
                else:
                    seen_hash[key] = iid
        except Exception as exc:  # missing fields etc.
            violations.append(Violation("HASH_ERROR", iid, str(exc)))

        # 4. taxonomy referential integrity
        for node in item.get("tests", []):
            if node not in taxonomy["nodes"]:
                violations.append(Violation("UNKNOWN_TEST_NODE", iid, node))
        if item.get("difficulty_label") not in taxonomy["difficulty_scale"]:
            violations.append(
                Violation("DIFFICULTY_NOT_IN_SCALE", iid, str(item.get("difficulty_label")))
            )

        # 5. option keys + answer membership (single_best)
        option_keys = [o["key"] for o in item.get("options", [])]
        if item.get("item_type") == "single_best":
            unique_contiguous = (
                len(set(option_keys)) == len(option_keys)
                and sorted(option_keys) == list(range(1, len(option_keys) + 1))
            )
            if not unique_contiguous:
                violations.append(Violation("BAD_OPTION_KEYS", iid, f"keys {option_keys}"))
            correct = item.get("answer_key", {}).get("correct")
            if correct not in set(option_keys):
                violations.append(
                    Violation("BAD_OPTION_KEYS", iid, f"answer {correct} is not an option key")
                )
            # per-option diagnosis is required: exactly one rationale per option
            rkeys = [r.get("option_key") for r in item.get("per_option_rationale", [])]
            if set(rkeys) != set(option_keys) or len(rkeys) != len(set(rkeys)):
                violations.append(
                    Violation("RATIONALE_COVERAGE", iid, f"rationale {sorted(set(rkeys))} vs options {sorted(set(option_keys))}")
                )

        # 6. rationale alignment
        correct = item.get("answer_key", {}).get("correct")
        for r in item.get("per_option_rationale", []):
            okey = r.get("option_key")
            if item.get("item_type") == "single_best" and okey not in set(option_keys):
                violations.append(Violation("RATIONALE_BAD_OPTION", iid, f"option {okey}"))
            expected = "correct" if okey == correct else "incorrect"
            if r.get("verdict") != expected:
                violations.append(
                    Violation(
                        "RATIONALE_VERDICT_MISMATCH",
                        iid,
                        f"option {okey}: verdict {r.get('verdict')}, expected {expected}",
                    )
                )
            misc = r.get("misconception")
            if misc is not None and misc not in taxonomy["misconceptions"]:
                violations.append(Violation("UNKNOWN_MISCONCEPTION", iid, misc))
            # every wrong option must name the misconception it encodes
            if okey != correct and not misc:
                violations.append(
                    Violation("MISCONCEPTION_REQUIRED", iid, f"incorrect option {okey} has no misconception")
                )

        # 6b. numeric items must carry common-error diagnosis
        if item.get("item_type") == "numeric_entry":
            common_errors = item.get("common_errors")
            if not common_errors:
                violations.append(Violation("MISSING_COMMON_ERRORS", iid, "numeric item has no common_errors"))
            else:
                answer_value = item.get("answer_key", {}).get("value")
                for ce in common_errors:
                    if ce.get("misconception") not in taxonomy["misconceptions"]:
                        violations.append(Violation("UNKNOWN_MISCONCEPTION", iid, str(ce.get("misconception"))))
                    if ce.get("value") == answer_value:
                        violations.append(Violation("COMMON_ERROR_EQUALS_ANSWER", iid, f"value {ce.get('value')}"))

        # 7. asset references resolve and are owned by this item
        texts = (
            [item.get("stem", "")]
            + [o["text"] for o in item.get("options", [])]
            + [item.get("explanation", "")]
        )
        for ref in canonical.referenced_asset_ids(texts):
            if ref not in assets_by_id:
                violations.append(Violation("DANGLING_ASSET_REF", iid, ref))
            elif assets_by_id[ref].get("owner_id") != iid:
                violations.append(Violation("ASSET_OWNER_MISMATCH", iid, ref))

    return violations
