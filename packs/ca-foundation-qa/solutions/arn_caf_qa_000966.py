"""Executable solution for arn_caf_qa_000966.

EMI with a derived outstanding-balance step.
EMI = loan / annuityPV(5,10%) = 7582 / 3.7908 = 2000.
After 3 of 5 installments, 2 remain.
Outstanding = EMI * annuityPV(2,10%) = 2000 * 1.7355 = 3471.
"""


def solve():
    loan = 7582.0
    af5 = 3.7908
    af2 = 1.7355

    emi = loan / af5                 # ~2000
    emi_rounded = round(emi)         # 2000
    outstanding = emi_rounded * af2  # 3471

    option_key = 1
    return {"value": round(outstanding), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
