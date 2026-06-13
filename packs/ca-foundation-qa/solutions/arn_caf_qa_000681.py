def solve():
    # Frequency polygon anchors at mid-values of adjacent imaginary classes
    # First actual class: 10-20, so imaginary preceding class: 0-10, mid = 5
    # Last actual class: 50-60, so imaginary succeeding class: 60-70, mid = 65
    lower_anchor = (0 + 10) / 2   # = 5
    upper_anchor = (60 + 70) / 2  # = 65
    # option 1: (5, 65), option 2: (10, 60), option 3: (0, 70), option 4: (15, 55)
    options = {1: (5, 65), 2: (10, 60), 3: (0, 70), 4: (15, 55)}
    correct = None
    for k, (lo, hi) in options.items():
        if abs(lo - lower_anchor) < 0.01 and abs(hi - upper_anchor) < 0.01:
            correct = k
            break
    return {"value": f"lower={lower_anchor}, upper={upper_anchor}", "option_key": correct}

if __name__ == "__main__":
    print(solve())
