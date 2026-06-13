def solve():
    # Bond: face = 1000, coupon = 10% p.a. paid semi-annually, maturity = 1 year,
    # required return = 8% p.a. compounded semi-annually
    face = 1000
    annual_coupon_rate = 0.10
    semi_annual_coupon = face * annual_coupon_rate / 2  # = 50
    annual_required_rate = 0.08
    r_semi = annual_required_rate / 2  # = 0.04, the per-period rate
    n_periods = 2  # 1 year x 2 semi-annual periods
    # Given: (1.04)^2 = 1.0816
    r1 = 1.04
    r2 = 1.0816

    pv_c1 = semi_annual_coupon / r1        # period-1 coupon PV
    pv_c2 = semi_annual_coupon / r2        # period-2 coupon PV
    pv_face = face / r2                    # face value PV at period 2

    price = round(pv_c1 + pv_c2 + pv_face, 2)
    # price should equal Rs 1018.86
    return {"value": price, "option_key": 4}

if __name__ == "__main__":
    print(solve())
