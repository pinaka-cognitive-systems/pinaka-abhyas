def solve():
    # Empirical rule: within 1 sigma of mean ~ 68.27%
    # Options: 1->99.73%, 2->68.27%, 3->95.45%, 4->50%
    coverage_1sigma_pct = 68.27
    options = {1: 99.73, 2: 68.27, 3: 95.45, 4: 50.0}
    for k, v in options.items():
        if abs(v - coverage_1sigma_pct) < 0.01:
            return {"value": coverage_1sigma_pct, "option_key": k}

if __name__ == "__main__":
    print(solve())
