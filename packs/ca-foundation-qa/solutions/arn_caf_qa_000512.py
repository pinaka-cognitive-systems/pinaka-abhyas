def solve():
    nU = 50
    nA = 22
    nB = 18
    nAB = 7
    n_union = nA + nB - nAB  # 33
    n_neither = nU - n_union  # 17
    return {"value": n_neither, "option_key": 1}

if __name__ == "__main__":
    print(solve())
