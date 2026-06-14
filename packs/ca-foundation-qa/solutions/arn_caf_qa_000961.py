"""Executable solution for arn_caf_qa_000961.

Deferred annuity present value.
Payments: 5000 at ends of years 6,7,8,9 (4 payments).
Value at end of year 5 (one period before first payment) = 5000 * annuity_factor(4,10%).
Discount 5 years to today using (1.10)^-5.
"""


def solve():
    payment = 5000.0
    annuity_pv_factor = 3.1699   # 4-year ordinary annuity at 10%
    defer_factor = 0.6209        # (1.10)^-5

    value_at_year5 = payment * annuity_pv_factor   # 15849.5
    pv_today = value_at_year5 * defer_factor        # ~9841

    option_key = 1
    return {"value": round(pv_today), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
