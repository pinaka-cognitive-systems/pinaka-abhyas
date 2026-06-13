def solve():
    # Both regression lines pass through the mean point (X_bar, Y_bar), so the
    # means are the unique solution of the two line equations:
    #   Line 1 (Y on X): 2Y - 3X = 1  ->  -3X + 2Y = 1
    #   Line 2 (X on Y): 5X - 2Y = 9  ->   5X - 2Y = 9
    # Solved exactly with Cramer's rule over fractions (stdlib only; the harness
    # sandbox has no third-party packages).
    from fractions import Fraction

    # a1 X + b1 Y = c1 ; a2 X + b2 Y = c2
    a1, b1, c1 = -3, 2, 1
    a2, b2, c2 = 5, -2, 9

    det = a1 * b2 - a2 * b1
    assert det != 0, "lines are parallel; no unique mean point"
    x_bar = Fraction(c1 * b2 - c2 * b1, det)
    y_bar = Fraction(a1 * c2 - a2 * c1, det)

    # Verify against both lines.
    assert 2 * y_bar - 3 * x_bar == 1
    assert 5 * x_bar - 2 * y_bar == 9

    # X_bar = 5, Y_bar = 8 -> option 1.
    return {
        "value": {"X_bar": int(x_bar), "Y_bar": int(y_bar)},
        "option_key": 1,
    }


if __name__ == "__main__":
    print(solve())
