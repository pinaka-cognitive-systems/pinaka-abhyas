"""Executable solution for arn_caf_qa_000994.

Binomial with mean 4, variance 2.4. Recover q = var/mean, p = 1-q, n = mean/p.
P(X >= 1) = 1 - q^n.
Options: 1=0.9940  2=0.0060  3=0.9999  4=0.0403
"""


def solve():
    mean = 4.0
    var = 2.4
    q = var / mean          # 0.6
    p = 1 - q               # 0.4
    n = mean / p            # 10
    n = round(n)            # integer number of trials
    at_least_one = 1 - q ** n   # 1 - 0.6^10
    value = round(at_least_one, 4)   # 0.9940
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
