def solve():
    from math import comb
    n, p = 5, 0.4
    q = 0.6
    prob = sum(comb(n, k) * (p**k) * (q**(n-k)) for k in range(3, n+1))
    # = P(3)+P(4)+P(5) = 0.23040+0.07680+0.01024 = 0.31744
    opts = {1: 0.31744, 2: 0.68256, 3: 0.23040, 4: 0.08704}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 5), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
