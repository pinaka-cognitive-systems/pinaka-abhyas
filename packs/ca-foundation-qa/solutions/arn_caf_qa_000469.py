def solve():
    # C(8,3) = 8! / (3! * 5!) = (8*7*6)/(3*2*1) = 56
    from math import comb
    value = comb(8, 3)
    # option_key: 1 -> 56, 2 -> 336, 3 -> 24, 4 -> 28
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
