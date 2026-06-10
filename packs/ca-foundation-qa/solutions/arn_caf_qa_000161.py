"""Executable solution for arn_caf_qa_000161.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=5  2=8  3=3  4=2
Set A has 5 elements, set B has 3 elements, B is a subset of A.
A union B = A = 5 elements.
"""


def solve():
    size_a = 5
    size_b = 3
    # B is a subset of A, so all B elements are already in A.
    # A union B = A
    union_size = size_a  # = 5
    # option 1 = 5
    option_key = 2
    return {"value": union_size, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
