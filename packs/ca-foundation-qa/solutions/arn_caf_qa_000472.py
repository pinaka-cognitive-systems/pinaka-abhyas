def solve():
    from math import comb
    # C(5,4) * C(6,3) = 5 * 20 = 100
    value = comb(5, 4) * comb(6, 3)
    # option 1=100, 2=2400, 3=50, 4=200
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
