"""Executable solution for arn_caf_qa_000123.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1=23/35  2=29/35  3=6/35  4=12/35

P(Priya solves) = 2/5, P(Rohan solves) = 3/7, independent.
P(neither) = (1 - 2/5)(1 - 3/7) = (3/5)(4/7) = 12/35.
P(at least one) = 1 - 12/35 = 23/35.
"""
from fractions import Fraction


def solve():
    p_priya = Fraction(2, 5)
    p_rohan = Fraction(3, 7)

    p_neither = (1 - p_priya) * (1 - p_rohan)  # 12/35
    p_at_least_one = 1 - p_neither              # 23/35

    # option 1 = "23/35"
    option_key = 2
    return {"value": str(p_at_least_one), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
