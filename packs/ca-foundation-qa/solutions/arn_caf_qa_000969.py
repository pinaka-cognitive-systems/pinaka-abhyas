"""Executable solution for arn_caf_qa_000969.

9 distinct books into 3 identical parcels of 3 each, X and Y not together.
Total unlabelled splits minus the splits with X,Y in the same parcel.
Options: 1=210  2=280  3=70  4=1260
"""

from math import factorial
from itertools import combinations


def solve():
    n, k, s = 9, 3, 3  # 9 books, 3 groups, size 3

    # closed-form: unlabelled equal-group total
    labelled_total = factorial(n)
    for _ in range(k):
        labelled_total //= factorial(s)
    total = labelled_total // factorial(k)  # divide by k! for identical parcels

    # forbidden (X,Y together): fix them in one parcel, pick 1 of remaining 7,
    # split remaining 6 into two identical parcels of 3
    rest = n - 2          # 7 books left after X,Y
    third = rest          # ways to pick the parcel's 3rd book
    six_split = factorial(6) // (factorial(3) * factorial(3)) // factorial(2)
    bad = third * six_split

    answer = total - bad

    # brute-force cross-check by enumerating set partitions of {0..8} into
    # three blocks of size 3, treating blocks as unordered, X=0, Y=1
    books = list(range(9))
    seen = set()
    valid = 0
    for g1 in combinations(books, 3):
        r1 = [b for b in books if b not in g1]
        for g2 in combinations(r1, 3):
            g3 = tuple(b for b in r1 if b not in g2)
            part = frozenset((frozenset(g1), frozenset(g2), frozenset(g3)))
            if part in seen:
                continue
            seen.add(part)
            # X=0, Y=1 must not be in the same block
            together = any({0, 1} <= set(block) for block in part)
            if not together:
                valid += 1
    assert valid == answer, (valid, answer)
    assert len(seen) == total, (len(seen), total)

    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
