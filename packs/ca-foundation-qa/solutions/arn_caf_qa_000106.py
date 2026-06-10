"""Executable solution for arn_caf_qa_000106.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=3150  2=2510  3=4100  4=950

Sales: 1200, 3500, 2800, 4100, 950. Find range.
"""


def solve():
    sales = [1200, 3500, 2800, 4100, 950]

    range_val = max(sales) - min(sales)  # 4100 - 950 = 3150

    # option 1 = 3150
    option_key = 1
    return {"value": range_val, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
