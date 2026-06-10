"""Executable solution for arn_caf_qa_000143.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 62,985  2=Rs 62,000  3=Rs 63,000  4=Rs 60,000

FV = P * (1 + r)^n.
P = 50000, r = 0.08, n = 3. Given: (1.08)^3 = 1.2597.
"""


def solve():
    principal = 50_000
    growth_factor = 1.2597  # (1.08)^3 given in stem
    fv = principal * growth_factor  # 50000 * 1.2597 = 62985

    option_key = 4
    return {"value": fv, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
