"""Executable solution for arn_caf_qa_000148.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=7.00%  2=6.67%  3=17.60%  4=11.43%

Fisher equation: (1 + real) = (1 + nominal) / (1 + inflation).
nominal = 0.12, inflation = 0.05.
"""


def solve():
    nominal = 0.12
    inflation = 0.05
    real = (1 + nominal) / (1 + inflation) - 1  # 1.12/1.05 - 1 = 0.066667

    option_key = 4
    return {"value": round(real * 100, 2), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
