"""Executable solution for arn_caf_qa_000937.

Convert odds to probabilities for two independent events, then P(at least one)
via the complement.
Options: 1=20/35  2=15/35  3=4/35  4=29/35
"""

from fractions import Fraction


def solve():
    # Odds in favour 2:3 -> P = 2/(2+3).
    p_first = Fraction(2, 2 + 3)  # 2/5
    # Odds against 5:2 -> P = 2/(5+2).
    p_second = Fraction(2, 5 + 2)  # 2/7

    # Independence: P(neither) = product of complements.
    p_neither = (1 - p_first) * (1 - p_second)  # (3/5)(5/7) = 15/35
    p_at_least_one = 1 - p_neither  # 20/35 = 4/7

    value = float(p_at_least_one)  # ~0.5714
    option_key = 1  # 20/35
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
