"""Executable solution for arn_caf_qa_000962.

Annuity due left to grow one extra (idle) year.
Deposits of 2000 at start of years 1, 2, 3; value at end of year 4.
Compounding spans: deposit1 -> 4 yrs, deposit2 -> 3 yrs, deposit3 -> 2 yrs.
"""


def solve():
    deposit = 2000.0
    r = 0.10
    # exponents: start-of-year deposits, valued at end of year 4
    exponents = [4, 3, 2]
    fv = sum(deposit * (1 + r) ** e for e in exponents)  # 8010.2

    option_key = 1
    return {"value": round(fv), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
