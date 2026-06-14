"""Executable solution for arn_caf_qa_000993.

Bag 4 red, 6 white; draw 3 together (without replacement).
X = number of reds ~ hypergeometric. Payoff(0)=-10,(1)=0,(2)=25,(3)=60.
Expected payoff in Rs.
Options: 1=7.83  2=18.75  3=8.88  4=1.20
"""

from math import comb


def solve():
    R, W, n = 4, 6, 3
    N = R + W
    payoff = {0: -10, 1: 0, 2: 25, 3: 60}
    expected = 0.0
    total_p = 0.0
    for k in range(0, n + 1):
        p = comb(R, k) * comb(W, n - k) / comb(N, n)
        total_p += p
        expected += p * payoff[k]
    assert abs(total_p - 1.0) < 1e-9      # distribution must sum to 1
    value = round(expected, 2)             # 7.83
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
