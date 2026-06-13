def solve():
    P = 5000
    r = 0.08
    n = 3
    fv = P * (1 + r * n)
    # fv = 6200.0
    options = {1: 6200, 2: 5400, 3: 6000, 4: 6300}
    for k, v in options.items():
        if abs(v - fv) < 1:
            return {"value": fv, "option_key": k}
    return {"value": fv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
