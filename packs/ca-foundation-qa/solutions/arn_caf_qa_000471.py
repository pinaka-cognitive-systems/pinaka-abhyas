def solve():
    from math import comb
    # exactly 2 red from 6, 2 blue from 4
    value = comb(6, 2) * comb(4, 2)  # 15 * 6 = 90
    # option 1=90, 2=360, 3=15, 4=24
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
