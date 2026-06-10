"""Executable solution for arn_caf_qa_000145.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 96,000  2=Rs 1,50,000  3=Rs 1,20,000  4=Rs 1,00,000

PV of perpetuity = PMT / r.
PMT = 12000, r = 0.08.
"""


def solve():
    pmt = 12_000
    r = 0.08
    pv = pmt / r  # 12000 / 0.08 = 150000

    option_key = 3
    return {"value": pv, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
