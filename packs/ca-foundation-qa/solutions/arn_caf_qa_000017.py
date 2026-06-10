"""Executable solution for arn_caf_qa_000017.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=b_vu=0.6 and b_uv=0.8  2=b_vu=0.4 and b_uv=1.2
         3=b_vu=0.8 and b_uv=0.6  4=b_vu=2/3 and b_uv=3/2

Regression coefficients are invariant under a change of origin.
u = X + 2, v = Y + 3 is a pure origin shift (no scale change).
Therefore b_vu = b_yx = 0.6 and b_uv = b_xy = 0.8.
"""


def solve():
    b_yx = 0.6  # regression of Y on X (given)
    b_xy = 0.8  # regression of X on Y (given)

    # u = X + constant, v = Y + constant: change of origin only.
    # Regression coefficients depend on deviations from means only,
    # so b_vu = b_yx and b_uv = b_xy.
    b_vu = b_yx
    b_uv = b_xy

    result = (b_vu, b_uv)  # (0.6, 0.8)

    # option 1 = "b_vu = 0.6 and b_uv = 0.8"
    option_key = 1
    return {"value": result, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
