"""Executable solution for arn_caf_qa_000112.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1="Median"  2="Mode"  3="Arithmetic mean"  4="First quartile"

The x-coordinate at the intersection of the less-than and more-than ogives.
"""


def solve():
    # By definition: less-than ogive and more-than ogive intersect at n/2
    # cumulative frequency, which corresponds to the median.
    answer = "Median"

    option_key = 1
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
