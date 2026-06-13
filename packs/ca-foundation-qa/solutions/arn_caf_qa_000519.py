def solve():
    nU = 200
    nM = 120
    nS = 90
    n_neither = 40
    n_union = nU - n_neither  # 160
    n_both = nM + nS - n_union  # 120 + 90 - 160 = 50
    assert n_both == 50
    return {"value": n_both, "option_key": 1}

if __name__ == "__main__":
    print(solve())
