def solve():
    # Two regression lines: Y = 2X + 3 and X = 0.4Y + 2
    # Both pass through (X_bar, Y_bar) => solve the system
    # Y = 2X + 3
    # X = 0.4Y + 2
    # Substitute Y = 2X + 3 into X = 0.4Y + 2:
    # X = 0.4*(2X + 3) + 2 = 0.8X + 1.2 + 2 = 0.8X + 3.2
    # 0.2X = 3.2  => X_bar = 16
    x_bar = 3.2 / 0.2
    y_bar = 2 * x_bar + 3
    # X_bar=16, Y_bar=35 -> option 1
    return {"value": (x_bar, y_bar), "option_key": 1}

if __name__ == "__main__":
    print(solve())
