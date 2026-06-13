"""Executable solution for arn_caf_qa_000908.

Equal SI: sum1 at 5% for 4 yr, sum2 at 8% for 3 yr. Find P1:P2.
Options: 1='6 : 5'  2='5 : 6'  3='3 : 4'  4='5 : 8'
"""

from math import gcd


def solve():
    r1, t1 = 5, 4
    r2, t2 = 8, 3
    # P1*r1*t1 = P2*r2*t2  ->  P1:P2 = (r2*t2):(r1*t1)
    num = r2 * t2   # 24
    den = r1 * t1   # 20
    g = gcd(num, den)
    a, b = num // g, den // g   # 6, 5
    value = f"{a} : {b}"
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
