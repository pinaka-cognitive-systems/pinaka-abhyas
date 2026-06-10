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
  DISTRACTOR_EQUALS_KEY      an incorrect option's text equals the correct option's text
                             (after canonical text normalization) — highest-harm defect
  STEM_ANSWER_LEAK           the correct option's normalized text appears verbatim in the
                             stem, or the stem contains the literal phrases
                             "the answer is" or "correct option" — highest-harm defect
  NEAR_DUPLICATE             two stems have word-shingle Jaccard similarity at or above
                             NEAR_DUP_THRESHOLD — reskin masquerading as a distinct item

Note: SVG sanitization is svg_is_safe(); the build runs it before packing.
Schema-level structure is delegated to the JSON Schema.
"""
import pathlib
import re
import unicodedata
from collections import namedtuple

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry

import canonical

Violation = namedtuple("Violation", ["code", "item_id", "message"])

# ---------------------------------------------------------------------------
# Threshold for near-duplicate detection (W3-3 / VAL-02).
# Word-shingle Jaccard similarity at or above this value within a pack is a
# hard Tier-2 violation.  Mirrors the advisory threshold in quality.py so the
# two layers agree on what "near-duplicate" means.
# ---------------------------------------------------------------------------
NEAR_DUP_THRESHOLD = 0.80
"""Jaccard similarity (word k=3 shingles) above which two stems are near-duplicates."""

# Literal phrases that constitute answer leakage regardless of option text.
_LEAK_PHRASES = re.compile(r"\bthe answer is\b|\bcorrect option\b", re.IGNORECASE)


def _canon_text(s: str) -> str:
    """Canonical text for content comparison: NFC, lowercase, collapsed whitespace."""
    s = unicodedata.normalize("NFC", (s or "").strip())
    s = re.sub(r"\s+", " ", s)
    return s.lower()


def _shingles(text: str, k: int = 3) -> set:
    """Word-level k-shingles of canonically normalized text."""
    words = _canon_text(text).split()
    if len(words) < k:
        return set(words) if words else set()
    return {tuple(words[i : i + k]) for i in range(len(words) - k + 1)}


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)

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

        # 9b. NOTATION_VIOLATION (W3-5): ADR 0015 unicode-first policy.
        #   Hard-reject LaTeX commands (backslash sequences), HTML tags,
        #   C0/C1 control characters, the Unicode replacement character (U+FFFD),
        #   and any character outside the declared allowlist.
        #
        # UNICODE_ALLOWLIST: printable ASCII (U+0020..U+007E) plus the explicit math
        # and currency glyphs listed in ADR 0015:
        #   × (U+00D7) ÷ (U+00F7) √ (U+221A) ∩ (U+2229) ∪ (U+222A)
        #   ² (U+00B2) ³ (U+00B3) ∫ (U+222B) Δ (U+0394) σ (U+03C3)
        #   μ (U+03BC) ≤ (U+2264) ≥ (U+2265) ≠ (U+2260) ≈ (U+2248)
        #   ± (U+00B1) ⁄ (U+2044, fraction slash) ₹ (U+20B9, rupee sign)
        # Plus standard punctuation outside ASCII that may appear in authored content:
        #   ' ' " " (U+2018 U+2019 U+201C U+201D) — retained for legacy; ADR bans new use
        UNICODE_ALLOWLIST = frozenset(
            range(0x0020, 0x007F)  # printable ASCII
        ) | frozenset(
            [
                0x00D7,  # × multiplication sign
                0x00F7,  # ÷ division sign
                0x221A,  # √ square root
                0x2229,  # ∩ intersection
                0x222A,  # ∪ union
                0x00B2,  # ² superscript two
                0x00B3,  # ³ superscript three
                0x222B,  # ∫ integral
                0x0394,  # Δ capital delta
                0x03C3,  # σ sigma
                0x03BC,  # μ mu
                0x2264,  # ≤ less-than or equal
                0x2265,  # ≥ greater-than or equal
                0x2260,  # ≠ not equal
                0x2248,  # ≈ approximately equal
                0x00B1,  # ± plus-minus
                0x2044,  # ⁄ fraction slash
                0x20B9,  # ₹ rupee sign
                # Common whitespace variants already collapsed by NFC, kept for safety
                0x000A,  # newline (valid in multi-line content)
                0x0009,  # tab
            ]
        )
        _LATEX_RE = re.compile(r"\\[a-zA-Z]+")
        _HTML_TAG_RE = re.compile(r"<[a-zA-Z!/][^>]*>")
        _CTRL_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|�")

        notation_texts = (
            [item.get("stem", "") or ""]
            + [o.get("text", "") or "" for o in item.get("options", [])]
            + [item.get("explanation", "") or ""]
            + [
                r.get("rationale", "") or ""
                for r in item.get("per_option_rationale", [])
            ]
        )
        for field_text in notation_texts:
            if not field_text:
                continue
            if _LATEX_RE.search(field_text):
                violations.append(
                    Violation(
                        "NOTATION_VIOLATION",
                        iid,
                        f"LaTeX command found: {_LATEX_RE.search(field_text).group()!r}",
                    )
                )
                break
            if _HTML_TAG_RE.search(field_text):
                violations.append(
                    Violation(
                        "NOTATION_VIOLATION",
                        iid,
                        f"HTML tag found: {_HTML_TAG_RE.search(field_text).group()!r}",
                    )
                )
                break
            if _CTRL_RE.search(field_text):
                violations.append(
                    Violation(
                        "NOTATION_VIOLATION",
                        iid,
                        "control character or U+FFFD replacement character found",
                    )
                )
                break
            for ch in field_text:
                cp = ord(ch)
                if cp not in UNICODE_ALLOWLIST:
                    violations.append(
                        Violation(
                            "NOTATION_VIOLATION",
                            iid,
                            f"character U+{cp:04X} ({ch!r}) is outside the ADR 0015 allowlist",
                        )
                    )
                    break
            else:
                continue
            break

        # 10. DISTRACTOR_EQUALS_KEY (W3-3): any incorrect option's canonical text must
        #     not equal the correct option's canonical text — highest-harm defect.
        if item.get("item_type") == "single_best":
            correct_key = item.get("answer_key", {}).get("correct")
            opts_by_key = {o["key"]: _canon_text(o.get("text", "")) for o in item.get("options", [])}
            correct_text = opts_by_key.get(correct_key, "")
            for o in item.get("options", []):
                if o["key"] != correct_key:
                    if _canon_text(o.get("text", "")) == correct_text:
                        violations.append(
                            Violation(
                                "DISTRACTOR_EQUALS_KEY",
                                iid,
                                f"option {o['key']} text equals correct option {correct_key} after normalization",
                            )
                        )

        # 11. STEM_ANSWER_LEAK (W3-3): the correct option's normalized text must not
        #     appear verbatim in the stem, and the stem must not contain literal leak
        #     phrases ("the answer is", "correct option").
        #
        # Verbatim-check exemption for logical-reasoning items (qa.lr.*): in LR
        # seating-arrangement and sequencing puzzles the answer entity (e.g. a
        # person's name or label) must be mentioned in the premise list; its presence
        # in the stem is structural necessity, not answer leakage.  The
        # forbidden-phrase check fires unconditionally for all item types.
        if item.get("item_type") == "single_best":
            correct_key = item.get("answer_key", {}).get("correct")
            correct_option_obj = next(
                (o for o in item.get("options", []) if o["key"] == correct_key), None
            )
            if correct_option_obj:
                # Forbidden-phrase check: always fires regardless of item type or
                # option text length.
                if _LEAK_PHRASES.search(item.get("stem", "")):
                    violations.append(
                        Violation(
                            "STEM_ANSWER_LEAK",
                            iid,
                            "stem contains a forbidden answer-leak phrase "
                            "('the answer is' or 'correct option')",
                        )
                    )
                # Verbatim-appearance check: skip for LR items (qa.lr subtree)
                # because the answer entity is necessarily named in the premise.
                is_lr_item = any(
                    t == "qa.lr" or t.startswith("qa.lr.")
                    for t in item.get("tests", [])
                )
                if not is_lr_item:
                    canon_stem = _canon_text(item.get("stem", ""))
                    canon_correct = _canon_text(correct_option_obj.get("text", ""))
                    # Numeric exemption: a numeric answer legitimately appears in
                    # the stem's own data (the median of a list IS in the list).
                    # Verbatim containment is only meaningful for non-numeric
                    # answers of useful length.
                    is_numeric_answer = bool(
                        re.fullmatch(r"[\d\s.,/%:+-]*\d[\d\s.,/%:+-]*", canon_correct)
                    )
                    if (
                        canon_correct
                        and len(canon_correct) >= 4
                        and not is_numeric_answer
                        and canon_correct in canon_stem
                    ):
                        violations.append(
                            Violation(
                                "STEM_ANSWER_LEAK",
                                iid,
                                f"correct option text "
                                f"'{correct_option_obj.get('text', '')}' "
                                f"appears verbatim in stem",
                            )
                        )

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

    # Cross-item: NEAR_DUPLICATE (W3-3).  Run pairwise over all item stems;
    # any pair whose word-shingle Jaccard similarity >= NEAR_DUP_THRESHOLD is a
    # hard violation. O(n²) — acceptable at pack sizes <5000.
    stemmed = [(item.get("id", "<no-id>"), _shingles(item.get("stem", ""))) for item in items]
    reported = set()
    for i in range(len(stemmed)):
        for j in range(i + 1, len(stemmed)):
            iid_i, sh_i = stemmed[i]
            iid_j, sh_j = stemmed[j]
            if _jaccard(sh_i, sh_j) >= NEAR_DUP_THRESHOLD:
                # Emit one violation per affected item (deterministic order).
                pair_key = (min(iid_i, iid_j), max(iid_i, iid_j))
                if pair_key not in reported:
                    reported.add(pair_key)
                    violations.append(
                        Violation(
                            "NEAR_DUPLICATE",
                            iid_i,
                            f"stem Jaccard similarity {_jaccard(sh_i, sh_j):.2f} "
                            f">= {NEAR_DUP_THRESHOLD} with item {iid_j}",
                        )
                    )
                    violations.append(
                        Violation(
                            "NEAR_DUPLICATE",
                            iid_j,
                            f"stem Jaccard similarity {_jaccard(sh_i, sh_j):.2f} "
                            f">= {NEAR_DUP_THRESHOLD} with item {iid_i}",
                        )
                    )

    return violations
