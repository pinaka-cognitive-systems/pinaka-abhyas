def solve():
    total = 80
    n_M = 45
    n_A = 30
    n_both = 15
    n_union = n_M + n_A - n_both   # 60
    n_neither = total - n_union     # 20
    prob = n_neither / total        # 20/80 = 1/4
    assert n_union == 60
    assert n_neither == 20
    assert abs(prob - 1/4) < 1e-10
    return {"value": prob, "option_key": 1}

if __name__ == "__main__":
    print(solve())
