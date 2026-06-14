"""Executable solution for arn_caf_qa_001000.

Two regression lines 8x - 10y + 66 = 0 and 40x - 18y - 214 = 0.
Choose the admissible assignment (product of regression coefficients <= 1),
then r = signed sqrt of that product.
Options: 1=0.6  2=-0.6  3=0.36  4=0.8
"""

import math


def solve():
    # Candidate A: line1 = y on x, line2 = x on y
    b_yx_A = 8 / 10          # from 10y = 8x + 66
    b_xy_A = 18 / 40         # from 40x = 18y + 214
    prod_A = b_yx_A * b_xy_A

    # Candidate B: line1 = x on y, line2 = y on x
    b_xy_B = 10 / 8          # from 8x = 10y - 66
    b_yx_B = 40 / 18         # from 18y = 40x - 214
    prod_B = b_yx_B * b_xy_B

    # Keep the admissible assignment (r^2 must be <= 1)
    if prod_A <= 1:
        prod, sign = prod_A, 1 if (b_yx_A > 0 and b_xy_A > 0) else -1
    else:
        prod, sign = prod_B, 1 if (b_yx_B > 0 and b_xy_B > 0) else -1

    r = sign * math.sqrt(prod)
    return {"value": round(r, 4), "option_key": 1}


if __name__ == "__main__":
    print(solve())
