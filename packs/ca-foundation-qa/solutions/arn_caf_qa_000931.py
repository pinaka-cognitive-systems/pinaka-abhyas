def solve():
    # Three sections. Overall mean of all students is given.
    # Back-calculate the unknown size of section C, then find the
    # combined mean of sections A and C only.
    nA, mA = 40, 60
    nB, mB = 50, 55
    mC = 48
    overall = 53
    # overall = (nA*mA + nB*mB + nC*mC) / (nA + nB + nC)
    # overall*(nA + nB + nC) = nA*mA + nB*mB + nC*mC
    # nC*(overall - mC) = nA*mA + nB*mB - overall*(nA + nB)
    nC = (nA * mA + nB * mB - overall * (nA + nB)) / (overall - mC)
    # Combined mean of A and C only.
    mAC = (nA * mA + nC * mC) / (nA + nC)
    return {"value": round(mAC, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
