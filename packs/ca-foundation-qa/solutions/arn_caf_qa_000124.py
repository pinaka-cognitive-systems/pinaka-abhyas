"""Executable solution for arn_caf_qa_000124.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1=1/12  2=1/2  3=7/12  4=1/7

A and B independent: P(A ∩ B) = P(A) × P(B) = (1/3)(1/4) = 1/12.
"""
from fractions import Fraction


def solve():
    p_a = Fraction(1, 3)
    p_b = Fraction(1, 4)

    p_intersection = p_a * p_b  # 1/12

    # option 1 = "1/12"
    option_key = 3
    return {"value": str(p_intersection), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
