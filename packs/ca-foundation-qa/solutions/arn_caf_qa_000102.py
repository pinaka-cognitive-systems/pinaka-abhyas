"""Executable solution for arn_caf_qa_000102.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=33  2=30  3=35  4=34

Grouped frequency distribution: 10-20:4, 20-30:8, 30-40:10, 40-50:6, 50-60:2.
Median using interpolation formula.
"""


def solve():
    # Class intervals (lower, upper) and frequencies
    classes = [(10, 20), (20, 30), (30, 40), (40, 50), (50, 60)]
    freqs = [4, 8, 10, 6, 2]

    n = sum(freqs)  # 30
    half_n = n / 2  # 15

    # Cumulative frequencies
    cum_freq = 0
    median_L = None
    median_f = None
    median_cf = None
    h = 10  # class width

    for i, (lower, upper) in enumerate(classes):
        prev_cf = cum_freq
        cum_freq += freqs[i]
        if cum_freq >= half_n and median_L is None:
            median_L = lower
            median_f = freqs[i]
            median_cf = prev_cf

    # Median = L + ((n/2 - cf) / f) * h
    median = median_L + ((half_n - median_cf) / median_f) * h
    # 30 + ((15 - 12) / 10) * 10 = 30 + 3 = 33

    # option 1 = 33
    option_key = 2
    return {"value": median, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
