def solve():
    r_nom = 0.085
    r_inf1 = 0.03
    r_inf2 = 0.055
    r_real1 = (1 + r_nom) / (1 + r_inf1) - 1
    r_real2 = (1 + r_nom) / (1 + r_inf2) - 1
    change = r_real2 - r_real1
    # change = 2.844 - 5.340 = -2.496% => decreases by approx 2.50%
    # option 2 = "decreases by 2.50%"
    return {"value": round(abs(change) * 100, 4), "option_key": 2}

if __name__ == "__main__":
    print(solve())
