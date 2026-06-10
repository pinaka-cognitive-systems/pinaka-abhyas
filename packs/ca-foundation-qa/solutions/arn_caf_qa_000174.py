"""Executable solution for arn_caf_qa_000174.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=6  2=0  3=3  4=9
lim(x->3) (x^2 - 9) / (x - 3)
= lim(x->3) (x-3)(x+3) / (x-3)
= lim(x->3) (x+3) = 6.

Compute numerically approaching from both sides to confirm.
"""


def solve():
    # Factor: (x^2 - 9) / (x - 3) = (x + 3) for x != 3
    # Limit as x -> 3 is 3 + 3 = 6
    def simplified(x):
        return x + 3  # after cancelling (x - 3)

    limit_value = simplified(3)  # = 6

    # Verify numerically: approach from left and right
    eps = 1e-7
    left = (((3 - eps) ** 2 - 9) / ((3 - eps) - 3))
    right = (((3 + eps) ** 2 - 9) / ((3 + eps) - 3))
    assert abs(left - 6) < 1e-4, f"Left limit {left} not close to 6"
    assert abs(right - 6) < 1e-4, f"Right limit {right} not close to 6"

    # option 1 = 6
    option_key = 4
    return {"value": limit_value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
