def solve():
    FV = 50000
    r = 0.10
    n = 4
    factor = 1.4641  # (1.10)^4
    denominator = factor - 1  # = 0.4641
    R = FV * r / denominator
    # R = 5000 / 0.4641 = 10774.xxx
    # option 1 = 10774 (approx)
    options = {1: 10774, 2: 12500, 3: 10000, 4: 11000}
    for k, v in options.items():
        if abs(v - R) < 5:
            return {"value": round(R, 2), "option_key": k}
    return {"value": round(R, 2), "option_key": -1}

if __name__ == "__main__":
    print(solve())
