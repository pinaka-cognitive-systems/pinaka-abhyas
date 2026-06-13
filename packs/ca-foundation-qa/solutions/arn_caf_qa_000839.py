def solve():
    # Consumption ~ N(300, 25^2). Find P(300 < X < 350).
    mu = 300
    sigma = 25
    x_lower = 300
    x_upper = 350
    z_lower = (x_lower - mu) / sigma  # 0.0
    z_upper = (x_upper - mu) / sigma  # 2.0
    phi_2 = 0.9772  # given P(Z < 2)
    phi_0 = 0.5000  # given P(Z < 0)
    prob = round(phi_2 - phi_0, 4)  # 0.4772

    # Options: 1->0.9772, 2->0.4772, 3->0.0228, 4->0.5228
    options = {1: 0.9772, 2: 0.4772, 3: 0.0228, 4: 0.5228}
    for k, v in options.items():
        if abs(v - prob) < 0.0001:
            return {"value": prob, "option_key": k}

if __name__ == "__main__":
    print(solve())
