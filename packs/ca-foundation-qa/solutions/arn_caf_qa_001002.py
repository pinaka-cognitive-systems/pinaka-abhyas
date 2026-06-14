"""Executable solution for arn_caf_qa_001002.

Three-commodity Fisher Ideal price index = sqrt(Laspeyres * Paasche).
Options: 1=158.22  2=190.48  3=131.43  4=160.95
"""

import math

# (p0, q0, p1, q1)
DATA = [
    (2, 40, 6, 10),
    (5, 10, 6, 50),
    (4, 20, 5, 20),
]


def solve():
    sp1q0 = sum(p1 * q0 for p0, q0, p1, q1 in DATA)
    sp0q0 = sum(p0 * q0 for p0, q0, p1, q1 in DATA)
    sp1q1 = sum(p1 * q1 for p0, q0, p1, q1 in DATA)
    sp0q1 = sum(p0 * q1 for p0, q0, p1, q1 in DATA)

    laspeyres = sp1q0 / sp0q0 * 100
    paasche = sp1q1 / sp0q1 * 100
    fisher = math.sqrt(laspeyres * paasche)
    return {"value": round(fisher, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
