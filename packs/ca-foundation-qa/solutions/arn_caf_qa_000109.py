"""Executable solution for arn_caf_qa_000109.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=27  2=25  3=1080  4=216

Frequency distribution: 0-10:2, 10-20:8, 20-30:15, 30-40:10, 40-50:5.
Arithmetic mean from grouped data.
"""


def solve():
    classes = [(0, 10), (10, 20), (20, 30), (30, 40), (40, 50)]
    freqs = [2, 8, 15, 10, 5]

    midpoints = [(l + u) / 2 for l, u in classes]  # [5, 15, 25, 35, 45]

    sum_fm = sum(m * f for m, f in zip(midpoints, freqs))
    # 10 + 120 + 375 + 350 + 225 = 1080

    n = sum(freqs)  # 40

    mean = sum_fm / n  # 1080/40 = 27.0

    # option 1 = 27
    option_key = 2
    return {"value": mean, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
