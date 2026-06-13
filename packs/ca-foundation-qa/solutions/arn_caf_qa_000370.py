def solve():
    from fractions import Fraction
    # Solve 2x + y = 100 and x + 3y = 120
    # Multiply second by 2: 2x + 6y = 240; subtract first: 5y = 140; y = 28; x = 36
    y = Fraction(140, 5)
    x = Fraction(100 - y, 2)
    assert x == 36 and y == 28
    corners = [(0, 0), (50, 0), (int(x), int(y)), (0, 40)]
    # Verify all corners are feasible
    for cx, cy in corners:
        assert 2*cx + cy <= 100, f"Machine constraint violated at ({cx},{cy})"
        assert cx + 3*cy <= 120, f"Labour constraint violated at ({cx},{cy})"
        assert cx >= 0 and cy >= 0
    # Evaluate profit Z = 5x + 4y
    profits = {(cx, cy): 5*cx + 4*cy for cx, cy in corners}
    best = max(profits, key=lambda k: profits[k])
    max_profit = profits[best]
    assert best == (36, 28) and max_profit == 292
    # option key 3 text is "292"
    return {"value": max_profit, "option_key": 3}

if __name__ == "__main__":
    print(solve())
