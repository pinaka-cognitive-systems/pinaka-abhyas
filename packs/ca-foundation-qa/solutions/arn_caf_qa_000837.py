def solve():
    # Scores ~ N(72, 8^2). Passing mark = 80.
    # Z = (80 - 72) / 8 = 1
    # P(Z < 1) = 0.8413 (given)
    # P(pass) = P(X > 80) = P(Z > 1) = 1 - 0.8413
    mu = 72
    sigma = 8
    passing_mark = 80
    z = (passing_mark - mu) / sigma  # z = 1.0
    p_z_less_than_1 = 0.8413
    p_pass = round(1 - p_z_less_than_1, 4)  # 0.1587
    p_pass_pct = round(p_pass * 100, 2)  # 15.87

    # Options: 1->84.13, 2->15.87, 3->34.13, 4->50.00
    options = {1: 84.13, 2: 15.87, 3: 34.13, 4: 50.00}
    for k, v in options.items():
        if abs(v - p_pass_pct) < 0.01:
            return {"value": p_pass_pct, "option_key": k}

if __name__ == "__main__":
    print(solve())
