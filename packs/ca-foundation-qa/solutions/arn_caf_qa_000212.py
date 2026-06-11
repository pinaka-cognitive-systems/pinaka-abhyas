"""Executable solution for arn_caf_qa_000212.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

7 students in a row; Arjun and Meena must NOT be adjacent.
Complementary counting:
  Total = 7! = 5040
  Adjacent (treat as block of 2): 6! * 2! = 720 * 2 = 1440
  Not adjacent = 5040 - 1440 = 3600
Correct option: 2 (text "3600").
"""
import math


def solve():
    total = math.factorial(7)          # 5040
    adjacent = math.factorial(6) * 2   # 6! * 2! = 1440
    not_adjacent = total - adjacent    # 3600
    return {"value": not_adjacent, "option_key": 2}


if __name__ == "__main__":
    print(solve())
