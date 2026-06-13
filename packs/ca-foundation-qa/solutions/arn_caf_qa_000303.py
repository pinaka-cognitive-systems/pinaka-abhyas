def solve():
    P = 12000
    r_annual = 0.08
    m = 2  # half-yearly
    n_years = 1
    r_period = r_annual / m       # 0.04
    total_periods = n_years * m   # 2
    factor = 1.0816  # (1.04)^2 as given
    A = P * factor
    # A = 12979.20
    return {"value": round(A, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
