def solve():
    from math import comb
    favourable = comb(4, 2)   # 6
    total = comb(52, 2)        # 1326
    prob = favourable / total  # 1/221
    # Verify: 6/1326 = 1/221
    assert abs(prob - 1/221) < 1e-10
    return {"value": prob, "option_key": 2}

if __name__ == "__main__":
    print(solve())
