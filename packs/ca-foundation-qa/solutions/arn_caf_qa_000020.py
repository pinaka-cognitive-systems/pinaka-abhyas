"""Executable solution for arn_caf_qa_000020.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=80  2=20  3=25  4=125

Price relative = (P_current / P_base) * 100.
P_base = 40, P_current = 50.
"""


def solve():
    p_base = 40
    p_current = 50

    price_relative = (p_current / p_base) * 100  # 125

    # option 4 = 125
    option_key = 4
    return {"value": price_relative, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
