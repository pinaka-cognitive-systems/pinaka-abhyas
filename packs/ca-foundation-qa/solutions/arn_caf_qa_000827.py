def solve():
    from math import comb
    n, k = 8, 3
    p = 1/4
    q = 3/4
    prob = comb(n, k) * (p**k) * (q**(n-k))
    # = 56 * (1/64) * (3/4)^5 = 56 * (1/64) * 0.2373046875 = 0.20761...
    opts = {1: 0.2076, 2: 0.0586, 3: 0.3164, 4: 0.1406}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
