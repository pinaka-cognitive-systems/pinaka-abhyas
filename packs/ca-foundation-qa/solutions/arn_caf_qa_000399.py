def solve():
    P = 15000
    # 8% pa compounded quarterly, 6 months
    quarterly_rate = 0.08 / 4  # = 0.02
    periods = 2  # 6 months = 2 quarters
    factor = 1.0404  # (1.02)^2
    fv = P * factor
    # fv = 15606.0
    options = {1: 15606, 2: 15600, 3: 15300, 4: 16200}
    for k, v in options.items():
        if abs(v - fv) < 1:
            return {"value": fv, "option_key": k}
    return {"value": fv, "option_key": -1}

if __name__ == "__main__":
    print(solve())
