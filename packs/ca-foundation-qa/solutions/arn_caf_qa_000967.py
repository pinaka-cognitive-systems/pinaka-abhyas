"""Executable solution for arn_caf_qa_000967.

EMI with a derived rate-conversion step.
Annual 12% compounded monthly -> monthly i = 0.01, n = 3.
EMI = P*i*(1+i)^n / ((1+i)^n - 1).
"""


def solve():
    p = 100000.0
    i = 0.12 / 12   # monthly rate 0.01
    n = 3
    growth = (1 + i) ** n  # 1.030301
    emi = p * i * growth / (growth - 1)  # ~34002

    option_key = 1
    return {"value": round(emi), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
