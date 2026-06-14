"""Executable solution for arn_caf_qa_000959.

Equal-SI inverse proportion across three parts at one rate.
Equal SI + same rate => P*T constant => P inversely proportional to T.
Times 4, 6, 12 -> P ratio 1/4 : 1/6 : 1/12 = 3 : 2 : 1 (sum 6).
12-year part = 7800 * 1/6 = 1300; SI = 1300 * 12 * 0.05 = 780 (same for all).
"""

from fractions import Fraction


def solve():
    total = 7800
    times = [4, 6, 12]
    rate = Fraction(5, 100)

    weights = [Fraction(1, t) for t in times]
    wsum = sum(weights)
    parts = [total * w / wsum for w in weights]

    interests = [p * rate * t for p, t in zip(parts, times)]
    # all interests must be equal
    assert all(i == interests[0] for i in interests)

    si_each = interests[0]

    option_key = 1
    return {"value": float(si_each), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
