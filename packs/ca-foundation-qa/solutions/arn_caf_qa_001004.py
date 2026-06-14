"""Executable solution for arn_caf_qa_001004.

Fisher satisfies the Factor Reversal Test: P01 * Q01 = value index =
Sigma p1q1 / Sigma p0q0.
Options: 1=132.14  2=130.95  3=133.34  4=131.55
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

    # Fisher price and quantity indices
    p01 = math.sqrt((sp1q0 / sp0q0) * (sp1q1 / sp0q1))
    q01 = math.sqrt((sp0q1 / sp0q0) * (sp1q1 / sp1q0))
    value_index = p01 * q01 * 100

    # Equivalently the value ratio (factor reversal identity)
    assert abs(value_index - sp1q1 / sp0q0 * 100) < 1e-6
    return {"value": round(value_index, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
