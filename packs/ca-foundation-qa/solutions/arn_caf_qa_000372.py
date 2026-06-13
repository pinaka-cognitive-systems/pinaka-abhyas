def solve():
    # Doubling in 8 years under SI means SI = P
    # P * R * 8 / 100 = P => R = 100/8 = 12.5%
    R = 100 / 8  # 12.5
    # For 5x: amount = 5P => SI = 4P
    # P * R * T / 100 = 4P => T = 400 / R
    T = 400 / R  # 32
    return {"value": T, "option_key": 1}

if __name__ == "__main__":
    print(solve())
