"""Executable solution for arn_caf_qa_000975.

x^2 - 6x + k = 0 has roots a, b. New roots a + 1/b and b + 1/a have sum 8.
Find their product, working entirely through Vieta symmetric functions.
Options: 1=16/3  2=10/3  3=169/12  4=8
"""

from fractions import Fraction


def solve():
    S = Fraction(6)       # a + b
    new_sum = Fraction(8)
    # new sum = S + S/P = new_sum  ->  S/P = new_sum - S  ->  P = S/(new_sum - S)
    P = S / (new_sum - S)  # a*b = k
    # new product = a*b + 2 + 1/(a*b)
    new_product = P + 2 + 1 / P

    # cross-check by constructing actual roots of x^2 - 6x + P
    import math
    disc = float(S) ** 2 - 4 * float(P)
    a = (float(S) + math.sqrt(disc)) / 2
    b = (float(S) - math.sqrt(disc)) / 2
    chk_sum = (a + 1 / b) + (b + 1 / a)
    chk_prod = (a + 1 / b) * (b + 1 / a)
    assert abs(chk_sum - float(new_sum)) < 1e-9
    assert abs(chk_prod - float(new_product)) < 1e-9

    return {"value": float(new_product), "option_key": 1}


if __name__ == "__main__":
    print(solve())
