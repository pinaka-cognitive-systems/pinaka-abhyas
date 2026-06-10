"""Executable solution for arn_caf_qa_000121.

Contract: solve() returns {"value": <computed answer as string fraction>, "option_key": <int>}.
Options: 1=19/99  2=20/99  3=1/5  4=19/100

Conditional probability: after the first defective is drawn,
19 defectives remain among 99 items.
P(second defective | first defective) = 19/99.
"""
from fractions import Fraction


def solve():
    total = 100
    defective = 20

    # After one defective drawn: 19 defective remain in 99 items
    remaining_defective = defective - 1
    remaining_total = total - 1

    prob = Fraction(remaining_defective, remaining_total)  # 19/99

    # option 1 = "19/99"
    option_key = 2
    return {"value": str(prob), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
