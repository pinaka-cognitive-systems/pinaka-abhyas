def solve():
    FV = 75000
    i = 0.10 / 2  # = 0.05 half-yearly rate
    m = 3 * 2     # = 6 half-year periods
    factor_pow = 1.3401  # (1.05)^6
    FVAF = (factor_pow - 1) / i  # = 0.3401 / 0.05 = 6.802
    R = FV / FVAF
    # R = 75000 / 6.802 = 11026.xx approx
    options = {1: 11026, 2: 12500, 3: 10714, 4: 13636}
    for k, v in options.items():
        if abs(v - R) < 20:
            return {"value": round(R, 2), "option_key": k}
    return {"value": round(R, 2), "option_key": -1}

if __name__ == "__main__":
    print(solve())
