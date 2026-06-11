"""Executable solution for arn_caf_qa_000205.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Principal = Rs 12000.
Period 1: rate = 5% pa, time = 3 years. SI1 = 12000 * 5/100 * 3 = 1800.
Period 2: rate = 7% pa, time = 2 years. SI2 = 12000 * 7/100 * 2 = 1680.
Total interest = 1800 + 1680 = 3480.
Correct option: 1 (text "Rs 3480").
"""


def solve():
    principal = 12000
    si1 = principal * 5 / 100 * 3  # 1800
    si2 = principal * 7 / 100 * 2  # 1680
    total_interest = si1 + si2      # 3480
    return {"value": total_interest, "option_key": 1}


if __name__ == "__main__":
    print(solve())
