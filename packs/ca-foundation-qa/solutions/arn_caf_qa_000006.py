"""Executable solution for arn_caf_qa_000006.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=4  2=2  3=2.19  4=1.41
Data: 4, 4, 4, 8, 8, 8. Population standard deviation.
"""

import math


def solve():
    data = [4, 4, 4, 8, 8, 8]
    n = len(data)

    mean = sum(data) / n  # 6
    variance = sum((x - mean) ** 2 for x in data) / n  # 24/6 = 4
    population_sd = math.sqrt(variance)  # 2

    # option 2 = 2
    option_key = 2
    return {"value": population_sd, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
