"""Executable solution for arn_caf_qa_000902.

x^2 - p*x + (p+3) = 0 has two distinct positive roots differing by 3. Find p.
Options: 1=7  2=-3  3=4  4=10
"""

import math


def roots(p):
    a = 1.0
    b = -p
    c = p + 3
    disc = b * b - 4 * a * c
    if disc < 0:
        return None
    sq = math.sqrt(disc)
    return ((-b + sq) / 2, (-b - sq) / 2)


def solve():
    # (alpha - beta)^2 = S^2 - 4P = p^2 - 4(p+3) = 9  ->  p^2 - 4p - 21 = 0
    candidates = []
    # solve p^2 - 4p - 21 = 0
    disc = 4 ** 2 + 4 * 21
    sq = math.sqrt(disc)
    for p in ((4 + sq) / 2, (4 - sq) / 2):
        r = roots(p)
        if r is None:
            continue
        r1, r2 = r
        distinct = abs(r1 - r2) > 1e-9
        positive = r1 > 1e-9 and r2 > 1e-9
        if distinct and positive:
            candidates.append(round(p))
    p = candidates[0]
    return {"value": p, "option_key": 1}


if __name__ == "__main__":
    print(solve())
