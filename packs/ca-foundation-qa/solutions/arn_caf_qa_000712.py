def solve():
    # Income: 10-20, 20-30, 30-40, 40-50, 50-60
    # Households: 5, 12, 18, 10, 5
    freqs = [5, 12, 18, 10, 5]
    lower_bounds = [10, 20, 30, 40, 50]
    h = 10
    n = sum(freqs)  # 50
    target = n / 2  # 25

    cf = 0
    median = None
    for i, f in enumerate(freqs):
        if cf + f >= target:
            L = lower_bounds[i]
            cf_prev = cf
            median = L + ((target - cf_prev) / f) * h
            break
        cf += f

    median = round(median, 2)
    # options: 1->34.44, 2->30.00, 3->35.00, 4->36.11
    options = {1: 34.44, 2: 30.00, 3: 35.00, 4: 36.11}
    option_key = min(options, key=lambda k: abs(options[k] - median))
    return {"value": median, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
