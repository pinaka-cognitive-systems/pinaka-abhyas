def solve():
    # Wages: 100-120, 120-140, 140-160, 160-180, 180-200
    # Frequencies: 4, 8, 14, 10, 4
    freqs = [4, 8, 14, 10, 4]
    lower_bounds = [100, 120, 140, 160, 180]
    h = 20
    n = sum(freqs)
    target = n / 2  # = 20

    cf = 0
    median = None
    for i, f in enumerate(freqs):
        if cf + f >= target:
            L = lower_bounds[i]
            cf_prev = cf
            median = L + ((target - cf_prev) / f) * h
            break
        cf += f

    # Round to 2 decimal places
    median = round(median, 2)
    # options: 1->151.43, 2->155.00, 3->148.57, 4->160.00
    # Determine closest option
    options = {1: 151.43, 2: 155.00, 3: 148.57, 4: 160.00}
    option_key = min(options, key=lambda k: abs(options[k] - median))
    return {"value": median, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
