def solve():
    from math import comb
    total = comb(10, 3)       # 120
    all_white = comb(6, 3)    # 20
    p_none_black = all_white / total   # 1/6
    p_at_least_one = 1 - p_none_black  # 5/6
    assert abs(p_none_black - 1/6) < 1e-10
    assert abs(p_at_least_one - 5/6) < 1e-10
    return {"value": p_at_least_one, "option_key": 1}

if __name__ == "__main__":
    print(solve())
