"""Executable solution for arn_caf_qa_000913.

Committee of 5 from 6 men, 4 women, with at least 2 women. Count the ways.
Options: 1=186  2=120  3=252  4=66
"""

from math import comb


def solve():
    men, women, size = 6, 4, 5
    total = 0
    for w in range(2, women + 1):       # at least 2 women
        m = size - w
        if 0 <= m <= men:
            total += comb(women, w) * comb(men, m)
    return {"value": total, "option_key": 1}


if __name__ == "__main__":
    print(solve())
