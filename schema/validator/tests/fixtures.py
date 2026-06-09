"""Synthetic fixtures for content-quality tests.

All fixtures are built here; no real bank files are read in tests.
"""


def make_item(
    iid="item_001",
    stem="What is the value of x in x + 5 = 10",
    options=None,
    correct=1,
    difficulty="L2",
    tests=None,
    rationales=None,
    subtopic=None,
):
    """Build a minimal valid-looking item dict."""
    if options is None:
        options = [
            {"key": 1, "text": "5"},
            {"key": 2, "text": "10"},
            {"key": 3, "text": "15"},
            {"key": 4, "text": "20"},
        ]
    if tests is None:
        tests = [subtopic or "qa.bmath.equations.simple"]
    if rationales is None:
        rationales = [
            {
                "option_key": correct,
                "verdict": "correct",
                "rationale": "Direct subtraction gives x = 10 - 5 = 5.",
            }
        ] + [
            {
                "option_key": o["key"],
                "verdict": "incorrect",
                "rationale": f"Wrong: did not isolate the variable properly for option {o['key']}.",
                "misconception": "sign_error",
            }
            for o in options
            if o["key"] != correct
        ]
    return {
        "id": iid,
        "stem": stem,
        "options": options,
        "answer_key": {"correct": correct},
        "difficulty_label": difficulty,
        "tests": tests,
        "per_option_rationale": rationales,
        "item_type": "single_best",
    }


def make_balanced_pack(n=24):
    """A balanced pack with correct answers distributed ~evenly across keys 1-4."""
    items = []
    for i in range(n):
        correct = (i % 4) + 1
        items.append(
            make_item(
                iid=f"item_{i:03d}",
                stem=f"Balanced question number {i} asking about something specific and unique",
                correct=correct,
            )
        )
    return items


def make_skewed_pack(n=24):
    """A skewed pack where key 1 holds 90% of correct answers."""
    items = []
    for i in range(n):
        # First 21 have correct=1, remaining 3 spread across 2,3,4
        if i < 21:
            correct = 1
        else:
            correct = i - 18  # 3,4,5 → clamp to 2,3,4
            correct = min(correct, 4)
        items.append(
            make_item(
                iid=f"item_{i:03d}",
                stem=f"Skewed question number {i} asking about something unique and different",
                correct=correct,
            )
        )
    return items


def make_length_tell_pack():
    """A pack where every correct option is the unique longest."""
    items = []
    for i in range(4):
        options = [
            {"key": 1, "text": "Short"},
            {"key": 2, "text": "A bit longer text here"},
            {"key": 3, "text": "Even more words in this option making it longer"},
            {"key": 4, "text": "The longest option is always correct and it has many extra words here"},
        ]
        rationales = [
            {
                "option_key": 4,
                "verdict": "correct",
                "rationale": "This is correct because the full reasoning applies here.",
            }
        ] + [
            {
                "option_key": o["key"],
                "verdict": "incorrect",
                "rationale": "Incorrect because the computation does not hold.",
                "misconception": "formula_misapplied",
            }
            for o in options
            if o["key"] != 4
        ]
        items.append(
            make_item(
                iid=f"length_{i}",
                stem=f"Question {i} with a length tell in the options text clearly",
                options=options,
                correct=4,
                rationales=rationales,
            )
        )
    return items


def make_near_dup_pair():
    """Two items with near-identical stems (Jaccard >= 0.80).

    The stems share almost every word-shingle; only the final question phrase differs.
    """
    # Near-identical: one word changed out of a very long stem → Jaccard > 0.80
    stem_a = "Asha deposits Rs 10000 in a bank at 10 percent per annum simple interest for 5 years what is the total simple interest earned by Asha at the end of the period"
    stem_b = "Asha deposits Rs 10000 in a bank at 10 percent per annum simple interest for 5 years what is the total simple interest accrued by Asha at the end of the period"
    return [
        make_item(iid="dup_a", stem=stem_a),
        make_item(iid="dup_b", stem=stem_b),
    ]


