def solve():
    # Both regression lines pass through (X_bar, Y_bar)
    # Line 1 (Y on X): 2Y - 3X = 1
    # Line 2 (X on Y): 5X - 2Y = 9
    # Adding both equations: 2Y - 3X + 5X - 2Y = 1 + 9 => 2X = 10 => X_bar = 5
    # Substitute X=5 into Line 1: 2Y - 15 = 1 => 2Y = 16 => Y_bar = 8

    import numpy as np
    A = np.array([[-3, 2], [5, -2]], dtype=float)
    b = np.array([1, 9], dtype=float)
    sol = np.linalg.solve(A, b)
    x_bar, y_bar = sol[0], sol[1]

    # Verify
    assert abs(2*y_bar - 3*x_bar - 1) < 1e-9
    assert abs(5*x_bar - 2*y_bar - 9) < 1e-9

    # x_bar = 5, y_bar = 8 => option 1
    return {"value": {"X_bar": round(x_bar), "Y_bar": round(y_bar)}, "option_key": 1}

if __name__ == "__main__":
    print(solve())
