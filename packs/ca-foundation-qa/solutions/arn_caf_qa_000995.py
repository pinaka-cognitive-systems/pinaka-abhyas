"""Executable solution for arn_caf_qa_000995.

Binomial: mean 6, mean exceeds variance by 1.8 -> variance 4.2.
q = var/mean = 0.7, p = 0.3, n = mean/p = 20.
P(X >= 2) = 1 - P(0) - P(1).
Options: 1=0.9924  2=0.9992  3=0.0076  4=0.0068
"""

from math import comb


def solve():
    mean = 6.0
    var = mean - 1.8           # 4.2
    q = var / mean             # 0.7
    p = 1 - q                  # 0.3
    n = round(mean / p)        # 20
    p0 = q ** n
    p1 = comb(n, 1) * p * q ** (n - 1)
    at_least_two = 1 - p0 - p1
    value = round(at_least_two, 4)   # 0.9924
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
