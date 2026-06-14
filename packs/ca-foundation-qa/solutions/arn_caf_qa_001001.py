"""Executable solution for arn_caf_qa_001001.

Regression lines 6x + 10y = 130 and 10x + 6y = 110. Identify the admissible
assignment, pick the y-on-x line, estimate y at x = 8.
Options: 1=8.2  2=5.0  3=10.0  4=17.8
"""


def solve():
    # Candidate A: line1 (6x+10y=130) is y on x, line2 (10x+6y=110) is x on y
    b_yx_A = -6 / 10         # y = (130 - 6x)/10
    b_xy_A = -6 / 10         # x = (110 - 6y)/10
    prod_A = b_yx_A * b_xy_A

    # Candidate B: the reverse assignment
    b_yx_B = -10 / 6         # from line2 read as y on x
    b_xy_B = -10 / 6         # from line1 read as x on y
    prod_B = b_yx_B * b_xy_B

    x0 = 8
    if prod_A <= 1:
        # y on x line is 6x + 10y = 130  ->  y = (130 - 6x)/10
        y_hat = (130 - 6 * x0) / 10
    else:
        # y on x line is 10x + 6y = 110  ->  y = (110 - 10x)/6
        y_hat = (110 - 10 * x0) / 6

    return {"value": round(y_hat, 4), "option_key": 1}


if __name__ == "__main__":
    print(solve())
