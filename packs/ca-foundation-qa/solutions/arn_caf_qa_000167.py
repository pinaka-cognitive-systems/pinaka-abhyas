"""Executable solution for arn_caf_qa_000167.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=9x^2-10x  2=9x^2-5x^2  3=9x^3-10x^2  4=3x^2-5x
y = 3x^3 - 5x^2 + 7
dy/dx = 9x^2 - 10x

Verified at x=3: dy/dx = 9*9 - 10*3 = 81 - 30 = 51.
"""


def solve():
    def deriv_correct(x):
        # dy/dx of 3x^3 - 5x^2 + 7 = 9x^2 - 10x
        return 9 * x**2 - 10 * x

    x = 3
    value = deriv_correct(x)  # = 51
    # option 1 = 9x^2 - 10x (evaluates to 51 at x=3)
    option_key = 1
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
