"""Executable solution for arn_caf_qa_000183.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=38  2=36  3=40  4=33

Number series: 3, 6, 11, 18, 27, ?
Rule: differences are consecutive odd numbers starting at 3: 3, 5, 7, 9, 11, ...
Equivalently: n-th term = n² + 2.
"""

SERIES = [3, 6, 11, 18, 27]
OPTION_MAP = {38: 1, 36: 2, 40: 3, 33: 4}
KEYED_ANSWER = 38
option_key = 4


def _compute_next(series):
    """Compute the next term by detecting the second-differences pattern.

    Step 1: compute first differences.
    Step 2: check they are consecutive odd numbers (second diff = constant 2).
    Step 3: extend by one step.
    """
    first_diffs = [series[i + 1] - series[i] for i in range(len(series) - 1)]
    second_diffs = [first_diffs[i + 1] - first_diffs[i] for i in range(len(first_diffs) - 1)]
    # Verify second differences are all 2.
    assert all(d == 2 for d in second_diffs), f"Unexpected second diffs: {second_diffs}"
    next_first_diff = first_diffs[-1] + 2
    return series[-1] + next_first_diff


def solve():
    next_term = _compute_next(SERIES)
    assert next_term == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {next_term}"
    return {"value": next_term, "option_key": option_key}


def check_consistency():
    """Compute the next term and confirm the answer is unique under the stated rule.

    satisfiable: the difference pattern is consistent (second diffs all equal 2).
    unique: exactly one next term follows from the rule.
    """
    first_diffs = [SERIES[i + 1] - SERIES[i] for i in range(len(SERIES) - 1)]
    second_diffs = [first_diffs[i + 1] - first_diffs[i] for i in range(len(first_diffs) - 1)]
    satisfiable = all(d == 2 for d in second_diffs)
    if satisfiable:
        next_term = SERIES[-1] + (first_diffs[-1] + 2)
        unique = next_term == KEYED_ANSWER
    else:
        unique = False
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
