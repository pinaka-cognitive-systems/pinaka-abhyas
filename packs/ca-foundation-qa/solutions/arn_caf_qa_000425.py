def solve():
    r_nom1 = 0.10
    r_inf1 = 0.04
    r_nom2 = 0.12
    r_inf2 = 0.07
    # Fisher each year
    r_real1 = (1 + r_nom1) / (1 + r_inf1) - 1
    r_real2 = (1 + r_nom2) / (1 + r_inf2) - 1
    # Compound the real factors
    cumulative = (1 + r_real1) * (1 + r_real2) - 1
    # = 1.05769 * 1.04673 - 1 = 0.10712 => 10.71%
    # option 1 = 10.71%
    return {"value": round(cumulative * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
