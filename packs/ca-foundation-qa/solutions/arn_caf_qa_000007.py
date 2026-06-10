"""Executable solution for arn_caf_qa_000007.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=9/13  2=1/52  3=4/13  4=17/52
Draw one card from 52. P(heart OR king) via addition rule.
"""

from fractions import Fraction


def solve():
    total = 52
    hearts = 13
    kings = 4
    king_of_hearts = 1  # counted in both

    favorable = hearts + kings - king_of_hearts  # 16
    prob = Fraction(favorable, total)  # 16/52 = 4/13

    # option 3 = 4/13
    option_key = 3
    return {"value": float(prob), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
