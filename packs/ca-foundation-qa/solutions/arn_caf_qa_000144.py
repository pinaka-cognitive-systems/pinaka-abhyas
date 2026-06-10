"""Executable solution for arn_caf_qa_000144.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 1,25,000  2=Rs 1,07,740  3=Rs 1,12,525  4=Rs 1,15,470

Sinking fund: PMT = FV / annuity_factor.
FV = 500000, annuity_factor = 4.641 (given in stem).
"""


def solve():
    fv = 500_000
    annuity_factor = 4.641  # ((1.1)^4 - 1) / 0.10, given in stem
    pmt = fv / annuity_factor  # 500000 / 4.641 = 107739.93...

    # Rounded to nearest rupee = 107740
    option_key = 1
    return {"value": round(pmt, 2), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
