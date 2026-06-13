def solve():
    mean = 50
    sd = 10
    cv = (sd / mean) * 100  # 20.0
    # Option 1: 20% (correct)
    # Option 2: 0.20 (ratio without *100)
    # Option 3: 500% (inverted ratio)
    # Option 4: 40 units (mean - SD)
    return {"value": cv, "option_key": 1}

if __name__ == "__main__":
    print(solve())
