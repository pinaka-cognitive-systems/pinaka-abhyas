"""Executable solution for arn_caf_qa_000008.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=486  2=50  3=80  4=242
GP: 2, 6, 18, 54, ... (a=2, r=3). Sum of first 5 terms.
"""


def solve():
    a = 2  # first term
    r = 3  # common ratio
    n = 5  # number of terms

    # S_n = a * (r^n - 1) / (r - 1) for r != 1
    s_n = a * (r ** n - 1) // (r - 1)  # 2 * (243 - 1) / 2 = 242

    # option 4 = 242
    option_key = 4
    return {"value": s_n, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
