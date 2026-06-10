"""Content-quality and bank-health checks (advisory layer).

This is the content-quality / advisory tier. It does NOT duplicate Tier 1 (schema
validation) or Tier 2 (cross-record correctness) from pack_validator.py. All functions
are pure (no side effects, no global state). Return structured dicts, never raise on
bad data — return warnings instead.

PROVISIONAL THRESHOLDS — tune after the beta bank, not now.
"""

import re
from collections import Counter, defaultdict

# ---------------------------------------------------------------------------
# B1 READABILITY CONSTANTS (W3-5 / positioning-ca.md "Target CEFR B1").
#
# These thresholds implement the three checks mandated by the task:
#   1. Sentence length over B1_MAX_WORDS_PER_SENTENCE words.
#   2. More than B1_MAX_SUBORDINATE_MARKERS subordinate clause markers per sentence.
#   3. Presence of any word from B1_BANNED_JARGON.
#
# The marker list and jargon list are sourced from positioning-ca.md and the task spec.
# All thresholds are PROVISIONAL and advisory by default; gating requires --strict.
# ---------------------------------------------------------------------------

B1_MAX_WORDS_PER_SENTENCE = 25
"""Sentence length above this word count warns as too long for CEFR B1."""

B1_MAX_SUBORDINATE_MARKERS = 1
"""More than this many subordinate clause markers in one sentence warns."""

B1_SUBORDINATE_MARKERS = [
    "which",
    "where",
    "although",
    "whereas",
    "given that",
]
"""Subordinate clause markers that signal clause depth exceeding B1."""

B1_BANNED_JARGON = [
    "utilize",
    "ascertain",
    "commence",
    "endeavour",
    "notwithstanding",
]
"""Words banned by the B1 readability policy (positioning-ca.md)."""

# Sentence splitter: split on . ! ? followed by whitespace or end-of-string.
# Handles abbreviations imperfectly but is good enough for content lint.
_SENTENCE_SPLIT_RE = re.compile(r"[.!?]+(?:\s+|$)")

# ---------------------------------------------------------------------------
# PROVISIONAL THRESHOLDS — all named, all documented, all at the top.
# ---------------------------------------------------------------------------

# Per-item lint
RATIONALE_MIN_CHARS = 20
"""Minimum character length for a wrong-option rationale to be 'substantive'."""

STOCK_PHRASES = [
    "This is incorrect",
    "This is wrong",
    "Not the answer",
    "Incorrect option",
]
"""Rationale phrases so generic they add no diagnostic value."""

FORBIDDEN_STYLE = {
    "em_dash": re.compile(r"—"),
    "latex_dollar": re.compile(r"\$\$?"),
    "filler_furthermore": re.compile(r"\bFurthermore\b", re.IGNORECASE),
    "filler_moreover": re.compile(r"\bMoreover\b", re.IGNORECASE),
    "filler_observed": re.compile(r"\bIt can be observed that\b", re.IGNORECASE),
    "filler_therefore_correct": re.compile(
        r"\bTherefore the correct answer is\b", re.IGNORECASE
    ),
    "asset_ref": re.compile(r"\{\{asset:"),
}
"""Named regex patterns for style violations."""

# Pack / bank-health
MIN_PACK = 20
"""Minimum pack size for answer-position balance to be meaningful."""

ANSWER_POS_LOW = 0.10
"""Lower bound on the fraction of correct answers at any single position."""

ANSWER_POS_HIGH = 0.40
"""Upper bound on the fraction of correct answers at any single position."""

ANSWER_POS_SPREAD_MAX = 0.25
"""Maximum allowed max-min spread in answer-position fractions."""

CORRECT_LONGEST_WARN_RATE = 0.35
"""Fraction of items where correct option is uniquely longest; above this warns."""

NEAR_DUP_THRESHOLD = 0.80
"""Jaccard similarity (word shingles k=3) above which two stems are near-duplicates."""

OVERUSE_SHARE = 0.25
"""Fraction of all misconception tags above which a single id is flagged as overused."""

DIFFICULTY_SKEW_THRESHOLD = 0.85
"""Single difficulty level above this fraction of the pack warns as extreme skew."""

# PART_MARKS is NO LONGER a hardcoded literal (VAL-09).
# Use _derive_part_marks(blueprint) to get this at runtime.
# The constant below is kept ONLY as a fallback for unit tests that do not
# supply a full blueprint.  Production code must call _derive_part_marks().
_PART_MARKS_FALLBACK = {"qa.bmath": 40, "qa.lr": 20, "qa.stats": 40}
"""Fallback only.  Do not use directly; call _derive_part_marks(blueprint)."""


