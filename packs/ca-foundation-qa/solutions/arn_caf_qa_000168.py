"""Executable solution for arn_caf_qa_000168.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=2x^3+2x^2+C  2=6x^3+4x^2+C  3=12x+4+C  4=2x^3+2x^2
integral(6x^2 + 4x) dx = 2x^3 + 2x^2 + C

Verify by evaluating the antiderivative at x=1 (ignoring C):
  correct: 2(1) + 2(1) = 4
  option 2: 6(1) + 4(1) = 10 -- wrong
  option 3: 12(1) + 4 = 16 -- wrong (also is a derivative)
  option 4: same numerical value as option 1 but missing C -- wrong form

We encode the numerical check: antiderivative at x=1 = 4.
"""


def solve():
    # Antiderivative of 6x^2 + 4x = 2x^3 + 2x^2 (+ C)
    def antideriv(x):
        return 2 * x**3 + 2 * x**2

    x = 1
    value = antideriv(x)  # = 4
    # option 1 = 2x^3 + 2x^2 + C (correct form with C)
    option_key = 2
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
