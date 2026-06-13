def solve():
    nU = 80
    nE = 48
    nM = 36
    nEM = 12
    n_union = nE + nM - nEM  # 72
    n_neither = nU - n_union  # 8
    assert n_neither == 8
    return {"value": n_neither, "option_key": 1}

if __name__ == "__main__":
    print(solve())
