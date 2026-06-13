def solve():
    # Classes: 0-10, 10-20, 20-30, 30-40, 40-50
    lower_bounds = [0, 10, 20, 30, 40]
    freqs = [5, 10, 15, 12, 8]
    h = 10  # class width
    N = sum(freqs)
    half_n = N / 2  # = 25

    # Build cumulative frequencies
    cumulative = []
    cf = 0
    for f in freqs:
        cf += f
        cumulative.append(cf)

    # Find median class: first class where cumulative >= N/2
    median_class_idx = None
    for i, cum in enumerate(cumulative):
        if cum >= half_n:
            median_class_idx = i
            break

    L = lower_bounds[median_class_idx]
    f = freqs[median_class_idx]
    cf_before = cumulative[median_class_idx - 1] if median_class_idx > 0 else 0
    median = L + ((half_n - cf_before) / f) * h

    # options: 1->25.33, 2->26.00, 3->26.67, 4->28.00
    options = {1: 25.33, 2: 26.00, 3: 26.67, 4: 28.00}
    option_key = [k for k, v in options.items() if abs(v - median) < 0.01][0]
    return {"value": round(median, 2), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
