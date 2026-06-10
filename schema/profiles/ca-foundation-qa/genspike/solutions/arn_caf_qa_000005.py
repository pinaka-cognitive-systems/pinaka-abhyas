"""Executable solution for arn_caf_qa_000005.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=30 m  2=60 m  3=20 m  4=25 m
Perimeter = 100 m, area = 600 sq m. Find the longer side.
l + w = 50, l * w = 600. Solve quadratic x^2 - 50x + 600 = 0.
"""

import math


def solve():
    semi_perimeter = 100 / 2  # l + w = 50
    area = 600

    # x^2 - (l+w)*x + lw = 0
    b = -semi_perimeter
    c = area
    discriminant = semi_perimeter ** 2 - 4 * area  # 2500 - 2400 = 100
    sqrt_disc = math.sqrt(discriminant)  # 10

    root1 = (semi_perimeter + sqrt_disc) / 2  # 30
    root2 = (semi_perimeter - sqrt_disc) / 2  # 20

    longer_side = max(root1, root2)  # 30

    # option 1 = 30 m
    option_key = 1
    return {"value": longer_side, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
