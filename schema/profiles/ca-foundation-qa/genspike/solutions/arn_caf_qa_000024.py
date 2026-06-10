"""Executable solution for arn_caf_qa_000024.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=0.9  2=0.54  3=0.36  4=0.4

Identity: b_XY * b_YX = r^2.
r = 0.6, b_XY = 0.9.
b_YX = r^2 / b_XY = 0.36 / 0.9 = 0.4.
"""


def solve():
    r = 0.6
    b_xy = 0.9  # regression of X on Y

    b_yx = (r ** 2) / b_xy  # 0.36 / 0.9 = 0.4

    # option 4 = 0.4
    option_key = 4
    return {"value": round(b_yx, 10), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
