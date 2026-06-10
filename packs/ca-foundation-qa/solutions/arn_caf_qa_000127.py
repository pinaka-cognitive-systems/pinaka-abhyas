"""Executable solution for arn_caf_qa_000127.

Contract: solve() returns {"value": <float>, "option_key": <int>}.
Options: 1=0.4  2=0.6  3=0.3  4=0.5

k = 1 - P(X=0) - P(X=1) - P(X=3) = 1 - 0.1 - 0.3 - 0.2 = 0.4.
"""
from fractions import Fraction


def solve():
    p0 = Fraction(1, 10)   # 0.1
    p1 = Fraction(3, 10)   # 0.3
    p3 = Fraction(2, 10)   # 0.2

    k = 1 - p0 - p1 - p3  # 4/10 = 0.4

    # option 1 = 0.4
    option_key = 1
    return {"value": float(k), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
