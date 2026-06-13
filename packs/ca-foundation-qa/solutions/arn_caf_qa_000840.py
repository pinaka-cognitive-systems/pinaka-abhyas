def solve():
    # Weekly wages ~ N(mu, sigma^2).
    # P(X < 430) = 0.1587 = P(Z < -1) => Z_430 = -1 => mu - 430 = sigma => mu = 430 + sigma
    # P(X < 490) = 0.9772 = P(Z < 2) => Z_490 = 2 => 490 - mu = 2*sigma
    # Substituting: 490 - (430 + sigma) = 2*sigma => 60 - sigma = 2*sigma => 60 = 3*sigma => sigma = 20
    # mu = 430 + 20 = 450

    # Solve the two-equation system
    # mu - 430 = sigma  ... (i)
    # 490 - mu = 2 * sigma ... (ii)
    # Adding (i) and (ii): 490 - 430 = 3 * sigma
    sigma = (490 - 430) / 3  # 20.0
    mu = 430 + sigma  # 450.0

    # Verify
    assert abs((430 - mu) / sigma - (-1)) < 1e-9, "Z at 430 should be -1"
    assert abs((490 - mu) / sigma - 2) < 1e-9, "Z at 490 should be 2"

    sigma_value = int(round(sigma))  # 20

    # Options: 1->30, 2->20, 3->15, 4->60
    options = {1: 30, 2: 20, 3: 15, 4: 60}
    for k, v in options.items():
        if v == sigma_value:
            return {"value": sigma_value, "option_key": k}

if __name__ == "__main__":
    print(solve())
