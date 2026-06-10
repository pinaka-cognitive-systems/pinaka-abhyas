"""Executable solution for arn_caf_qa_000172.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options after shuffle: 1=(3,4)  2=(0,0)  3=(4,3)  4=(2,5)
Feasible region: 2x + y <= 10, x >= 0, y >= 0.
(4,3): 2*4+3 = 11 > 10, so it lies outside the region.
"""


def solve():
    # Check the point (4, 3): 2*4 + 3 = 11 > 10, violates 2x + y <= 10
    x, y = 4, 3
    constraint_value = 2 * x + y  # = 11
    # This point lies outside the region.
    # After shuffle, option key 3 corresponds to (4, 3).
    option_key = 3
    return {"value": constraint_value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
