import math

def solve():
    mids = [15, 25, 35, 45, 55]
    freqs = [1, 6, 6, 6, 1]
    A = 35
    h = 10
    n = sum(freqs)
    u_vals = [(m - A) // h for m in mids]
    fu = sum(u * f for u, f in zip(u_vals, freqs))
    fu2 = sum(u * u * f for u, f in zip(u_vals, freqs))
    sd = h * math.sqrt(fu2 / n - (fu / n) ** 2)
    # sd = 10
    # Options: 1->10, 2->100, 3->10.26, 4->7.07
    options = {1: 10, 2: 100, 3: 10.26, 4: 7.07}
    correct = min(options, key=lambda k: abs(options[k] - sd))
    return {"value": sd, "option_key": correct}

if __name__ == "__main__":
    print(solve())
