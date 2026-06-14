"""Executable solution for arn_caf_qa_000960.

Equal-SI inverse proportion; derive the third time, then find the largest part.
Third period = twice first = 2*5 = 10. Times: 5, 6, 10.
Equal SI + same rate => P inversely proportional to T.
1/5 : 1/6 : 1/10 = 6 : 5 : 3 (over LCM 30), sum 14.
Largest part pairs with smallest time (5 yr): 4200 * 6/14 = 1800.
"""

from fractions import Fraction


def solve():
    total = 4200
    t1 = 5
    t2 = 6
    t3 = 2 * t1  # 10
    times = [t1, t2, t3]

    weights = [Fraction(1, t) for t in times]
    wsum = sum(weights)
    parts = [total * w / wsum for w in weights]

    largest = max(parts)

    option_key = 1
    return {"value": float(largest), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
