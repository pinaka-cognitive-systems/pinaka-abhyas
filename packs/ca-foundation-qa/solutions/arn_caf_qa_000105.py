"""Executable solution for arn_caf_qa_000105.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=24  2=18  3=1296  4=72

GM of 4 numbers = 6. Three known: 2, 3, 9. Find the fourth.
"""


def solve():
    gm = 6
    n = 4
    known = [2, 3, 9]

    # GM = (product)^(1/n), so product = GM^n
    total_product = gm ** n  # 6^4 = 1296

    # Product of known three
    known_product = 1
    for x in known:
        known_product *= x  # 2*3*9 = 54

    # Fourth number
    fourth = total_product / known_product  # 1296/54 = 24.0

    # option 1 = 24
    option_key = 3
    return {"value": fourth, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
