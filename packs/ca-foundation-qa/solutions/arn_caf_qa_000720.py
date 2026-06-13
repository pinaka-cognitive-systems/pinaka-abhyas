def solve():
    # Classes: 10-20, 20-30, 30-40, 40-50, 50-60
    # Frequencies: 5, p, 40, 20, 5; total = 90
    known_freqs = [5, 40, 20, 5]
    total = 90
    p = total - sum(known_freqs)  # = 20

    # Verify with mode formula
    # Modal class: 30-40 (f1=40), f0=p=20, f2=20
    f0 = p
    f1 = 40
    f2 = 20
    L = 30
    h = 10
    mode = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h
    assert abs(mode - 35.0) < 0.01, f"Mode check failed: {mode}"

    option_map = {20: 1, 15: 2, 25: 3, 18: 4}
    return {"value": p, "option_key": option_map[p]}

if __name__ == "__main__":
    print(solve())
