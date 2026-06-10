"""Executable solution for arn_caf_qa_000104.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=3.43  2=4  3=4.58  4=14

Rates: 2, 4, 8 kg per rupee. Equal spending on each lot.
Harmonic mean = n / sum(1/xi).
"""


def solve():
    rates = [2, 4, 8]
    n = len(rates)

    hm = n / sum(1 / r for r in rates)
    # 3 / (0.5 + 0.25 + 0.125) = 3 / 0.875 = 24/7 = 3.428571...

    # Round to 2 dp for comparison: 3.43
    hm_rounded = round(hm, 2)  # 3.43

    # option 1 = 3.43
    option_key = 1
    return {"value": hm_rounded, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
