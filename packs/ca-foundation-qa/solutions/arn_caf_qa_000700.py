def solve():
    age_midpoints = [25, 35, 45, 55]
    freqs = [8, 14, 12, 6]
    A = 40
    d = [m - A for m in age_midpoints]
    fd = [f * dd for f, dd in zip(freqs, d)]
    N = sum(freqs)
    mean = A + sum(fd) / N
    # options: 1->37.5, 2->38.0, 3->38.5, 4->39.0
    options = {1: 37.5, 2: 38.0, 3: 38.5, 4: 39.0}
    option_key = [k for k, v in options.items() if abs(v - mean) < 0.01][0]
    return {"value": mean, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
