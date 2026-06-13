"""Executable solution for arn_caf_qa_000940.

Spearman correction: back-calculate Sigma d^2 from the reported r, swap the bad
term, recompute.
Options: 1=20/33 (~0.606)  2=0.8  3=~0.582  4=~0.994
"""

from fractions import Fraction


def solve():
    n = 10
    denom = n * (n * n - 1)  # 990
    r_reported = Fraction(8, 10)

    # Back-calculate the wrong Sigma d^2 from r = 1 - 6*Sd2/denom.
    sd2_wrong = (1 - r_reported) * denom / 6  # 33

    # Correct the single term: remove 2^2 = 4, add 6^2 = 36.
    sd2_correct = sd2_wrong - 2 ** 2 + 6 ** 2  # 65

    r_correct = 1 - Fraction(6) * sd2_correct / denom  # 20/33

    value = float(r_correct)  # ~0.6061
    option_key = 1  # 20/33
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
