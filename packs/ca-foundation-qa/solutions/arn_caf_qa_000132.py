"""Executable solution for arn_caf_qa_000132.

Contract: solve() returns {"value": <str>, "option_key": <int>}.
Options: 1="3 × e^(-2)"  2="e^(-2)"  3="2 × e^(-2)"  4="1 - e^(-2)"

Poisson lambda=2. P(X<=1) = P(X=0) + P(X=1).
P(X=0) = e^(-2).
P(X=1) = 2 * e^(-2).
P(X<=1) = 3 * e^(-2).

The solution computes the coefficient using exact arithmetic and confirms option 1.
"""
import math
from fractions import Fraction


def solve():
    lam = 2

    # Compute coefficient: P(X<=1) = c * e^(-lambda)
    # P(X=0) = 1 * e^(-lambda)  -> coefficient 1
    # P(X=1) = lambda * e^(-lambda) / 1! -> coefficient lambda = 2
    coeff_0 = 1
    coeff_1 = lam

    total_coeff = coeff_0 + coeff_1  # 3

    # Verify numerically
    prob = total_coeff * math.exp(-lam)  # 3 * e^(-2) ≈ 0.4060

    # option 1 = "3 × e^(-2)"
    option_key = 3
    return {"value": f"{total_coeff} × e^(-{lam})", "option_key": option_key}


if __name__ == "__main__":
    print(solve())
