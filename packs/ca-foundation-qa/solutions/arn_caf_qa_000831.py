def solve():
    import math
    rate_per_m = 2
    metres = 2
    lam = rate_per_m * metres  # 4
    k = 3
    prob = math.exp(-lam) * (lam**k) / math.factorial(k)
    # = e^(-4) * 64 / 6 = 0.0183 * 10.6667 = 0.19520
    opts = {1: 0.1952, 2: 0.0732, 3: 0.1465, 4: 0.0183}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
