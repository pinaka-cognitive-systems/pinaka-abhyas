def solve():
    # Class: 20-30, 30-40, 40-50, 50-60, 60-70
    # Known frequencies: 8, 12, x, 20, 6; total = 70
    known_sum = 8 + 12 + 20 + 6
    total = 70
    x = total - known_sum  # = 24
    # Verify median
    freqs = [8, 12, x, 20, 6]
    lower_bounds = [20, 30, 40, 50, 60]
    h = 10
    n = sum(freqs)
    target = n / 2  # 35
    cf = 0
    median = None
    for i, f in enumerate(freqs):
        if cf + f >= target:
            L = lower_bounds[i]
            cf_prev = cf
            median = L + ((target - cf_prev) / f) * h
            break
        cf += f
    # options: 1->24, 2->20, 3->28, 4->16
    option_map = {24: 1, 20: 2, 28: 3, 16: 4}
    return {"value": x, "option_key": option_map[x]}

if __name__ == "__main__":
    print(solve())
