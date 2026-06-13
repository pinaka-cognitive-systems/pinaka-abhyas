def solve():
    import math
    lam = 2
    variance = lam  # Poisson property: variance = mean = lambda
    opts = {1: 2, 2: 4, 3: math.sqrt(2), 4: 1}
    option_key = min(opts, key=lambda k: abs(opts[k] - variance))
    return {"value": variance, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
