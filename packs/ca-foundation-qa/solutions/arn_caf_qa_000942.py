"""Executable solution for arn_caf_qa_000942.

Fisher Ideal index = geometric mean of Laspeyres and Paasche; it satisfies both
the time reversal and factor reversal tests.
Options: 1=150 (both tests)  2=140  3=~160.71  4=~150.36
"""

import math


def solve():
    # rows: (p0, q0, p1, q1)
    rows = [(6, 3, 14, 4), (4, 4, 2, 2), (8, 2, 10, 3)]

    s_p1q0 = sum(p1 * q0 for p0, q0, p1, q1 in rows)  # 70
    s_p0q0 = sum(p0 * q0 for p0, q0, p1, q1 in rows)  # 50
    s_p1q1 = sum(p1 * q1 for p0, q0, p1, q1 in rows)  # 90
    s_p0q1 = sum(p0 * q1 for p0, q0, p1, q1 in rows)  # 56

    laspeyres = s_p1q0 / s_p0q0 * 100  # 140
    paasche = s_p1q1 / s_p0q1 * 100    # 160.714...
    fisher = math.sqrt(laspeyres * paasche)  # 150.0

    value = fisher  # 150.0
    option_key = 1  # 150 and both reversal tests
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
