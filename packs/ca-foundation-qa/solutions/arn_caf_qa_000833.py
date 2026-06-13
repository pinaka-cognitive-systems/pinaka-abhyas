def solve():
    import math
    rate_per_hr = 5
    period_hr = 0.5
    lam = rate_per_hr * period_hr  # 2.5
    k = 2
    prob = math.exp(-lam) * (lam**k) / math.factorial(k)
    # = e^(-2.5) * 6.25 / 2 = 0.0821 * 3.125 = 0.25656
    opts = {1: 0.2565, 2: 0.0821, 3: 0.2052, 4: 0.5125}
    option_key = min(opts, key=lambda k: abs(opts[k] - prob))
    return {"value": round(prob, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
