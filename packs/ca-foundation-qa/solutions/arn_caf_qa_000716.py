def solve():
    # Hours: 10-20, 20-30, 30-40, 40-50, 50-60
    # Frequencies: 6, 10, 28, 12, 4
    freqs = [6, 10, 28, 12, 4]
    lower_bounds = [10, 20, 30, 40, 50]
    h = 10

    # Find modal class (max frequency)
    modal_idx = freqs.index(max(freqs))  # index 2 (class 30-40)
    f1 = freqs[modal_idx]
    f0 = freqs[modal_idx - 1] if modal_idx > 0 else 0
    f2 = freqs[modal_idx + 1] if modal_idx < len(freqs) - 1 else 0
    L = lower_bounds[modal_idx]

    mode = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h
    mode = round(mode, 2)

    options = {1: 35.29, 2: 34.71, 3: 30.00, 4: 35.00}
    option_key = min(options, key=lambda k: abs(options[k] - mode))
    return {"value": mode, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
