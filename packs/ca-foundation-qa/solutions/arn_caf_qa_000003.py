"""Executable solution for arn_caf_qa_000003.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 20,000  2=Rs 28,125  3=Rs 30,000  4=Rs 50,000
Asha:Bimal:Chetan = 4:5:6; total profit = Rs 75,000; find Chetan's share.
"""


def solve():
    ratios = {"Asha": 4, "Bimal": 5, "Chetan": 6}
    total_profit = 75_000

    total_parts = sum(ratios.values())  # 15
    chetan_share = (ratios["Chetan"] / total_parts) * total_profit  # 30000

    # option 3 = Rs 30,000
    option_key = 3
    return {"value": chetan_share, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
