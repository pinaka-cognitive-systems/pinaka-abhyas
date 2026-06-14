"""Executable solution for arn_caf_qa_000996.

Poisson with P(X=2) = P(X=3) -> lambda = 3.
P(X <= 2) = e^-3 (1 + 3 + 9/2).
Options: 1=0.4232  2=0.6767  3=0.1991  4=0.5768
"""

import math


def solve():
    # P(X=k) = P(X=k+1) for Poisson forces lambda = k+1; here k=2 -> lambda=3
    k = 2
    lam = k + 1                        # 3
    cumulative = 0.0
    for j in range(0, 3):              # X = 0, 1, 2 (at most 2)
        cumulative += math.exp(-lam) * lam ** j / math.factorial(j)
    value = round(cumulative, 4)        # 0.4232
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
