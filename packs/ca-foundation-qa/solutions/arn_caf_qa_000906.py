"""Executable solution for arn_caf_qa_000906.

CI - SI over 3 years at 10% p.a. is Rs 155. Find the principal P.
Options: 1=5000  2=15500  3=5167  4=7750
"""


def solve():
    i = 0.10
    diff = 155
    # CI - SI over 3 years = P*((1+i)^3 - 1 - 3i)
    factor = (1 + i) ** 3 - 1 - 3 * i  # = i^2*(3+i) = 0.031
    p = diff / factor
    return {"value": round(p), "option_key": 1}


if __name__ == "__main__":
    print(solve())
