"""Executable solution for arn_caf_qa_000125.

Contract: solve() returns {"value": <int>, "option_key": <int>}.
Options: 1=160  2=280  3=100  4=60

E = 1000*(1/10) + 200*(3/10) + 0*(6/10) = 100 + 60 = 160.
"""
from fractions import Fraction


def solve():
    prize_1 = 1000
    prob_1 = Fraction(1, 10)
    prize_2 = 200
    prob_2 = Fraction(3, 10)
    prize_3 = 0
    prob_3 = Fraction(6, 10)

    expected = prize_1 * prob_1 + prize_2 * prob_2 + prize_3 * prob_3  # 160

    # option 1 = 160
    option_key = 1
    return {"value": int(expected), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
