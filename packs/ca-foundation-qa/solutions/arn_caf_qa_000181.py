"""Executable solution for arn_caf_qa_000181.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=35  2=16  3=25  4=49

Odd-man-out: find the number in the group that is NOT a perfect square.
Group: 4, 9, 16, 25, 35, 49.
Rule family: perfect squares.
"""

import math

GROUP = [4, 9, 16, 25, 35, 49]

# Map each group member to its option key.
# Option keys after authoring (pre-shuffle): 1=35, 2=16, 3=25, 4=49.
# Members not in options (4, 9) are clearly squares and never asked.
OPTION_MAP = {35: 1, 16: 2, 25: 3, 49: 4}

KEYED_ANSWER = 35  # the non-perfect-square
option_key = 4


def _is_perfect_square(n: int) -> bool:
    root = int(math.isqrt(n))
    return root * root == n


def _find_odd_one_out():
    """Compute the odd one out by applying the perfect-square rule to every member."""
    non_squares = [n for n in GROUP if not _is_perfect_square(n)]
    return non_squares


def solve():
    non_squares = _find_odd_one_out()
    assert len(non_squares) == 1, f"Expected exactly one non-square, got {non_squares}"
    answer = non_squares[0]
    assert answer == KEYED_ANSWER
    return {"value": answer, "option_key": option_key}


def check_consistency():
    """Enumerate the rule space and confirm satisfiability and uniqueness.

    satisfiable: at least one member violates the perfect-square rule.
    unique: exactly one member violates it, matching the keyed answer.
    """
    non_squares = _find_odd_one_out()
    satisfiable = len(non_squares) >= 1
    unique = len(non_squares) == 1 and non_squares[0] == KEYED_ANSWER
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
