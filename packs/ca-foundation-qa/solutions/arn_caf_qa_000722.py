def solve():
    # Grouped data mode: modal class 30-40
    # L=30, f1=15, f0=8, f2=13, h=10
    L = 30
    f1 = 15
    f0 = 8
    f2 = 13
    h = 10
    mode = L + (f1 - f0) / (2 * f1 - f0 - f2) * h
    # mode = 30 + 7/9 * 10 = 36.666...
    value = round(mode, 2)
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
