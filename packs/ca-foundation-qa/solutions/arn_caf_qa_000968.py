"""Executable solution for arn_caf_qa_000968.

Split 12 distinct trainees into UNLABELLED groups of sizes 5, 4, 3.
The multinomial counts labelled blocks; divide by k! only per set of
equal-sized groups. Here all sizes differ, so no further division.
Options: 1=27720  2=166320  3=4620  4=9240
"""

from math import factorial
from collections import Counter


def solve():
    n = 12
    sizes = [5, 4, 3]
    # labelled multinomial: place into fixed-size blocks
    labelled = factorial(n)
    for s in sizes:
        labelled //= factorial(s)
    # unlabelling: divide by m! for each group of m blocks sharing a size
    correction = 1
    for _size, m in Counter(sizes).items():
        correction *= factorial(m)
    unlabelled = labelled // correction
    return {"value": unlabelled, "option_key": 1}


if __name__ == "__main__":
    print(solve())
