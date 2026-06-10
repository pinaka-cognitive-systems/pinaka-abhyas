"""Executable solution for arn_caf_qa_000004.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=84  2=168  3=336  4=56
Choose 3 from 8 candidates (unordered sub-group) = C(8,3).
"""

import math


def solve():
    n = 8
    r = 3

    ways = math.comb(n, r)  # 8! / (3! * 5!) = 56

    # option 4 = 56
    option_key = 4
    return {"value": ways, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
