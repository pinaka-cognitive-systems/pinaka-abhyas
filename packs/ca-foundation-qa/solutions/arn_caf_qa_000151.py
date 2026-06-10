"""Executable solution for arn_caf_qa_000151.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 20,000  2=Rs 26,380  3=Rs 16,380  4=Rs 12,961

Sinking fund: PMT = FV / [((1+r)^n - 1) / r].
FV = 100000, r = 0.10, n = 5. Given: (1.1)^5 = 1.61051.
"""


def solve():
    fv = 100_000
    r = 0.10
    growth_factor = 1.61051  # (1.1)^5 given in stem
    ann_factor = (growth_factor - 1) / r  # 0.61051 / 0.10 = 6.1051
    pmt = fv / ann_factor  # 100000 / 6.1051 = 16379.75

    option_key = 3
    return {"value": round(pmt, 2), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
