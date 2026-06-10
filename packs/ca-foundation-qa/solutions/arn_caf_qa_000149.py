"""Executable solution for arn_caf_qa_000149.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 58,800  2=Rs 30,000  3=Rs 300  4=Rs 42,000

Real salary = (Nominal / Price index) * 100.
Nominal = 42000, Index = 140, Base = 100.
"""


def solve():
    nominal = 42_000
    price_index = 140
    base = 100
    real = (nominal / price_index) * base  # (42000 / 140) * 100 = 30000

    option_key = 2
    return {"value": real, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
