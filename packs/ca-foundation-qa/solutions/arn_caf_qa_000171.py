"""Executable solution for arn_caf_qa_000171.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=9:10  2=3:5  3=5:8  4=3:4
a:b = 3:4, b:c = 6:5.
LCM(4, 6) = 12. a:b = 9:12, b:c = 12:10. a:c = 9:10.
"""

import math


def solve():
    # a:b = 3:4, b:c = 6:5
    a_b_a, a_b_b = 3, 4
    b_c_b, b_c_c = 6, 5

    # Make b common
    common_b = math.lcm(a_b_b, b_c_b)  # 12
    scale_a = common_b // a_b_b         # 3
    scale_c = common_b // b_c_b         # 2

    a = a_b_a * scale_a  # 9
    c = b_c_c * scale_c  # 10

    # Simplify ratio a:c
    g = math.gcd(a, c)
    a_reduced = a // g   # 9
    c_reduced = c // g   # 10

    # Encode as a:c = numerator/denominator fraction
    # Correct answer is 9:10; encode value as a/c = 9/10 = 0.9
    value = a_reduced / c_reduced  # = 0.9
    # option 1 = 9:10
    option_key = 1
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
