"""Executable solution for arn_caf_qa_001003.

Fisher satisfies the Time Reversal Test: P01 * P10 = 1.
Options: 1=1.00  2=0.99  3=1.01  4=1.32
"""

import math

# (p0, q0, p1, q1)
DATA = [
    (4, 50, 5, 40),
    (6, 30, 8, 35),
    (2, 20, 3, 25),
]


def solve():
    sp1q0 = sum(p1 * q0 for p0, q0, p1, q1 in DATA)
    sp0q0 = sum(p0 * q0 for p0, q0, p1, q1 in DATA)
    sp1q1 = sum(p1 * q1 for p0, q0, p1, q1 in DATA)
    sp0q1 = sum(p0 * q1 for p0, q0, p1, q1 in DATA)

    # Fisher P01 (year 0 base) as a ratio
    p01 = math.sqrt((sp1q0 / sp0q0) * (sp1q1 / sp0q1))
    # Fisher P10 (year 1 base): swap the two years' roles
    p10 = math.sqrt((sp0q1 / sp1q1) * (sp0q0 / sp1q0))

    product = p01 * p10
    return {"value": round(product, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
