def solve():
    import math
    lam = 1.5
    prob = 1 - math.exp(-lam)
    # = 1 - 0.2231 = 0.7769
    opts = {1: 0.7769, 2: 0.2231, 3: 0.3347, 4: 0.5578}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