def _derive_part_marks(blueprint: dict) -> dict:
    """Derive PART_MARKS from blueprint parts at runtime (VAL-09).

    Returns {part_id: marks}.  Falls back to _PART_MARKS_FALLBACK if the
    blueprint has no 'parts' list (e.g. minimal test blueprints).
    """
    parts = blueprint.get("parts", [])
    if not parts:
        return dict(_PART_MARKS_FALLBACK)
    result = {p["id"]: p["marks"] for p in parts if "marks" in p}
    return result

PART_SHARE_TOLERANCE = 0.15
"""Warn if a part's share of items deviates from expected by more than this."""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalize_text(text: str) -> str:
    """Lowercase, collapse whitespace."""
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _shingles(text: str, k: int = 3) -> set:
    """Word-level k-shingles of normalized text."""
    words = _normalize_text(text).split()
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


# ---------------------------------------------------------------------------
# Per-item lint
# ---------------------------------------------------------------------------


def lint_item(item: dict) -> list:
    """Return a list of warning dicts for a single item.

    Each warning: {"code": str, "item_id": str, "message": str}.
    Pure function; never raises.
    """
    warnings = []
    iid = item.get("id", "<no-id>")

    def warn(code, msg):
        warnings.append({"code": code, "item_id": iid, "message": msg})

    # Collect all text fields
    stem = item.get("stem", "") or ""
    options = item.get("options", [])
    rationales = item.get("per_option_rationale", [])
    explanation = item.get("explanation", "") or ""

    all_texts = [stem, explanation]
    for o in options:
        all_texts.append(o.get("text", "") or "")
    for r in rationales:
        all_texts.append(r.get("rationale", "") or "")

    full_text = " ".join(all_texts)

    # -- style --
    for rule_name, pattern in FORBIDDEN_STYLE.items():
        if pattern.search(full_text):
            warn("STYLE", f"forbidden pattern '{rule_name}' found")

    # -- options_distinct --
    option_texts = [_normalize_text(o.get("text", "")) for o in options]
    seen_opts: dict = {}
    for idx, txt in enumerate(option_texts):
        if txt in seen_opts:
            warn(
                "OPTIONS_DUPLICATE",
                f"option {options[idx]['key']} text duplicates option {options[seen_opts[txt]]['key']} after normalisation",
            )
        else:
            seen_opts[txt] = idx

    # -- correct_not_longest --
    if options:
        answer_key = item.get("answer_key", {})
        correct_key = answer_key.get("correct")
        lengths = [(o["key"], len(o.get("text", ""))) for o in options]
        max_len = max(l for _, l in lengths)
        longest_keys = [k for k, l in lengths if l == max_len]
        if len(longest_keys) == 1 and longest_keys[0] == correct_key:
            warn(
                "CORRECT_LONGEST",
                f"correct option (key {correct_key}) is the unique longest option (length {max_len}) — length tell",
            )

    # -- rationale_substantive --
    correct_key = item.get("answer_key", {}).get("correct")
    for r in rationales:
        okey = r.get("option_key")
        if okey == correct_key:
            continue  # only check wrong options
        rat = (r.get("rationale") or "").strip()
        if len(rat) < RATIONALE_MIN_CHARS:
            warn(
                "RATIONALE_THIN",
                f"option {okey} rationale is too short ({len(rat)} chars, min {RATIONALE_MIN_CHARS})",
            )
        for phrase in STOCK_PHRASES:
            if phrase.lower() in rat.lower():
                warn(
                    "RATIONALE_STOCK",
                    f"option {okey} rationale uses stock phrase '{phrase}'",
                )

    return warnings


# ---------------------------------------------------------------------------
# Pack / bank-health
# ---------------------------------------------------------------------------


