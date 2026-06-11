"""Executable solution for arn_caf_qa_000209.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.

Options: 1=510  2=450  3=540  4=495

AP: T_5 = 22, T_12 = 50. Find S_15.

Working:
  T_n = a + (n-1)*d
  a + 4d = 22   ...(1)
  a + 11d = 50  ...(2)
  (2) - (1): 7d = 28 => d = 4
  a = 22 - 4*4 = 6
  S_15 = 15/2 * (2*6 + 14*4) = 15/2 * 68 = 510
"""

from fractions import Fraction


def solve():
    # Given
    t5 = 22
    t12 = 50

    # Solve: a + 4d = t5, a + 11d = t12
    # 7d = t12 - t5
    d = Fraction(t12 - t5, 7)    # 28/7 = 4
    a = Fraction(t5) - 4 * d     # 22 - 16 = 6

    assert d == 4, f"Expected d=4, got {d}"
    assert a == 6, f"Expected a=6, got {a}"

    # S_n = n/2 * (2a + (n-1)*d)
    n = 15
    s15 = Fraction(n, 2) * (2 * a + (n - 1) * d)  # 15/2 * (12 + 56) = 15/2 * 68 = 510

    assert s15 == 510, f"Expected 510, got {s15}"
    return {"value": int(s15), "option_key": 1}


if __name__ == "__main__":
    print(solve())
