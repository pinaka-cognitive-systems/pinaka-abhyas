"""Executable solution for arn_caf_qa_000002.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 3,310  2=Rs 3,000  3=Rs 1,000  4=Rs 300
"""


def solve():
    principal = 10_000
    rate = 0.10
    time_years = 3

    simple_interest = principal * rate * time_years  # 3000

    # option 2 = Rs 3,000
    option_key = 2
    return {"value": simple_interest, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