def check_answer_position_balance(items: list) -> dict:
    """Distribution of correct-answer positions.

    Returns:
        {
            "counts": {key: int},
            "fractions": {key: float},
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    counts: Counter = Counter()
    for item in items:
        correct = item.get("answer_key", {}).get("correct")
        if correct is not None:
            counts[correct] += 1

    total = sum(counts.values())
    fractions = {k: counts[k] / total for k in counts} if total else {}

    warnings = []
    status = "PASS"

    if total >= MIN_PACK:
        for key, frac in fractions.items():
            if frac < ANSWER_POS_LOW or frac > ANSWER_POS_HIGH:
                warnings.append(
                    f"answer position {key}: fraction {frac:.2%} outside [{ANSWER_POS_LOW:.0%}, {ANSWER_POS_HIGH:.0%}]"
                )
                status = "WARN"
        if fractions:
            spread = max(fractions.values()) - min(fractions.values())
            if spread > ANSWER_POS_SPREAD_MAX:
                warnings.append(
                    f"max-min spread {spread:.2%} exceeds {ANSWER_POS_SPREAD_MAX:.0%}"
                )
                status = "WARN"
    else:
        warnings.append(
            f"pack size {total} < MIN_PACK {MIN_PACK}; balance check skipped"
        )

    return {
        "counts": dict(counts),
        "fractions": fractions,
        "warnings": warnings,
        "status": status,
    }


def check_correct_longest_rate(items: list) -> dict:
    """Fraction of items where the correct option is the unique longest.

    Returns:
        {
            "rate": float,
            "offending_ids": [str],
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    offending = []
    total = 0
    for item in items:
        options = item.get("options", [])
        if not options:
            continue
        total += 1
        correct_key = item.get("answer_key", {}).get("correct")
        lengths = [(o["key"], len(o.get("text", ""))) for o in options]
        max_len = max(l for _, l in lengths)
        longest_keys = [k for k, l in lengths if l == max_len]
        if len(longest_keys) == 1 and longest_keys[0] == correct_key:
            offending.append(item.get("id", "<no-id>"))

    rate = len(offending) / total if total else 0.0
    warnings = []
    status = "PASS"
    if rate > CORRECT_LONGEST_WARN_RATE:
        warnings.append(
            f"correct option is uniquely longest in {rate:.1%} of items (threshold {CORRECT_LONGEST_WARN_RATE:.0%})"
        )
        status = "WARN"

    return {
        "rate": rate,
        "offending_ids": offending,
        "warnings": warnings,
        "status": status,
    }


def check_near_duplicates(items: list, threshold: float = NEAR_DUP_THRESHOLD) -> dict:
    """Cluster items by stem shingle Jaccard similarity.

    Returns:
        {
            "clusters": [[item_id, ...], ...],  # only clusters with >=2 members
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    shingled = [
        (item.get("id", f"<no-id-{i}>"), _shingles(item.get("stem", "")))
        for i, item in enumerate(items)
    ]

    # Union-Find for clustering
    parent = {iid: iid for iid, _ in shingled}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for i in range(len(shingled)):
        for j in range(i + 1, len(shingled)):
            iid_i, sh_i = shingled[i]
            iid_j, sh_j = shingled[j]
            if _jaccard(sh_i, sh_j) >= threshold:
                union(iid_i, iid_j)

    # Group by root
    groups: dict = defaultdict(list)
    for iid, _ in shingled:
        groups[find(iid)].append(iid)

    clusters = [sorted(g) for g in groups.values() if len(g) >= 2]

    warnings = []
    status = "PASS"
    if clusters:
        status = "WARN"
        for cl in clusters:
            warnings.append(f"near-duplicate cluster: {cl}")

    return {"clusters": clusters, "warnings": warnings, "status": status}


def check_misconception_usage(items: list, canon_ids: set) -> dict:
    """Count misconception ids across all wrong options.

    Returns:
        {
            "counts": {id: int},
            "total_tags": int,
            "overused": [{id, count, share}],
            "never_used": [id],
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    counts: Counter = Counter()
    for item in items:
        correct_key = item.get("answer_key", {}).get("correct")
        for r in item.get("per_option_rationale", []):
            if r.get("option_key") == correct_key:
                continue
            misc = r.get("misconception")
            if misc:
                counts[misc] += 1

    total = sum(counts.values())
    overused = []
    warnings = []
    status = "PASS"

    if total > 0:
        for mid, cnt in counts.items():
            share = cnt / total
            if share > OVERUSE_SHARE:
                overused.append({"id": mid, "count": cnt, "share": share})
                warnings.append(
                    f"misconception '{mid}' used in {share:.1%} of wrong-option tags ({cnt}/{total}) — exceeds {OVERUSE_SHARE:.0%} threshold"
                )
                status = "WARN"

    never_used = sorted(canon_ids - set(counts.keys()))

    return {
        "counts": dict(counts),
        "total_tags": total,
        "overused": overused,
        "never_used": never_used,
        "warnings": warnings,
        "status": status,
    }


def check_difficulty_distribution(items: list) -> dict:
    """Counts of L1/L2/L3. Warns on extreme skew.

    Returns:
        {
            "counts": {"L1": int, "L2": int, "L3": int},
            "fractions": {...},
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    counts: Counter = Counter()
    for item in items:
        label = item.get("difficulty_label")
        if label:
            counts[label] += 1

    total = sum(counts.values())
    fractions = {k: counts[k] / total for k in counts} if total else {}

    warnings = []
    status = "PASS"
    for level, frac in fractions.items():
        if frac > DIFFICULTY_SKEW_THRESHOLD:
            warnings.append(
                f"difficulty level {level} is {frac:.1%} of bank — extreme skew (threshold {DIFFICULTY_SKEW_THRESHOLD:.0%})"
            )
            status = "WARN"

    return {
        "counts": dict(counts),
        "fractions": fractions,
        "warnings": warnings,
        "status": status,
    }


def check_blueprint_coverage(items: list, blueprint: dict) -> dict:
    """Items per family and per part vs blueprint targets.

    Returns:
        {
            "by_family": {family_id: int},
            "by_part": {part_id: int},
            "gaps": [family_id],       # families with zero items
            "part_share_warnings": [...],
            "warnings": [...],
            "status": "PASS" | "WARN"
        }
    """
    # Build a set of all family ids from the blueprint
    all_families: set = set()
    part_families: dict = {}  # part_id -> [family_id]
    for part in blueprint.get("parts", []):
        pid = part["id"]
        fams = []
        for sec in part.get("sections", []):
            for fam in sec.get("families", []):
                all_families.add(fam)
                fams.append(fam)
        part_families[pid] = fams

    # Count items per subtopic (first element of tests[])
    family_counts: Counter = Counter()
    part_counts: Counter = Counter()

    for item in items:
        tests = item.get("tests", [])
        if not tests:
            continue
        subtopic = tests[0]
        # Map subtopic to family (longest matching family prefix)
        matched_fam = None
        for fam in all_families:
            if subtopic == fam or subtopic.startswith(fam + "."):
                if matched_fam is None or len(fam) > len(matched_fam):
                    matched_fam = fam
        if matched_fam:
            family_counts[matched_fam] += 1
        # Map to part
        matched_part = None
        for pid in part_families:
            if subtopic == pid or subtopic.startswith(pid + "."):
                matched_part = pid
                break
        if matched_part:
            part_counts[matched_part] += 1

    gaps = sorted(f for f in all_families if family_counts[f] == 0)

    # Part share check: expected vs actual.
    # Derive PART_MARKS from the blueprint at runtime (VAL-09 single source).
    derived_part_marks = _derive_part_marks(blueprint)
    total_marks = sum(derived_part_marks.values())
    total_items = sum(part_counts.values())

    warnings = []
    part_share_warnings = []
    status = "PASS"

    if total_items > 0:
        for pid, expected_marks in derived_part_marks.items():
            expected_share = expected_marks / total_marks
            actual_share = part_counts.get(pid, 0) / total_items
            deviation = abs(actual_share - expected_share)
            if deviation > PART_SHARE_TOLERANCE:
                msg = (
                    f"part {pid}: actual share {actual_share:.1%} vs expected {expected_share:.0%} "
                    f"(deviation {deviation:.1%} > tolerance {PART_SHARE_TOLERANCE:.0%})"
                )
                part_share_warnings.append(msg)
                warnings.append(msg)
                status = "WARN"

    if gaps:
        for fam in gaps:
            warnings.append(f"family '{fam}' has zero items in the bank")
        status = "WARN"

    return {
        "by_family": dict(family_counts),
        "by_part": dict(part_counts),
        "gaps": gaps,
        "part_share_warnings": part_share_warnings,
        "warnings": warnings,
        "status": status,
    }


# ---------------------------------------------------------------------------
# B1 readability lint (W3-5 / advisory by default; gating with --strict)
# ---------------------------------------------------------------------------


def lint_b1_readability(item: dict) -> list:
    """Return B1 readability warnings for a single item.

    Checks stem, option texts, and explanation.  Rationale fields are NOT checked
    here (they are coach-facing, not student-facing at the B1 surface).

    Each warning: {"code": "B1_READABILITY", "item_id": str, "message": str}.
    Pure function; never raises.
    """
    warnings = []
    iid = item.get("id", "<no-id>")

    def warn(msg: str) -> None:
        warnings.append({"code": "B1_READABILITY", "item_id": iid, "message": msg})

    texts_to_check = [
        ("stem", item.get("stem", "") or ""),
        ("explanation", item.get("explanation", "") or ""),
    ]
    for opt in item.get("options", []):
        texts_to_check.append((f"option {opt.get('key', '?')}", opt.get("text", "") or ""))

    # Banned jargon — check across all fields combined.
    all_text = " ".join(t for _, t in texts_to_check).lower()
    for jargon in B1_BANNED_JARGON:
        # Word-boundary match so "utilizing" catches "utilize".
        if re.search(r"\b" + re.escape(jargon.lower()), all_text):
            warn(f"banned jargon '{jargon}' found")

    # Per-sentence checks on stem and explanation only (options are short by design).
    for field_name, field_text in texts_to_check:
        if field_name.startswith("option"):
            continue  # option texts are short; sentence checks don't apply
        if not field_text.strip():
            continue
        # Split into sentences
        sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(field_text) if s.strip()]
        for sent in sentences:
            words = sent.split()
            word_count = len(words)
            if word_count > B1_MAX_WORDS_PER_SENTENCE:
                warn(
                    f"{field_name}: sentence has {word_count} words "
                    f"(max {B1_MAX_WORDS_PER_SENTENCE}): '{sent[:80]}...'"
                    if len(sent) > 80
                    else f"{field_name}: sentence has {word_count} words "
                    f"(max {B1_MAX_WORDS_PER_SENTENCE}): '{sent}'"
                )
            # Count subordinate clause markers.
            sent_lower = sent.lower()
            marker_count = sum(
                1
                for m in B1_SUBORDINATE_MARKERS
                if re.search(r"\b" + re.escape(m.lower()) + r"\b", sent_lower)
            )
            if marker_count > B1_MAX_SUBORDINATE_MARKERS:
                found = [
                    m
                    for m in B1_SUBORDINATE_MARKERS
                    if re.search(r"\b" + re.escape(m.lower()) + r"\b", sent_lower)
                ]
                warn(
                    f"{field_name}: sentence has {marker_count} subordinate markers "
                    f"(max {B1_MAX_SUBORDINATE_MARKERS}): {found}"
                )

    return warnings


def run_b1_readability_checks(items: list) -> dict:
    """Run B1 readability lint across all items.

    Returns:
        {
            "item_warnings": {item_id: [warning_dict]},
            "warn_count": int,
        }
    """
    item_warnings: dict = {}
    total_warn = 0
    for item in items:
        iid = item.get("id", "<no-id>")
        w = lint_b1_readability(item)
        if w:
            item_warnings[iid] = w
            total_warn += len(w)
    return {"item_warnings": item_warnings, "warn_count": total_warn}


# ---------------------------------------------------------------------------
# Top-level bank report
# ---------------------------------------------------------------------------


def run_quality_checks(items: list, blueprint: dict, canon_ids: set) -> dict:
    """Run all per-item lint and bank-health checks on a list of item dicts.

    Returns a single structured report dict with:
        - item_warnings: {item_id: [warning_dict]}
        - answer_position: result of check_answer_position_balance
        - correct_longest: result of check_correct_longest_rate
        - near_duplicates: result of check_near_duplicates
        - misconception_usage: result of check_misconception_usage
        - difficulty: result of check_difficulty_distribution
        - blueprint_coverage: result of check_blueprint_coverage
        - total_items: int
        - warn_count: int   (total advisory warnings emitted)
    """
    item_warnings: dict = {}
    total_warn = 0

    for item in items:
        iid = item.get("id", "<no-id>")
        w = lint_item(item)
        if w:
            item_warnings[iid] = w
            total_warn += len(w)

    pos = check_answer_position_balance(items)
    longest = check_correct_longest_rate(items)
    dups = check_near_duplicates(items)
    misc = check_misconception_usage(items, canon_ids)
    diff = check_difficulty_distribution(items)
    cov = check_blueprint_coverage(items, blueprint)

    total_warn += (
        len(pos["warnings"])
        + len(longest["warnings"])
        + len(dups["warnings"])
        + len(misc["warnings"])
        + len(diff["warnings"])
        + len(cov["warnings"])
    )

    return {
        "item_warnings": item_warnings,
        "answer_position": pos,
        "correct_longest": longest,
        "near_duplicates": dups,
        "misconception_usage": misc,
        "difficulty": diff,
        "blueprint_coverage": cov,
        "total_items": len(items),
        "warn_count": total_warn,
    }