def make_distinct_pair():
    """Two items with clearly different stems (Jaccard << 0.80)."""
    stem_a = "Asha deposits money in a bank at compound interest rate what is the amount"
    stem_b = "Find the number of ways to arrange five books on a shelf using permutations"
    return [
        make_item(iid="dist_a", stem=stem_a),
        make_item(iid="dist_b", stem=stem_b),
    ]


def make_overused_misconception_pack(n=12):
    """A pack where one misconception id appears in > 25% of wrong-option tags."""
    items = []
    for i in range(n):
        # All 3 wrong options in every item use 'formula_misapplied'
        options = [
            {"key": 1, "text": "Correct answer here"},
            {"key": 2, "text": "Wrong answer alpha"},
            {"key": 3, "text": "Wrong answer beta"},
            {"key": 4, "text": "Wrong answer gamma"},
        ]
        rationales = [
            {
                "option_key": 1,
                "verdict": "correct",
                "rationale": "Direct computation gives this result.",
            },
            {
                "option_key": 2,
                "verdict": "incorrect",
                "rationale": "Applied the wrong formula for this situation.",
                "misconception": "formula_misapplied",
            },
            {
                "option_key": 3,
                "verdict": "incorrect",
                "rationale": "Applied the wrong formula again for this case.",
                "misconception": "formula_misapplied",
            },
            {
                "option_key": 4,
                "verdict": "incorrect",
                "rationale": "Once more the wrong formula was chosen here.",
                "misconception": "formula_misapplied",
            },
        ]
        items.append(
            make_item(
                iid=f"overuse_{i:03d}",
                stem=f"Overuse misconception question {i} on a specific financial topic",
                options=options,
                correct=1,
                rationales=rationales,
            )
        )
    return items


def minimal_blueprint():
    """A minimal blueprint with two parts and three families for assembler tests."""
    return {
        "parts": [
            {
                "id": "qa.bmath",
                "name": "Business Mathematics",
                "marks": 40,
                "sections": [
                    {
                        "icai_section": "I",
                        "label": "Equations",
                        "weight_percent_of_part": [50, 60],
                        "derived_target_questions": 4,
                        "families": ["qa.bmath.equations"],
                    },
                    {
                        "icai_section": "II",
                        "label": "Finance",
                        "weight_percent_of_part": [40, 50],
                        "derived_target_questions": 4,
                        "families": ["qa.bmath.finance"],
                    },
                ],
            },
            {
                "id": "qa.lr",
                "name": "Logical Reasoning",
                "marks": 20,
                "sections": [
                    {
                        "icai_section": "III",
                        "label": "Blood Relations",
                        "weight_percent_of_part_per_topic": [20, 30],
                        "derived_target_questions": 2,
                        "families": ["qa.lr.blood_relations"],
                    }
                ],
            },
            {
                "id": "qa.stats",
                "name": "Statistics",
                "marks": 40,
                "sections": [
                    {
                        "icai_section": "IV",
                        "label": "Probability",
                        "weight_percent_of_part": [50, 60],
                        "derived_target_questions": 4,
                        "families": ["qa.stats.probability"],
                    }
                ],
            },
        ]
    }


def make_small_bank_for_assembler():
    """A tiny bank (5 items) to force assembler shortfalls."""
    return [
        make_item(
            iid="sm_eq_1",
            stem="Small bank equations item one solve for x",
            subtopic="qa.bmath.equations.simple",
            correct=1,
        ),
        make_item(
            iid="sm_eq_2",
            stem="Small bank equations item two find the root",
            subtopic="qa.bmath.equations.quadratic",
            correct=2,
        ),
        make_item(
            iid="sm_fin_1",
            stem="Small bank finance item one simple interest rate",
            subtopic="qa.bmath.finance.simple_interest",
            correct=3,
        ),
        make_item(
            iid="sm_br_1",
            stem="Small bank blood relations item one family puzzle",
            subtopic="qa.lr.blood_relations",
            correct=4,
        ),
        make_item(
            iid="sm_prob_1",
            stem="Small bank probability item one classical probability",
            subtopic="qa.stats.probability.classical",
            correct=1,
        ),
    ]
