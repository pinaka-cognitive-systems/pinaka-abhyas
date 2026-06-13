"""Executable solution for arn_caf_qa_000939.

Scale the Poisson rate to the window, then cumulative P(X <= 2) as a 3-term sum.
Options: 1=5e^-2 (~0.677)  2=8.5e^-3 (~0.423)  3=2e^-2 (~0.271)  4=3e^-2 (~0.406)
"""

import math


def solve():
    rate_per_hour = 3
    window_hours = 40 / 60  # 2/3 hour

    # Match the mean to the window.
    lam = rate_per_hour * window_hours  # 2.0

    # Cumulative P(X <= 2) = sum of three Poisson terms.
    p_cum = sum(math.exp(-lam) * lam ** k / math.factorial(k) for k in range(3))
    # = e^-2 * (1 + 2 + 2) = 5 e^-2

    value = p_cum  # ~0.6767
    option_key = 1  # 5 e^-2
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
