"""Executable solution for arn_caf_qa_000162.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=5  2=25  3=65  4=10
Total = 60, |M| = 35, |S| = 30, every student in at least one.
|M ∩ S| = |M| + |S| - |M ∪ S| = 35 + 30 - 60 = 5.
"""


def solve():
    total = 60
    maths = 35
    stats = 30
    # Inclusion-exclusion: union = total (every student in at least one subject)
    both = maths + stats - total  # = 5
    # option 1 = 5
    option_key = 4
    return {"value": both, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
