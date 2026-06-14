"""Executable solution for arn_caf_qa_000970.

7 around a round table (rotations identified), A,B,C together as a block,
A and C never adjacent. Closed form plus brute-force check.
Options: 1=48  2=144  3=240  4=96
"""

from math import factorial
from itertools import permutations


def solve():
    # closed form: (5-1)! circular orders of 5 units, times valid internal
    # orders of the A,B,C block (A,C non-adjacent => B in middle => 2 orders)
    units = 5
    valid_internal = 2
    answer = factorial(units - 1) * valid_internal

    # brute force: fix a non-block person (id 3) at seat 0 to quotient rotation
    A, B, C = 0, 1, 2
    others = [0, 1, 2, 4, 5, 6]  # everyone except the fixed person 3
    count = 0
    for perm in permutations(others):
        arr = [3] + list(perm)
        pos = {arr[i]: i for i in range(7)}

        def consecutive(ps):
            for start in range(7):
                run = set((start + k) % 7 for k in range(3))
                if set(ps) == run:
                    return True
            return False

        if not consecutive([pos[A], pos[B], pos[C]]):
            continue
        d = abs(pos[A] - pos[C])
        if d == 1 or d == 6:  # A,C adjacent circularly -> reject
            continue
        count += 1

    assert count == answer, (count, answer)
    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
