"""Executable solution for arn_caf_qa_000997.

240 emails over 8 h (480 min) -> 0.5 per minute. Over 5 minutes, lambda = 2.5.
P(X <= 1) = e^-2.5 (1 + 2.5).
Options: 1=0.2873  2=0.9098  3=0.5438  4=0.7127
"""

import math


def solve():
    per_day = 240
    minutes_in_day = 8 * 60          # 480
    per_minute = per_day / minutes_in_day   # 0.5
    window = 5
    lam = per_minute * window        # 2.5
    cumulative = 0.0
    for j in range(0, 2):            # X = 0, 1 (at most 1)
        cumulative += math.exp(-lam) * lam ** j / math.factorial(j)
    value = round(cumulative, 4)      # 0.2873
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
