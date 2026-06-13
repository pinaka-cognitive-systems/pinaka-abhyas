def solve():
    V0 = 100000
    cagr = 0.12
    n = 3
    power_given = 1.4049   # (1.12)^3 given in stem
    Vn = V0 * power_given   # 140490
    return {"value": 140490, "option_key": 2}

if __name__ == "__main__":
    print(solve())
