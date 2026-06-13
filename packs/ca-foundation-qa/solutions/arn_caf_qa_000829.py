def solve():
    import math
    lam = 3
    k = 0
    prob = math.exp(-lam) * (lam**k) / math.factorial(k)
    # = e^(-3) = 0.049787...
    opts = {1: 0.0498, 2: 0.1494, 3: 0.9502, 4: 0.0166}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
