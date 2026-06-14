"""Executable solution for arn_caf_qa_000983.

Back-calculate Group II SD from the combined SD by inverting the
pooled-variance identity.
Group I: n=40, mean=20, SD=5. Group II: n=60, mean=30, SD=?.
Combined: n=100, SD=13.
Options: 1=15  2=16.28  3=15.52  4=18.33
"""
import math


def solve():
    n1, m1, s1 = 40, 20, 5
    n2, m2 = 60, 30
    N = n1 + n2
    combined_sd = 13
    M = (n1 * m1 + n2 * m2) / N
    d1 = m1 - M
    d2 = m2 - M
    total = combined_sd ** 2 * N
    s2_sq = (total - n1 * (s1 ** 2 + d1 ** 2) - n2 * d2 ** 2) / n2
    s2 = math.sqrt(s2_sq)
    return {"value": round(s2, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
