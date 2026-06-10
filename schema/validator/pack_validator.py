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
import pathlib
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


def validate_pack(pack, taxonomy, schema, registry=None, pack_root=None):
    """taxonomy = {"nodes": set, "misconceptions": set, "difficulty_scale": list,
                   "taxonomy_version": int (optional), "misconception_version": int (optional),
                   "abstract_nodes": set (optional),
                   "node_ancestors": dict (optional, node_id -> set of ancestor ids including self),
                   "misconception_families": dict (optional, misconception_id -> list of family prefixes),
                   "family_scoping_allowlist": set (optional, frozenset of (item_id, option_key, misconception_id) triples to skip)}.

    schema is the item schema to enforce (the CA Foundation QA Profile). When that
    schema composes the Core via $ref, pass a referencing registry that resolves it.

    pack_root is an optional pathlib.Path; when provided, SOLUTION_FILE_MISSING fires
    when an item's solution.path does not resolve to a non-empty file under pack_root.

    TAXONOMY_VERSION_MISMATCH fires when the taxonomy file's taxonomy_version, the
    misconception canon's version (if present), or any item's taxonomy_version disagree.
    """
    violations = []
    reg = registry if registry is not None else Registry()
    schema_validator = Draft202012Validator(schema, registry=reg, format_checker=FormatChecker())
    items = pack.get("items", [])
    assets_by_id = {a["id"]: a for a in pack.get("assets", [])}

    seen_ids = set()
    seen_hash = {}

    # 0. bundle version agreement: taxonomy, misconceptions, and all items must agree.
    bundle_tax_version = taxonomy.get("taxonomy_version")
    bundle_misc_version = taxonomy.get("misconception_version")
    if (
        bundle_tax_version is not None
        and bundle_misc_version is not None
        and bundle_tax_version != bundle_misc_version
    ):
        violations.append(
            Violation(
                "TAXONOMY_VERSION_MISMATCH",
                "<pack>",
                f"taxonomy taxonomy_version={bundle_tax_version} disagrees with "
                f"misconception canon version={bundle_misc_version}",
            )
        )

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
        if bundle_tax_version is not None:
            item_tax_version = item.get("taxonomy_version")
            if item_tax_version != bundle_tax_version:
                violations.append(
                    Violation(
                        "TAXONOMY_VERSION_MISMATCH",
                        iid,
                        f"item taxonomy_version={item_tax_version} does not match "
                        f"bundle taxonomy_version={bundle_tax_version}",
                    )
                )
        abstract_nodes = taxonomy.get("abstract_nodes", set())
        for node in item.get("tests", []):
            if node not in taxonomy["nodes"]:
                violations.append(Violation("UNKNOWN_TEST_NODE", iid, node))
            elif node in abstract_nodes:
                violations.append(
                    Violation(
                        "ABSTRACT_TEST_NODE",
                        iid,
                        f"{node} is an abstract (non-leaf) node and cannot be a test target",
                    )
                )
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
            # misconception family scoping: the misconception's declared families must
            # intersect the item's tests[] ancestor chain. "*" means unrestricted.
            if misc is not None and misc in taxonomy["misconceptions"]:
                misc_families = taxonomy.get("misconception_families", {})
                node_ancestors = taxonomy.get("node_ancestors", {})
                families = misc_families.get(misc, [])
                if families and families != ["*"] and "*" not in families and node_ancestors:
                    item_ancestors = set()
                    for node in item.get("tests", []):
                        item_ancestors |= node_ancestors.get(node, set())
                    if not any(fam in item_ancestors for fam in families):
                        allowlist = taxonomy.get("family_scoping_allowlist", set())
                        key = (iid, okey, misc)
                        if key not in allowlist:
                            violations.append(
                                Violation(
                                    "MISCONCEPTION_FAMILY_MISMATCH",
                                    iid,
                                    f"option {okey}: misconception {misc} (families {families}) "
                                    f"does not apply to item test nodes {item.get('tests', [])}",
                                )
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

        # 8. license: LicenseRef-pinaka-internal-unreleased is forbidden when published
        license_val = item.get("provenance", {}).get("license")
        status_val = item.get("verification_status")
        if (
            license_val == "LicenseRef-pinaka-internal-unreleased"
            and status_val == "published"
        ):
            violations.append(
                Violation(
                    "UNPUBLISHABLE_LICENSE",
                    iid,
                    "LicenseRef-pinaka-internal-unreleased is not permitted when verification_status is published",
                )
            )

        # 9. solution file must exist and be non-empty when solution is present
        solution = item.get("solution")
        if solution is not None and pack_root is not None:
            sol_path = pathlib.Path(solution.get("path", ""))
            full_path = pack_root / sol_path
            if not full_path.exists() or full_path.stat().st_size == 0:
                violations.append(
                    Violation(
                        "SOLUTION_FILE_MISSING",
                        iid,
                        f"solution path {sol_path} does not exist or is empty under pack root",
                    )
                )

    return violations
