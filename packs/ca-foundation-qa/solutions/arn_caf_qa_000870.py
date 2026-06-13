def solve():
    r = 0.8
    b_yx = 1.6
    sx = 5
    x_bar = 10
    y_bar = 20
    y_predict = 25

    # Step 1: recover Sy from b_yx = r * (Sy/Sx)
    sy = b_yx * sx / r        # 1.6 * 5 / 0.8 = 10

    # Step 2: compute b_xy = r * (Sx/Sy)
    b_xy = r * sx / sy        # 0.8 * 5 / 10 = 0.4

    # Step 3: use the X-on-Y regression line to predict X
    # X - X_bar = b_xy * (Y - Y_bar)
    x_estimated = x_bar + b_xy * (y_predict - y_bar)  # 10 + 0.4*5 = 12

    # Verify r^2 = b_yx * b_xy
    assert abs(b_yx * b_xy - r**2) < 1e-9

    return {"value": x_estimated, "option_key": 1}

if __name__ == "__main__":
    print(solve())
