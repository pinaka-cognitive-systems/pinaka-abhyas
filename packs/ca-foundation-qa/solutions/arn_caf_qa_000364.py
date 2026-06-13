def solve():
    # -4 <= 2x - 6 <= 8
    # Add 6: 2 <= 2x <= 14 => 1 <= x <= 7
    lower = (-4 + 6) / 2   # = 1
    upper = (8 + 6) / 2    # = 7
    assert lower == 1.0 and upper == 7.0
    # option key 1 text is "1 <= x <= 7"
    return {"value": (lower, upper), "option_key": 1}

if __name__ == "__main__":
    print(solve())
