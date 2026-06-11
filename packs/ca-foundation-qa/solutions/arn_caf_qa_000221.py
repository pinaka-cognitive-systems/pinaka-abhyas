"""Executable solution for arn_caf_qa_000221.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Given r(X, Y) = 0.6.
U = 3X + 7 (scale a = 3, positive).
V = -4Y + 2 (scale c = -4, negative).
r(U, V) = sign(a) * sign(c) * r(X, Y)
        = (+1) * (-1) * 0.6 = -0.6.
Correct option: 3 (text "-0.6").
"""


def solve():
    r_xy = 0.6
    a = 3    # scale factor for U = 3X + 7
    c = -4   # scale factor for V = -4Y + 2
    sign_a = 1 if a > 0 else -1
    sign_c = 1 if c > 0 else -1
    r_uv = sign_a * sign_c * r_xy  # -0.6
    return {"value": r_uv, "option_key": 3}


if __name__ == "__main__":
    print(solve())
