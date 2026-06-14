"""Executable solution for arn_caf_qa_000991.

Eight people in a row. P(Asha and Bharat have exactly 3 people between them).
Three between -> seat-number difference = 4.
Enumerate directly over all seat positions for the pair to be safe.
Options: 1=0.143  2=0.179  3=0.125  4=0.071
"""


def solve():
    n = 8
    between = 3
    gap = between + 1          # seat-number difference
    favourable = 0
    total = 0
    for i in range(1, n + 1):
        for j in range(1, n + 1):
            if i == j:
                continue       # two people cannot share a seat
            total += 1         # ordered placements of the pair: 8*7 = 56
            if abs(i - j) == gap:
                favourable += 1
    prob = favourable / total  # 8/56
    value = round(prob, 3)
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
