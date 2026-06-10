"""Executable solution for arn_caf_qa_000108.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=7.2  2=36  3=6.8  4=0

Dataset: 8, 12, 16, 22, 32. Mean deviation about arithmetic mean.
"""


def solve():
    data = [8, 12, 16, 22, 32]
    n = len(data)

    mean = sum(data) / n  # 90/5 = 18.0

    # Sum of absolute deviations from mean
    sum_abs_dev = sum(abs(x - mean) for x in data)
    # |8-18| + |12-18| + |16-18| + |22-18| + |32-18| = 10+6+2+4+14 = 36

    md = sum_abs_dev / n  # 36/5 = 7.2

    # option 1 = 7.2
    option_key = 4
    return {"value": md, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
