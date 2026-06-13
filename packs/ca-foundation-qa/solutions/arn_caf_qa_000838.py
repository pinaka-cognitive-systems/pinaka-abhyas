def solve():
    # Output ~ N(500, 20^2). Find P(470 < X < 530).
    mu = 500
    sigma = 20
    x_lower = 470
    x_upper = 530
    z_lower = (x_lower - mu) / sigma  # -1.5
    z_upper = (x_upper - mu) / sigma  # 1.5
    phi_1_5 = 0.9332  # given P(Z < 1.5)
    phi_neg_1_5 = 1 - phi_1_5  # 0.0668 by symmetry
    prob = round(phi_1_5 - phi_neg_1_5, 4)  # 0.8664

    # Options: 1->0.8664, 2->0.9332, 3->0.1336, 4->0.7500
    options = {1: 0.8664, 2: 0.9332, 3: 0.1336, 4: 0.75}
    for k, v in options.items():
        if abs(v - prob) < 0.0001:
            return {"value": prob, "option_key": k}

if __name__ == "__main__":
    print(solve())
