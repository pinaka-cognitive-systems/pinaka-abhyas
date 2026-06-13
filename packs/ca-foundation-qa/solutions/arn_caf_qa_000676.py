def solve():
    # Relative frequency = (class frequency / total) * 100
    frequencies = [8, 20, 24, 16, 12]
    total = sum(frequencies)
    class_freq_20_30 = 24
    rel_freq_pct = (class_freq_20_30 / total) * 100
    # option 1: 30, option 2: 24, option 3: 25, option 4: 20
    options = {1: 30.0, 2: 24.0, 3: 25.0, 4: 20.0}
    correct = None
    for k, v in options.items():
        if abs(v - rel_freq_pct) < 0.01:
            correct = k
            break
    return {"value": rel_freq_pct, "option_key": correct}

if __name__ == "__main__":
    print(solve())
