"""Executable solution for arn_caf_qa_000110.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=22.75  2=22.5  3=22.55  4=32.75

Step-deviation method: Mean = A + h * (sum(f*u)/n).
A=22.5, h=5, sum(f*u)=2, n=40.
"""


def solve():
    A = 22.5
    h = 5
    sum_fu = 2
    n = 40

    mean = A + h * (sum_fu / n)
    # 22.5 + 5 * (2/40) = 22.5 + 5 * 0.05 = 22.5 + 0.25 = 22.75

    # option 1 = 22.75
    option_key = 1
    return {"value": mean, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
