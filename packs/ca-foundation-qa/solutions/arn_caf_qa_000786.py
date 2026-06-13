def solve():
    total = 52
    n_hearts = 13
    n_face = 12   # J, Q, K of 4 suits
    n_overlap = 3  # J, Q, K of hearts
    n_union = n_hearts + n_face - n_overlap  # 22
    prob = n_union / total   # 22/52
    assert n_union == 22
    assert abs(prob - 22/52) < 1e-10
    return {"value": prob, "option_key": 3}

if __name__ == "__main__":
    print(solve())
