"""Executable solution for arn_caf_qa_000202.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Evaluate (n+2)! / n! for n = 7.
= (9 * 8 * 7!) / 7! = 9 * 8 = 72.
Correct option: 2 (text "72").
"""


def solve():
    import math
    n = 7
    value = math.factorial(n + 2) // math.factorial(n)  # 72
    return {"value": value, "option_key": 2}


if __name__ == "__main__":
    print(solve())
