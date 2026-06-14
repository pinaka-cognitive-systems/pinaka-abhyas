"""Executable solution for arn_caf_qa_000979.

Two branches merge. Recover SDs from CVs, pool variance with mean-shift,
find combined CV to one decimal place.
Branch A: n=40, mean=25, CV=20%. Branch B: n=60, mean=30, CV=15%.
Options: 1=18.9%  2=16.8%  3=17.0%  4=17.5%
"""
import math


def solve():
    n1, m1, cv1 = 40, 25, 20.0
    n2, m2, cv2 = 60, 30, 15.0
    sd1 = cv1 / 100 * m1
    sd2 = cv2 / 100 * m2
    N = n1 + n2
    M = (n1 * m1 + n2 * m2) / N
    d1 = m1 - M
    d2 = m2 - M
    variance = (n1 * (sd1 ** 2 + d1 ** 2) + n2 * (sd2 ** 2 + d2 ** 2)) / N
    sd = math.sqrt(variance)
    cv = sd / M * 100
    return {"value": round(cv, 1), "option_key": 1}


if __name__ == "__main__":
    print(solve())
