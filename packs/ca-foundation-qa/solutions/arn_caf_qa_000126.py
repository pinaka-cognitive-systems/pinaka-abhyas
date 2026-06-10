"""Executable solution for arn_caf_qa_000126.

Contract: solve() returns {"value": <int>, "option_key": <int>}.
Options: 1=2  2=11  3=3  4=8

X = 1 (p=1/4), 3 (p=1/2), 5 (p=1/4).
E[X]  = 1*(1/4) + 3*(1/2) + 5*(1/4) = 3.
E[X²] = 1*(1/4) + 9*(1/2) + 25*(1/4) = 11.
Var(X) = E[X²] - (E[X])² = 11 - 9 = 2.
"""
from fractions import Fraction


def solve():
    outcomes = [(1, Fraction(1, 4)), (3, Fraction(1, 2)), (5, Fraction(1, 4))]

    e_x = sum(x * p for x, p in outcomes)       # 3
    e_x2 = sum(x**2 * p for x, p in outcomes)   # 11
    variance = e_x2 - e_x**2                      # 2

    # option 1 = 2
    option_key = 3
    return {"value": int(variance), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
