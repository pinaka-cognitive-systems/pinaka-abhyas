"""Executable solution for arn_caf_qa_000204.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Solve: (2x + 5) / 3 - (x - 1) / 2 = 4
Multiply by 6: 2(2x+5) - 3(x-1) = 24
4x + 10 - 3x + 3 = 24
x + 13 = 24
x = 11
Correct option: 4 (text "11").
"""


def solve():
    # Verify by substitution
    x = 11
    lhs = (2 * x + 5) / 3 - (x - 1) / 2  # (27/3) - (10/2) = 9 - 5 = 4
    assert abs(lhs - 4) < 1e-9, f"Verification failed: lhs = {lhs}"
    return {"value": x, "option_key": 4}


if __name__ == "__main__":
    print(solve())
