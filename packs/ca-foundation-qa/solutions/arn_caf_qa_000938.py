"""Executable solution for arn_caf_qa_000938.

Derive p from mean and variance, then P(at least one) via the complement.
Options: 1=665/729  2=64/729  3=728/729  4=1/3
"""

from fractions import Fraction


def solve():
    mean = Fraction(2)        # np
    variance = Fraction(4, 3)  # npq

    # variance / mean = npq / np = q.
    q = variance / mean        # 2/3
    p = 1 - q                  # 1/3
    n = mean / p               # 6
    n = int(n)

    # P(at least one) = 1 - P(zero) = 1 - q^n.
    p_at_least_one = 1 - q ** n  # 1 - (2/3)^6 = 665/729

    value = float(p_at_least_one)  # ~0.9122
    option_key = 1  # 665/729
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
