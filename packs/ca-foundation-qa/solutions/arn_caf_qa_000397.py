def solve():
    P = 8000
    factor = 1.1025  # (1.05)^2
    fv = P * factor
    # fv = 8820.0
    options = {1: 8820, 2: 8800, 3: 8400, 4: 9000}
    for k, v in options.items():
        if abs(v - fv) < 1:
            return {"value": fv, "option_key": k}
    return {"value": fv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
