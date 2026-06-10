"""Executable solution for arn_caf_qa_000142.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 1,10,000  2=Rs 1,00,000  3=Rs 1,21,000  4=Rs 99,000

PV = FV / (1 + r)^n.
FV = 121000, r = 0.10, n = 2. Given: (1.1)^2 = 1.21.
"""


def solve():
    fv = 121_000
    growth_factor = 1.21  # (1.1)^2 given in stem
    pv = fv / growth_factor  # 121000 / 1.21 = 100000

    option_key = 2
    return {"value": pv, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
