def solve():
    from math import comb
    n, p = 5, 0.2
    q = 1 - p
    prob = comb(n, 0) * (p**0) * (q**5) + comb(n, 1) * (p**1) * (q**4)
    # prob = 0.32768 + 0.40960 = 0.73728
    opts = {1: 0.73728, 2: 0.32768, 3: 0.40960, 4: 0.67232}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 5), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
