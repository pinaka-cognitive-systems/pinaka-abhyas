def solve():
    # Distance: 0-5, 5-15, 15-25, 25-35, 35-40
    # Riders: 5, 18, 30, 22, 5
    freqs = [5, 18, 30, 22, 5]
    lower_bounds = [0, 5, 15, 25, 35]
    widths = [5, 10, 10, 10, 5]

    # Frequency densities
    fd = [f / w for f, w in zip(freqs, widths)]
    # fd: 1.0, 1.8, 3.0, 2.2, 1.0

    # Modal class: maximum frequency density
    modal_idx = fd.index(max(fd))  # index 2 (class 15-25)
    f1 = freqs[modal_idx]
    f0 = freqs[modal_idx - 1] if modal_idx > 0 else 0
    f2 = freqs[modal_idx + 1] if modal_idx < len(freqs) - 1 else 0
    L = lower_bounds[modal_idx]
    h = widths[modal_idx]

    mode = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h
    mode = round(mode, 2)

    options = {1: 21.00, 2: 20.00, 3: 15.00, 4: 22.50}
    option_key = min(options, key=lambda k: abs(options[k] - mode))
    return {"value": mode, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
