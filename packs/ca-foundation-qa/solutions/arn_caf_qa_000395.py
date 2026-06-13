def solve():
    fv = 12100
    r = 0.10
    n = 2
    factor = 1.21  # (1.10)^2
    pv = fv / factor
    # pv = 10000.0
    # option 1 = 10000, option 2 = 9800, option 3 = 10100, option 4 = 11000
    options = {1: 10000, 2: 9800, 3: 10100, 4: 11000}
    for k, v in options.items():
        if abs(v - pv) < 1:
            return {"value": pv, "option_key": k}
    return {"value": pv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
