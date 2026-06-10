"""Executable solution for arn_caf_qa_000146.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 27,050  2=Rs 10,000  3=Rs 21,550  4=Rs 17,982

NPV = PV1 + PV2 - initial_cost.
CF1 = 60500, CF2 = 66550, cost = 100000, r = 0.10.
"""


def solve():
    cf1 = 60_500
    cf2 = 66_550
    cost = 100_000
    r = 0.10

    pv1 = cf1 / (1 + r)       # 60500 / 1.1 = 55000
    pv2 = cf2 / (1 + r) ** 2  # 66550 / 1.21 = 55000
    npv = pv1 + pv2 - cost    # 55000 + 55000 - 100000 = 10000

    option_key = 1
    return {"value": npv, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
