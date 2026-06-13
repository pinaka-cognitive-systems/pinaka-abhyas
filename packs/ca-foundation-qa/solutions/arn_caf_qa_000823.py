def solve():
    from math import comb
    n, k, p = 6, 4, 0.5
    prob = comb(n, k) * (p ** k) * ((1 - p) ** (n - k))
    # prob = 15/64
    # options: 1=15/64, 2=6/64, 3=15/32, 4=1/64
    opts = {1: 15/64, 2: 6/64, 3: 15/32, 4: 1/64}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 10), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
