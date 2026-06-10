"""Executable solution for arn_caf_qa_000022.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=4  2=8  3=16  4=64

Poisson distribution property: variance = lambda (the mean).
Rate = 4 complaints/hour. Period = 2 hours. lambda = 4 * 2 = 8.
Variance = lambda = 8.
"""


def solve():
    rate_per_hour = 4
    hours = 2

    lam = rate_per_hour * hours  # 8
    variance = lam  # Poisson property: variance = lambda

    # option 2 = 8
    option_key = 2
    return {"value": variance, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
