def solve():
    nP = 45
    nQ = 38
    nR = 42
    nPQ = 12
    nQR = 15
    nPR = 10
    nU = 100
    # By inclusion-exclusion: nU = nP+nQ+nR - nPQ - nQR - nPR + nPQR
    # nPQR = nU - (nP+nQ+nR) + (nPQ+nQR+nPR)
    nPQR = nU - (nP + nQ + nR) + (nPQ + nQR + nPR)
    # nPQR = 100 - 125 + 37 = 12
    assert nPQR == 12
    return {"value": nPQR, "option_key": 1}

if __name__ == "__main__":
    print(solve())
