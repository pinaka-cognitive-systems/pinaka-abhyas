def solve():
    from math import comb
    favourable = comb(3, 2) * comb(5, 1)  # 3 * 5 = 15
    total = comb(8, 3)                      # 56
    prob = favourable / total               # 15/56
    assert favourable == 15
    assert total == 56
    return {"value": prob, "option_key": 1}

if __name__ == "__main__":
    print(solve())
