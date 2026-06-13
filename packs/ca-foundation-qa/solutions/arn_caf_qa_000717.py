def solve():
    # Salary: 5-10, 10-15, 15-20, 20-25, 25-30
    # Employees: 3, 7, 25, 8, 2
    freqs = [3, 7, 25, 8, 2]
    lower_bounds = [5, 10, 15, 20, 25]
    h = 5

    modal_idx = freqs.index(max(freqs))  # index 2 (class 15-20)
    f1 = freqs[modal_idx]
    f0 = freqs[modal_idx - 1] if modal_idx > 0 else 0
    f2 = freqs[modal_idx + 1] if modal_idx < len(freqs) - 1 else 0
    L = lower_bounds[modal_idx]

    mode = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h
    mode = round(mode, 2)

    options = {1: 17.57, 2: 15.00, 3: 17.14, 4: 18.13}
    option_key = min(options, key=lambda k: abs(options[k] - mode))
    return {"value": mode, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
