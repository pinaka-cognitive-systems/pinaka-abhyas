"""Executable solution for arn_caf_qa_000130.

Contract: solve() returns {"value": <float>, "option_key": <int>}.
Options: 1=0.0668  2=0.9332  3=0.4332  4=0.5000

X ~ N(50, 10^2). P(X > 65).
z = (65 - 50) / 10 = 1.5.
Given P(Z < 1.5) = 0.9332 (stated in stem).
P(X > 65) = 1 - 0.9332 = 0.0668.
"""


def solve():
    mu = 50
    sigma = 10
    x = 65

    z = (x - mu) / sigma           # 1.5
    p_z_less = 0.9332              # given in stem
    p_greater = 1 - p_z_less       # 0.0668

    # option 1 = 0.0668
    option_key = 3
    return {"value": round(p_greater, 4), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
