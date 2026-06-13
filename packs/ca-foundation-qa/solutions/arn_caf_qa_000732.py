def solve():
    import math
    # Frequency distribution: (value, frequency)
    data = [(10, 4), (20, 6), (40, 8), (80, 2)]
    N = sum(f for _, f in data)
    # Weighted log GM
    sum_f_log = sum(f * math.log10(x) for x, f in data)
    log_gm = sum_f_log / N
    gm = 10 ** log_gm
    # gm approx 26.38
    # Options: 24.25, 30, 22.13, 35
    options = {1: 24.25, 2: 30.0, 3: 22.13, 4: 35.0}
    closest_key = min(options, key=lambda k: abs(options[k] - gm))
    return {"value": round(gm, 4), "option_key": closest_key}

if __name__ == "__main__":
    print(solve())
