"""Executable solution for arn_caf_qa_000147.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=13.5%  2=18.5%  3=12%  4=10%

CAGR = (End/Start)^(1/n) - 1.
End = 140493, Start = 100000, n = 3. Given: (1.12)^3 = 1.40493.
"""


def solve():
    end_value = 140_493
    start_value = 100_000
    n = 3
    # (1.12)^3 = 1.40493 given, so (end/start)^(1/3) - 1 = 0.12
    cagr = (end_value / start_value) ** (1 / n) - 1  # = 0.12

    option_key = 3
    return {"value": round(cagr * 100, 2), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
