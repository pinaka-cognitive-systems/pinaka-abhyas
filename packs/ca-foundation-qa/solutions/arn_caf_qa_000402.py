def solve():
    target = 100000
    ordinary_factor = 5.526  # ((1.05)^5 - 1) / 0.05
    due_factor = 5.526 * 1.05  # = 5.8023 for annuity due
    R = target / due_factor
    # R = 17235 approx
    options = {1: 17235, 2: 18094, 3: 20000, 4: 16760}
    for k, v in options.items():
        if abs(v - R) < 20:
            return {"value": round(R, 2), "option_key": k}
    return {"value": round(R, 2), "option_key": -1}

if __name__ == "__main__":
    print(solve())
