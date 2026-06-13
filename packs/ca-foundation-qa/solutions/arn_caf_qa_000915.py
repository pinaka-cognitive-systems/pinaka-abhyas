"""Executable solution for arn_caf_qa_000915.

C(x) = x^3 - 6x^2 + 15x + 50. Find marginal cost at x = 4.
MC = dC/dx = 3x^2 - 12x + 15.
Options: 1=15  2=19.50  3=39  4=78
"""


def solve():
    x = 4
    mc = 3 * x ** 2 - 12 * x + 15  # derivative of C, evaluated at x
    return {"value": mc, "option_key": 1}


if __name__ == "__main__":
    print(solve())
