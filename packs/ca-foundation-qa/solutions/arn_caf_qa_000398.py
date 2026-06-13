def solve():
    P = 20000
    i = 0.06 / 2  # half-yearly rate = 3%
    m = 2         # 2 half-year periods in 1 year
    factor = 1.0609  # (1.03)^2
    fv = P * factor
    # fv = 21218.0
    options = {1: 21218, 2: 21200, 3: 21000, 4: 21060}
    for k, v in options.items():
        if abs(v - fv) < 1:
            return {"value": fv, "option_key": k}
    return {"value": fv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
