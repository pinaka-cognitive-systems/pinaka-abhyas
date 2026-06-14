"""Executable solution for arn_caf_qa_000981.

Combined SD of two sections via pooled-variance formula with mean-shift terms.
Section X: n=40, mean=30, SD=6. Section Y: n=60, mean=50, SD=8.
Options: 1=12.20  2=7.27  3=7.20  4=7.00
"""
import math


def solve():
    n1, m1, s1 = 40, 30, 6
    n2, m2, s2 = 60, 50, 8
    N = n1 + n2
    M = (n1 * m1 + n2 * m2) / N
    d1 = m1 - M
    d2 = m2 - M
    variance = (n1 * (s1 ** 2 + d1 ** 2) + n2 * (s2 ** 2 + d2 ** 2)) / N
    sd = math.sqrt(variance)
    return {"value": round(sd, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
