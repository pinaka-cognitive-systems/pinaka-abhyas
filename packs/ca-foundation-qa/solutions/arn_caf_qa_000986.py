"""Executable solution for arn_caf_qa_000986.

Back-calculate batch B's size from the three-batch combined mean,
then find the mean of subset (B, C).
A: n=20, mean=50. C: n=30, mean=40. B: mean=72, size unknown.
Combined mean of all three = 58.
Options: 1=60  2=58  3=56  4=44
"""


def solve():
    nA, mA = 20, 50
    nC, mC = 30, 40
    mB = 72
    combined = 58
    # combined*(nA + nB + nC) = nA*mA + nB*mB + nC*mC ; solve nB
    nB = (nA * mA + nC * mC - combined * (nA + nC)) / (combined - mB)
    nB = int(round(nB))
    mean_BC = (nB * mB + nC * mC) / (nB + nC)
    return {"value": round(mean_BC, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
