"""Executable solution for arn_caf_qa_000166.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=x>8  2=x>-8  3=x<8  4=x>6
3x - 7 > 2x + 1  =>  x > 8. Boundary value is 8.
"""


def solve():
    # 3x - 7 > 2x + 1
    # x > 1 + 7 = 8
    boundary = 1 + 7  # = 8
    # The solution is x > 8; boundary value = 8
    # option 1 corresponds to x > 8
    option_key = 3
    return {"value": boundary, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
