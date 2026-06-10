"""Executable solution for arn_caf_qa_000173.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=4  2=5  3=16  4=10
GM of 2 and 8 = sqrt(2 * 8) = sqrt(16) = 4.
"""

import math


def solve():
    a = 2
    b = 8
    gm = math.sqrt(a * b)  # = 4.0
    value = int(gm)         # = 4
    # option 1 = 4
    option_key = 1
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
