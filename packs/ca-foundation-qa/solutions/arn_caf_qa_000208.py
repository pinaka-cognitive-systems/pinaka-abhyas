"""Executable solution for arn_caf_qa_000208.

Contract: solve() returns {"value": <answer text>, "option_key": <int>}.

Options: 1="x <= -1"  2="x >= 1"  3="x <= 6"  4="x <= 1"

Solve: -3(2x - 4) >= 6(x + 2) - 12

Correct working:
  LHS: -6x + 12
  RHS: 6x + 12 - 12 = 6x
  -6x + 12 >= 6x
  12 >= 12x
  x <= 1
"""

from fractions import Fraction


def solve():
    # Represent as ax + b >= 0 after rearranging.
    # -6x + 12 >= 6x  =>  -12x + 12 >= 0  =>  -12x >= -12  =>  x <= 1
    lhs_coeff = Fraction(-3 * 2)   # coefficient of x on LHS after expansion: -6
    lhs_const = Fraction(-3 * -4)  # constant on LHS: +12
    rhs_coeff = Fraction(6)        # coefficient of x on RHS: 6
    rhs_const = Fraction(6 * 2 - 12)  # constant on RHS: 12 - 12 = 0

    # Move everything to LHS: (lhs_coeff - rhs_coeff)*x + (lhs_const - rhs_const) >= 0
    net_coeff = lhs_coeff - rhs_coeff   # -12
    net_const = lhs_const - rhs_const   # 12

    # net_coeff * x >= -net_const
    # x <= -net_const / net_coeff  (sign flips because net_coeff < 0)
    assert net_coeff < 0, "Expected negative coefficient requiring sign flip"
    boundary = -net_const / net_coeff  # -12 / -12 = 1
    # Inequality direction: >= flips to <= when dividing by negative
    direction = "<="

    result = f"x {direction} {int(boundary)}"
    assert result == "x <= 1"
    return {"value": result, "option_key": 4}


if __name__ == "__main__":
    print(solve())
