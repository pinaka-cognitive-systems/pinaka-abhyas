"""Executable solution for arn_caf_qa_000941.

Recover r from two regression lines: slopes -> product -> signed square root.
Also recovers the means as the intersection.
Options: 1=0.6  2=0.36  3=0.8  4=0.625
"""

import math
from fractions import Fraction


def solve():
    # y on x: 4x - 5y + 33 = 0 -> y = (4/5)x + 33/5 -> byx = 4/5.
    byx = Fraction(4, 5)
    # x on y: 20x - 9y - 107 = 0 -> x = (9/20)y + 107/20 -> bxy = 9/20.
    bxy = Fraction(9, 20)

    r_squared = byx * bxy  # 9/25 = 0.36
    # Both coefficients positive -> r positive.
    sign = 1 if byx > 0 and bxy > 0 else -1
    r = sign * math.sqrt(float(r_squared))  # 0.6

    # Means are the intersection of the two lines (sanity, not the answer).
    # 4x - 5y = -33 ; 20x - 9y = 107  ->  x = 13, y = 17.
    y_bar = Fraction(272, 16)          # 17
    x_bar = (-33 + 5 * y_bar) / 4       # 13
    assert (x_bar, y_bar) == (13, 17)
    assert float(r_squared) <= 1  # assignment validity check

    value = r  # 0.6
    option_key = 1  # 0.6
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
