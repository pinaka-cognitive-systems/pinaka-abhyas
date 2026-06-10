"""Executable solution for arn_caf_qa_000129.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1=175/256  2=81/256  3=27/64  4=1/256

n=4, p=1/4 (six), q=3/4.
P(at least one six) = 1 - P(X=0) = 1 - (3/4)^4 = 1 - 81/256 = 175/256.
"""
from fractions import Fraction


def solve():
    n = 4
    p = Fraction(1, 4)
    q = 1 - p  # 3/4

    p_none = q**n             # 81/256
    p_at_least_one = 1 - p_none  # 175/256

    # option 1 = "175/256"
    option_key = 4
    return {"value": str(p_at_least_one), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
