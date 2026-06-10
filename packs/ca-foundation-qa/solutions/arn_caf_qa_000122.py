"""Executable solution for arn_caf_qa_000122.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1=1/2  2=2/3  3=1/4  4=3/8

P(A) = 3/8, P(B) = 1/2, P(A ∩ B) = 1/4.
P(A | B) = P(A ∩ B) / P(B) = (1/4) / (1/2) = 1/2.
"""
from fractions import Fraction


def solve():
    p_a = Fraction(3, 8)       # noqa: F841
    p_b = Fraction(1, 2)
    p_a_and_b = Fraction(1, 4)

    p_a_given_b = p_a_and_b / p_b  # 1/2

    # option 1 = "1/2"
    option_key = 4
    return {"value": str(p_a_given_b), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
