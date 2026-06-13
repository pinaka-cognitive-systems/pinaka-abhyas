def solve():
    FV = 40000
    r = 0.08
    factor_pow = 1.3605  # (1.08)^4
    FVAF = (factor_pow - 1) / r  # = 0.3605 / 0.08 = 4.50625
    R = FV / FVAF
    # R = 40000 / 4.50625 = 8877.xx approx
    options = {1: 8878, 2: 10000, 3: 8500, 4: 9574}
    for k, v in options.items():
        if abs(v - R) < 20:
            return {"value": round(R, 2), "option_key": k}
    return {"value": round(R, 2), "option_key": -1}

if __name__ == "__main__":
    print(solve())
