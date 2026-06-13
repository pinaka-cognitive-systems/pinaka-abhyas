def solve():
    frequencies = [8, 14, 20, 12, 6]
    total = sum(frequencies)       # 60
    max_freq = max(frequencies)    # 20
    # fraction = max_freq / total = 20/60 = 1/3
    from fractions import Fraction
    frac = Fraction(max_freq, total)
    # frac = Fraction(1, 3), corresponds to option 1
    return {"value": float(frac), "option_key": 1}

if __name__ == "__main__":
    print(solve())
