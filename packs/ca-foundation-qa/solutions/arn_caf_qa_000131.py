"""Executable solution for arn_caf_qa_000131.

Contract: solve() returns {"value": <float>, "option_key": <int>}.
Options: 1=0.6826  2=0.3413  3=0.8413  4=0.1587

X ~ N(500, 20^2). P(480 < X < 520).
z1 = (480 - 500)/20 = -1, z2 = (520 - 500)/20 = 1.
P(-1 < Z < 1) = 2 * P(0 < Z < 1) = 2 * 0.3413 = 0.6826 (symmetry).
P(0 < Z < 1) = 0.3413 given in stem.
"""


def solve():
    mu = 500
    sigma = 20
    x_low, x_high = 480, 520

    z_low = (x_low - mu) / sigma    # -1
    z_high = (x_high - mu) / sigma  # 1

    p_half = 0.3413                 # P(0 < Z < 1), given in stem
    prob = 2 * p_half               # 0.6826 by symmetry

    # option 1 = 0.6826
    option_key = 1
    return {"value": round(prob, 4), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
