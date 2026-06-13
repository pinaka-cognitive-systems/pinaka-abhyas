import math

def solve():
    # Frequency distribution
    freqs = [2, 1, 20, 9, 8]
    mids = [15, 25, 35, 45, 55]
    A = 35
    h = 10
    N = sum(freqs)

    # Step deviation: u = (mid - A) / h
    u = [(m - A) / h for m in mids]
    fu = [f * uu for f, uu in zip(freqs, u)]
    fu2 = [f * uu ** 2 for f, uu in zip(freqs, u)]
    sum_fu = sum(fu)
    sum_fu2 = sum(fu2)

    # Mean
    mean = A + (sum_fu / N) * h

    # Variance with correction term
    variance = h ** 2 * (sum_fu2 / N - (sum_fu / N) ** 2)
    sd = math.sqrt(variance)

    # Coefficient of variation
    cv = (sd / mean) * 100

    # options: 1->20, 2->22.5, 3->25, 4->28
    options = {1: 20.0, 2: 22.5, 3: 25.0, 4: 28.0}
    option_key = [k for k, v in options.items() if abs(v - cv) < 0.1][0]
    return {"value": round(cv, 2), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
