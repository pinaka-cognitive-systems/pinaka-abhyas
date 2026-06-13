def solve():
    # Less-than ogive: <10:5, <20:25, <30:55, <40:73, <50:80
    # Classes: [0,10], [10,20], [20,30], [30,40], [40,50]
    cumulative = [5, 25, 55, 73, 80]
    lower_bounds = [0, 10, 20, 30, 40]
    h = 10
    n = 80
    target = n / 2  # 40

    # Recover class frequencies from ogive
    freqs = [cumulative[0]] + [cumulative[i] - cumulative[i-1] for i in range(1, len(cumulative))]
    # freqs: 5, 20, 30, 18, 7

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
    options = {1: 25.00, 2: 30.00, 3: 31.67, 4: 27.50}
    option_key = min(options, key=lambda k: abs(options[k] - median))
    return {"value": median, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
