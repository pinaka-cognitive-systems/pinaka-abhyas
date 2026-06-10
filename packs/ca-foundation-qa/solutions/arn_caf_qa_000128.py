"""Executable solution for arn_caf_qa_000128.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1=80/243  2=40/243  3=8/243  4=10/243

Binomial: n=5, k=2, p=1/3, q=2/3.
P(X=2) = C(5,2) * (1/3)^2 * (2/3)^3 = 10 * (1/9) * (8/27) = 80/243.
"""
from fractions import Fraction
from math import comb


def solve():
    n = 5
    k = 2
    p = Fraction(1, 3)
    q = 1 - p  # 2/3

    prob = comb(n, k) * p**k * q**(n - k)  # 80/243

    # option 1 = "80/243"
    option_key = 2
    return {"value": str(prob), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
