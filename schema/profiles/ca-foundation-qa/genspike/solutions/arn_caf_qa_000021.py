"""Executable solution for arn_caf_qa_000021.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=10.5  2=10  3=5  4=12.5

Frequency distribution: (5,4), (10,2), (15,3), (20,1).
Arithmetic mean = sum(f*x) / sum(f).
"""


def solve():
    data = [(5, 4), (10, 2), (15, 3), (20, 1)]  # (value, frequency)

    sum_fx = sum(x * f for x, f in data)   # 20+20+45+20 = 105
    sum_f = sum(f for _, f in data)         # 10

    mean = sum_fx / sum_f  # 10.5

    # option 1 = 10.5
    option_key = 1
    return {"value": mean, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
