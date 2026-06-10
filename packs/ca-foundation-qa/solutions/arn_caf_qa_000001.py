"""Executable solution for arn_caf_qa_000001.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
The value is the computed CI; option_key is the option whose text matches that value.
Options: 1=Rs 2,050  2=Rs 2,000  3=Rs 4,200  4=Rs 2,100
"""


def solve():
    principal = 20_000
    annual_rate = 0.10
    periods_per_year = 2
    years = 1

    rate_per_period = annual_rate / periods_per_year
    n_periods = periods_per_year * years

    amount = principal * (1 + rate_per_period) ** n_periods
    ci = amount - principal  # 22050 - 20000 = 2050

    # Match to option key: option 1 = Rs 2,050
    option_key = 1
    return {"value": ci, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
