"""Executable solution for arn_caf_qa_000971.

5 men, 3 women round table (rotations identified), no two women adjacent,
Priya (a woman) immediately next to Raj (a man). Closed form + brute check.
Options: 1=576  2=1440  3=2880  4=288
"""

from math import factorial, comb
from itertools import permutations


def solve():
    # gap method: seat 5 men circularly, 5 gaps, women in distinct gaps
    men_circular = factorial(5 - 1)         # 24
    priya_gap_choices = 2                    # the 2 gaps flanking Raj
    other_women = comb(4, 2) * factorial(2)  # 12
    answer = men_circular * priya_gap_choices * other_women  # 576

    # brute force: men 0..4 (Raj=0), women 5,6,7 (Priya=5)
    # fix man 0 (Raj) at seat 0 to quotient rotation
    women = {5, 6, 7}
    others = [1, 2, 3, 4, 5, 6, 7]
    count = 0
    for perm in permutations(others):
        arr = [0] + list(perm)
        # no two women adjacent (circular)
        bad = any(arr[i] in women and arr[(i + 1) % 8] in women for i in range(8))
        if bad:
            continue
        p5 = arr.index(5)
        p0 = arr.index(0)
        d = abs(p5 - p0)
        if d == 1 or d == 7:  # Priya adjacent to Raj
            count += 1

    assert count == answer, (count, answer)
    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
