"""Executable solution for arn_caf_qa_000141.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=12.68%  2=12.00%  3=12.36%  4=11.68%

Effective annual rate = (1 + r/m)^m - 1.
r = 0.12, m = 12. Given: (1.01)^12 = 1.1268.
"""


def solve():
    growth_factor = 1.1268  # (1.01)^12 given in stem
    ear = growth_factor - 1  # 0.1268 = 12.68%

    option_key = 4
    return {"value": round(ear * 100, 2), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
