def solve():
    P = 20000
    # Scheme A: SI at 10% for 2 years
    r_A = 0.10
    n = 2
    SI_A = P * r_A * n  # 4000.0

    # Scheme B: CI at 9.5% compounded annually for 2 years
    factor_B = 1.199025  # (1.095)^2 as given
    CI_B = P * (factor_B - 1)  # 3980.50

    diff = SI_A - CI_B  # 19.50 (positive means A is higher)
    # Scheme A gives Rs 19.50 more
    return {"value": round(diff, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
