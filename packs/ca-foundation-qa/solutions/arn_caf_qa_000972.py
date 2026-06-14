"""Executable solution for arn_caf_qa_000972.

Letters of CHARITY: vowels {A,I,Y}, consonants {C,H,R,T}.
No two vowels adjacent, both ends consonants, C at neither end.
Closed form + brute-force over all 7! arrangements.
Options: 1=72  2=144  3=108  4=1440
"""

from math import factorial
from itertools import permutations


def solve():
    # closed form
    good_consonant_orders = factorial(4) - 2 * factorial(3)  # C off both ends
    vowel_orders = factorial(3)                              # 3 internal gaps
    answer = good_consonant_orders * vowel_orders           # 72

    # brute force
    letters = ["A", "I", "Y", "C", "H", "R", "T"]
    vowels = {"A", "I", "Y"}
    count = 0
    for p in permutations(letters):
        if p[0] in vowels or p[-1] in vowels:
            continue
        if any(p[i] in vowels and p[i + 1] in vowels for i in range(6)):
            continue
        if p[0] == "C" or p[-1] == "C":
            continue
        count += 1

    assert count == answer, (count, answer)
    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
