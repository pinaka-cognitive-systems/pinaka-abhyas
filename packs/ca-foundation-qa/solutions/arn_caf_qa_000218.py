"""Executable solution for arn_caf_qa_000218.

Contract: solve() returns {"value": ..., "option_key": <int>}.

Two-commodity Paasche price index.

  Cloth:  P0=5, Q0=10, P1=7,  Q1=12.
  Sugar:  P0=10, Q0=5, P1=12, Q1=4.

  Paasche = Sum(P1*Q1) / Sum(P0*Q1) * 100
          = (7*12 + 12*4) / (5*12 + 10*4) * 100
          = (84 + 48) / (60 + 40) * 100
          = 132 / 100 * 100
          = 132.

Options: 1=130  2=131  3=144  4=132
Correct: 4
"""

import math


COMMODITIES = [
    {"name": "Cloth", "p0": 5,  "q0": 10, "p1": 7,  "q1": 12},
    {"name": "Sugar", "p0": 10, "q0": 5,  "p1": 12, "q1": 4},
]


def paasche_index(commodities):
    """Paasche = Sum(P1*Q1) / Sum(P0*Q1) * 100."""
    numerator   = sum(c["p1"] * c["q1"] for c in commodities)
    denominator = sum(c["p0"] * c["q1"] for c in commodities)
    return numerator / denominator * 100


def laspeyres_index(commodities):
    """Laspeyres = Sum(P1*Q0) / Sum(P0*Q0) * 100."""
    numerator   = sum(c["p1"] * c["q0"] for c in commodities)
    denominator = sum(c["p0"] * c["q0"] for c in commodities)
    return numerator / denominator * 100


def solve():
    p = paasche_index(COMMODITIES)
    l = laspeyres_index(COMMODITIES)

    # Verify Laspeyres = 130 and Paasche = 132.
    assert abs(l - 130.0) < 1e-9, f"Expected Laspeyres=130, got {l}"
    assert abs(p - 132.0) < 1e-9, f"Expected Paasche=132, got {p}"

    # Verify Fisher's Ideal Index rounds to 131.
    fisher = math.sqrt(l * p)
    assert abs(round(fisher) - 131) < 1e-9, f"Expected Fisher~131, got {fisher}"

    return {"value": p, "option_key": 4}


if __name__ == "__main__":
    print(solve())
